> *It is recommended to use mRHU with the [es6-string-html](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html) extension as it provides syntax highlighting for HTML written in JavaScript strings.*

## Basics

mRHU allows you to write inline HTML and easily access its elements via bindings. To do this, import the `html` function from `rhu/html.js`:

```typescript
import { html, DOM } from "rhu/html.js";
```

You can then create html with the following:

```typescript
const HTML = html`
    <h1>Some Title</h1>
    <p>Lorem Ipsum</p>
    `;
```

This will return an special HTML object which represents the produced elements. You can access a list of these elements using:

```typescript
const elements: Node[] = HTML[DOM].elements;
```

The HTML object also has [`Symbol.Iterator`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/iterator) defined, so you can also:

```typescript
// Both of the following work
const elements: Node[] = [...HTML];
const elements: Node[] = [...HTML[DOM]];
```

Which allows you to:

```typescript
document.body.append(...HTML);
document.body.append(...HTML[DOM]);
```

> Unlike [[Macro/03 HTML|macro.js html]], this `html` actually generates elements and returns them instantly rather than creating a template and instantiating from said template.

## Accessing Elements

To access elements inside `html`, you need to assign bindings to them using `m-id`:

```typescript
const HTML = html`
    <h1 m-id="title">Some Title</h1>
    <p m-id="text">Lorem Ipsum</p>
    `;

console.log(HTML.title); // <h1>
console.log(HTML.text); // <p>
```
## Nested html

You can nest HTML objects within each other:

```typescript
const nested = html`
    <p>Lorem Ipsum</p>
    `;

const HTML = html`
    <h1>Some Title</h1>
    ${nested}
    `;
```

If you do this multiple times, the HTML object *moves* to its last position as it gets placed in each written position:

```typescript
const nested = html`
    <p>Lorem Ipsum</p>
    `;

const HTML = html`
    ${nested}
    <h1>Some Title</h1>
    ${nested}
    `;
```

```html
<h1>Some Title</h1>
<p>Lorem Ipsum</p>
```

Bindings from nested HTML propagate into the parent, unless they are marked as `boxed`:

```typescript
const nested = html`
    <p m-id="text1">Lorem Ipsum</p>
    `;

const nestedBoxed = html`
    <p m-id="text2">Lorem Ipsum</p>
    `;
html.box(nestedBoxed);

const HTML = html`
    <h1>Some Title</h1>
    ${nested}
    ${nestedBoxed}
    `;

console.log(HTML.text1); // <p>
console.log(HTML.text2); // undefined
```

Giving a HTML object a binding will box its values into the given bind:

```typescript
const nested = html`
    <p m-id="text">Lorem Ipsum</p>
    `;

const HTML = html`
    <h1>Some Title</h1>
    ${html.bind(nested, "nested")}
    `;

console.log(HTML.nested.text); // <p>
```

## Advanced Usage

The parser supports Array Initialisation:

```typescript
const HTML = html`
    <ul>
        ${[1, 2, 3].map((i) => html`<li>Item: ${i}</li>`)}
    </ul>
    `;
```

```html
<ul>
    <li>Item: 1</li>
    <li>Item: 2</li>
    <li>Item: 3</li>
</ul>
```

As well as signals:

```typescript
const state = signal<number>(0);
const HTML = html`
    <span>State: ${state}</span>
    `;
```

```html
<span>State: 0</span>
```

And regular DOM elements:

```typescript
const element = document.createElement("div");
const HTML = html`
    ${element}
    `;
```

```html
<div></div>
```
## Creating Components

Refer to [[05 Samples]]