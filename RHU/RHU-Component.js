if (!document.currentScript.defer) console.warn("'RHU-Component.js' should be loaded with either 'defer' keyword or at the end of <body></body>.");

/**
 * @namespace _RHU (Symbol.for("RHU")), RHU
 * NOTE(randomuserhi): _RHU (Symbol.for("RHU")) is the internal library hidden from user, whereas RHU is the public interface.
 *
 * TODO(randomuserhi): Figure out how I'm gonna handle mutation observers and callbacks, since parsing involves a lot of moving
 *                     DOM elements around, mutation observer will trigger for all of them so you will get unnecessary callbacks.
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
     * Attempt to grab `document.body` element and store in `_body`, throw error if it fails.
     */

    let _body = (function()
    {
        if (exists(document.body)) return document.body;
        throw new Error(`Unable to get document.body. Try loading this script with 'defer' keyword or at the end of <body></body>.`);
    })();

    /**
     * @func Called on document load and will trigger parsing for <rhu-component>
     */
    let _internalLoad = function()
    {
        // Register element to begin parsing
        customElements.define("rhu-component", _Component);
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
            value: Symbol("component type")
        },
        _source: {
            value: Symbol("component source")
        },
        _options: {
            value: Symbol("component options")
        },
        _constructed: {
            value: Symbol("component constructed")
        },
        _shadow: {
            value: Symbol("shadow dom")
        }
    });

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Set HTMLElement and Node overrides or extended functionality
     */

    /**
     * @func                Create a component of type.
     * @param type{String}  Type of component.
     * @return{HTMLElement} Macro element.
     */
    HTMLDocument.prototype.createComponent = function(type)
    {
        let element = this.createElement("rhu-component");
        // NOTE(randomuserhi): Since `_internalLoad` is called after `load-rhu-template` callback,
        //                     `type` accessor hasn't been declared yet, so we use setAttribute.
        element.setAttribute("rhu-type", type);
        return element;
    };

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Define custom element <rhu-component> logic
     */

    /**
     * @func Constructor for <rhu-component> element
     */
    let _construct = function()
    {
        /**
         * @property{symbol} _constructed{Boolean}  If true, node has finished parsing and is constructed
         * @property{symbol} _shadow{Node}          ShadowDom of element
         */

        this[_symbols._constructed] = false;
        // TODO(randomuserhi): Add a way to let people declare closed or opened shadow prior to importing component
        //                     module
        // NOTE(randomuserhi): Elements cannot contain more than one shadow, so if it is defined, skip
        if (!exists(this[_symbols._shadow]))
            this[_symbols._shadow] = this.attachShadow({ mode: "closed" });
    }

    /**
     * @func Destructor for <rhu-component> element
     * NOTE(randomuserhi): Acts like a traditional destructor, needs to cleanup things like mutationObservers etc...
     */
    let _deconstruct = function()
    {
        // Delete element properties => maintain shadow between deletions
        _RHU.delete(this, { [_symbols._shadow]: undefined });
        /** 
         * Reset prototype
         *
         * NOTE(randomuserhi): setPrototypeOf is not very performant due to how they are handled
         *                     internally: https://mathiasbynens.be/notes/prototypes
         *                     
         *                     This is a problem since _deconstruct may be called frequently
         *                     from creating a ton of tempates. Benchmarking may be required
         *                     since this changes from engine to engine.
         *                     
         *                     Technically speaking, this only a problem on initial creation and 
         *                     subsequent type changes, as long as you don't change its type often
         *                     you should be fine. May vary on different browser engines so benchmark.
         *
         *                     Sadly I don't think I can avoid the use of setPrototypeOf that doesnt
         *                     require new custom elements since I want to keep functionality on the element.
         *
         * NOTE(randomuserhi): It is important that we use Object.create to make
         *                     a copy of the prototype, such that when we extend it
         *                     for user-defined items it does not effect the original
         *                     prototype.
         *
         *                     The prototype chain thus looks like:
         *                     Element -> Proxy Object (from Object.create) -> _Component.prototype -> HTMLElement.prototype
         *
         *                     This proxy object is what gets extended with user functionality.
         */
        Object.setPrototypeOf(this, Object.create(_Component.prototype));
    }

    /**
     * @class{_Component} Custom element for <rhu-component>
     */
    let _Component = function()
    {
        let el = Reflect.construct(HTMLElement, [], _Component);

        _construct.call(el);

        return el;
    }
    /**  
     * @func{override} callback that is triggered when rhu-component type changes
     *                 https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks
     */
    _Component.prototype.attributeChangedCallback = function(name, oldValue, newValue)
    {
        // Trigger parse on type change
        if (oldValue != newValue) _parse(newValue, this);
    };
    _RHU.definePublicAccessors(_Component, {
        /**
         * @get{static} observedAttributes{Array[String]} As per HTML Spec provide which 
         *              attributes that are being watched
         */ 
        observedAttributes: {
            get() 
            {
                return ["rhu-type"];
            }
        },
    });
    _RHU.definePublicAccessors(_Component.prototype, {
        /**
         * @get type{String} Get type of component
         * @set type{String} Set type of component
         */ 
        type: {
            get() 
            {
                return this.getAttribute("rhu-type");
            },
            set(type)
            {
                this.setAttribute("rhu-type", type);
            }
        }
    });
    _RHU.inherit(_Component, HTMLElement);

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Component definition
     */

    /**
     * @class{RHU.Component}        Describes a RHU component
     * @param object{Object}    Object definition for component
     * @param type{string}      type name of component
     * @param source{string}    HTML source of component
     * @param options{Object}   TODO(randomuserhi): document this object
     */
    let Component = function(object, type, source, options = {})
    {
        /**
         * @property{symbol} _type{String}      name of component
         * @property{symbol} _source{String}    HTML source of component
         * @property{symbol} _options{Object}   TODO(randomuserhi): document this object
         */

        if (new.target === undefined) throw new TypeError("Constructor Component requires 'new'.");
        if (type == "") throw new SyntaxError("'type' cannot be blank.");
        if (typeof type !== "string") throw new TypeError("'type' must be a string.");
        if (typeof source !== "string") throw new TypeError("'source' must be a string.");
        if (!_RHU.isConstructor(object)) throw new TypeError("'object' must be a constructor.");

        /** 
         * Set prototype of object to make it a component
         * NOTE(randomuserhi): setPrototypeOf is not very performant due to how they are handled
         *                     internally: https://mathiasbynens.be/notes/prototypes
         *                     In this case, it should only be called on component definition, which should
         *                     only run once which is fine.
         */
        Object.setPrototypeOf(object.prototype, this);

        // Create definition
        this[_symbols._type] = type;
        this[_symbols._source] = source;
        this[_symbols._options] = options;

        // Add constructor to component map
        if (_templates.has(type)) console.warn(`Component template '${type}' already exists. Definition will be overwritten.`);
        _templates.set(type, object);
    };

    // Store a default definition to use when component type cannot be found.
    let _default = function() {};
    _default.prototype = Object.create(Component.prototype);

    let _templates = new Map();

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Parsing logic
     */

    /**
     * @func                        Parse a given component
     * @param type{String}          Type of component.
     * @param element{HTMLElement}  Component element <rhu-component>
     */
    let _parse = function(type, element)
    {
        element[_symbols._constructed] = false;

        // De-construct element (call destructor)
        _deconstruct.call(element)
        // Re-construct element (call constructor)
        _construct.call(element);

        // Purge old dom
        let _shadow = element[_symbols._shadow];
        _shadow.replaceChildren();

        // Get constructor for type and type definition
        let constructor = _templates.get(type);
        if (!exists(constructor)) constructor = _default;
        let definition = Object.getPrototypeOf(constructor.prototype);
        let options = {
            strict: false
        };
        if (exists(definition[_symbols._options]))
            for (let key in options) 
                if (exists(definition[_symbols._options][key])) 
                    options[key] = definition[_symbols._options][key];

        // Assign prototype
        _RHU.assign(Object.getPrototypeOf(element), constructor.prototype);

        // Get elements from parser 
        let doc = _RHU.domParser.parseFromString(exists(definition[_symbols._source]) ? definition[_symbols._source] : "", "text/html");

        // Create properties
        let referencedElements = doc.querySelectorAll("*[rhu-id]");
        let properties = {};
        for (let el of referencedElements)
        {
            let identifier = el.getAttribute("rhu-id");
            el.removeAttribute("rhu-id");
            if (Object.prototype.hasOwnProperty.call(properties, identifier)) throw new SyntaxError(`Identifier '${identifier}' already exists.`);
            if (options.strict && identifier in element) throw new SyntaxError(`Identifier '${identifier}' already exists.`);
            _RHU.definePublicAccessor(properties, identifier, {
                get() 
                {
                    return el[_globalSymbols._instance];
                }
            })
        }
        // Add properties to element
        if (exists(options.encapsulate))
        {            
            if (typeof options.encapsulate !== "string") throw new TypeError("Option 'encapsulate' must be a string.");
            _RHU.definePublicAccessor(element, options.encapsulate, {
                get() { return properties; }
            });
        }
        else _RHU.assign(element, properties);

        // Place content into a shadow
        let shadow = document.createElement("rhu-shadow");
        shadow.append(...doc.head.childNodes);
        shadow.append(...doc.body.childNodes);

        // Attach to body to expand nested elements using a shadow (Kinda hacky solution)
        _body.appendChild(shadow);

        // Place items back onto component
        _shadow.append(shadow);

        // Remove shadow
        shadow.replaceWith(...shadow.childNodes);

        // Call constructor
        constructor.call(element);

        // Set component as constructed
        element[_symbols._constructed] = true;
    }

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Create interface for Component
     */

    _RHU.definePublicProperties(_RHU, {
        Component: {
            enumerable: false,
            value: Component
        }
    });

    _RHU.definePublicAccessors(RHU, {
        Component: {
            get() { return _RHU.Component; }
        }
    });

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Create and trigger onload event
     */

    let _onDocumentLoad = function()
    {
        // NOTE(randomuserhi): We must call load event first so user-defined types are set first before we load
        //                     custom element otherwise custom element will parse with undefined templates (since
        //                     they just have not been loaded yet).

        window.dispatchEvent(new Event("load-rhu-component"));
        
        _internalLoad();
    }
    if (document.readyState === "loading") 
        document.addEventListener("DOMContentLoaded", _onDocumentLoad);
    // Document may have loaded already since the script is declared as defer, in this case just call onload
    else 
        _onDocumentLoad();
    
})((window[Symbol.for("RHU")] || (window[Symbol.for("RHU")] = {})), // Internal library that can only be accessed via Symbol.for("RHU")
   (window["RHU"] || (window["RHU"] = {}))); // Public interfact for library