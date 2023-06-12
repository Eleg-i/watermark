# watermark —— 水印

简体中文 | [English](../README.md)

## 描述

一款无框架依赖具有一定程度上放篡改能力的水印插件。

## 开始使用

安装依赖包

```bash
npm i @cailiao/watermark
```

#### 导入

```javascript
import Watermark from '@cailiao/watermark'
```

#### 使用

```javascript
const watermark = new Watermark({
        content: '水印文本'
      })
        container = document.querySelector('#container') // 需要加上水印的目标元素
      
const destroy = await watermark.mount(container)
```



## 说明

#### `Watermark` `Class`

##### 参数

- `options`： `Object` 类型，可选，`options` 的属性如下：

  - **`content`**： `String`|`Array`类型， 可选

      水印的文本，支持换行符，支持数组，数组成员视为一行。

  - **`font`** ：`Object`类型，可选，字体，font的属性如下：

      - **`color`**：`String类型`，可选，字体颜色，要求是符合 web css 规范的颜色字符串，默认值为`hsla(0, 0%, 50%, 0.5)`。

      - **`fontFamily`**：`String`类型，可选，要求是符合 web css 规范的字体字符串，且要求字体本地可用，默认值为`sans-serif`。

      - **`fontSize`**：`Number`类型，可选，单位为像素，默认为`16`。

      - **`fontStyle`**：`Enum<String>`类型，可选，字体风格，可选值为符合 web css 规范的 font-style 字符串。 默认值为`normal`。

      - **`fontWeight`**：`Enum<String>|Number`类型，可选，字体粗细，可选值为符合 web css 规范的 font-style 字符串或者数值，默认值为`normal`。

  - **`gap`**：`Number`类型，可选，水印之间的列间距，单位为像素，默认为`100`.

  - **`image`**： `String`类型，可选，图片URL，支持DataURL。

  - **`lineHeight`**： `String|Number`类型，可选，文本行高，要求是符合 web css 规范的 line-height 字符串或数值，默认值为1.5.

  - **`offset`** `Arrary<Number>`类型，可选，水印相邻行的偏移量，单位为像素。第一成员为X轴偏移量，第二成员为Y轴偏移量，缺省表示0，默认为`[100, 100]`。

  - **`rotate`** `Number`类型，可选，旋转角度，单位为角度，默认为`-37`或`323`。

  - **`zIndex`** `Number`类型，可选，定位叠层值，可选值为符合 web css 规范的 z-index 数值。默认为`Number.MAX_SAFE_INTEGER`.


##### 实例化返回值[`watermark`](#watermark) 类型



#### watermark

##### 实例方法：

**`mount`**

挂载水印到指定的元素上，同一个实例支持多次调用挂载，挂载的水印各自独立。

- **参数**：

  第一参数接受一个`DOM` `Element` 对象，水印将挂载在此元素的上。要求传入的元素具有定位属性，否则会强制设置相对定位，请务对类型预先必做好必要的封装。

- **返回值**：

  返回一个 `Promise<Function>`类型，Promise处理的函数 destroy 用于取消当前挂载。



#### 其它

##### destroy `Function`

用于注销与之关联的水印的挂载。无参数，无返回值，直接调用即可。

