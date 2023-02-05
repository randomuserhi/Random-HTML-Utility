if (!document.currentScript.defer) console.warn("'RHU-Component.js' should be loaded with either 'defer' keyword or at the end of <body></body>.");

/**
 * @namespace RHU
 *
 * TODO(randomuserhi): Figure out how I'm gonna handle mutation observers and callbacks, since parsing involves a lot of moving
 *                     DOM elements around, mutation observer will trigger for all of them so you will get unnecessary callbacks.
 */
(function (_RHU, RHU) 
{

    let exists = _RHU.exists;

    // ------------------------------------------------------------------------------------------------------

    let _body = (function()
    {
        if (exists(document.body)) return document.body;
        throw new Error(`Unable to get document.body. Try loading this script with 'defer' keyword or at the end of <body></body>.`);
    })();

    let _internalLoad = function()
    {
        customElements.define("rhu-component", _Component);
    }

    let _globalSymbols = _RHU._globalSymbols;
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

    // ------------------------------------------------------------------------------------------------------

    HTMLDocument.prototype.createComponent = function(type)
    {
        let element = this.createElement("rhu-component");
        element.type = type;
        return element;
    };

    // ------------------------------------------------------------------------------------------------------

    let _construct = function()
    {
        this[_symbols._constructed] = false;
        // TODO(randomuserhi): Add a way to let people declare closed or opened shadow prior to importing component
        //                     module
        if (!exists(this[_symbols._shadow])) 
            this[_symbols._shadow] = this.attachShadow({ mode: "closed" });
    }

    /**
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

    let _Component = function()
    {
        let el = Reflect.construct(HTMLElement, [], _Component);

        _construct.call(el);

        return el;
    }
    /**  
     * @func{public override} callback that is triggered when rhu-component type changes
     *                        https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks
     */
    _Component.prototype.attributeChangedCallback = function(name, oldValue, newValue)
    {
        // Trigger parse on type change
        if (oldValue != newValue) _parse(newValue, this);
    };
    _RHU.definePublicAccessors(_Component, {
        /**
         * @get{public static} observedAttributes{Array[string]} As per HTML Spec provide which 
         *                     attributes that are being watched
         */ 
        observedAttributes: {
            get() 
            {
                return ["rhu-type"];
            }
        },
    });
    _RHU.definePublicAccessors(_Component.prototype, {
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

    // ------------------------------------------------------------------------------------------------------

    /**
     * @class{RHU.Component} Describes a RHU component
     * @param object{Object} object type of component
     * @param type{string} type name of component
     * @param source{string} HTML of component
     * @param options{Object} TODO(randomuserhi): document this object
     */
    let Component = function(object, type, source, options = {})
    {
        /**
         * @property{private} _type{string} name of component
         * @property{private} _source{string} HTML source of component
         * @property{private} _options{Object} TODO(randomuserhi): document this object
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

    let _default = function() {};
    _default.prototype = Object.create(Component.prototype);

    let _templates = new Map();

    // ------------------------------------------------------------------------------------------------------

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
            if (properties.hasOwnProperty(identifier)) throw new SyntaxError(`Identifier '${identifier}' already exists.`);
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

    // ------------------------------------------------------------------------------------------------------

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

    // ------------------------------------------------------------------------------------------------------

    let _onDocumentLoad = function()
    {
        window.dispatchEvent(new Event("load-rhu-component"));
        
        _internalLoad();
    }
    if (document.readyState === "loading") 
        document.addEventListener("DOMContentLoaded", _onDocumentLoad);
    else 
        _onDocumentLoad();
    
})((window[Symbol.for("RHU")] || (window[Symbol.for("RHU")] = {})),
   (window["RHU"] || (window["RHU"] = {})));