/**
 * 设置样式
 * @param {HTMLElement} target 目标元素
 * @param {String} name 样式名
 * @param {String} value 样式值
 */
export function setStyle(target, name, value) {
  if (target) target.style.setProperty(name, value.toString(), 'important')
}

/**
 * 获取伪元素布局占用高度，若不占用空间则返回0
 * @param {HTMLElement} el 根元素
 * @return {Number} 返回伪元素高度
 */
export function getBeforeElementHeight(el) {
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
export function diffCSSStyle(oldStyle, newStyle) {
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

  cssText
    .split(';')
    .filter((item, index, self) => {
      if (item.endsWith('"data:image/png')) {
        self[index + 1] = `${item};${self[index + 1]}}`

        return false
      }

      return true
    })
    .forEach(item => {
      const [name, value] = item.split(':')

      if (name) result[name.trim()] = value.trim()
    })

  return result
}

/**
 * 获取元素的padding水平方向和垂直方向的总和
 * @param {HTMLElement} el 目标元素
 * @return {Object} 返回一个对象包含水平方向和垂直方向的总和
 */
export function getElPadding(el) {
  // 将el的计算样式中的padding左右值和上下值分别相加，得到padding水平方向和垂直方向的总和，然后返回一个对象包含这两个值
  const { paddingTop, paddingRight, paddingBottom, paddingLeft } = getComputedStyle(el)
  var hPadding = parseFloat(paddingLeft.replace('px', '')) + parseFloat(paddingRight.replace('px', '')),
      vPadding = parseFloat(paddingTop.replace('px', '')) + parseFloat(paddingBottom.replace('px', ''))

  if (Number.isNaN(hPadding)) {
    hPadding = 0
  }

  if (Number.isNaN(vPadding)) {
    vPadding = 0
  }

  return { hPadding, vPadding }
}
