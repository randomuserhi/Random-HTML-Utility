## Simple Counter (Functional Macro)

```typescript
import { html, Macro } from "rhu/macro.js";
import { signal, Signal, computed, effect } from "rhu/signal.js";

const Counter = () => {
    interface Counter { 
        readonly shallowCount: Signal<string>;
        readonly deepCount: Signal<string>;
        readonly btn: HTMLButtonElement;
    }
    
    // Initialising state here instead of in the `.then()`
    // clause allows the same state to be used if the created
    // element is copied through `.copy()`.
    const shallowState = signal<number>(0);
    
    // Placing the type in the `then` clause instead of here
    // Creates a "Public" and "Private" interface for TypeScript
    //
    // The type declared here is what is public, and the type in
    // the `then` clause is private.
    return html<Record<string, never>>/**//*html*/`
        <div>
            <div>${Macro.signal("shallowCount")}</div>
            <div>${Macro.signal("deepCount")}</div>
            <button m-id="btn">Increment</button>
        </div>
        `.box().then((_self) => {
        const self = _self as unknown as Counter;

        // Initialising state here instead of outside the `.then()`
        // clause prevents this state from being used by multiple
        // instances when copied through `.copy()`.
        //
        // Each copy will have it's own state.
        const deepState = signal<number>(0);
        
        // Update DOM
        deepState.on((value) => self.deepCount(`deepState: ${value}`));
        shallowState.on((value) => self.shallowCount(`shallowState: ${value}`));
        self.btn.addEventListener("click", () => {
            deepState(deepState() + 1);
            shallowState(shallowState() + 1);
        });
    });
};

const temp = Counter(); // Store a counter to make a copy of to demonstrate
                        // Shallow and Deep state copies.
const [_, fragment] = html`
<h1>Independent Counter</h1>
${Counter()}
<br /><h1>Counter and its copy</h1>
${temp}
${temp.copy()}
`.dom();

document.body.append(fragment);
```

> Note that the general consensus for copy semantics is that when using `.copy()` instead of creating a new instance, you should assume the copy will use the same state as the original unless explicitly told otherwise.
> 
> Especially since `.copy()` does not copy all properties internally, but just the factory properties. So for Functional Macros you should avoid it entirely and only use the function to instantiate elements.
## Simple Counter (Macro)

> Unlike *Functional Macros*, there are no copy semantics.

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
}, html`
    <div>
        <div>state: ${Macro.signal<number>("state", 0)}</div>
        <button m-id="btn">Increment</button>
    </div>
    `);
    
const [_, fragment] = html`
${Counter()}
`;

document.body.append(fragment);
```