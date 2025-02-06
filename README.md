# Random HTML Utility (RHU)

A typescript / pure javascript library that allows "react" code without package hell or the need for a transpiler/compiler as long as the browser supports ES6 modules.

# What does this let you do?

**Inline HTML**
```typescript
import { html } from "rhu/html.js";

const fragment = html`
    <h1>Some Title</h1>
    <p>Lorem Ipsum</p>
    `;

document.body.append(...fragment);
```

**Inline HTML - accessing elements**
```typescript
const fragment = html`
    <h1 m-id="title">Some Title</h1>
    <p m-id="text">Lorem Ipsum</p>
    `;

console.log(fragment.title); // <h1>
console.log(fragment.text); // <p>
```

**Inline HTML - nesting**
```typescript
const nested = html`
    <p>Lorem Ipsum</p>
    `;

const fragment = html`
    <h1>Some Title</h1>
    ${nested}
    `;
```

**Inline HTML - boxing references**
```typescript
const nested = html`
    <p m-id="text1">Lorem Ipsum</p>
    `;

const nestedBoxed = html`
    <p m-id="text2">Lorem Ipsum</p>
    `;
html.box(nestedBoxed);

const fragment = html`
    <h1>Some Title</h1>
    ${nested}
    ${nestedBoxed}
    `;

console.log(fragment.text1); // <p>
console.log(fragment.text2); // undefined
```

**Inline HTML - array initialization**
```typescript
const fragment = html`
    <ul>
        ${[1, 2, 3].map((i) => html`<li>Item: ${i}</li>`)}
    </ul>
    `;
```

**Signals, Computed and Effect**
```typescript
import { signal, computed, effect } from "rhu/signal.js";

const a = signal<number>(0);
const b = computed<number>((b) => {
    b(a() * 2);
}, [a]);
const onA = effect(() => {
    console.log(`A changed: ${a()}`);
}, [a]);
const fragment = html`
    <div>a: ${a}</div>
    <div>b: ${b}</div>
    `;

a(10); // "A changed: 10"
```
```html
<div>a: 10</div>
<div>b: 20</div>
```
