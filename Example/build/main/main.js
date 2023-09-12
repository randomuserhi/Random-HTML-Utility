RHU.module(new Error(), "Main", { Style: "rhu/style", Macro: "rhu/macro" }, function ({ Style, Macro }) {
    const style = Style(({ style, css }) => {
        const wrapper = style.class `
            display: flex;
            gap: 10px;
            width: 100%;
            height: 100%;
            background-color: blue;
            padding: 10px;
            ${css({
            border: {
                borderRadius: 5
            }
        })}
            `;
        style `
            ${wrapper}>div {
                width: 100%;
                height: 10px;
                background-color: white;
            }
            `;
        return {
            wrapper
        };
    });
    const appmount = function () {
    };
    Macro(appmount, "appmount", `
            <div>
            </div>
            `, {
        element: `<div class="${style.wrapper}"></div>`
    });
});
