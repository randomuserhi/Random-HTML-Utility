import { html, Macro } from "rhu/macro.js";
import { signal, Signal } from "rhu/signal.js";

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

const temp = Counter();

export const Demo_Counter = () => html`
    <h1>Independent Counter</h1>
    ${Counter()}
    <br /><h1>Counter and its copy</h1>
    ${temp}
    ${temp.copy()}
    `.dom()[1];