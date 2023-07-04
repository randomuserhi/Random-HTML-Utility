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
            type Body = RHU.Style.Body &
            {
                [symbols.name]?: string | null;
            }
            type Block = RHU.Style.Block;
            type MediaQuery = RHU.Style.MediaQuery;
            const symbols: SymbolCollection = {
                name: Symbol("style name"),
            } as SymbolCollection;

            // Utility functions
            let isPlainObject = function(obj: any): boolean
            {
                return Object.getPrototypeOf(obj) === Object.prototype;
            }

            RHU.Style = function(arg: any)
            {
                // Handle function overloads in this way...
                if (RHU.exists(new.target)) return new styleBlock(arg);
                else return new styleBody(arg);
            } as Function as RHU.Style;

            let styleBlock = function<T extends {}>(this: Block, generator: (style: RHU.Style.StyledType<T> & Block) => void): RHU.Style.StyledType<T> & Block
            {
                throw new Error("Not implemented yet.");
            } as Function as { 
                new<T extends {}>(generator: (style: RHU.Style.StyledType<T> & Block) => void): RHU.Style.StyledType<T> & Block;
                prototype: Block;
            };

            let styleBody = function(this: Body, declaration: RHU.Style.BodyDeclaration)
            {
                // Deep clone input into style body
                let clone: (target: Body, declaration: RHU.Style.BodyDeclaration) => void = function(target, declaration)
                {
                    for (let key of Object.keys(declaration))
                    {
                        let value = declaration[key];
                        if (typeof value === "string" || typeof value === "number") target[key] = value;
                        else if (isMediaQuery(value)) target[key] = new mediaQuery(value);
                        else if (isStyleBody(value)) target[key] = new styleBody(value);
                        else if (isPlainObject(value)) target[key] = new styleBody(value as RHU.Style.BodyDeclaration);
                        // TODO(randomuserhi): Better error message => include full property path?
                        else throw new Error(`Object assigned to ${key} is not a valid style object.`);
                    }     
                };
                clone(this, declaration);
            } as Function as { 
                new(declaration: RHU.Style.BodyDeclaration): Body;
                prototype: Body;
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
            let isStyleBody: (obj: any) => obj is Body 
                = Object.isPrototypeOf.bind(styleBody.prototype);

            RHU.Style.mediaQuery = function(arg: any)
            {
                if (RHU.exists(new.target)) throw new Error("This function cannot be called with the 'new' keyword.");
                else return new mediaQuery(arg);
            } as any;

            let mediaQuery = function(this: MediaQuery, declaration: RHU.Style.BlockDeclaration)
            {
                // Deep clone input into media query body
                let clone: (target: MediaQuery, declaration: RHU.Style.BlockDeclaration) => void = function(target, declaration)
                {
                    for (let key of Object.keys(declaration))
                    {
                        let value = declaration[key];
                        if (isMediaQuery(value)) target[key] = new mediaQuery(value);
                        else if (isStyleBody(value)) target[key] = new styleBody(value);
                        else if (isPlainObject(value)) target[key] = new styleBody(value as RHU.Style.BodyDeclaration);
                        // TODO(randomuserhi): Better error message => include full property path?
                        else throw new Error(`Object assigned to ${key} is not a valid style object.`);
                    }     
                };
                clone(this, declaration);
            } as Function as { 
                new(body: RHU.Style.BlockDeclaration): MediaQuery;
                prototype: MediaQuery;
            };
            let isMediaQuery: (obj: any) => obj is MediaQuery 
                = Object.isPrototypeOf.bind(mediaQuery.prototype);

            let element = Symbol("Element reference");
            RHU.Style.el = function() { return element; };

            type CSSMediaQuery<T extends {} = {}> = RHU.Style.CSSMediaQuery<T>;
            type CSSBody<T extends {} = {}> = RHU.Style.CSSBody<T>;
            let style = RHU.Style!<{
                wrapper: CSSBody,
                grid: {
                    cell: CSSBody
                },
                // grid: CSSBlock<{ ... }> also works
                query: CSSMediaQuery
            }>({
                display: "flex",
                color: "aqua",
                borderRadius: 10,
                wrapper: {
                    display: "flex"
                },
                grid: {
                    cell: {
                        display: "flex"
                    }
                },
                query: RHU.Style!.mediaQuery({})
            });
        }
    }));

})();