> *It is recommended to use mRHU with the [es6-string-html](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html) extension as it provides syntax highlighting for HTML written in JavaScript strings.*

## Basics

mRHU allows you to write inline HTML and easily access its elements via bindings. To do this, import the `html` function from `rhu/macro.js`:

```typescript
import { html } from "rhu/macro.js";
```

`html` is used to create *factories* that can spawn elements:

```typescript
const template = html`
    <h1>Some Title</h1>
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
    <h1 m-id="title">Some Title</h1>
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
    <h1 m-id="text">Some Title</h1>
    <p m-id="text">Lorem Ipsum</p>
    `;

const [bindings, fragment] = template.dom(); // Error! Cannot have two 
                                             // elements with the same 
                                             // binding 'text'.

console.log(bindings.title);
console.log(bindings.text);
```

## TypeScript Bindings

Typescript cannot infer the bindings you create in the html string, and thus you have to provide them via the generic. If it is not provided then `any` is assumed by default.

```typescript
const template = html<{ 
    title: HTMLHeadingElement;
    text: HTMLParagraphElement;
    }>/**//*html*/`
    <h1 m-id="title">Some Title</h1>
    <p m-id="text">Lorem Ipsum</p>
    `;

const [bindings, fragment] = template.dom();

type A = typeof bindings;
/*{
    title: HTMLHeadingElement;
    text: HTMLParagraphElement;
}*/
```
## Nested HTML

You can nest `html` factories within each other:

```typescript
const nested = html`
    <p m-id="text">Paragraph</p>
    `;

const template = html`
    <h1 m-id="title">Title</h1>
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
    <h1 m-id="text">Title</h1>
    ${nested}
    `;

const [bindings, fragment] = template.dom();

console.log(bindings.text);
console.log(bindings.nested.text);
```

### Nested HTML - `.box()` and `.unbox()`

HTML bindings leak into other such that nested bindings are accessible in the parent:

```typescript
const nested = html`
    <p m-id="text">Paragraph</p>
    `;

const template = html`
    <h1 m-id="title">Title</h1>
    ${nested}
    `;

const [bindings, fragment] = template.dom();

console.log(bindings.title);
console.log(bindings.text); // Has access to `text` from `nested`
```

This can be undesirable, and thus you can box them such that properties do not propagate up:

```typescript
const nested = html`
    <p m-id="text">Paragraph</p>
    `.box();

const template = html`
    <h1 m-id="title">Title</h1>
    ${nested}
    `;

const [bindings, fragment] = template.dom();

console.log(bindings.title);
console.log(bindings.text); // undefined - `text` does not exist on `bindings`
```

Once boxed, you can unbox it by calling `.unbox()`.

### Nested HTML - `.copy()`

Factories retain all their options, *including bindings and boxing*. For example, if you are reusing a factory:

```typescript
const nested = html`
    <p m-id="text">Paragraph</p>
    `;

const template = html`
    <h1 m-id="title">Title</h1>
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
    <h1 m-id="title">Title</h1>
    ${nested.copy().bind("p1")}
    ${nested.copy().bind("p2")}
    `; // Our copies can then overwrite said options 
       // from the base factory.

const [bindings, fragment] = template.dom(); // No Error!

console.log(bindings.title);
console.log(bindings.p1);
console.log(bindings.p2);
```

And from this an even better pattern would be to use a function that returns new factory instances:

```typescript
const nested = () => html`
    <p m-id="text">Paragraph</p>
    `;

const template = html`
    <h1 m-id="title">Title</h1>
    ${nested().bind("p1")}
    ${nested().bind("p2")}
    `;

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
    <h1 m-id="title">Title</h1>
    ${nested.copy().then(() => { /* ... */ })}
    ${nested.copy().then(() => { /* ... */ })}
    `; // The callbacks are unique to each copy

const [bindings, fragment] = template.dom();
```

## Advanced HTML - Allowing Children

`html` also allows you to create templates that accept children and can apply the children on callback. 

```typescript
const List = html`<ul m-id="ul"><li>default</li></ul>`.then(
    (self, children) => {
        if (children.length !== 0) self.ul.replaceChildren(...children);
    }).box();

const [bindings, fragment] = html`
    ${List.open()}
        <li>1</li>
        <li>2</li>
        <li>3</li>
    ${List.close}
    
    ${List}
    `.dom();
```

```html
<ul>
    <li>1</li>
    <li>2</li>
    <li>3</li>
</ul>

<ul>
    <li>default</li>
</ul>
```

Note how `.open()` is not an factory option like `.bind()` or `.box()` and thus does not set the factory to always create an opening tag.

It also does not create a new instance or copy, thus subsequent `.bind()` calls etc... will effect the original factory as discussed previously.

However, using the return value of `.open()` as a factory, referred to as an "*Open Factory*," requires a closing tag or it will translate to incorrect HTML:

```typescript
const List = html`<ul m-id="ul"><li>default</li></ul>`.then(
    (self, children) => {
        if (children) self.ul.append(...children);
    }).box()
    .open(); // Open Factory - Typically avoid doing this as
             //                it is non-obvious leading to 
             //                developer error.

const [bindings, fragment] = html`
    ${List} <!-- Open by default so no need .open() -->
        <li>1</li>
        <li>2</li>
        <li>3</li>
    ${List.close}
    
    ${List} 
    <!-- 
    Warning! - no closing tag!
     
    This will still parse as browsers can
    manage missing closing tags, but the generated
    layout may be incorrect.
    -->
    `.dom();
```

## Advanced HTML - Functional Macros

You can create reusable templates using the following syntax:

```typescript
import { html, Macro } from "rhu/macro.js";
import { signal, Signal, computed, effect } from "rhu/signal.js";

const Counter = () => {
    // Type definition of instance
    interface Counter { 
        readonly state: Signal<number>;
        readonly btn: HTMLButtonElement;

        debug: () => void;
    }

    // Return html factory
    return html<Counter>/**//*html*/`
        <div>
            <div>count: ${html.signal<number>("state", 0)}</div>
            <button m-id="btn">Increment</button>
        </div>
        `.box().then((self, children, dom) => {
        // On instantiation, setup stuff:

        // Get State
        const { state } = self;
    
        // Update DOM
        self.btn.addEventListener("click", () => state(state() + 1));

        // Create methods
        self.debug = () => {
            console.log(`count: ${count()}`);
        };
    });
};
```

These are referred to as *Functional Macros*, you can then use them as such:

```typescript
const [bindings, fragment] = html<{ 
    counter: html<typeof Counter>; 
}>/**//*html*/`
    ${Counter().bind("counter")}
    `;

document.body.append(fragment);
bindings.counter.debug();
```

This allows you to setup custom methods as well as manage state.

A more managed setup can be achieved with [[06 Macros]]. Despite this, functional macros have additional semantics with global state as discussed in [[11 Samples#Simple Counter (Functional Macro)]].

### Typescript - Functional Macros and public / private interfaces

To imitate public facing variables and private ones such as how you can declare them in [[06 Macros]], you need to use the following:

```typescript
const Counter = () => {
    // public interface
    interface Counter {
        readonly dom: Node[];
        debug: () => void;
    }
    // private interface
    interface _Counter { 
        readonly state: Signal<number>;
        readonly btn: HTMLButtonElement;
    }

    // Assign public interface
    return html<Counter>/**//*html*/`
        <div>
            <div>${html.signal<number>("state", 0)}</div>
            <button m-id="btn">Increment</button>
        </div>
        `.box().then((_self, children, dom) => {
        // Coerce type into (public & private) interface
        const self = _self as unknown as (_Counter & Counter);
        const { state } = self; // Get state
        (self as any).dom = dom; // forcing readonly assignments

        // Continue as normal
        self.btn.addEventListener("click", () => state(state() + 1));

        self.debug = () => {
            console.log(`state: ${state()}`);
        };
    });
};
```
