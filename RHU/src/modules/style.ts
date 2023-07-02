(function() {
    
    let RHU: RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.import(RHU.module({ trace: new Error(),
        name: "rhu/style", hard: [],
        callback: function()
        {
            if (RHU.exists(RHU.Style))
                console.warn("Overwriting RHU.Style...");

            // Type aliases to allow for privated symbols
            interface SymbolCollection
            { 
                readonly name: unique symbol;
            }
            type CSSBody = RHU.Style.CSSBody &
            {
                [symbols.name]?: string | null;
            }
            type CSSBlock = RHU.Style.CSSBlock;
            const symbols: SymbolCollection = {
                name: Symbol("style name"),
            } as SymbolCollection;

            RHU.Style = function(arg: any)
            {
                // Handle function overloads in this way...
                if (RHU.exists(new.target)) return new styleBlock(arg);
                else return new styleBody(arg);
            } as Function as RHU.Style;

            let styleBlock = function(this: CSSBlock, generator: (style: CSSBlock) => void)
            {
                throw new Error("Not implemented yet.")
            } as Function as { 
                new(generator: (style: CSSBlock) => void): CSSBlock;
                prototype: CSSBlock;
            };

            // TODO(randomuserhi): Type inference so that the stylebody created has the correct autocompletion
            //                     based on the parsed input:
            //
            // let style = RHU.Style({
            //     "color": "white",
            //     "display": "flex",
            //     button: {
            //         "color": "white"
            //     }
            // });
            // // This line is poorly inferred by typescript
            // (style.button as RHU.Style.BodyDeclaration).color = "red";

            let styleBody = function(this: CSSBody, declaration: RHU.Style.BodyDeclaration)
            {
                // Deep clone input into style body
                let clone: (target: CSSBody, declaration: RHU.Style.BodyDeclaration) => void = function(target, declaration)
                {
                    for (let key of Object.keys(declaration))
                    {
                        let value = declaration[key];
                        if (typeof value === "string") target[key] = value;
                        else if (isStyleBody(value)) target[key] = new styleBody(value);
                        else 
                        {
                            target[key] = {};
                            clone(target[key] as CSSBody, value as RHU.Style.BodyDeclaration);
                        }
                    }     
                };
                clone(this, declaration);
            } as Function as { 
                new(declaration: RHU.Style.BodyDeclaration): CSSBody;
                prototype: CSSBody;
            };
            styleBody.prototype[Symbol.toPrimitive] = function(hint)
            {
                if (hint !== "number") return this.toString();
                return null;
            };
            styleBody.prototype.toString = function()
            {
                throw new Error("Not implemented yet.");
            }
            let isStyleBody: (obj: any) => obj is CSSBody 
                = Object.isPrototypeOf.bind(styleBody.prototype);

            let element = Symbol("Element reference");
            RHU.Style.el = function() { return element; };
        }
    }));

})();