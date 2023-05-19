/**
 * Base size of the canvas, 1 for parallel layout and 2 for alternate layout
 * Only alternate layout is currently supported
 */
const baseSize = 1,
      fontGap = 3

// export default interface Watermark {
//   new(options:{
//   el: Element,
//   zIndex?: number,
//   rotate?: number,
//   width?: number,
//   height?: number,
//   image?: string,
//   content?: string | string[],
//   font?: {
//     color?: string,
//     fontSize?: number | string,
//     fontWeight?: 'normal' | 'light' | 'weight' | number,
//     fontStyle?: 'none' | 'normal' | 'italic' | 'oblique',
//     fontFamily?: string;
//   },
//   className?: string,
//   gap?: [number, number],
//   offset?: [number, number]
//   }): object
// }

/**
 * 水印
 */
export default class Watermark {
  className: string
  color: string
  content: string
  el?: Element
  fontFamily: string
  fontSize: string
  fontStyle: string
  fontWeight: string
  image: string
  angle: number
  offset: number[]
  rotate: number
  gap: number
  zIndex: number
  canvas: Element
  dataURL: string

  /**
   * 构造器，初始化一个水印图片
   * @param {Number[]} gap 水印的间隔
   */
  constructor(
    {
      zIndex = 999,
      rotate = -37,
      image,
      content = '@cailiao/watermark',
      font = {},
      className,
      gap = 50,
      offset = [50, 50]
    }: {
      zIndex: number
      rotate?: number
      image?: string
      content?: string | string[]
      font?: {
        color?: string
        fontSize?: number | string
        fontWeight?: 'normal' | 'light' | 'weight' | number
        fontStyle?: 'none' | 'normal' | 'italic' | 'oblique'
        fontFamily?: string
      }
      className?: string
      gap?: number
      offset?: [number, number]
    } = {
      content: '@cailiao/watermark',
      font: {},
      gap: 50,
      offset: [50, 50],
      rotate: -37,
      zIndex: 999
    }
  ) {
    const {
      color = 'rgba(0,0,0,.15)',
      fontSize = 16,
      fontWeight = 'normal',
      fontStyle = 'normal',
      fontFamily = 'sans-serif'
    } = font

    Object.assign(this, {
      className,
      color,
      content,
      fontFamily,
      fontSize,
      fontStyle,
      fontWeight,
      gap,
      image,
      offset,
      rotate,
      zIndex
    })

    this.renderWatermark()
  }

  /** */
  appendWatermark(base64Url: string, markWidth: number, containerRef, watermarkRef) {
    if (containerRef.current && watermarkRef.current) {
      // stopObservation.current = true
      // watermarkRef.current.setAttribute(
      //   'style',
      //   getStyleStr({
      //     ...getMarkStyle(),
      //     backgroundImage: `url('${base64Url}')`,
      //     backgroundSize: `${(gapX + markWidth) * baseSize}px`
      //   })
      // )
      containerRef.current?.append(watermarkRef.current)
      // Delayed execution
      setTimeout(() => {
        //   stopObservation.current = false
      })
    }
  }

  /** */
  destroy(id?: string) {
    const { el, mounted } = this

    if (id) {
      // watermarkRef.current.remove()
      // watermarkRef.current = undefined
    }
  }

  /** */
  drawText({
    canvas,
    ctx,
    canvasWidth,
    canvasHeight,
    rotatedBlockWidth,
    rotatedBlockHeight,
    blockWidth,
    blockHeight
  }: {
    canvas: HTMLCanvasElement
    ctx: CanvasRenderingContext2D
    canvasWidth: number
    canvasHeight: number
    rotatedBlockWidth: number
    rotatedBlockHeight: number
    blockWidth: number
    blockHeight: number
  }) {
    const { offset, gap } = this,
          [offsetWidth, offsetHeight] = offset

    // rotateWatermark(ctx, rotatedBlockWidth / 2, rotatedBlockHeight / 2, rotate)
    this.fillTexts(ctx, 0, 0)
    ctx.restore()
    ctx.translate(offsetWidth, offsetHeight)
    ctx.save()
    // rotateWatermark(ctx, rotatedBlockWidth / 2, rotatedBlockHeight / 2, rotate)
    this.fillTexts(ctx, 0, 0)
    ctx.restore()
    ctx.translate(-(gap + blockWidth), 0)
    this.fillTexts(ctx, 0, 0)
    const clipLeft = ctx.getImageData(0, 0, canvasWidth / 4, canvasHeight),
          clipRight = ctx.getImageData(canvasWidth / 4, 0, canvasWidth * 3 / 4, canvasHeight)

    ctx.putImageData(clipRight, 0, 0)
    ctx.putImageData(clipLeft, canvasWidth * 3 / 4, 0)

    const clipTop = ctx.getImageData(0, 0, canvasWidth, canvasHeight / 4),
          clipBottom = ctx.getImageData(0, canvasHeight / 4, canvasWidth, canvasHeight * 3 / 4)

    ctx.putImageData(clipBottom, 0, 0)
    ctx.putImageData(clipTop, 0, canvasHeight * 3 / 4)

    /** Fill the interleaved text after rotation */
    // rotateWatermark(ctx, alternateRotateX, alternateRotateY, this.rotate)
    // this.fillTexts(ctx, alternateDrawX, alternateDrawY, drawWidth, drawHeight)
    console.log(canvas.toDataURL())
    this.dataURL = canvas.toDataURL()
    // this.appendWatermark(canvas.toDataURL(), markWidth)
  }

  /**
   * 绘制文本
   */
  fillTexts(ctx: CanvasRenderingContext2D, drawX: number, drawY: number) {
    const ratio = devicePixelRatio,
          mergedFontSize = Number(this.fontSize) * ratio,
          { content, fontFamily } = this

    ctx.font = `${this.fontStyle} normal ${this.fontWeight} ${mergedFontSize}px ${fontFamily}`
    ctx.fillStyle = this.color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    const contents = Array.isArray(content) ? content : [content]

    contents?.forEach((text, index) => {
      ctx.translate(ctx.measureText(text).width / 2, 0)

      ctx.fillText(text, drawX, drawY + index * (mergedFontSize + fontGap * ratio))
    })
  }

  /**
   * 计算水印宽度
   */
  getMarkSize(ctx: CanvasRenderingContext2D) {
    const { fontSize, content, image, fontFamily, rotate } = this,
          angle = -rotate / 180 * Math.PI
    var width = 0,
        height = 0,
        rotatedBlockWidth,
        rotatedBlockHeight

    this.angle = angle
    if (!image && ctx.measureText) {
      ctx.font = `${Number(fontSize)}px ${fontFamily}`
      const contents = Array.isArray(content) ? content : [content],
            widths = contents.map(text => ctx.measureText(text).width)

      width = Math.ceil(Math.max(...widths))
      height = Number(fontSize) * contents.length + (contents.length - 1) * fontGap
      rotatedBlockWidth = Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)) * height
      rotatedBlockHeight = Math.abs(Math.sin(angle)) * width + Math.abs(Math.cos(angle)) * height
    }

    return { blockWidth: width, blockHeight: height, rotatedBlockWidth, rotatedBlockHeight } as const
  }

  /** */
  getMarkStyle() {
    const { offsetLeft, zIndex, gapXCenter, offsetTop, gapYCenter } = this,
          markStyle = {
            backgroundRepeat: 'repeat',
            height: '100%',
            left: '0',
            pointerEvents: 'none',
            position: 'absolute',
            top: '0',
            width: '100%',
            zIndex
          }

    /** Calculate the style of the offset */
    let positionLeft = offsetLeft - gapXCenter,
        positionTop = offsetTop - gapYCenter

    if (positionLeft > 0) {
      markStyle.left = `${positionLeft}px`
      markStyle.width = `calc(100% - ${positionLeft}px)`
      positionLeft = 0
    }

    if (positionTop > 0) {
      markStyle.top = `${positionTop}px`
      markStyle.height = `calc(100% - ${positionTop}px)`
      positionTop = 0
    }

    markStyle.backgroundPosition = `${positionLeft}px ${positionTop}px`

    return markStyle
  }

  /** */
  renderWatermark() {
    const canvas = document.createElement('canvas'),
          ctx = canvas.getContext('2d'),
          { offset, rotate, image, gap } = this,
          [offsetWidth, offsetHeight] = offset

    this.canvas = canvas
    if (ctx) {
      // if (!watermarkRef.current) {
      //   watermarkRef.current = document.createElement('div')
      // }

      const ratio = devicePixelRatio,
            { blockWidth, blockHeight, rotatedBlockWidth, rotatedBlockHeight } = this.getMarkSize(ctx),
            canvasWidth = (blockWidth + gap) * ratio,
            canvasHeight = 2 * offsetHeight * ratio

      canvas.setAttribute('width', `${canvasWidth * baseSize}px`)
      canvas.setAttribute('height', `${canvasHeight * baseSize}px`)

      const drawX = 0,
            drawY = 0,
            drawWidth = 0 * ratio,
            drawHeight = 0 * ratio,
            rotateX = (drawWidth + 0 * ratio) / 2,
            rotateY = (drawHeight + 0 * ratio) / 2,
        /** Alternate drawing parameters */
            alternateDrawX = drawX + canvasWidth,
            alternateDrawY = drawY + canvasHeight,
            alternateRotateX = rotateX + canvasWidth,
            alternateRotateY = rotateY + canvasHeight

      ctx.save()

      if (image) {
        const img = new Image()

        img.onload = () => {
          ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
          /** Draw interleaved pictures after rotation */
          ctx.restore()
          rotateWatermark(ctx, alternateRotateX, alternateRotateY, rotate)
          ctx.drawImage(img, alternateDrawX, alternateDrawY, drawWidth, drawHeight)
          console.log(canvas.toDataURL())
          // this.appendWatermark(canvas.toDataURL(), markWidth)
        }

        img.onerror = () =>
          this.drawText(
            canvas,
            ctx,
            drawX,
            drawY,
            drawWidth,
            drawHeight,
            alternateRotateX,
            alternateRotateY,
            alternateDrawX,
            alternateDrawY
            // markWidth
          )
        img.crossOrigin = 'anonymous'
        img.referrerPolicy = 'no-referrer'
        img.src = image
      } else {
        this.drawText({
          canvas,
          ctx,
          rotatedBlockWidth,
          rotatedBlockHeight,
          canvasWidth,
          canvasHeight,
          blockWidth,
          blockHeight
        })
      }
    }
  }

  /** */
  onMutate(mutations: MutationRecord[]) {}

  /**挂载水印元素 */
  mount(el) {
    const { dataURL, rotate, angle } = this,
          container = document.createElement('div'),
          watermark = document.createElement('div'),
          containerStyle = {
            overflow: 'hidden',
            position: 'absolute',
            zIndex: 999,
            top: 0,
            width: '100%',
            height: `${el.offsetHeight}px`,
            pointerEvents: 'none'
          },
          watermarkStyle = {
            backgroundImage: `url(${dataURL})`,
            height: `${el.offsetHeight * Math.cos(angle) + el.offsetWidth * Math.sin(angle)}px`,
            left: '50%',
            opacity: 0.5,
            position: 'relative',
            top: '50%',
            transform: `translate(-50%,-50%) rotate(${rotate}deg)`,
            transformOrigin: 'center center',
            width: `${el.offsetHeight * Math.sin(angle) + el.offsetWidth * Math.cos(angle)}px`
          }

    for (const name in containerStyle) {
      setStyle(container, name, containerStyle[name])
    }

    for (const name in watermarkStyle) {
      setStyle(watermark, name, watermarkStyle[name])
    }

    container.appendChild(watermark)
    el.appendChild(container.cloneNode(true))
  }
}

/** */
function rotateWatermark(ctx: CanvasRenderingContext2D, rotateX: number, rotateY: number, rotate: number) {
  ctx.translate(rotateX, rotateY)
  ctx.rotate(Math.PI / 180 * Number(rotate))
  ctx.translate(-rotateX, -rotateY)
}

function setStyle(target, name, value) {
  target.style[name] = value
}
