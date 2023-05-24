/* eslint-disable valid-jsdoc */
import patch from '@cailiao/watch-dom'

interface Wait extends Promise<string> {
  resolve?: (value: string) => void
}

const { max, ceil, cos, sin, abs } = Math

/**
 * 水印
 */
export default class Watermark {
  className: string
  color: string
  content: string[] = ['@cailiao/watermark']
  el?: HTMLElement
  fontFamily: string
  fontSize: string
  fontStyle: string
  fontWeight: string
  lineHeight = '20px'
  image: {
    src: string
    // 图像水印相对于默认位置的偏移量，单位为px，第一个元素为水平偏移量，第二个元素为垂直偏移量（旋转后）
    offset: [number, number]
  }
  angle: number
  // 水印之间的相对偏移量，单位为px，第一个元素为同一行水平偏移量，第二个元素为同一列垂直偏移量（旋转后）
  offset: number[] = [100, 100]
  rotate = -37
  // 同一行水印之间的间距，单位为px
  gap = 100
  zIndex = 999
  canvas: HTMLCanvasElement
  #dataURL: string
  #waitDataURL: Wait
  #img: HTMLImageElement
  #mounted = false
  #container: HTMLDivElement
  #unWatch: () => void
  sinA: number
  cosA: number

  /**
   * 构造器，初始化一个水印图片
   * @param {Number[]} gap 水印的间隔
   */
  constructor(
    {
      className,
      content,
      font = {},
      gap,
      image,
      lineHeight,
      offset,
      rotate,
      zIndex
    }: {
      className?: string
      content?: string | string[]
      font?: {
        color?: string
        fontFamily?: string
        fontSize?: string
        fontStyle?: 'none' | 'normal' | 'italic' | 'oblique'
        fontWeight?: 'normal' | 'light' | 'weight' | number
      }
      gap?: number
      image?: string | object
      lineHeight?: string
      offset?: [number, number]
      rotate?: number
      zIndex?: number
    } = {
      font: {}
    }
  ) {
    const {
      color = 'hsla(0, 0%, 50%, 0.5)',
      fontSize = 16,
      fontWeight = 'normal',
      fontStyle = 'normal',
      fontFamily = 'sans-serif'
    } = font,
          args = {
            className,
            color,
            content,
            fontFamily,
            fontSize,
            fontStyle,
            fontWeight,
            gap,
            image,
            lineHeight,
            offset,
            rotate,
            zIndex
          }

    // 处理依赖
    if (!Element.prototype.$watch || !Element.prototype.$watchBox) patch()

    // 处理image参数
    if (image) {
      this.content = []
      if (typeof image === 'string') args.image = { src: image, offset: [0] }
    }

    // 处理content参数
    if (content && typeof content === 'string') {
      const newContent = content.replace(/\\n+/g, '\n')

      args.content = newContent.split('\n')
    }

    for (const key in args) {
      const value = args[key]

      if (value !== undefined) this[key] = value
    }

    // 计算弧度
    const { rotate: newRotate } = this,
          angle = -newRotate / 180 * Math.PI

    this.angle = angle
    this.sinA = newRotate % 180 ? abs(sin(angle)) : 0
    this.cosA = newRotate === 0 || newRotate % 90 ? abs(cos(angle)) : 0

    this.renderWatermark()
  }

  /** */
  destroy(unWatch: () => void, unWatchResize: () => void, container: HTMLDivElement) {
    unWatch()
    unWatchResize()
    container.remove()
  }

  /** */
  drawText({
    absLineHeight,
    blockWidth,
    canvas,
    canvasWidth,
    ctx
  }: {
    absLineHeight: number
    blockWidth: number
    canvas: HTMLCanvasElement
    canvasWidth: number
    ctx: CanvasRenderingContext2D
  }) {
    const { offset } = this,
          [offsetX, offsetY] = offset,
          transfOffsetX = ceil((offsetX % canvasWidth + canvasWidth) % canvasWidth),
          transfOffsetY = ceil(offsetY)

    ctx.save()

    // 先于原点绘制文本
    ctx.translate(blockWidth / 2, 0)
    this.fillTexts({ ctx, absLineHeight })

    ctx.translate(transfOffsetX, transfOffsetY)
    this.fillTexts({ ctx, absLineHeight })

    ctx.translate(-canvasWidth, 0)
    this.fillTexts({ ctx, absLineHeight })
    ctx.restore()

    // /* 将左四分之一的图形移动至右方，然后再将上四分之一的图形移动至下方 */
    // const clipLeft = ctx.getImageData(0, 0, ceil(canvasWidth / 4), canvasHeight),
    //       clipRight = ctx.getImageData(ceil(canvasWidth / 4), 0, ceil(canvasWidth * 3 / 4), canvasHeight)

    // ctx.putImageData(clipRight, 0, 0)
    // ctx.putImageData(clipLeft, ceil(canvasWidth * 3 / 4), 0)

    // const clipTop = ctx.getImageData(0, 0, canvasWidth, ceil(canvasHeight / 4)),
    //       clipBottom = ctx.getImageData(0, ceil(canvasHeight / 4), canvasWidth, ceil(canvasHeight * 3 / 4))

    // ctx.putImageData(clipBottom, 0, 0)
    // ctx.putImageData(clipTop, 0, ceil(canvasHeight * 3 / 4))

    this.setDataUrl(canvas.toDataURL())
  }

  /**
   * 绘制文本
   */
  fillTexts({ ctx, absLineHeight }: { ctx: CanvasRenderingContext2D; absLineHeight: number }) {
    const ratio = devicePixelRatio,
          mergedFontSize = Number(this.fontSize) * ratio,
          { content, fontFamily } = this

    ctx.font = `${this.fontStyle} normal ${this.fontWeight} ${mergedFontSize}px ${fontFamily}`
    ctx.fillStyle = this.color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    content?.forEach((text, index) => ctx.fillText(text, 0, 0 + index * absLineHeight * ratio))
  }

  /** */
  async drawImage({
    absLineHeight,
    blockWidth,
    canvasHeight,
    canvasWidth,
    ctx,
    imgWidth,
    imgHeight
  }: {
    absLineHeight: number
    blockWidth: number
    canvas: HTMLCanvasElement
    canvasHeight: number
    canvasWidth: number
    ctx: CanvasRenderingContext2D
    imgWidth: number
    imgHeight: number
  }) {
    const { offset, image } = this,
          img = this.#img,
          mergedFontSize = Number(this.fontSize) * devicePixelRatio,
          [imgOffsetX = 0, imgOffsetY = 0] = image.offset,
          transfImgOffsetX = ceil((imgOffsetX % canvasWidth + canvasWidth) % canvasWidth),
          transfImgOffsetY = ceil((imgOffsetY % canvasHeight + canvasHeight) % canvasHeight),
          [offsetX, offsetY] = offset,
          transfOffsetX = ceil((offsetX % canvasWidth + canvasWidth) % canvasWidth),
          transfOffsetY = ceil(offsetY),
          imgOffsetHeight = imgHeight + absLineHeight - mergedFontSize

    // debugger
    /**
     * 先于居中绘制图片
     * 然后根据偏移量进行偏移
     * 然后计算根据canvas的宽高计算偏移量
     */
    ctx.translate(0, imgOffsetHeight)
    ctx.save()
    ctx.translate(blockWidth / 2 - imgWidth / 2, -imgOffsetHeight)
    ctx.translate(transfImgOffsetX, transfImgOffsetY)
    ctx.drawImage(img, 0, 0, imgWidth, imgHeight)
    ctx.drawImage(img, -canvasWidth, 0, imgWidth, imgHeight)
    ctx.drawImage(img, 0, -canvasHeight, imgWidth, imgHeight)
    ctx.drawImage(img, -canvasWidth, -canvasHeight, imgWidth, imgHeight)

    ctx.translate(transfOffsetX, transfOffsetY)
    ctx.drawImage(img, 0, 0, imgWidth, imgHeight)
    ctx.drawImage(img, -canvasWidth, 0, imgWidth, imgHeight)
    ctx.drawImage(img, 0, -canvasHeight, imgWidth, imgHeight)
    ctx.drawImage(img, -canvasWidth, -canvasHeight, imgWidth, imgHeight)
    ctx.restore()
  }

  /**
   * 计算水印宽度
   */
  async getCanvasSize(ctx: CanvasRenderingContext2D) {
    const { textblockWidth, textblockHeight, absLineHeight } = await this.getContentTextSize(ctx),
          { imgWidth = 0, imgHeight = 0 } = this.image ? await this.getImgSize() : {}

    return {
      blockWidth: max(textblockWidth, imgWidth),
      blockHeight: textblockHeight + imgHeight,
      textblockWidth,
      absLineHeight,
      imgWidth,
      imgHeight
    } as {
      blockWidth: number
      blockHeight: number
      textblockWidth: number
      absLineHeight: number
      imgWidth: number
      imgHeight: number
    }
  }

  /** */
  async getImgSize() {
    const { image } = this,
          img = new Image(),
          waitOnLoad = new Promise((resolve, reject) => {
            img.addEventListener('load', resolve)
            img.addEventListener('error', reject)
          })

    img.crossOrigin = 'anonymous'
    img.referrerPolicy = 'no-referrer'
    img.src = image.src
    this.#img = img

    await waitOnLoad

    return { imgWidth: img.width, imgHeight: img.height } as {
      imgWidth: number
      imgHeight: number
    }
  }

  /** */
  async getContentTextSize(ctx: CanvasRenderingContext2D) {
    const { fontSize, content, fontFamily, lineHeight } = this
    var width = 0,
        height = 0,
        absLineHeight: number

    const pEl = document.createElement('p')

    pEl.style.lineHeight = lineHeight
    pEl.innerText = content.join('')

    queueMicrotask(() => document.body.appendChild(pEl))
    // 获取行高的绝对值
    absLineHeight = await new Promise(resolve => {
      const unWatch = pEl.$watchBox(record => {
        resolve(record[0].contentRect.height)
        unWatch()
        pEl.remove()
      })
    })

    ctx.font = `${Number(fontSize)}px ${fontFamily}`

    const widths = content.map(text => ctx.measureText(text).width)

    width = ceil(max(...widths))
    height = absLineHeight * content.length

    return { textblockWidth: width, textblockHeight: height, absLineHeight } as {
      textblockWidth: number
      textblockHeight: number
      absLineHeight: number
    }
  }

  /** */
  async renderWatermark() {
    const canvas = document.createElement('canvas'),
          ctx = canvas.getContext('2d'),
          { offset, image, gap } = this,
          [, offsetY] = offset

    this.canvas = canvas
    if (ctx) {
      const ratio = devicePixelRatio,
            { blockWidth, absLineHeight, imgWidth, imgHeight } = await this.getCanvasSize(ctx),
            canvasWidth = (blockWidth + gap) * ratio,
            canvasHeight = ceil(2 * offsetY * ratio)

      canvas.setAttribute('width', `${canvasWidth}px`)
      canvas.setAttribute('height', `${canvasHeight}px`)

      if (image)
        this.drawImage({
          absLineHeight,
          blockWidth,
          canvas,
          canvasHeight,
          canvasWidth,
          ctx,
          imgHeight,
          imgWidth
        })

      this.drawText({
        absLineHeight,
        blockWidth,
        canvas,
        canvasWidth,
        ctx
      })
    }
  }

  /** */
  async getDataUrl() {
    var result
    const dataURL = this.#dataURL

    if (dataURL) result = dataURL
    else {
      const waitDataURL = this.#waitDataURL

      if (waitDataURL) result = waitDataURL
      else {
        let resolve

        const wait: Wait = new Promise(res => {
          resolve = res
        })

        wait.resolve = resolve
        this.#waitDataURL = wait
        result = wait
      }
    }

    return result
  }

  /** */
  async setDataUrl(newDataURL) {
    if (!this.#dataURL && this.#waitDataURL) {
      this.#waitDataURL.resolve(newDataURL)
      this.#waitDataURL = null
    }

    this.#dataURL = newDataURL
  }

  /** */
  tamperProofing(rootEl: HTMLElement, closure: { container: HTMLDivElement; originContainer: HTMLDivElement }) {
    var { container, originContainer } = closure,
        timer1: number,
        timer2: number,
        unWatchContainer: () => void

    /** */
    function reMount() {
      container.remove()
      container = closure.container = originContainer.cloneNode(true) as HTMLDivElement
      rootEl.insertAdjacentElement('afterbegin', container)
      unWatchContainer(), watchContainer(container)
    }

    /** */
    function watchContainer(el) {
      unWatchContainer = el.$watch(
        record => {
          record
          // debugger

          // 节流
          clearTimeout(timer2)
          // 监视container的属性是否发生变化
          timer2 = setTimeout(() => reMount(), 35)
        },
        { subtree: true, childList: true, attributes: true, attributeOldValue: true }
      )
    }

    const unWatchRootEL = rootEl.$watch(
      () => {
        // 节流
        clearTimeout(timer1)
        timer1 = setTimeout(() => {
          // 监视 container 是否存在于 rootEl 中, 或者判断首元素是否为 container
          if (!rootEl.contains(container) || rootEl.firstElementChild !== container) reMount()
        }, 35)
      },
      { childList: true }
    )

    watchContainer(container)

    return () => {
      unWatchRootEL()
      unWatchContainer()
      container = null
    }
  }

  /**
   * 在检测到rootEl的大小发生变化时重调用 createContianer 方法
   */
  resize(rootEl, closure) {
    var container = closure.container,
        isImmideate = true,
        timer: number
    const { cosA, sinA } = this,
          unWatchResize = rootEl.$watchBox(records => {
            // 节流
            clearTimeout(timer)
            timer = setTimeout(() => {
              if (!isImmideate) {
                const { width, height } = records[0].contentRect

                if (width && height) {
                  container.style.setProperty('--container-height', `${height * cosA + width * sinA}px`)
                  container.style.setProperty('--container-width', `${height * sinA + width * cosA}px`)
                }
              }
            }, 35)

            isImmideate = false
          })

    return unWatchResize
  }

  /**挂载水印元素 */
  async mount(rootEl: HTMLElement) {
    const closure: { container: HTMLDivElement; originContainer: HTMLDivElement } = await this.createContianer(rootEl),
          unWatch = this.tamperProofing(rootEl, closure),
          unWatchResize = this.resize(rootEl, closure)

    return this.destroy.bind(null, unWatch, unWatchResize, closure)
  }

  /** */
  async createContianer(rootEl) {
    const { rotate, cosA, sinA } = this,
          container = document.createElement('div'),
          watermark = document.createElement('div'),
          beforeElHeight = getBeforeElementHeight(rootEl),
          commonStyle = {
            'clip-path': 'none',
            display: 'block',
            margin: 0,
            visibility: 'visible',
            'z-index': Number.MAX_SAFE_INTEGER
          },
          containerStyle = {
            ...commonStyle,
            '--container-height': `${rootEl.offsetHeight * cosA + rootEl.offsetWidth * sinA}px`,
            '--container-width': `${rootEl.offsetHeight * sinA + rootEl.offsetWidth * cosA}px`,
            height: `${rootEl.offsetHeight}px`,
            opacity: 1,
            overflow: 'hidden',
            'pointer-events': 'none',
            position: 'absolute',
            transform: `${beforeElHeight ? `translateY(-${beforeElHeight})` : ''}`,
            width: `${rootEl.offsetWidth}px`
          },
          watermarkStyle = {
            ...commonStyle,
            'background-image': `url(${await this.getDataUrl()})`,
            display: 'inline-block',
            height: 'var(--container-height)',
            left: '50%',
            opacity: 0.5,
            position: 'relative',
            top: '50%',
            transform: `translate(-50%,-50%) rotate(${rotate}deg)`,
            'transform-origin': 'center center',
            width: 'var(--container-width)'
          }

    for (const name in containerStyle) {
      setStyle(container, name, containerStyle[name])
    }

    for (const name in watermarkStyle) {
      setStyle(watermark, name, watermarkStyle[name])
    }

    container.appendChild(watermark)

    const cloneNode = container.cloneNode(true) as HTMLDivElement

    rootEl.insertAdjacentElement('afterbegin', cloneNode)

    return { originContainer: container, container: cloneNode }
  }
}

/**
 * 设置样式
 */
function setStyle(target, name, value) {
  target.style.setProperty(name, value.toString(), 'important')
}

/**
 * 获取伪元素高度
 */
function getBeforeElementHeight(rootEl) {
  const { height, float, position } = getComputedStyle(rootEl, ':before'),
        isFloat = float !== 'none' || position === 'absolute'

  return isFloat ? 0 : height
}
