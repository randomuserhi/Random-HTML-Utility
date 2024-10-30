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

Note that the parser will error out if given elements with the same binding:

```typescript
const template = html`
    <h m-id="text">Some Title</h>
    <p m-id="text">Lorem Ipsum</p>
    `;

const [bindings, fragment] = template.dom(); // Error! Cannot have two 
                                             // elements with the same 
                                             // binding 'text'.

console.log(bindings.title);
console.log(bindings.text);
```
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

If you need to encapsulate templates to prevent bindings of the same name with nested HTML, then you can give a binding to the entire HTML fragment:

```typescript
const nested = html`
    <p m-id="text">Paragraph</p>
    `.bind("nested");

const template = html`
    <h m-id="text">Title</h>
    ${nested}
    `;

const [bindings, fragment] = template.dom();

console.log(bindings.text);
console.log(bindings.nested.text);
```

This brings up another behaviour which is how factories retain all their options, *including bindings*. For example, if you are reusing a factory:

```typescript
const nested = html`
    <p m-id="text">Paragraph</p>
    `;

const template = html`
    <h m-id="title">Title</h>
    ${nested.bind("p1")}
    ${nested.bind("p2")}
    `;

const [bindings, fragment] = template.dom(); // Error! Cannot have two 
                                             // elements with the same 
                                             // binding 'p2'.

console.log(bindings.title);
console.log(bindings.p1);
console.log(bindings.p2);
```

What is happening here is that `nested` represents one instance of the factory which can only have 1 binding. This means that when assigning to `template`, `nested` is given the bind `p1` followed by `p2`. Not 2 different bindings. 

Thus by the end `nested` has the binding `p2` such that once `template.dom()` executes, it tries to instantiate `nested` twice with the same binding of `p2`.

The actual way to do this would be to clone the factory using `.copy()` before binding such that the binds occur on a different instance:
```typescript
const nested = html`
    <p m-id="text">Paragraph</p>
    `.bind("nested"); // The original factory can technically 
                      // have whatever default options, including 
                      // no bind.

const template = html`
    <h m-id="title">Title</h>
    ${nested.copy().bind("p1")}
    ${nested.copy().bind("p2")}
    `; // Our copies can then overwrite said options 
       // from the base factory.

const [bindings, fragment] = template.dom(); // No Error!

console.log(bindings.title);
console.log(bindings.p1);
console.log(bindings.p2);
```
## List Initialisation

`html` also supports initialising elements from a list:

```typescript
const template = html`
    <div>
        ${[1, 2, 3]}
    </div>
    `;

const [bindings, fragment] = template.dom();
```

```html
<div>123</div>
```

This allows you to also map elements into nested `html`:

```typescript
const template = html`
    <div>
        ${[1, 2, 3].map((i) => html`<div m-id="item_${i}">${i}</div>`)}
    </div>
    `;

const [bindings, fragment] = template.dom();

console.log(bindings.item_1);
console.log(bindings.item_2);
console.log(bindings.item_3);
```

```html
<div>
    <div>1</div>
    <div>2</div>
    <div>3</div>
</div>
```

## Callbacks

`html` factories can be created with callbacks such that once instantiated, JavaScript can be executed. These callbacks have access to the generated bindings and can be used to set custom behaviour event listeners:

```typescript
const template = html`
    <button m-id="btn"></button>
    `.then((self) => self.btn.addEventListener("click", 
        () => console.log("click")
    ));

const [bindings, fragment] = template.dom();
```

As discussed before, callbacks follow the same rules as binds requiring a `.copy()` if you wish to assign different callbacks for the same factory:

```typescript
const nested = html`
    <button m-id="btn"></button>
    `.then(() => { /* ... */ }) // This callback will run for every copy

const template = html`
    <h m-id="title">Title</h>
    ${nested.copy().then(() => { /* ... */ })}
    ${nested.copy().then(() => { /* ... */ })}
    `; // The callbacks are unique to each copy

const [bindings, fragment] = template.dom();
```