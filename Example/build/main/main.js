RHU.import(RHU.module({ trace: new Error(),
    name: "Main", hard: ["RHU.Macro"],
    callback: function () {
        let { RHU } = window.RHU.require(window, this);
        let appmount = function () {
        };
        RHU.Macro(appmount, "appmount", `
            `, {
            element: `<div class=""></div>`
        });
    }
}));
