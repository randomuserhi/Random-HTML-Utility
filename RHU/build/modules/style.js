(function () {
    let RHU = window.RHU;
    if (RHU === null || RHU === undefined)
        throw new Error("No RHU found. Did you import RHU before running?");
    RHU.import(RHU.module({ trace: new Error(),
        name: "rhu/style", hard: [],
        callback: function () {
            if (RHU.exists(RHU.Style))
                console.warn("Overwriting RHU.Style...");
            const symbols = {
                name: Symbol("style name"),
            };
            let style = RHU.Style({
                button: {
                    __style__: {
                        display: "flex",
                        border: {
                            borderRadius: 1
                        }
                    },
                    text: {
                        __style__: {
                            display: "block"
                        }
                    }
                },
            });
        }
    }));
})();
