> *It is recommended to use mRHU with the [es6-string-html](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html) extension as it provides syntax highlighting for HTML written in JavaScript strings.*

## Basics

mRHU allows you to write inline HTML and easily access its elements via bindings. To do this, import the `html` function from `rhu/macro.js`:

```typescript
import { html } from "rhu/macro.js";
```

`html` is used to create *factories* that can spawn elements:

```typescript
const template = html`
    <h>Some Title</h>
    <p>Lorem Ipsum</p>
    `;
```

`template` is now a *factory* that will generate the following html:

```html
<h>Some Title</h>
<p>Lorem Ipsum</p>
```

As a *factory*, the HTML does not exist until we instantiate it which can be done using `.dom()`:

```TypeScript
const [bindings, fragment] = template.dom();
```

- `fragment` is a [DocumentFragment](https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment) containing the parsed HTML.
- `bindings` is an object containing references to any elements that you wish have access to.

We currently have no `bindings` as we did not specify any elements we wish to access. This can be done by adding the `m-id` attribute and providing a property name:

```typescript
const template = html`
    <h m-id="title">Some Title</h>
    <p m-id="text">Lorem Ipsum</p>
    `;

const [bindings, fragment] = template.dom();

console.log(bindings.title);
console.log(bindings.text);
```

In the above example, we specify that we want access to the `<h></h>` element, calling it `title`, and access to the `<p></p>` element, calling it `text`. We can then access these via the returned `bindings` object.

## Nested HTML

You can nest `html` factories within each other:

```typescript
const nested = html`
    <p m-id="text">Paragraph</p>
    `;

const template = html`
    <h m-id="title">Title</h>
    ${nested}
    `;

const [bindings, fragment] = template.dom();

console.log(bindings.title);
console.log(bindings.text);
```


## List Initialisation


