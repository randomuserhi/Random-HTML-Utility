## Simple Counter (Functional Macro)

```typescript
import { html, Macro } from "rhu/macro.js";
import { signal, Signal, computed, effect } from "rhu/signal.js";

const Counter = () => {
    interface Counter { 
        readonly state: Signal<number>;
        readonly btn: HTMLButtonElement;
    }
    
    // Initialising state here instead of in the `.then()`
    // clause allows the same state to persist across
    // instances as long as they stem from the same invocation:
    //
    // const invocation = Counter();
    // const someOtherFactory = html`${invocation}`;
    //
    // const a = someOtherFactory.dom();
    // const b = someOtherFactory.dom();
    //
    // Elements generated in `a` and `b` will share the same
    // global state.
    const globalState = signal<number>(0);
    
    // Placing the type in the `then` clause instead of here
    // Creates a "Public" and "Private" interface for TypeScript
    //
    // The type declared here is what is public, and the type in
    // the `then` clause is private.
    return html<Record<string, never>>/**//*html*/`
        <div>
            <div>Global State: ${globalState}</div>
            <div>State: ${html.signal("state", 0)}</div>
            <button m-id="btn">Increment</button>
        </div>
        `.box().then((_self) => {
        const self = _self as unknown as Counter;
        const { state } = self;
        
        // Update DOM
        self.btn.addEventListener("click", () => {
            state(state() + 1);
            globalState(globalState() + 1);
        });
    });
};

const temp = Counter(); // Store an invocation to demonstrate
                        // Global State.
const [_, fragment] = html`
<h1>Unique Invocation Counter</h1>
${Counter()}
<br /><h1>Shared Invocation</h1>
${temp}
${temp.copy()}
`.dom();

document.body.append(fragment);
```
## Simple Counter (Macro)

> Unlike *Functional Macros*, there are no semantics with global state.

```typescript
import { html, Macro, MacroElement } from "rhu/macro.js";
import { signal, Signal, computed, effect } from "rhu/signal.js";

const Counter = Macro(class Counter extends MacroElement {
    private state: Signal<number>;
    private btn: HTMLButtonElement;

    constructor(dom: Node[], bindings: any) {
        super(dom, bindings);
        
        this.btn.addEventListener("click", () => {
            this.state(this.state() + 1);
        });
    }
}, () => html`
    <div>
        <div>state: ${html.signal<number>("state", 0)}</div>
        <button m-id="btn">Increment</button>
    </div>
    `);
    
const [_, fragment] = html`
${Counter()}
`;

document.body.append(fragment);
```