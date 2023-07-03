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
            type CSSMediaQuery = RHU.Style.CSSMediaQuery;
            const symbols: SymbolCollection = {
                name: Symbol("style name"),
            } as SymbolCollection;

            // NOTE(randomuserhi): This below is to test types => not to push to production
            let style = new RHU.Style!((style) => {
                style.button = {
                    display: "flex",
                    color: "aqua",
                    wrapper: {
                        display: "flex"
                    }
                }
                style.isPortrait = RHU.Style!.mediaQuery({
                    [`${style.button}`]: {
                        display: "none"
                    }
                });
            });
            // TODO(randomuserhi): I would like some type inference on the returned CSSBlock
            //                     But i'm not sure if that is even possible with the generator
            //                     setup I have...
            style.button.wrapper.display = "none"; // Without inference, type error => wrapper does not exist   

            RHU.Style = function(arg: any)
            {
                // Handle function overloads in this way...
                if (RHU.exists(new.target)) return new styleBlock(arg);
                else return new styleBody(arg);
            } as Function as RHU.Style;

            let styleBlock = function(this: CSSBlock, generator: (style: CSSBlock) => void)
            {
                throw new Error("Not implemented yet.");
            } as Function as { 
                new(generator: (style: CSSBlock) => void): CSSBlock;
                prototype: CSSBlock;
            };

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
                        // By default assume object pattern is a style body
                        else target[key] = new styleBody(value as RHU.Style.BodyDeclaration);
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

            RHU.Style.mediaQuery = function(this: CSSMediaQuery, declaration: RHU.Style.BlockDeclaration): CSSMediaQuery
            {
                throw new Error("Not implemented yet.");
            };

            let element = Symbol("Element reference");
            RHU.Style.el = function() { return element; };
        }
    }));

})();