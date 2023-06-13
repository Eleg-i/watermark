import { diffCSSStyle, getBeforeElementHeight, getElPadding, setStyle } from './utils'
import { watch, watchBox } from '@cailiao/watch-dom'

const { max, ceil, cos, sin, abs } = Math

interface Wait extends Promise<string> {
  resolve?: (value: string) => void
}

/**
 * 水印
 */
export default class Watermark {
  blockWidth: number
  blockHeight: number
  className: string
  color: string
  content: string[] = ['@cailiao/watermark']
  el?: HTMLElement
  fontFamily: string
  fontSize: string
  fontStyle: string
  fontWeight: string
  lineHeight = 1.5
  image: {
    alpha: number
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
  zIndex = Number.MAX_SAFE_INTEGER
  canvas: HTMLCanvasElement
  #dataURL: string
  #waitDataURL: Wait
  #img: HTMLImageElement
  sinA: number
  cosA: number

  /**
   * 构造器，初始化一个水印图片
   * @param {Number[]} gap 水印的间隔
   */
  constructor(
    {
      content,
      font = {},
      gap,
      image,
      lineHeight,
      offset,
      rotate,
      zIndex
    }: {
      content?: string | string[]
      font?: {
        color?: string
        fontFamily?: string
        fontSize?: number | string
        fontStyle?: 'normal' | 'italic' | 'oblique'
        fontWeight?: 'normal' | 'lighter' | 'bolder' | 'bold' | number
      }
      gap?: number
      image?: string | { src: string; offset?: [number, number]; alpha?: number }
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

    // 处理image参数
    if (image) {
      if (typeof image === 'string') {
        this.content = []
        args.image = { src: image, offset: [0, 0], alpha: 1 }
      } else if (image.src) this.content = []
    }

    // 处理content参数
    if (content && typeof content === 'string' && content.trim() !== '') {
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
    this.sinA = abs(sin(angle))
    this.cosA = abs(cos(angle))

    this.renderWatermark()
  }

  /**
   * 销毁水印
   * @param {Function} unWatch 取消 Mutation 监听
   * @param {Function} unWatchResize 取消 Resize 监听
   * @param {Object} closure 闭包
   */
  destroy(unWatch: () => void, unWatchResize: () => void, closure: { container: HTMLElement }) {
    const { container } = closure

    unWatch()
    unWatchResize()
    container.remove()
    closure.container = undefined
  }

  /**
   * 绘制文本
   * @param {Number} absLineHeight 文本行高的绝对值
   * @param {Number} blockWidth 水印块的宽度
   * @param {HTMLCanvasElement} canvas 画布
   * @param {Number} canvasWidth 画布宽度
   * @param {CanvasRenderingContext2D} ctx 画布上下文
   */
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

    this.setDataUrl(canvas.toDataURL())
  }

  /**
   * 填充文本至画布
   * @param {CanvasRenderingContext2D} ctx 画布上下文
   * @param {Number} absLineHeight 文本行高的绝对值
   */
  fillTexts({ ctx, absLineHeight }: { ctx: CanvasRenderingContext2D; absLineHeight: number }) {
    const ratio = devicePixelRatio,
          mergedFontSize = Number(this.fontSize) * ratio,
          { content, fontFamily, fontStyle, lineHeight, fontWeight } = this

    ctx.font = `${fontStyle} normal ${fontWeight} ${mergedFontSize}px / ${lineHeight} ${fontFamily}`
    ctx.fillStyle = this.color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    content?.forEach((text, index) => ctx.fillText(text, 0, 0 + index * absLineHeight * ratio))
  }

  /**
   * 绘制图片
   * @param {Number} absLineHeight 文本行高的绝对值
   * @param {Number} blockWidth 水印块的宽度
   * @param {Number} canvasHeight 画布高度
   * @param {Number} canvasWidth 画布宽度
   * @param {CanvasRenderingContext2D} ctx 画布上下文
   * @param {Number} imgWidth 图片宽度
   * @param {Number} imgHeight 图片高度
   */
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
          { alpha = 1 } = image || {},
          [imgOffsetX = 0, imgOffsetY = 0] = image.offset,
          transfImgOffsetX = ceil((imgOffsetX % canvasWidth + canvasWidth) % canvasWidth),
          transfImgOffsetY = ceil((imgOffsetY % canvasHeight + canvasHeight) % canvasHeight),
          [offsetX, offsetY] = offset,
          transfOffsetX = ceil((offsetX % canvasWidth + canvasWidth) % canvasWidth),
          transfOffsetY = ceil(offsetY),
          imgOffsetHeight = imgHeight + absLineHeight - mergedFontSize

    /**
     * 先于居中绘制图片
     * 然后根据偏移量进行偏移
     * 然后计算根据canvas的宽高计算偏移量
     */
    ctx.translate(0, imgOffsetHeight)
    ctx.save()
    ctx.globalAlpha = alpha
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
   * @param {CanvasRenderingContext2D} ctx 画布上下文
   */
  async getCanvasSize(ctx: CanvasRenderingContext2D) {
    const { textblockWidth, textblockHeight, absLineHeight } = await this.getContentTextSize(ctx),
          { imgWidth = 0, imgHeight = 0 } = this.image?.src ? await this.getImgSize() : {},
          blockWidth = this.blockWidth = max(textblockWidth, imgWidth),
          blockHeight = this.blockHeight = textblockHeight + imgHeight

    return {
      blockWidth,
      blockHeight,
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

  /**
   * 获取图片的宽高
   * @return {Promise<{ imgWidth: Number, imgHeight: Number }>} 图片的宽高
   */
  async getImgSize() {
    const { image } = this,
          img = new Image(),
          waitOnLoad = new Promise((resolve, reject) => {
            img.addEventListener('load', resolve)
            img.addEventListener('error', event => {
              reject(event)
              console.error('图片加载失败！')
            })
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

  /**
   * 获取文本的宽高及行高的绝对值
   * @param {CanvasRenderingContext2D} ctx 画布上下文
   * @return {Promise<{ textblockWidth: Number, textblockHeight: Number, absLineHeight: Number }>} 文本的宽高及行高的绝对值
   */
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
      var unWatch

      /**
       * 获取元素高度
       * @param {ResizeObserverEntry[]} record
       */
      function getElHeight(record) {
        resolve(record[0].contentRect.height)
        unWatch()
        pEl.remove()
      }

      if (watchBox) unWatch = watchBox(pEl, getElHeight)
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

  /**
   * 绘制水印
   * @return {undefined}
   */
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

      if (image?.src)
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

  /**
   * 获取水印的dataURL
   * @return {Promise<String>|String} 水印的dataURL
   */
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

  /**
   * 设置水印的dataURL
   * @param {String} newDataURL 水印的dataURL
   */
  async setDataUrl(newDataURL) {
    if (!this.#dataURL && this.#waitDataURL) {
      this.#waitDataURL.resolve(newDataURL)
      this.#waitDataURL = null
    }

    this.#dataURL = newDataURL
  }

  /**
   * 防止篡改水印
   * @param {HTMLElement} rootEl 根元素
   * @param {Object} closure 闭包
   * @return {Promise<Function>} 返回注销监听器的函数
   */
  tamperProofing(rootEl: HTMLElement, closure: { container: HTMLDivElement; originContainer: HTMLDivElement }) {
    var { container, originContainer } = closure,
        timer1: ReturnType<typeof setTimeout>,
        timer2: ReturnType<typeof setTimeout>,
        unWatchContainer: () => void

    /**
     * 重新挂载水印元素
     */
    function reMount() {
      if (container) {
        container.remove()
        container = closure.container = originContainer.cloneNode(true) as HTMLDivElement
        rootEl.insertAdjacentElement('afterbegin', container)
        unWatchContainer(), watchContainer(container)
      }
    }

    /**
     * 监听水印元素的变化
     * @param {HTMLElement} container 水印容器元素
     */
    function watchContainer(container) {
      const positionStatus = {
        top: getComputedStyle(container).top,
        left: getComputedStyle(container).left
      }

      unWatchContainer = watch(
        container,
        record => {
          if (container) {
            let legal = false
            const { offsetHeight: height, offsetWidth: width } = rootEl,
                  { hPadding, vPadding } = getElPadding(rootEl)

            record.forEach(({ target, oldValue, type, attributeName }) => {
              record
              if (type === 'attributes' && attributeName === 'style') {
                const diff = diffCSSStyle(oldValue, target.style.cssText)

                /** */
                ;(function findLegal() {
                  if (Object.keys(diff).length === 0) {
                    const { top, left } = getComputedStyle(target),
                          { top: oldTop, left: oldLeft } = positionStatus

                    if (oldTop !== top) {
                      setStyle(container, '--root-padding-horizontal', `${hPadding}px`)
                      positionStatus.top = top
                    }

                    if (oldLeft !== left) {
                      setStyle(container, '--root-padding-vertical', `${vPadding}px`)
                      positionStatus.left = left
                    }

                    return
                  }

                  for (const name in diff) {
                    const value = diff[name]

                    switch (name) {
                      case '--container-height':
                        if (value === `${height}px !important`) legal = true
                        break
                      case '--container-width':
                        if (value === `${width}px !important`) legal = true
                        break
                      case '--root-padding-horizontal':
                        if (value === `${hPadding}px !important`) legal = true
                        break
                      case '--root-padding-vertical':
                        if (value === `${vPadding}px !important`) legal = true
                        break
                      default:
                        return
                    }
                  }
                })()
              }
            })

            if (!legal) {
              // 节流
              clearTimeout(timer2)
              // 监视container的属性是否发生变化
              timer2 = setTimeout(() => reMount(), 35)
            }
          }
        },
        { subtree: true, childList: true, attributes: true, attributeOldValue: true }
      )
    }

    const unWatchRootEL = watch(
      rootEl,
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
   * @param {HTMLElement} rootEl 根元素
   * @param {Object} closure 闭包
   * @return {Function} 返回注销监听器的函数
   */
  resize(rootEl, closure) {
    var isImmideate = true,
        timer: ReturnType<typeof setTimeout>
    const unWatchResize = watchBox(rootEl, records => {
      // 节流
      if (!isImmideate) {
        clearTimeout(timer)
        timer = setTimeout(() => {
          const { container, originContainer } = closure,
                { inlineSize: width, blockSize: height } = records[0].borderBoxSize[0]

          if (width && height) {
            setStyle(container, '--container-height', `${height}px`)
            setStyle(container, '--container-width', `${width}px`)
            setStyle(originContainer, '--container-height', `${height}px`)
            setStyle(originContainer, '--container-height', `${width}px`)
          }
        }, 35)
      }

      isImmideate = false
    })

    return unWatchResize
  }

  /**
   * 挂载水印元素
   * @param {HTMLElement} rootEl 根元素
   * @return {Promise<Function>} 返回注销水印挂载的函数
   */
  async mount(rootEl: HTMLElement) {
    const closure: { container: HTMLDivElement; originContainer: HTMLDivElement } = await this.createContianer(rootEl)

    this.setRootELMode(rootEl)
    const unWatch = this.tamperProofing(rootEl, closure),
          unWatchResize = this.resize(rootEl, closure)

    return this.destroy.bind(null, unWatch, unWatchResize, closure)
  }

  /**
   * 设置根元素的定位模式
   * @param {HTMLElement} rootEl 根元素
   */
  setRootELMode(rootEl) {
    if (rootEl) {
      const { position } = getComputedStyle(rootEl)

      if (position === 'static') rootEl.style.setProperty('position', 'relative', 'important')
    }

    watch(
      rootEl,
      records => {
        records.forEach(({ target, attributeName }) => {
          if (attributeName === 'style') {
            const { position } = getComputedStyle(target)

            if (position === 'static') target.style.setProperty('position', 'relative', 'important')
          }
        })
      },
      { attributes: true, attributeFilter: ['style'] }
    )
  }

  /**
   * 创建水印元素
   * @param {HTMLElement} rootEl 根元素
   */
  async createContianer(rootEl) {
    // 先等待图形数据，图形数据绘制完全后再计算父元素样式，利用 Canvas 的绘制来等待导航的结束
    const dataURL = await this.getDataUrl(),
          { rotate, cosA, sinA, zIndex } = this,
          container = document.createElement('div'),
          watermark = document.createElement('div'),
          beforeElHeight = getBeforeElementHeight(rootEl),
          commonStyle = {
            'clip-path': 'none',
            display: 'block',
            filter: 'none',
            margin: 0,
            mark: 'none',
            visibility: 'visible',
            'z-index': zIndex
          },
          { hPadding, vPadding } = getElPadding(rootEl),
          containerStyle = {
            ...commonStyle,
            '--container-height': `${rootEl.offsetHeight}px`,
            '--container-width': `${rootEl.offsetWidth}px`,
            '--cosA': cosA,
            '--root-padding-horizontal': `${hPadding}px`,
            '--root-padding-vertical': `${vPadding}px`,
            '--sinA': sinA,
            height: 'calc(var(--container-height) - var(--root-padding-horizontal))',
            opacity: 1,
            overflow: 'hidden',
            'pointer-events': 'none',
            position: 'absolute',
            transform: `${beforeElHeight ? `translateY(-${beforeElHeight})` : ''}`,
            width: 'calc(var(--container-width) - var(--root-padding-vertical))'
          },
          watermarkStyle = {
            ...commonStyle,
            get background() {
              return `${this['background-origin']} ${this['background-clip']} ${this['background-color']} ${this['background-image']}
               ${this['background-repeat']} ${this['background-attachment']} ${this['background-position']} / ${this['background-size']}`
            },
            'background-attachment': 'fixed',
            'background-blend-mode': 'luminosity',
            'background-clip': 'border-box',
            'background-color': 'transparent',
            'background-image': `url(${dataURL})`,
            'background-origin': 'border-box',
            'background-position': 'center',
            'background-repeat': 'repeat',
            'background-size': 'auto',
            display: 'inline-block',
            height: 'calc(var(--container-height) * var(--cosA) + var(--container-width) * var(--sinA))',
            left: '50%',
            opacity: 0.5,
            position: 'relative',
            top: '50%',
            transform: `translate(-50%,-50%) rotate(${rotate}deg)`,
            'transform-origin': 'center center',
            width: 'calc(var(--container-height) * var(--sinA) + var(--container-width) * var(--cosA))'
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
