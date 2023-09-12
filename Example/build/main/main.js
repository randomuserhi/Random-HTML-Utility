RHU.import(RHU.module({ trace: new Error(),
    name: "Main", hard: ["RHU.Macro", "RHU.Style"],
    callback: function () {
        const { RHU } = window.RHU.require(window, this);
        const { Macro, Style } = RHU;
        const style = Style(({ style, css }) => {
            const wrapper = style.class `
            display: flex;
            gap: 10px;
            width: 100%;
            height: 100%;
            background-color: blue;
            padding: 10px;
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
    }
}));
