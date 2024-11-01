## (Module) Random HTML Utility

This is my HTML utility library that I use for developing web apps. It serves as a light weight alternative to frameworks such as [React](https://react.dev/), [Svelt](https://svelte.dev/) and the like.

Specifically, this is the [module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) version of the library to be used with ES 6 JS Modules.

It fully supports [TypeScript](https://www.typescriptlang.org/) but can also be used without in pure JS.

> *NOTE(randomuserhi): These docs will be written with the use of TypeScript, it is trivial to strip the types for use with pure JavaScript.*
## Features

**In-Code Styles**
- Define styles in scope, removing the naming-hell of CSS classes

```javascript
import { Style } from "rhu/style.js";

const style = Style(({ css }) => {
    const wrapper = css.class`
    font-family: roboto;

    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;

    background-color: #fff;

    overflow: hidden;
    `;

    css`
    ${wrapper}:hover {
        pointer: cursor;
    }
    `;

    return {
        wrapper,
    };
});

const element = document.createElement("div");
element.classList.add(`${style.wrapper}`); // Can apply styles as class names
```

**Themes**
- Define theme variables that can be easily swapped as a CSS class

```javascript
import { Theme } from "rhu/theme.js";
import { Style } from "rhu/style.js";

// Define a base theme and its default properties
export const theme = Theme(({ theme }) => {
    return {
        background: theme`#fff`
    };
});

// Define skin classes that override the theme and its base properties
export const skins = Style(({ css }) => {
    // dark theme override
    const dark = css.class`
    ${tvar(theme.background)}: #000;
    `;

    return { 
        dark
    };
});

const style = Style(({ css }) => {
    const wrapper = css.class`
    color: ${theme.defaultColor}; /* Use theme variables in styles */
    `;

    return {
        wrapper
    };
});

// Apply theme and skins to elements:

const baseTheme = document.createElement("div");
baseTheme.classList.add(`${theme}`);

const darkTheme = document.createElement("div");
darkTheme.classList.add(`${theme} ${skins.dark}`);
```

**Signals**
- Reactive variables with signals that support memoization
```js
import { signal, computed } from "rhu/signal.js"

const X = signal(0);
const Y = signal(0);
const X_Y = computed((set) => set(X() + Y()), [X, Y]);

X.on((x) => console.log(x));
Y.on((y) => console.log(y));
X_Y.on((x_y) => console.log(x_y));

X(1); // X_Y => 1, X => 1
Y(1); // X_Y => 2, Y => 1
```

**In-Code HTML**
- Create HTML fragments inline with bindings, making element creation simpler
```javascript
import { html } from "@/rhu/macro.js";

const [bindings, fragment] = html`
    <ul m-id="list">
        ${[1, 2, 3].map((value) => html`
        <li m-id="child_${value}">${value}</li>
        `)}
    </ul>
    `.dom();

console.log(bindings.list); // <ul>...</ul>
console.log(bindings.child_1); // <li>1</li>
console.log(bindings.child_2); // <li>2</li>
console.log(bindings.child_3); // <li>3</li>
```

```html
<!-- fragment -->
<ul>
    <li>1</li>
    <li>2</li>
    <li>3</li>
</ul>
```

**Custom Elements (Macros)**
- The Macro API is a layer built on top of In-Code HTML to allow creating groups of elements with custom behaviour. 
```javascript
import { html, Macro, MacroElement } from "rhu/macro.js";

// Definition of a Macro called "List"
const List = Macro(class List extends MacroElement {
    constructor(dom, bindings, children, title) {
        super(dom, bindings);
        
        this.title(title);
        this.slot.append(...children);

        this.slot.addEventListener("click", () => console.log("list clicked!"));
    }
}, html`
    <h>${html.signal("title")}</h>
    <ul m-id="slot">
    </ul>
    `);

// We can now use "List" in our In-Code HTMl for extended functionality
const [bindings, fragment] = html`
    ${List.open("Names").bind("list")}
        <li>Adam</li>
        <li>Bob</li>
        <li>Chris</li>
    ${List.close}
    `.dom();

console.log(bindings.list); // class List { .title, .slot }
console.log(bindings.list.title()); // "Names"
console.log(bindings.list.slot); // <ul>...</ul>
```

```html
<!-- fragment -->
<h>Names</h>
<ul>
    <li>Adam</li>
    <li>Bob</li>
    <li>Chris</li>
</ul>
```