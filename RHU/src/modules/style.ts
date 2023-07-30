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

            // TODO(randomuserhi): Change type inference so that the returned type from RHU.Style and RHU.mediaQuery etc...
            //                     only accepts classes for use in html
            //                     Given the example below you should not be able to do:
            //                     `style.button[":hover"]` ...
            //                     You also should not be able to do
            //                     `style.button.__style__.display = "none"`
            //                     
            //                     These actions are only prohibitted outside the generator function, thus to make it work I simply
            //                     need to implement a type that can convert an intermediate type:
            //                     `{ button: DeclCSSStyle<{}>, query: DeclMediaQuery<{}> }` to `{ button: CSSStyle, query: MediaQuery }` where 
            //                     CSSStyle / MediaQuery is the internally used type for the generator to have access to __style__ and __query__ 
            //                     properties and DeclCSSStyle / DeclMediaQuery is used externally for exposing specific classes
            //
            //                     This makes the behaviour defined in the sense that styles can't be altered post creation, and the exposed classes
            //                     are simply the string names to be used in html: <div style="`${style.button}`"></div>

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
                let common: RHU.Style.StyleDeclaration = {
                    color: "aliceblue"
                }
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
                    },
                    ":hover": {
                        __style__: common
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
                        __style__: common
                    }
                }
            });
        }
    }));

})();