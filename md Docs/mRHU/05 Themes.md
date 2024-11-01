## Basics

Much like in-code styles, themes are a way to generate CSS variables without dealing with naming. To do this, import the `Theme` function from `rhu/theme.js`:

```typescript
import { Theme } from "rhu/theme.js";
```

You can then generate a theme, which is a collection of CSS variables, by calling the `Theme` function:

```typescript
export const theme = Theme(({ theme }) => {
    return {
        background: theme`#fff`
    };
});
```

This directly translates into the following CSS:

```css
.theme {
    --background: #fff;
}
```

> Note that the actual CSS class names and variables will be randomly generated.

From here, we can then use the generated CSS variables in our styles:

```typescript
const style = Style(({ css }) => {
    const wrapper = css.class`
    color: ${theme.defaultColor}; /* Use theme variables in styles */
    `;

    return {
        wrapper
    };
});
```

As the theme itself is a CSS class which contains the variable definitions, to apply it to elements we need to add both the theme and the style. Due to the cascading nature of CSS we can also apply the theme to a parent element such as the `<body>`:

```typescript
const themedElement = document.createElement("div");
themedElement.classList.add(`${theme} ${style.wrapper}`);
```
## Changing Themes

If you wish to have different themes and swap between them, you can do so using skins. This works by overriding the CSS variables in the theme with new values:

```typescript
// Define a base theme and assign CSS variables
export const theme = Theme(({ theme }) => {
    return {
        background: theme`#fff`
    };
});

// Create a CSS class that acts as a skin of the theme
export const skins = Style(({ css }) => {
    // dark theme override
    const dark = css.class`
    ${tvar(theme.background)}: #000;
    `;

    return { 
        dark
    };
});
```

You can then utilize this as such:

```typescript
const baseTheme = document.createElement("div");
baseTheme.classList.add(`${theme}`);

const darkTheme = document.createElement("div");
darkTheme.classList.add(`${theme} ${skins.dark}`);
```
## Releasing resources

Since `Theme` generates a `<style>` element, you may want to clear the element from DOM for garbage collection or to remove the style entirely. To do this, simply:

```typescript
Theme.dispose(theme);
```

If you are using skins, you need to dispose of the skins as well:

```typescript
Style.dispose(skins);
```