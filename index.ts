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

  /**
   * 销毁水印
   * @param {Function} unWatch 取消 Mutation 监听
   * @param {Function} unWatchResize 取消 Resize 监听
   * @param {HTMLDivCollection} container 水印容器
   */
  destroy(unWatch: () => void, unWatchResize: () => void, container: HTMLDivElement) {
    unWatch()
    unWatchResize()
    container.remove()
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
   * 填充文本至画布
   * @param {CanvasRenderingContext2D} ctx 画布上下文
   * @param {Number} absLineHeight 文本行高的绝对值
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
   * @param {CanvasRenderingContext2D} ctx 画布上下文
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

  /**
   * 获取图片的宽高
   * @return {Promise<{ imgWidth: Number, imgHeight: Number }>}} 图片的宽高
   */
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
   * @return {Function} 返回注销监听器的函数
   */
  tamperProofing(rootEl: HTMLElement, closure: { container: HTMLDivElement; originContainer: HTMLDivElement }) {
    var { container, originContainer } = closure,
        timer1: number,
        timer2: number,
        unWatchContainer: () => void

    /**
     * 重新挂载水印元素
     */
    function reMount() {
      container.remove()
      container = closure.container = originContainer.cloneNode(true) as HTMLDivElement
      rootEl.insertAdjacentElement('afterbegin', container)
      unWatchContainer(), watchContainer(container)
    }

    /**
     * 监听水印元素的变化
     * @param {HTMLElement} el 水印元素
     */
    function watchContainer(el) {
      unWatchContainer = el.$watch(
        record => {
          var legal = false
          const { offsetHeight: height, offsetWidth: width } = rootEl

          record.forEach(({ target, oldValue, type, attributeName }) => {
            if (type === 'attributes' && attributeName === 'style') {
              const diff = diffCSSStyle(oldValue, target.style.cssText)

              /** */
              ;(function findLegal() {
                for (const name in diff) {
                  const value = diff[name]

                  switch (name) {
                    case '--container-height':
                      if (value === `${height}px !important`) legal = true
                      break
                    case '--container-width':
                      if (value === `${width}px !important`) legal = true
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
   * @param {HTMLElement} rootEl 根元素
   * @param {Object} closure 闭包
   * @return {Function} 返回注销监听器的函数
   */
  resize(rootEl, closure) {
    var isImmideate = true,
        timer: number
    const unWatchResize = rootEl.$watchBox(records => {
      // 节流
      if (!isImmideate) {
        clearTimeout(timer)
        timer = setTimeout(() => {
          const { container, originContainer } = closure,
                { width, height } = records[0].contentRect

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
   * @return {Function} 返回注销水印挂载的函数
   */
  async mount(rootEl: HTMLElement) {
    const closure: { container: HTMLDivElement; originContainer: HTMLDivElement } = await this.createContianer(rootEl),
          unWatch = this.tamperProofing(rootEl, closure),
          unWatchResize = this.resize(rootEl, closure)

    return this.destroy.bind(null, unWatch, unWatchResize, closure)
  }

  /**
   * 创建水印元素
   * @param {HTMLElement} rootEl 根元素
   */
  async createContianer(rootEl) {
    const { rotate, cosA, sinA, zIndex } = this,
          container = document.createElement('div'),
          watermark = document.createElement('div'),
          beforeElHeight = getBeforeElementHeight(rootEl),
          commonStyle = {
            'clip-path': 'none',
            display: 'block',
            margin: 0,
            visibility: 'visible',
            'z-index': zIndex
          },
          containerStyle = {
            ...commonStyle,
            '--container-height': `${rootEl.offsetHeight}px`,
            '--container-width': `${rootEl.offsetWidth}px`,
            '--cosA': cosA,
            '--sinA': sinA,
            height: 'var(--container-height)',
            opacity: 1,
            overflow: 'hidden',
            'pointer-events': 'none',
            position: 'absolute',
            transform: `${beforeElHeight ? `translateY(-${beforeElHeight})` : ''}`,
            width: 'var(--container-width)'
          },
          watermarkStyle = {
            ...commonStyle,
            'background-image': `url(${await this.getDataUrl()})`,
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

/**
 * 设置样式
 * @param {HTMLElement} target 目标元素
 * @param {String} name 样式名
 * @param {String} value 样式值
 */
function setStyle(target, name, value) {
  target.style.setProperty(name, value.toString(), 'important')
}

/**
 * 获取伪元素布局占用高度，若不占用空间则返回0
 * @param {HTMLElement} el 根元素
 * @return {Number} 返回伪元素高度
 */
function getBeforeElementHeight(el) {
  const { height, float, position } = getComputedStyle(el, ':before'),
        isFloat = float !== 'none' || position === 'absolute'

  return isFloat ? 0 : height
}

/**
 * 比较两个css文本的差异
 * @param {String} oldStyle 旧样式
 * @param {String} newStyle 新样式
 * @return {Object} 返回差异对象
 */
function diffCSSStyle(oldStyle, newStyle) {
  const result = {},
        oldStyleObj = parseCSSText(oldStyle),
        newStyleObj = parseCSSText(newStyle)

  for (const name in newStyleObj) if (oldStyleObj[name] !== newStyleObj[name]) result[name] = newStyleObj[name]

  for (const name in oldStyle)
    if (!result.hasOwnProperty(name) && oldStyleObj[name] !== newStyleObj[name]) result[name] = newStyleObj[name]

  return result
}

/**
 * 解析css文本
 * @param {String} cssText css文本
 * @return {Object} 返回css对象
 */
function parseCSSText(cssText) {
  const result = {}

  cssText.split(';').forEach(item => {
    const [name, value] = item.split(':')

    if (name) result[name.trim()] = value.trim()
  })

  return result
}
