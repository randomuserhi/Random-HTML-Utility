/**
 * @namespace _RHU (Symbol.for("RHU")), RHU
 * NOTE(randomuserhi): _RHU (Symbol.for("RHU")) is the internal library hidden from user, whereas RHU is the public interface.
 */
(function (_RHU, RHU) 
{
    /**
     * NOTE(randomuserhi): Grab references to functions, purely to shorten names for easier time.
     */

    let exists = _RHU.exists;

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Declare Symbols and initial conditions for Macros
     */

    /**
     * @func Called on document load and will trigger parsing for <rhu-macro>
     */
    let _internalLoad = function()
    {
        // Expand <rhu-macro> tags into their original macros
        // NOTE(randomuserhi): this expansion is the same as done in _parse, consider
        //                     converting into a function
        let expand = [...document.getElementsByTagName("rhu-macro")];
        for (let el of expand)
        { 
            const typename = "rhu-type";
            let type = Element.prototype.getAttribute.call(el, typename);
            Element.prototype.removeAttribute.call(el, typename);
            let constructor = _templates.get(type);
            if (!exists(constructor)) constructor = _default;
            let definition = Object.getPrototypeOf(constructor.prototype);
            let options = {
                element: "<div></div>"
            };
            if (exists(definition[_symbols._options]))
                for (let key in options) 
                    if (exists(definition[_symbols._options][key])) 
                        options[key] = definition[_symbols._options][key];

            let doc = _RHU.domParser.parseFromString(options.element, "text/html");
            let macro = doc.body.children[0];
            if (!exists(macro)) macro = doc.head.children[0];
            if (!exists(macro)) console.error(`No valid container element to convert into macro was found for '${type}'.`);
            else
            {
                Element_setAttribute.call(macro, "rhu-macro", type);
                for (let i = 0; i < el.attributes.length; ++i)
                    macro.setAttribute(el.attributes[i].name, el.attributes[i].value);
                el.replaceWith(macro);
            }
        }

        // Parse macros on document
        let macros = document.querySelectorAll("*[rhu-macro]");
        for (let el of macros) _parse(el, el.rhuMacro);

        // Setup mutation observer to detect macros being created
        let observer = new MutationObserver(function(mutationList, observer) {
            /**
             * NOTE(randomuserhi): Since mutation observers are asynchronous, the current attribute value
             *                     as read from .getAttribute may not be correct. To remedy this, a dictionary
             *                     storing the atribute changes is used to keep track of changes at the moment
             *                     a mutation occurs.
             *                     ref: https://stackoverflow.com/questions/60593551/get-the-new-attribute-value-for-the-current-mutationrecord-when-using-mutationob
             */
            attributes = new Map();
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
                                 */
                                _parse(mutation.target, mutation.oldValue);
                            }
                        }
                    }
                    break;
                }
            }

            for (let el of attributes.keys()) 
            {
                let attr = el.rhuMacro;
                if (attributes.get(el) !== attr)
                    _parse(el, attr);
            }
        });
        observer.observe(document, {
            attributes: true,
            attributeOldValue: true,
            attributeFilter: [ "rhu-macro" ],
            //childList: true,
            subtree: true
        });
    }

    /**
     * Grab a reference to global symbols
     */
    let _globalSymbols = _RHU._globalSymbols;

    /**
     * Define local symbols used for macros, these are completely
     * hidden from view as they are defined in local scope
     */
    let _symbols = {};
    _RHU.defineProperties(_symbols, {
        _type: {
            value: Symbol("macro type")
        },
        _source: {
            value: Symbol("macro source")
        },
        _options: {
            value: Symbol("macro options")
        },
        _constructed: {
            value: Symbol("macro constructed")
        },
        _content: {
            value: Symbol("macro content")
        }
    });

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Set HTMLElement and Node overrides or extended functionality
     */

    /**
     * @func                    Create a macro of type.
     * @param type{String}      Type of macro.
     * @return{HTMLElement}     Macro element.
     */
    HTMLDocument.prototype.createMacro = function(type)
    {
        let constructor = _templates.get(type);
        if (!exists(constructor)) constructor = _default;
        let definition = Object.getPrototypeOf(constructor.prototype);
        let options = {
            element: "<div></div>",
            floating: false
        };
        if (exists(definition[_symbols._options]))
            for (let key in options) 
                if (exists(definition[_symbols._options][key])) 
                    options[key] = definition[_symbols._options][key];

        //if (options.floating) throw new TypeError("Cannot create a floating macro as it won't be based.");

        //TODO(randomuserhi): for performance, if it is floating, dont parse a doc, just make a <div> with createElement

        let doc = _RHU.domParser.parseFromString(options.element, "text/html");
        let el = doc.body.children[0];
        if (!exists(el)) el = doc.head.children[0];
        if (!exists(el)) throw SyntaxError(`No valid container element to convert into macro was found for '${type}'.`);
        el.remove(); //un bind element from temporary doc
        el.rhuMacro = type;
        return el[_globalSymbols._instance];
    };

    /**
     * @func                        Returns the HTML DOM String for a given macro.
     * @param type{String}          Type of macro.
     * @param attributes{Object}    Additional attributes to add.
     * @return{String}              HTML DOM String for the macro.
     */
    HTMLDocument.prototype.Macro = function(type, attributes)
    {
        let constructor = _templates.get(type);
        if (!exists(constructor)) constructor = _default;
        let definition = Object.getPrototypeOf(constructor.prototype);
        let options = {
            element: "<div></div>"
        };
        if (exists(definition[_symbols._options]))
            for (let key in options) 
                if (exists(definition[_symbols._options][key])) 
                    options[key] = definition[_symbols._options][key];

        let doc = _RHU.domParser.parseFromString(options.element, "text/html");
        let el = doc.body.children[0];
        if (!exists(el)) el = doc.head.children[0];
        if (!exists(el)) throw SyntaxError(`No valid container element to convert into macro was found for '${type}'.`);
        Element_setAttribute.call(el, "rhu-macro", type);
        for (let key in attributes) el.setAttribute(key, attributes[key]);
        el.remove(); //un bind element from temporary doc
        return el.outerHTML;
    }

    /**
     * @func                    Override setAttribute functionality to handle <rhu-macro> being created to auto parse it
     * @param attrName{String}  attribute to set.
     * @param value{String}     value of attribute.
     */
    let Element_setAttribute = Element.prototype.setAttribute; // NOTE(randomuserhi): Store a reference to original function to use.
    Element.prototype.setAttribute = function(attrName, value) 
    {
        // Remove macro functionality if element is no longer considered a macro
        if (attrName === "rhu-macro") _parse(this, value);
        Element_setAttribute.call(this, attrName, value);
    }

    // NOTE(randomuserhi): Store a reference to base accessors to use.
    let Node_childNodes = Object.getOwnPropertyDescriptor(Node.prototype, "childNodes").get;
    let Node_parentNode = Object.getOwnPropertyDescriptor(Node.prototype, "parentNode").get;

    /**
     * @get rhuMacro{String}    get rhu-macro attribute
     * @set rhuMacro{String}    set rhu-macro attribute
     */
    RHU.definePublicAccessors(Element.prototype, {
        rhuMacro: {
            get() 
            {
                let attribute = Element.prototype.getAttribute.call(this, "rhu-macro"); 
                if (exists(attribute)) return attribute;
                else return "";
            },
            set(value) 
            { 
                Element.prototype.setAttribute.call(this, "rhu-macro", value);
                _parse(this, value);
            }
        }
    });

    // ------------------------------------------------------------------------------------------------------

    /**
     * @class{RHU.Macro}        Describes a RHU macro
     * @param object{Object}    Object definition for macro
     * @param type{string}      type name of macro
     * @param source{string}    HTML source of macro
     * @param options{Object}   TODO(randomuserhi): document this object
     */
    let Macro = function(object, type, source = "", options = {})
    {
        /**
         * @property{symbol} _type{String}      name of macro
         * @property{symbol} _source{String}    HTML source of macro
         * @property{symbol} _options{Object}   TODO(randomuserhi): document this object
         */

        if (new.target === undefined) throw new TypeError("Constructor Macro requires 'new'.");
        if (type == "") throw new SyntaxError("'type' cannot be blank.");
        if (typeof type !== "string") throw new TypeError("'type' must be a string.");
        if (typeof source !== "string") throw new TypeError("'source' must be a string.");
        if (!_RHU.isConstructor(object)) throw new TypeError("'object' must be a constructor.");

        /** 
         * Set prototype of object to make it a macro
         * NOTE(randomuserhi): setPrototypeOf is not very performant due to how they are handled
         *                     internally: https://mathiasbynens.be/notes/prototypes
         *                     In this case, it should only be called on macro definition, which should
         *                     only run once which is fine.
         */
        Object.setPrototypeOf(object.prototype, this);

        // Create definition
        this[_symbols._type] = type;
        this[_symbols._source] = source;
        this[_symbols._options] = options;

        // Add constructor to template map
        if (_templates.has(type)) console.warn(`Macro template '${type}' already exists. Definition will be overwritten.`);
        _templates.set(type, object);
    };

    // Store a default definition to use when macro type cannot be found.
    let _default = function() {};
    _default.prototype = Object.create(Macro.prototype);

    let _templates = new Map();

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Parsing logic
     */

    /**
     * @func                        Parse a given macro
     * @param type{String}          Type of macro.
     * @param element{HTMLElement}  Macro element
     *
     * TODO(randomuserhi): Fix bug where if encapsulate is being used and strict is true, it shouldnt prevent properties
     *                     since they are encapsulated. Basically move the check over to encapsulate as opposed to the properties
     *                     or something.
     */
    let _parse = function(element, type)
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
        if ((element[_symbols._constructed] !== "" && !element[_symbols._constructed]) && RHU.properties(element, { hasOwn: true }).size !== 0) 
            throw new TypeError(`Element is not eligible to be used as a rhu-macro.`);

        // return if type has not changed
        if (element[_symbols._constructed] === type) return;

        // Clear old element properties
        RHU.delete(element);

        // Purge old dom
        Element.prototype.replaceChildren.call(element);

        // Get constructor for type and type definition
        let constructor = _templates.get(type);
        if (!exists(constructor)) constructor = _default;
        let definition = Object.getPrototypeOf(constructor.prototype);
        let options = {
            strict: false,
            floating: false,
            encapsulate: undefined,
            content: undefined
        };
        if (exists(definition[_symbols._options]))
            for (let key in options) 
                if (exists(definition[_symbols._options][key])) 
                    options[key] = definition[_symbols._options][key];

        // Assign prototype methods
        // NOTE(randomuserhi): prototype methods are not stored in a proxy prototype
        //                     This may be confusing for those trying to access their methods via
        //                     Object.getPrototypeOf, but is done due to not utilizing a proxy
        //                     as described above.
        // Set target object
        let target = element;
        if (options.floating) target = Object.create(constructor.prototype);
        else _RHU.assign(target, constructor.prototype);

        // Get elements from parser 
        let doc = _RHU.domParser.parseFromString(exists(definition[_symbols._source]) ? definition[_symbols._source] : "", "text/html");

        // property object to hold element properties
        let properties = {};

        // Expand <rhu-macro> tags into their original macros
        let nested = [...doc.getElementsByTagName("rhu-macro")];
        for (let el of nested)
        {
            const typename = "rhu-type";
            let type = Element.prototype.getAttribute.call(el, typename);
            Element.prototype.removeAttribute.call(el, typename);
            let constructor = _templates.get(type);
            if (!exists(constructor)) constructor = _default;
            let definition = Object.getPrototypeOf(constructor.prototype);
            let options = {
                element: "<div></div>",
                strict: false,
                floating: false
            };
            if (exists(definition[_symbols._options]))
                for (let key in options) 
                    if (exists(definition[_symbols._options][key])) 
                        options[key] = definition[_symbols._options][key];

            // If the macro is floating, check for id, and create its property and parse it
            // we have to parse it manually here as floating macros don't have containers to 
            // convert to for the parser later to use.
            if (options.floating)
            {
                if (Element.prototype.hasAttribute.call(el, "rhu-id"))
                {
                    let identifier = Element.prototype.getAttribute.call(el, "rhu-id");
                    Element.prototype.removeAttribute.call(el, "rhu-id");
                    if (Object.prototype.hasOwnProperty.call(properties, identifier)) throw new SyntaxError(`Identifier '${identifier}' already exists.`);
                    if (options.strict && identifier in target) throw new SyntaxError(`Identifier '${identifier}' already exists.`);
                    _RHU.definePublicAccessor(properties, identifier, {
                        get() 
                        {
                            return el[_globalSymbols._instance];
                        }
                    });
                }
                _parse(el, type);
            }
            // If the macro is not floating, parse it and create the container the macro needs to be inside
            else
            {
                let doc = _RHU.domParser.parseFromString(options.element, "text/html");
                let macro = doc.body.children[0];
                if (!exists(macro)) macro = doc.head.children[0];
                if (!exists(macro)) console.error(`No valid container element to convert into macro was found for '${type}'.`);
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

            if (Object.prototype.hasOwnProperty.call(properties, identifier)) throw new SyntaxError(`Identifier '${identifier}' already exists.`);
            if (options.strict && identifier in target) throw new SyntaxError(`Identifier '${identifier}' already exists.`);

            _RHU.definePublicAccessor(properties, identifier, {
                get() { return el[_globalSymbols._instance]; }
            })
        }

        // Parse nested rhu-macros (can't parse floating macros as they don't have containers)
        nested = doc.querySelectorAll("*[rhu-macro]");
        for (let el of nested) _parse(el, el.rhuMacro);

        // NOTE(randomuserhi): When placing items into macro, account for <style> and other blocks
        //                     being placed in document head
        Element.prototype.append.call(element, ...doc.head.childNodes);
        Element.prototype.append.call(element, ...doc.body.childNodes);

        // Set content of macro 
        // NOTE(randomuserhi): Technically unnecessary and only relevant if option for content is true.
        //                     (Could just be a local variable, thats getted instead of a symbol property)
        target[_symbols._content] = [...Node_childNodes.call(element)];

        // Set content variable if set:
        if (exists(options.content))
        {            
            if (typeof options.content !== "string") throw new TypeError("Option 'content' must be a string.");
            
            if (Object.prototype.hasOwnProperty.call(properties, options.content)) throw new SyntaxError(`Identifier '${options.content}' already exists.`);
            if (options.strict && options.content in target) throw new SyntaxError(`Identifier '${options.content}' already exists.`);
            
            _RHU.definePublicAccessor(properties, options.content, {
                get() { return target[_symbols._content]; }
            });
        }

        if (options.floating)
        {
            // If we are floating, replace children
            // If no parent, unbind children
            if (exists(Node_parentNode.call(element))) Element.prototype.replaceWith.call(element, ...Node_childNodes.call(element));
            else Element.prototype.replaceWith.call(element);

            // If we are floating, set instance to be the new target object instead of the element container:
            _RHU.defineProperties(element, {
                [_globalSymbols._instance]: {
                    get() { return target; }
                }
            });
        }
        
        // Add properties to target => TODO(randomuserhi): check when strict mode is active if the encapsulate 
        //                                                 property clashes with any other properties.
        if (exists(options.encapsulate))
        {            
            if (typeof options.encapsulate !== "string") throw new TypeError("Option 'encapsulate' must be a string.");
            _RHU.definePublicAccessor(target, options.encapsulate, {
                get() { return properties; }
            });
        }
        else _RHU.assign(target, properties);

        constructor.call(target);

        // Set constructed type for both target and element
        // NOTE(randomuserhi): You need to set it for both, since if the element is a proxy
        //                     for the floating macro it needs to be considered constructed
        target[_symbols._constructed] = type;
        element[_symbols._constructed] = type;
    }

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Create interface for Macro
     */

    _RHU.definePublicProperties(_RHU, {
        Macro: {
            enumerable: false,
            value: Macro
        }
    });

    _RHU.definePublicAccessors(RHU, {
        Macro: {
            get() { return _RHU.Macro; }
        }
    });

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Create and trigger onload event
     */

    let _onDocumentLoad = function()
    {
        // NOTE(randomuserhi): We must call load event first so user-defined types are set first before we load
        //                     custom element otherwise custom element will parse with undefined macros (since
        //                     they just have not been loaded yet).
        
        window.dispatchEvent(new Event("load-rhu-macro"));
        
        _internalLoad();
    }
    if (document.readyState === "loading") 
        document.addEventListener("DOMContentLoaded", _onDocumentLoad);
    // Document may have loaded already since the script is declared as defer, in this case just call onload
    else 
        _onDocumentLoad();
    
})((window[Symbol.for("RHU")] || (window[Symbol.for("RHU")] = {})), // Internal library that can only be accessed via Symbol.for("RHU")
   (window["RHU"] || (window["RHU"] = {}))); // Public interfact for library