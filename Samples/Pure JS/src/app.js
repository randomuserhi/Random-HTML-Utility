import { html, Macro, MacroElement } from "rhu/macro.js";
import { Style } from "rhu/style.js";
import { Theme } from "rhu/theme.js";
import { Demo_Counter } from "./demos/counter.js";

export const theme = Theme(({ theme }) => {
    return {
        defaultColor: theme`rgba(255, 255, 255, 0.8)`,
        fullWhite: theme`white`,
        fullBlack: theme`black`,
        hoverPrimary: theme`#2997ff`,
        backgroundPrimary: theme`#0071e3`,
        backgroundAccent: theme`#147ce5`,
    };
});

const style = Style(({ css }) => {
    const wrapper = css.class`
    font-family: roboto;

    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;

    background-color: #fff;

    overflow: hidden;
    `;
    const body = css.class`
    flex: 1;
    margin: 5px;
    `;

    const nav = css.class`
    padding: 5px;
    `;

    css`
    button {
        background-color: #ccc;
        border-radius: 5px;
        padding: 0 5px;
    }

    li::before {
        content: "-";
        padding: 5px;
    }

    h1 {
        font-size: 20px;
        margin-bottom: 5px;
    }
    `;

    return {
        wrapper,
        body,
        nav
    };
});

const demos = [
    Demo_Counter
];

const App = Macro(class App extends MacroElement {
    constructor(dom, bindings) {
        super(dom, bindings);
        
        this.back.addEventListener("click", () => this.load(this.demoList));
    }

    load(fragment) {
        this.body.replaceChildren(fragment);
    }
}, () => html`
    <div class="${theme} ${style.wrapper}">
        <div class="${style.nav}"><button m-id="back">Back</button></div>
        <div m-id="body" class="${style.body}">
            <ul m-id="demoList">
                ${
    [...([
        "Counter"
    ].entries())].map((v) => html`<li><button m-id="item">${v[1]}</button></li>`.box()
        .then((self) => { 
            self.item.addEventListener("click", () => { app().load(demos[v[0]]()); }) ;
        }))}
            </ul>
        </div>
    </div>
    `);

// App Getter
let _app = undefined;
export function app() {
    if (_app === undefined) throw new Error("App has not loaded yet.");
    return _app;
}

// Load app
const __load__ = () => {
    _app = Macro.create(App());
    document.body.replaceChildren(..._app.dom);
};
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", __load__);
} else {
    __load__();
}