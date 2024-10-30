## General Usage

1) Download [mRHU](https://github.com/randomuserhi/Random-HTML-Utility/tree/main/mRHU) and run `npm install && npm run build` in its directory. This will generate a `build` folder.
2) Inside the `build` folder you will find 2 folders:
    - `@types` - These are the type files for [[02 Getting Started#Typescript|Typescript]].
    - `rhu` - This is the JavaScript code that you import into your project.

To import mRHU into a webpage, simply create an [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) for the `rhu` folder above. (Feel free to move it anywhere in your project).
```html
<script type="importmap">
{
    "imports": {
        "rhu": "./path/to/rhu/rhu.js",
        "rhu/": "./path/to/rhu/"
    }
}
</script>
```

You can then use mRHU:
```html
<script type="module">

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

</script>
```
## Typescript

To setup [TypeScript](https://www.typescriptlang.org/) with mRHU, simply add the `@types` path from building mRHU to your [`tsconfig`](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html):
```json
{ 
    "compilerOptions": {
        ...
        "paths": {
            "*": ["./path/to/@types/*"],
            ...
        }
    }
    ...
}
```