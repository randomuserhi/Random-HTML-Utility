(function() {
    "use strict";

    let RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module({ module: "rhu/macro", hard: ["Map", "XPathEvaluator", "WeakRef", "WeakSet", "FinalizationRegistry"] }, function()
    {
        //TODO(randomuserhi): read from a config and enable performance logging etc...

        if (RHU.exists(RHU.Macro))
            console.warn("Overwriting RHU.Macro...");

        let symbols = {
            macro: Symbol("macro"),
            constructed: Symbol("macro constructed"),
            prototype: Symbol("macro prototype")
        };

        RHU.defineProperty(Node.prototype, symbols.macro, {
            get() { return this; }
        });
        RHU.definePublicAccessor(Node.prototype, "macro", {
            get() { return this[symbols.macro]; }
        });

        // NOTE(randomuserhi): Store a reference to base functions that will be overridden
        let Element_setAttribute = Element.prototype.setAttribute;
        let Node_childNodes = Object.getOwnPropertyDescriptor(Node.prototype, "childNodes").get;
        let Node_parentNode = Object.getOwnPropertyDescriptor(Node.prototype, "parentNode").get;

        HTMLDocument.prototype.createMacro = function(type)
        {
            let definition = templates.get(type);
            if (!RHU.exists(definition)) definition = defaultDefinition;
            let options = definition.options;

            //TODO(randomuserhi): for performance, if it is floating, dont parse a doc, just make a <div> with createElement

            let doc = Macro.parseDomString(options.element);
            let el = doc.children[0];
            if (!RHU.exists(el)) throw SyntaxError(`No valid container element to convert into macro was found for '${type}'.`);
            el.remove(); //un bind element from temporary doc
            el.rhuMacro = type;
            return el[symbols.macro];
        };

        HTMLDocument.prototype.Macro = function(type, attributes)
        {
            let definition = templates.get(type);
            if (!RHU.exists(definition)) definition = defaultDefinition;
            let options = definition.options;

            let doc = Macro.parseDomString(options.element);
            let el = doc.children[0];
            if (!RHU.exists(el)) throw SyntaxError(`No valid container element to convert into macro was found for '${type}'.`);
            Element_setAttribute.call(el, "rhu-macro", type);
            for (let key in attributes) el.setAttribute(key, attributes[key]);
            el.remove(); //un bind element from temporary doc
            return el.outerHTML;
        };

        Element.prototype.setAttribute = function(attrName, value) 
        {
            // Remove macro functionality if element is no longer considered a macro
            if (attrName === "rhu-macro") Macro.parse(this, value);
            Element_setAttribute.call(this, attrName, value);
        };

        RHU.definePublicAccessor(Element.prototype, "rhuMacro", {
            get() 
            {
                let attribute = Element.prototype.getAttribute.call(this, "rhu-macro"); 
                if (RHU.exists(attribute)) return attribute;
                else return undefined;
            },
            set(value) 
            { 
                Element_setAttribute.call(this, "rhu-macro", value);
                Macro.parse(this, value);
            }
        });

        let Macro = RHU.Macro = function(object, type, source = "", options)
        {
            if (new.target === undefined) throw new TypeError("Constructor Macro requires 'new'.");
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
                options: opt
            });

            // parse macros currently of said type
            let update = liveMacros.get(type);
            if (RHU.exists(update))
                for (let el of update)
                    Macro.parse(el, type, true);
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
            }
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

        let MacroCollection = function()
        {
            this._weakSet = new WeakSet();
            this._collection = [];
            // TODO(randomuserhi): Consider moving FinalizationRegistry to a soft dependency since this just assists
            //                     cleaning up huge amounts of divs being created, since otherwise cleanup of the
            //                     collection only occures on deletion / iteration of the collection which can
            //                     cause huge memory consumption as the collection of WeakRef grows.
            //                     - The version that runs without FinalizationRegistry, if it is moved, to a soft
            //                       dependency, would simply run a setTimeout loop which will filter the collection every
            //                       30 seconds or something (or do analysis on how frequent its used to determine how often)
            //                       cleanup is required.
            this._registry = new FinalizationRegistry(() => {
                this._collection = this._collection.filter((i) => {
                    return RHU.exists(i.deref()); 
                });
            });

            this.has = this._weakSet.has;
        };
        MacroCollection.prototype.add = function(...items)
        {
            for (let item of items)
            {
                if (!this._weakSet.has(item))
                {
                    this._collection.push(new WeakRef(item));
                    this._weakSet.add(item);
                    this._registry.register(item);
                }
            }
        };
        MacroCollection.prototype.delete = function(...items)
        {
            for (let item of items)
            {
                if (this._weakSet.has(item))
                    this._weakSet.delete(item);
            }  
            this._collection = this._collection.filter((i) => {
                i = i.deref();
                return RHU.exists(i) && !items.includes(i); 
            });
        };
        MacroCollection.prototype[Symbol.iterator] = function* ()
        {
            let collection = this._collection;
            this._collection = []; 
            for (let item of collection)
            {
                item = item.deref();
                if (RHU.exists(item))
                {
                    this._collection.push(new WeakRef(item));
                    yield item;
                }
            }
        };

        let parseStack = [];
        let liveMacros = new Map(); // Stores active macros that are being watched
        Macro._liveMacros = liveMacros;
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
            if ((element[symbols.constructed] !== "" && !element[symbols.constructed]) && RHU.properties(element, { hasOwn: true }).size !== 0) 
                throw new TypeError(`Element is not eligible to be used as a rhu-macro.`);

            // return if type or element doesn't exist
            if (!RHU.exists(element) || !RHU.exists(type)) return;

            // return if type has not changed unless we are force parsing it
            if (force === false && element[symbols.constructed] === type) return;

            // Check parse stack to see if we are in a recursive loop
            if (parseStack.includes(type))
                throw new Error("Recursive definition of macros are not allowed.");

            parseStack.push(type);

            // get prototype of element
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
                
                // get HTML prototype
                if (!RHU.exists(proto)) proto = Object.getPrototypeOf(target);
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
                proxy = Object.create(clonePrototypeChain(constructor.prototype, proto));
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
                let type = Element.prototype.getAttribute.call(el, typename);
                Element.prototype.removeAttribute.call(el, typename);
                let definition = templates.get(type);
                if (!RHU.exists(definition)) definition = defaultDefinition;
                let options = definition.options;

                // If the macro is floating, check for id, and create its property and parse it
                // we have to parse it manually here as floating macros don't have containers to 
                // convert to for the parser later to use.
                if (options.floating)
                {
                    if (Element.prototype.hasAttribute.call(el, "rhu-id"))
                    {
                        let identifier = Element.prototype.getAttribute.call(el, "rhu-id");
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
                        Element_setAttribute.call(macro, "rhu-macro", type);
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
                let identifier = Element.prototype.getAttribute.call(el, "rhu-id");
                Element.prototype.removeAttribute.call(el, "rhu-id");
                checkProperty(identifier);
                RHU.definePublicAccessor(properties, identifier, {
                    get: function() { return el[symbols.macro]; }
                });
            }

            // Parse nested rhu-macros (can't parse floating macros as they don't have containers)
            nested = doc.querySelectorAll("*[rhu-macro]");
            for (let el of nested) Macro.parse(el, el.rhuMacro);

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
                properties[options.content] = [...Node_childNodes.call(element)];
            }

            if (options.floating)
            {
                // If we are floating, replace children
                // If no parent, unbind children
                if (RHU.exists(Node_parentNode.call(element))) Element.prototype.replaceWith.call(element, ...Node_childNodes.call(element));
                else Element.prototype.replaceWith.call(element);

                // If we are floating, set instance to be the new target object instead of the element container:
                RHU.defineProperties(element, {
                    [symbols.macro]: {
                        get() { return target; }
                    }
                });
            }
            
            // Add properties to target
            if (RHU.exists(options.encapsulate))
            {            
                //if (typeof options.encapsulate !== "string") throw new TypeError("Option 'encapsulate' must be a string.");
                checkProperty(options.encapsulate);
                RHU.definePublicAccessor(proxy, options.encapsulate, {
                    get() { return properties; }
                });
            }
            else RHU.assign(proxy, properties);

            constructor.call(target);

            // Update live map
            // Handle old type
            if (RHU.exists(element[symbols.constructed]))
            {
                let oldType = element[symbols.constructed];
                let old = templates.get(oldType);
                if (!RHU.exists(old)) old = defaultDefinition;
                // check if old type was not floating
                // - floating macros are 1 time use (get consumed) and thus arn't watched
                if (!old.options.floating && liveMacros.has(oldType))
                    liveMacros.get(oldType).delete(element);
            }
            // Handle new type
            // check if new type is floating
            // - floating macros are 1 time use (get consumed) and thus arn't watched
            if (!options.floating)
            {
                if (!liveMacros.has(type))
                    liveMacros.set(type, new MacroCollection());    
                let typeCollection = liveMacros.get(type);
                typeCollection.add(element);
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
            // Expand <rhu-macro> tags into their original macros
            // TODO(randomuserhi): consider using a custom element to convert <rhu-macro>, also allows for document.createElement();
            // NOTE(randomuserhi): this expansion is the same as done in _parse, consider
            //                     converting into a function
            let expand = [...document.getElementsByTagName("rhu-macro")];
            for (let el of expand)
            { 
                const typename = "rhu-type";
                let type = Element.prototype.getAttribute.call(el, typename);
                Element.prototype.removeAttribute.call(el, typename);
                let definition = templates.get(type);
                if (!RHU.exists(definition)) definition = defaultDefinition;
                let options = definition.options;

                let doc = Macro.parseDomString(options.element);
                let macro = doc.children[0];
                if (!RHU.exists(macro)) macro = doc.children[0];
                if (!RHU.exists(macro)) console.error(`No valid container element to convert into macro was found for '${type}'.`);
                else
                {
                    Element_setAttribute.call(macro, "rhu-macro", type);
                    for (let i = 0; i < el.attributes.length; ++i)
                        macro.setAttribute(el.attributes[i].name, el.attributes[i].value);
                    el.replaceWith(macro);
                }
            }

            // Parse macros on document
            let macros = document.querySelectorAll("[rhu-macro]");
            for (let el of macros) Macro.parse(el, el.rhuMacro);

            // Initialize observer
            Macro.observe(document);
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
                        {
                            if (RHU.exists(node.rhuMacro))
                                Macro.parse(node, node.rhuMacro);
                        }
                    }
                    break;
                }
            }

            for (let el of attributes.keys()) 
            {
                let attr = el.rhuMacro;
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
        // Document may have loaded already since the script is declared as defer, in this case just call onload
        else 
            onDocumentLoad();
    });
})();