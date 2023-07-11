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

            // Test code:
            type CSSStyle<T extends RHU.Style.CSSStyle = {}> = RHU.Style.CSSStyle<T>;
            let style = RHU.Style!<{
                button: CSSStyle<{
                    text: CSSStyle
                }>,
                /*query: CSSQuery<{
                    mobile: CSSStyle
                }>*/
            }>({
                button: {
                    __style__: {
                        display: "flex"
                    },
                    text: {
                        __style__: {
                            display: "flex"
                        }
                    }
                },
                // the structure can either be defined here in <> or above in the parent
                /*query: RHU.Style.mediaQuery({
                
                })*/
            });
        }
    }));

})();