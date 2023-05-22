(function() {
    "use strict";

    /**
     * NOTE(randomuserhi): <rhu-macro> is a c-style macro which means that it is preprocessed into the given macro
     *                     but has no functionality beyond that. For example, if you create a <rhu-macro> element and
     *                     attach to dom with document.body.append(document.createElement("rhu-macro")), it won't do anything. 
     */

    let RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module({ module: "rhu/macro", trace: new Error(), hard: ["Map", "XPathEvaluator", "RHU.WeakCollection"] }, function()
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

        let symbols = {
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
        let isElement = Object.prototype.isPrototypeOf.bind(HTMLElement.prototype);
        let Element_setAttribute = Function.call.bind(Element.prototype.setAttribute);
        let Element_getAttribute = Function.call.bind(Element.prototype.getAttribute);
        let Element_hasAttribute = Function.call.bind(Element.prototype.hasAttribute);
        let Element_removeAttribute = Function.call.bind(Element.prototype.removeAttribute);
        let Node_childNodes = Function.call.bind(Object.getOwnPropertyDescriptor(Node.prototype, "childNodes").get);
        let Node_parentNode = Function.call.bind(Object.getOwnPropertyDescriptor(Node.prototype, "parentNode").get);

        Document.prototype.createMacro = function(type)
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

        Document.prototype.Macro = function(type, attributes)
        {
            let definition = templates.get(type);
            if (!RHU.exists(definition)) definition = defaultDefinition;
            let options = definition.options;

            let doc = Macro.parseDomString(options.element);
            let el = doc.children[0];
            if (!RHU.exists(el)) throw SyntaxError(`No valid container element to convert into macro was found for '${type}'.`);
            Element_setAttribute(el, "rhu-macro", type);
            for (let key in attributes) el.setAttribute(key, attributes[key]);
            el.remove(); //un bind element from temporary doc
            return el.outerHTML;
        };

        Element.prototype.setAttribute = function(attrName, value) 
        {
            // Remove macro functionality if element is no longer considered a macro
            if (attrName === "rhu-macro") Macro.parse(this, value);
            return Element_setAttribute(this, attrName, value);
        };

        Element.prototype.removeAttribute = function(attrName) 
        {
            // Remove macro functionality if element is no longer considered a macro
            if (attrName === "rhu-macro") Macro.parse(this);
            return Element_removeAttribute(this, attrName);
        };

        RHU.definePublicAccessor(Element.prototype, "rhuMacro", {
            get: function() { return Element_getAttribute(this, "rhu-macro"); },
            set: function(value) 
            { 
                Element_setAttribute(this, "rhu-macro", value);
                Macro.parse(this, value);
            }
        });

        let Macro = RHU.Macro = function(object, type, source = "", options)
        {
            if (type == "") throw new SyntaxError("'type' cannot be blank.");
            if (typeof type !== "string") throw new TypeError("'type' must be a string.");
            if (typeof source !== "string") throw new TypeError("'source' must be a string.");
            if (!RHU.isConstructor(object)) throw new TypeError("'object' must be a constructor.");

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
                constructor: object,
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
        };
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

        let xPathEvaluator = new XPathEvaluator();
        Macro.parseDomString = function(str)
        {
            /* NOTE(randomuserhi): template is used to handle parsing of fragments like <td> which don't work on document */
            let template = document.createElement("template");
            template.innerHTML = str;
            return template.content;
        };

        let clonePrototypeChain = function(prototype, last)
        {
            let next = Object.getPrototypeOf(prototype);
            if (next === Object.prototype) return RHU.clone(prototype, last);
            return RHU.clone(prototype, clonePrototypeChain(next, last));
        };
        
        let parseStack = [];
        let watching = new Map(); // Stores active macros that are being watched
        Macro.watching = watching;
        // TODO(randomuserhi): make force default true
        Macro.parse = function(element, type, force = false)
        {
            /**
             * NOTE(randomuserhi): Since rhu-macro elements may override their builtins, Element.prototype etc... are used
             *                     to prevent undefined behaviour when certain builtins are overridden.
             */

            /**
             * NOTE(randomuserhi): In built elements may have properties that need to be protected
             *                     such that they are not cleared when rhu-macro changes, to do so you would
             *                     create a proxy as shown below:
             *                      
             *                     let proxy = RHU.clone(element);
             *                     Object.setPrototypeOf(element, proxy);
             *
             *                     The proxy should only be created once, to prevent huge prototype chains
             *                     when type changes frequently.
             *                     The reason why a poxy isn't used is because all built-ins (needs confirming)
             *                     seem to not have any properties, an error check is made to double check this.
             */

            // Check if element is eligible for RHU-Macro (check hasOwn properties and that it has not been converted into a macro already)
            if (!Object.hasOwnProperty.call(element, symbols.constructed) && RHU.properties(element, { hasOwn: true }).size !== 0) 
                throw new TypeError(`Element is not eligible to be used as a rhu-macro.`);

            // return if element doesn't exist
            if (!RHU.exists(element)) return;

            // return if type has not changed unless we are force parsing it
            if (force === false && element[symbols.constructed] === type) return;

            // Check parse stack to see if we are in a recursive loop
            if (parseStack.includes(type))
                throw new Error("Recursive definition of macros are not allowed.");

            parseStack.push(type);

            // get old type of element, prior to purging old properties
            let oldType = element[symbols.constructed];
            // get prototype of element, prior to purging old properties
            let proto = element[symbols.prototype];

            // Clear old element properties
            RHU.delete(element);

            // Purge old dom
            Element.prototype.replaceChildren.call(element);

            // Get constructor for type and type definition
            let definition = templates.get(type);
            if (!RHU.exists(definition)) definition = defaultDefinition;
            let constructor = definition.constructor;
            let options = definition.options;

            // NOTE(randomuserhi): Create an inbetween object that will hold properties etc...
            let proxy = Object.create(constructor.prototype);

            // Assign prototype methods
            // NOTE(randomuserhi): prototype methods are not stored in a proxy prototype
            //                     This may be confusing for those trying to access their methods via
            //                     Object.getPrototypeOf, but is done due to not utilizing a proxy
            //                     as described above.
            // Set target object
            let target = element;
            if (options.floating) target = Object.create(proxy);
            else
            { 
                // Handle inheritance
                if (!RHU.exists(proto))
                    proto = element[symbols.prototype] = Object.getPrototypeOf(element);
                else 
                    element[symbols.prototype] = proto;

                /**
                 * Create a clone of the chain and inherit from it. A clone has to be created to avoid editting the original prototype.
                 *
                 * NOTE(randomuserhi): setPrototypeOf is not very performant due to how they are handled
                 *                     internally: https://mathiasbynens.be/notes/prototypes
                 *                     This means RHU-Macros are not very performant.
                 *
                 *                     A way to get around this would be to append the methods directly to the element
                 *                     handling overrides by not overwriting properties that already exist:
                 *                     
                 *                     for (let proto = constructor.prototype; proto !== Object.prototype; proto = Object.getPrototypeOf(proto))
                 *                          RHU.assign(target, proto, { replace: false });
                 *
                 *                     The downside to this approach over setPrototypeOf is the inability to call parent methods since obv they dont exist
                 *                     in the prototype.
                 */

                // load cached cloned prototypes for performance
                let protoCache = definition.protoCache;
                let cachedProto = protoCache.get(proto);
                if (RHU.exists(cachedProto))
                {
                    //console.log(`${definition === defaultDefinition ? "undefined" : type} cached: ${proto}`);
                    proxy = Object.create(cachedProto);
                }
                else
                {
                    //console.log(`${definition === defaultDefinition ? "undefined" : type} not cached: ${proto}`);
                    let clonedProto = clonePrototypeChain(constructor.prototype, proto);
                    protoCache.set(proto, clonedProto);
                    proxy = Object.create(clonedProto);
                }
                Object.setPrototypeOf(target, proxy);

                // NOTE(randomuserhi): Alternate method that does not use setPrototypeOf in the event of performance
                //                     Won't work if ur code relies on calling parent, Object.getPrototypeOf(this).superMethod.
                //for (let proto = constructor.prototype; proto !== Object.prototype; proto = Object.getPrototypeOf(proto))
                //    RHU.assign(target, proto, { replace: false });
            }

            // Get elements from parser 
            let doc = Macro.parseDomString(RHU.exists(definition.source) ? definition.source : "");

            let properties = {};
            let checkProperty = (identifier) => {
                if (Object.hasOwnProperty.call(properties, identifier)) 
                    throw new SyntaxError(`Identifier '${identifier}' already exists.`);
                if (!options.encapsulate && options.strict && identifier in target) 
                    throw new SyntaxError(`Identifier '${identifier}' already exists.`);

                return true;
            };

            // Expand <rhu-macro> tags into their original macros
            let nested = [...doc.querySelectorAll("rhu-macro")];
            for (let el of nested)
            {
                const typename = "rhu-type";
                let type = Element_getAttribute(el, typename);
                Element.prototype.removeAttribute.call(el, typename);
                let definition = templates.get(type);
                if (!RHU.exists(definition)) definition = defaultDefinition;
                let options = definition.options;

                // If the macro is floating, check for id, and create its property and parse it
                // we have to parse it manually here as floating macros don't have containers to 
                // convert to for the parser later to use.
                if (options.floating)
                {
                    if (Element_hasAttribute(el, "rhu-id"))
                    {
                        let identifier = Element_getAttribute(el, "rhu-id");
                        Element.prototype.removeAttribute.call(el, "rhu-id");
                        checkProperty(identifier);
                        RHU.definePublicAccessor(properties, identifier, {
                            get: function() { return el[symbols.macro]; }
                        });
                    }
                    Macro.parse(el, type);
                }
                // If the macro is not floating, parse it and create the container the macro needs to be inside
                else
                {
                    let doc = Macro.parseDomString(options.element);
                    let macro = doc.children[0];
                    if (!RHU.exists(macro)) console.error(`No valid container element to convert into macro was found for '${type}'.`);
                    else
                    {
                        Element_setAttribute(macro, "rhu-macro", type);
                        for (let i = 0; i < el.attributes.length; ++i)
                            macro.setAttribute(el.attributes[i].name, el.attributes[i].value);
                        el.replaceWith(macro);
                    }
                }
            }

            // Create properties
            let referencedElements = doc.querySelectorAll("*[rhu-id]");
            for (let el of referencedElements)
            {
                let identifier = Element_getAttribute(el, "rhu-id");
                Element.prototype.removeAttribute.call(el, "rhu-id");
                checkProperty(identifier);
                RHU.definePublicAccessor(properties, identifier, {
                    get: function() { return el[symbols.macro]; }
                });
            }

            // Parse nested rhu-macros (can't parse floating macros as they don't have containers)
            nested = doc.querySelectorAll("*[rhu-macro]");
            for (let el of nested) Macro.parse(el, Element_getAttribute(el, "rhu-macro"));

            // Place elements onto element
            Element.prototype.append.call(element, ...doc.childNodes);

            // Remove comment nodes:
            const xPath = "//comment()";
            let query = xPathEvaluator.evaluate(xPath, element, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
            for (let i = 0, length = query.snapshotLength; i < length; ++i)
                query.snapshotItem(i).replaceWith();

            // Set content variable if set:
            if (RHU.exists(options.content))
            {            
                //if (typeof options.content !== "string") throw new TypeError("Option 'content' must be a string.");
                checkProperty(options.content);
                properties[options.content] = [...Node_childNodes(element)];
            }

            if (options.floating)
            {
                // If we are floating, replace children
                // If no parent, unbind children
                if (RHU.exists(Node_parentNode(element))) Element.prototype.replaceWith.call(element, ...Node_childNodes(element));
                else Element.prototype.replaceWith.call(element);

                // If we are floating, set instance to be the new target object instead of the element container:
                // NOTE(randomuserhi): Needs to be configurable to ensure that the property can be deleted when element
                //                     is reused
                RHU.defineProperties(element, {
                    [symbols.macro]: {
                        configurable: true,
                        get: function() { return target; }
                    }
                });
            }
            
            // Add properties to target
            if (RHU.exists(options.encapsulate))
            {            
                //if (typeof options.encapsulate !== "string") throw new TypeError("Option 'encapsulate' must be a string.");
                checkProperty(options.encapsulate);
                RHU.definePublicAccessor(proxy, options.encapsulate, {
                    get: function() { return properties; }
                });
            }
            else RHU.assign(proxy, properties);

            constructor.call(target);

            // Update live map
            // Handle old type
            if (RHU.exists(oldType))
            {
                let old = templates.get(oldType);
                if (!RHU.exists(old)) old = defaultDefinition;
                // check if old type was not floating
                // - floating macros are 1 time use (get consumed) and thus arn't watched
                if (!old.options.floating && watching.has(oldType))
                    watching.get(oldType).delete(element);
            }
            // Handle new type
            // check if new type is floating
            // - floating macros are 1 time use (get consumed) and thus arn't watched
            if (!options.floating)
            {
                if (RHU.exists(type))
                {
                    if (!watching.has(type))
                        watching.set(type, new RHU.WeakCollection());    
                    let typeCollection = watching.get(type);
                    typeCollection.add(element);
                }
            }

            // Set constructed type for both target and element
            // NOTE(randomuserhi): You need to set it for both, since if the element is a proxy
            //                     for the floating macro it needs to be considered constructed
            target[symbols.constructed] = type;
            element[symbols.constructed] = type;

            parseStack.pop();
        };

        let load = function()
        {
            /**
             * NOTE(randomuserhi): Due to definitions not being loaded at the time of this parsing stage,
             *                     the outer hull of elements will be incorrectly parsed, and since re-parsing doesn't alter the
             *                     outer hull, they will not be generated correctly. This can be seen by using a <rhu-macro> tag
             *                     and then trying to set outer hull properties in definition post load.
             *                     It is not reasonable to fix this via regular means due to how the outer hull element should not be
             *                     overwritten and how undefined types work.
             *                     
             *                     Thus the only potential fix would be to allow the user to control when this initial load call is made
             *                     such that they can call it after they defined all their macros.
             *                     - This can be implemented by using rhu-config, just expose config options on load so modules can access
             *                       them and read them.
             */

            // Expand <rhu-macro> tags into their original macros
            // TODO(randomuserhi): consider using a custom element to convert <rhu-macro>, also allows for document.createElement();
            // NOTE(randomuserhi): this expansion is the same as done in _parse, consider
            //                     converting into a function
            let expand = [...document.getElementsByTagName("rhu-macro")];
            for (let el of expand)
            { 
                const typename = "rhu-type";
                let type = Element_getAttribute(el, typename);
                Element.prototype.removeAttribute.call(el, typename);
                let definition = templates.get(type);
                if (!RHU.exists(definition)) definition = defaultDefinition;
                let options = definition.options;

                let doc = Macro.parseDomString(options.element);
                let macro = doc.children[0];
                if (!RHU.exists(macro)) console.error(`No valid container element to convert into macro was found for '${type}'.`);
                else
                {
                    Element_setAttribute(macro, "rhu-macro", type);
                    for (let i = 0; i < el.attributes.length; ++i)
                        macro.setAttribute(el.attributes[i].name, el.attributes[i].value);
                    el.replaceWith(macro);
                }
            }

            // Parse macros on document
            let macros = document.querySelectorAll("[rhu-macro]");
            for (let el of macros) Macro.parse(el, Element_getAttribute(el, "rhu-macro"));

            // Initialize observer
            Macro.observe(document);
        };

        let recursiveParse = function(node)
        {
            if (isElement(node) && Element_hasAttribute(node, "rhu-macro")) 
            {
                Macro.parse(node, Element_getAttribute(node, "rhu-macro"));
                return;
            }
            for (let child of node.childNodes)
                recursiveParse(child);
        };

        // Setup mutation observer to detect macros being created
        let observer = new MutationObserver(function(mutationList) {
            /**
             * NOTE(randomuserhi): Since mutation observers are asynchronous, the current attribute value
             *                     as read from .getAttribute may not be correct. To remedy this, a dictionary
             *                     storing the atribute changes is used to keep track of changes at the moment
             *                     a mutation occurs.
             *                     ref: https://stackoverflow.com/questions/60593551/get-the-new-attribute-value-for-the-current-mutationrecord-when-using-mutationob
             */
            let attributes = new Map();
            for (const mutation of mutationList) 
            {
                switch (mutation.type)
                {
                case "attributes":
                    {
                        if (mutation.attributeName === "rhu-macro")
                        {
                            if (!attributes.has(mutation.target)) attributes.set(mutation.target, mutation.oldValue);
                            else if (attributes.get(mutation.target) !== mutation.oldValue)
                            {
                                attributes.set(mutation.target, mutation.oldValue);

                                /**
                                 * NOTE(randomuserhi): A performance gain could be done by only parsing the last tracked attribute change
                                 *                     since other changes are redundant as they are replaced by the latest.
                                 *                     This is purely done for the sake of being consistent with what the user may expect.
                                 */
                                Macro.parse(mutation.target, mutation.oldValue);
                            }
                        }
                    }
                    break;
                case "childList":
                    {
                        for (let node of mutation.addedNodes)
                            recursiveParse(node);
                    }
                    break;
                }
            }

            for (let el of attributes.keys()) 
            {
                let attr = Element_getAttribute(el, "rhu-macro");
                if (attributes.get(el) !== attr)
                    Macro.parse(el, attr);
            }
        });
        // Allows you to assign macro observation to other docs to trigger macro updates
        Macro.observe = function(target)
        {
            observer.observe(target, {
                attributes: true,
                attributeOldValue: true,
                attributeFilter: [ "rhu-macro" ],
                childList: true,
                subtree: true
            });
        };

        let onDocumentLoad = function()
        {
            // NOTE(randomuserhi): We must call load event first so user-defined types are set first before we load
            //                     custom element otherwise custom element will parse with undefined macros (since
            //                     they just have not been loaded yet).
            
            window.dispatchEvent(new Event("load-rhu-macro"));
            
            load();
        };
        if (document.readyState === "loading") 
            document.addEventListener("DOMContentLoaded", onDocumentLoad);
        // Document may have loaded already if the script is declared as defer, in this case just call onload
        else 
            onDocumentLoad();
    });
})();