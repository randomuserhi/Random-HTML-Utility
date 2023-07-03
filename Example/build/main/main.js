RHU.import(RHU.module({ trace: new Error(),
    name: "Main", hard: ["RHU.Macro", "RHU.Style"],
    callback: function () {
        let { RHU } = window.RHU.require(window, this);
        let appmount = function () {
        };
        RHU.Macro(appmount, "appmount", `
            `, {
            element: `<div class=""></div>`
        });
        let style = RHU.Style({
            "color": "red",
            "display": "flex",
            button: RHU.Style({
                "color": "white"
            }),
            test: {
                b: RHU.Style({
                    "display": "flex"
                }),
            },
            borderRadius: {}
        });
        console.log(style);
    }
}));
