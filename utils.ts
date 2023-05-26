/**
 * 设置样式
 * @param {HTMLElement} target 目标元素
 * @param {String} name 样式名
 * @param {String} value 样式值
 */
export function setStyle(target, name, value) {
  target.style.setProperty(name, value.toString(), 'important')
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

  cssText.split(';').forEach(item => {
    const [name, value] = item.split(':')

    if (name) result[name.trim()] = value.trim()
  })

  return result
}
