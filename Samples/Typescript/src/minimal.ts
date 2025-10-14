import { html } from "rhu/html.js";
import { signal } from "rhu/signal.js";

interface Counter {
    list: HTMLUListElement;
    btn: HTMLButtonElement;
}

const Counter = () => {
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
    html(dom).box().children((children) => {
        if (children.length === 0) return;
        dom.list.replaceWith(...children);
    });

    dom.btn.addEventListener("click", () => state(state() + 1));

    return dom;
};

document.body.replaceChildren(...html`
    ${html.open(Counter())}
        <div>Child!</div>
    ${html.close()}
`);