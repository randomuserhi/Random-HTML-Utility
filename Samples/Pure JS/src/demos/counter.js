import { html } from "rhu/macro.js";
import { signal } from "rhu/signal.js";

const Counter = () => {
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
    const globalState = signal(0);

    return html`
        <div>
            <div>Global State: ${globalState}</div>
            <div>State: ${html.signal("state", 0)}</div>
            <button m-id="btn">Increment</button>
        </div>
        `.box().then((self) => {
        const { state } = self;
        
        // Update DOM
        self.btn.addEventListener("click", () => {
            state(state() + 1);
            globalState(globalState() + 1);
        });
    });
};

const temp = Counter();
const template = html`${Counter()}`; // Persistent Invocation (Doesn't generate a new one on each demo start)
export const Demo_Counter = () => html`
    <h1>Unique Invocation</h1>
    <br />
    ${Counter()}
    <br />
    <h1>Reuse / Persistent Invocation</h1>
    <br />
    ${template}
    <br />
    <h1>Shared Invocation</h1>
    <br />
    ${temp}
    <br />
    ${temp.copy()}
    `.dom()[1];