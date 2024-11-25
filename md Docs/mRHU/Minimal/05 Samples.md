## Simple Counter

```typescript
import { DOM, html } from "rhu/html.js";
import { signal } from "rhu/signal.js";

const Counter = () => {
    interface Counter {
        list: HTMLUListElement;
        btn: HTMLButtonElement;
    }

    const state = signal(0);

    const dom = html<Counter>/**//*html*/`
    <div>
        <div>state: ${state}</div>
        <button m-id="btn">Increment</button>
        <ul m-id="list">
            <li>No Children</li>
        </ul>
    </div>
    `;
    html.box(dom);
    html.children(dom, (children) => {
        if (children.length === 0) return;
        dom.list.replaceWith(...children);
    });

    dom.btn.addEventListener("click", () => state(state() + 1));

    return dom;
};

document.body.replaceChildren(...html`
    ${Counter()}

    ${html.open(Counter())}
        <div>Child!</div>
    ${html.close()}
`[DOM]);
```

## Private & Public Interfaces

```typescript
const App = () => {
    /*private:*/
    interface _App {
        readonly body: HTMLDivElement;
    }
    /*public:*/
    interface App {

    }

    const dom = html<_App & App>/**//*html*/`
    <div class="${theme} ${style.wrapper}">
        <div m-id="body" class="${style.body}">
        </div>
    </div>
    `;
    html.box(dom);
    
    return dom as html<App>;
};

// Accessing type
const app: html<typeof App>;
```