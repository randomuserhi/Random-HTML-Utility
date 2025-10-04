import { html } from "rhu/html.js";
import { always, Signal, signal } from "rhu/signal.js";

const Counter = () => {
    interface Counter {
        list: HTMLUListElement;
        btn: HTMLButtonElement;
    }

    const state = signal(0);

    const items = signal<number[]>([], always);
    state.on((v) => {
        const arr = items();
        while (arr.length < v) {
            arr.push(Math.random());
        }
        items(arr);
    });

    const list = html.map(items, undefined, (kv, el?: html<{ v: Signal<number> }>) => {
        const [, v] = kv;
        if (el === undefined) {
            const sig = signal(v);
            el = html`<li>${html.bind(sig, "v")}</li>`;
        }
        el.v(v);
        return el;
    });

    const dom = html<Counter>/**//*html*/`
    <div>
        <div>state: ${state}</div>
        <button m-id="btn">Increment</button>
        <ul>${list}</ul>
        <ul m-id="list">
            <li>No Children</li>
        </ul>
    </div>
    `;
    html(dom).box().children((children) => {
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
`);