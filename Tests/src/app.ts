import { html } from "rhu/html.js";
import { Style } from "rhu/style.js";
import { TestResults } from "./tests.js";

const style = Style(({ css }) => {
    const wrapper = css.class`
    width: 100%;
    flex: 1;

    position: relative;

    display: flex;
    justify-content: center;
    `;

    const body = css.class`
    width: 100%;
    max-width: 1800px;
    height: 100%;
    `;

    return {
        wrapper,
        body
    };
});

interface App {
    body: HTMLDivElement;
}

const App = () => {
    const dom = html<App>/**//*html*/`
    <div class="${style.wrapper}">
        <div m-id="body" class="${style.body}">${TestResults()}</div>
    </div>
    `;
    html(dom).box();

    return dom;
};

export const app = App();

// Load app
const __load__ = () => {
    document.body.replaceChildren(...app);
};
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", __load__);
} else {
    __load__();
}