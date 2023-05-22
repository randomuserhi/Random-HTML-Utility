(function() {
    
    /**
     * NOTE(randomuserhi): <rhu-macro> is a c-style macro which means that it is preprocessed into the given macro
     *                     but has no functionality beyond that. For example, if you create a <rhu-macro> element and
     *                     attach to dom with document.body.append(document.createElement("rhu-macro")), it won't do anything. 
     */

    let RHU: RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module({ name: "rhu/macro", trace: new Error(), hard: ["Map", "XPathEvaluator", "RHU.WeakCollection"] }, function()
    {
        //TODO(randomuserhi): read from a config and enable performance logging etc...
        //TODO(randomuserhi): documentation
        //TODO(randomuserhi): Implement a way to create a macro from HTML definition
        //                    so you can RHU.Macro.fromHTML(element) and it will generate a macro definition
        //                    including nested definitions with proper error handling.
        //                    This is useful to handle macros that only exist one time (like a navbar)
        //                    - Maybe in this case fromHTML() shouldnt create a defintion and just return a 1 time macro object

        if (RHU.exists(RHU.Macro))
            console.warn("Overwriting RHU.Macro...");

        let symbols: { macro: symbol, constructed: symbol, prototype: symbol } = {
            macro: Symbol("macro"),
            constructed: Symbol("macro constructed"),
            prototype: Symbol("macro prototype")
        };

        RHU.defineProperty(Node.prototype, symbols.macro, {
            get: function() { return this; }
        });
        RHU.definePublicAccessor(Node.prototype, "macro", {
            get: function() { return this[symbols.macro]; }
        });

        // NOTE(randomuserhi): Store a reference to base functions that will be overridden
        let isElement:(object: any) => boolean;
        let Element_setAttribute:(element: Element, qualifiedName: string, value: string) => void;
        let Element_getAttribute:(element: Element, qualifiedName: string) => string;
        let Element_hasAttribute:(element: Element, qualifiedName: string) => boolean;
        let Element_removeAttribute:(element: Element, qualifiedName: string) => void;
        let Node_childNodes:(node: Node) => NodeListOf<ChildNode>;
        let Node_parentNode:(node: Node) => ParentNode;

        isElement = Object.prototype.isPrototypeOf.bind(HTMLElement.prototype);
        Element_setAttribute = Function.call.bind(Element.prototype.setAttribute);
        Element_getAttribute = Function.call.bind(Element.prototype.getAttribute);
        Element_hasAttribute = Function.call.bind(Element.prototype.hasAttribute);
        Element_removeAttribute = Function.call.bind(Element.prototype.removeAttribute);
        Node_childNodes = Function.call.bind(Object.getOwnPropertyDescriptor(Node.prototype, "childNodes").get);
        Node_parentNode = Function.call.bind(Object.getOwnPropertyDescriptor(Node.prototype, "parentNode").get);

        Document.prototype.createMacro = function(type: string): RHU.Macro
        {
            let definition = templates.get(type);
            if (!RHU.exists(definition)) definition = defaultDefinition;
            let options = definition.options;

            //TODO(randomuserhi): for performance, if it is floating, dont parse a doc, just make a <div> with createElement

            let doc = Macro.parseDomString(options.element);
            let el = doc.children[0];
            if (!RHU.exists(el)) throw SyntaxError(`No valid container element to convert into macro was found for '${type}'.`);
            el.remove(); //un bind element from temporary doc
            Element_setAttribute(el, "rhu-macro", type);
            Macro.parse(el, type);
            return el[symbols.macro];
        };

        let Macro: RHU.Macro
         = RHU.Macro = function(constructor: Function, type: string, source: string = "", options: RHU.Macro.Options): void
        {
            if (type == "") throw new SyntaxError("'type' cannot be blank.");
            if (typeof type !== "string") throw new TypeError("'type' must be a string.");
            if (typeof source !== "string") throw new TypeError("'source' must be a string.");
            if (!RHU.isConstructor(constructor)) throw new TypeError("'object' must be a constructor.");

            // Add constructor to template map
            if (templates.has(type))
                console.warn(`Macro template '${type}' already exists. Definition will be overwritten.`);
            
            let opt = {
                element: "<div></div>",
                floating: false,
                strict: false,
                encapsulate: undefined,
                content: undefined
            };
            RHU.parseOptions(opt, options);
            
            templates.set(type, {
                constructor: constructor,
                type: type,
                source: source,
                options: opt,
                protoCache: new RHU.WeakRefMap() // Used by the parser for performance
            });

            // parse macros currently of said type
            let update = watching.get(type);
            if (RHU.exists(update))
                for (let el of update)
                    Macro.parse(el, type, true);

            return undefined;
        } as RHU.Macro;

        let templates = new Map();
        let defaultDefinition = {
            constructor: function() {},
            options: {
                element: "<div></div>",
                floating: false,
                strict: false,
                encapsulate: undefined,
                content: undefined
            },
            protoCache: new RHU.WeakRefMap()
        };

        let parseStack = [];
        let watching = new Map(); // Stores active macros that are being watched
        Macro.watching = watching;
    });

})();