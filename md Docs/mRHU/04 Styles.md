## Basics

mRHU allows you to write inline CSS and easily create classes whilst avoiding the naming-hell of CSS class names. To do this, import the `Style` function from `rhu/style.js`:

```typescript
import { Style } from "rhu/style.js";
```

To generate a style, you can then call the `Style` function providing it with a method that generates the CSS content for that given style. 

```typescript
// Create a style sheet and store it in `style`
const style = Style(({ css }) => {
    
    // Create a css class with the following css properties
    const box = css.class`
    position: absolute;
    width: 50px;
    height: 50px;
    background-color: black;
    border-radius: 5px;
    `;

    // Add some additional rules to the generated class
    css`
    ${box}:hover {
        cursor: pointer;
    }
    `;

    // Return the class so that we can reference it later
    return {
        box
    };
});
```

The `Style` function directly translates into a CSS stylesheet, except it abstracts away class names:

```css
/* The above is equivalent to the following CSS */

.box {
    position: absolute;
    width: 50px;
    height: 50px;
    background-color: black;
    border-radius: 5px;
}

.box:hover {
    cursor: pointer;
}
```

> Note that the actual CSS class names will be randomly generated.

You can then use the generated style sheet, now stored in `style`, and access the returned class names to style elements:

```typescript
const [_, fragment] = html`<div class="${style.box}"></div>`.dom();

const div = document.createElement("div");
div.classList.add(`${style.box}`);
```

> Note that the class name is a JavaScript object, `ClassName`, and relies on the [`Symbol.toPrimitive`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toPrimitive) cast to actually return the generated name string.