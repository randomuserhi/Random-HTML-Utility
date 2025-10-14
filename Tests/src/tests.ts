import { html } from "rhu/html.js";
import { Style } from "rhu/style.js";

const style = Style(({ css }) => {
    const table = css.class`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    `;

    const cell = css.class`
    outline: 1px solid #000;
    `;

    return {
        table,
        cell
    };
});

interface TestCase {
    cells: HTMLElement[];
}

export const TestCase = () => {
    const dom = html<TestResults>/*html*/`
    <div m-id="cells" class="${style.cell}">TestName</div>
    <div m-id="cells" class="${style.cell}">HTML</div>
    <div m-id="cells" class="${style.cell}">Console Logs</div>
    `;
    html(dom).box();

    return dom;
};

interface TestResults {

}

export const TestResults = () => {
    const dom = html<TestResults>/*html*/`
    <div class="${style.table}">
        ${TestCase()}
    </div>
    `;
    html(dom).box();

    return dom;
};