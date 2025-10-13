import { html } from "rhu/html.js";
import { signal, computed, effect } from "rhu/signal.js";

const Counter = () => {
    const state = signal(0);

    const dom = html`
    <div>
        <div>state: ${state}</div>
        <ul m-id="list">
            <li>${new Text(`No Children`)}</li>
        </ul>
    </div>
    `;
    html(dom).box().children((children) => {
        if (children.length === 0) return;
        dom.list.replaceChildren(...children);
    });
	
	dom.state = state;

    return dom;
};

const ref = Counter();

ref.state.on((value) => console.log(value));

const comp = (state) => {
	const isEven = computed((s) => { s(state % 2 == 0); }, [state]); 
	const dom = html`
	<div>Child: ${isEven}</div>
	<button m-id="btn">Increment</button>
	`;
	html(dom).box();
	
	dom.btn.addEventListener("click", () => state(state() + 1));
	
	return dom;
}

document.body.replaceChildren(...html`
    ${html.open(ref)}
        <div>Child! ${comp(ref.state)}</div>
    ${html.closure}
	
	<div>Child! ${comp(ref.state)}</div>
	
	<div>Child! ${comp(ref.state)}</div>
`);