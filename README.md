# watermark

[简体中文](readme/README-zh-cn.md) | English

## Description

A watermark plugin that does not depend on any frameworks and has a certain degree of tampering ability.

## Getting Started

Install dependencies

```bash
npm i @cailiao/watermark
```

#### Import

```javascript
import Watermark from '@cailiao/watermark'
```

#### Usage

```javascript
const watermark = new Watermark({
    content: 'Watermark Text'
  })
const container = document.querySelector('#container') // The target element to add the watermark
  
const destroy = await watermark.mount(container)
```



## Documentation

#### `Watermark` `Class`

##### Parameters

- `options`: `Object`, optional. The properties of `options` are as follows:

  - **`content`**: `String` | `Array`, optional.

    The text of the watermark. Supports line breaks and can be an array, with each array member treated as a separate line.

  - **`font`**: `Object`, optional. The font properties are as follows:

    - **`color`**: `String`, optional. The font color, which must be a valid CSS color string. The default value is `hsla(0, 0%, 50%, 0.5)`.

    - **`fontFamily`**: `String`, optional. The font family, which must be a valid CSS font string and available locally. The default value is `sans-serif`.

    - **`fontSize`**: `Number`, optional. The font size in pixels. The default value is `16`.

    - **`fontStyle`**: `Enum<String>`, optional. The font style, which must be a valid CSS font-style string. The default value is `normal`.

    - **`fontWeight`**: `Enum<String>|Number`, optional. The font weight, which can be a valid CSS font-weight string or a number. The default value is `normal`.

  - **`gap`**: `Number`, optional. The column gap between watermarks in pixels. The default value is `100`.

  - **`image`**: `String|Object` type, optional, image URL, supports DataURL. When it is an object type, the attributes are as follows:

       - **`alpha`**: `Number` type, optional, transparency, default is 1.

       - **`src`**: `String` type, optional, image URL, supports DataURL.

       - **`offset`**: `Arrary<Number>` type, optional, the offset of the image relative to the default position, in pixels. The first member is the X-axis offset, the second member is the Y-axis offset, and the default is [0, 0].

  - **`lineHeight`**: `String` | `Number`, optional. The line height of the text, which must be a valid CSS line-height string or number. The default value is `1.5`.

  - **`offset`**: `Array<Number>`, optional. The offset between adjacent rows of watermarks in pixels. The first member represents the X-axis offset, and the second member represents the Y-axis offset. Default value is `[100, 100]`.

  - **`rotate`**: `Number`, optional. The rotation angle in degrees. The default value is `-37` or `323`.

  - **`zIndex`**: `Number`, optional. The z-index value for positioning, which must be a valid CSS z-index number. The default value is `Number.MAX_SAFE_INTEGER`.

##### Return Value of Instantiation [`watermark`](#watermark) Type



#### watermark

##### Instance Methods

**`mount`**
Mounts the watermark on the specified element. Multiple mounts can be called on the same instance, and each mounted watermark is independent.

- **Parameters**:

  The first parameter accepts a `DOM` `Element` object where the watermark will be mounted. The element must have a positioning property. If not, relative positioning will be forcibly set. Please ensure that the type of the element is properly encapsulated beforehand.

- **Return Value**:

  Return a `Promise<Function>` type where the function `destroy` is used to cancel the current mounting.



#### Others

##### destroy `Function`

Unmounting associated watermarks. No parameters required, no returns, simply call the function.
