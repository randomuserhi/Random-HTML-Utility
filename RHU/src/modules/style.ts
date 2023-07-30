(function() {
    
    let RHU: RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.import(RHU.module({ trace: new Error(),
        name: "rhu/style", hard: [],
        callback: function()
        {
            if (RHU.exists(RHU.Style))
                console.warn("Overwriting RHU.Style...");

            // Types for symbols
            interface SymbolCollection
            { 
                readonly name: unique symbol;
            }
            const symbols: SymbolCollection = {
                name: Symbol("style name"),
            } as SymbolCollection;

            // Type aliases for private symbol properties

            // TODO(randomuserhi): Allow RHU.mediaquery(query, {}) and RHU.style({}) shorthands instead of __style__

            // Test code:
            type CSSStyle<T extends {} = {}> = RHU.Style.CSSStyle<T>;
            type CSSMediaQuery<T extends {} = {}> = RHU.Style.CSSMediaQuery<T>;
            let style = RHU.Style!<{
                button: CSSStyle<{
                    text: CSSStyle
                }>,
                query: CSSMediaQuery<{
                    mobile: CSSStyle
                }>
            }>((style) => {
                style.button = {
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
                }
                // NOTE(randomuserhi): <T> can't be inferred
                /*style.query: RHU.Style!.mediaQuery<{
                    mobile: CSSStyle
                }>({
                    __query__: "cringe",
                    mobile: {
                        __style__: {

                        }
                    }
                })*/
                // Version without requirement to infer
                style.query = {
                    __query__: "cringe",
                    mobile: {
                        __style__: {

                        }
                    }
                }
            });
        }
    }));

})();