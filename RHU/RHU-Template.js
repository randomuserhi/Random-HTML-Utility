if (!document.currentScript.defer) console.warn("'RHU-Template.js' should be loaded with either 'defer' keyword or at the end of <body></body>.");

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
        customElements.define("rhu-template", _Template);
    }

    let _globalSymbols = _RHU._globalSymbols;
    let _symbols = {};
    _RHU.defineProperties(_symbols, {
        _type: {
            value: Symbol("template type")
        },
        _source: {
            value: Symbol("template source")
        },
        _options: {
            value: Symbol("template options")
        },
        _constructed: {
            value: Symbol("template constructed")
        },
        _slot: {
            value: Symbol("template slot")
        }
    });

    // ------------------------------------------------------------------------------------------------------

    HTMLDocument.prototype.createTemplate = function(type)
    {
        let element = this.createElement("rhu-template");
        element.type = type;
        return element;
    };

    let Node_childNodes = Object.getOwnPropertyDescriptor(Node.prototype, "childNodes").get;

    // ------------------------------------------------------------------------------------------------------

    let _construct = function()
    {
        this[_symbols._slot] = null;
        this[_symbols._constructed] = false;
    }

    /**
     * NOTE(randomuserhi): Acts like a traditional destructor, needs to cleanup things like mutationObservers etc...
     */
    let _deconstruct = function()
    {
        // Delete element properties
        _RHU.delete(this);
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
         *                     Element -> Proxy Object (from Object.create) -> _Template.prototype -> HTMLElement.prototype
         *
         *                     This proxy object is what gets extended with user functionality.
         */
        Object.setPrototypeOf(this, Object.create(_Template.prototype));
    }

    let _Template = function()
    {
        let el = Reflect.construct(HTMLElement, [], _Template);

        _construct.call(el);

        return el;
    }
    /**  
     * @func{public override} callback that is triggered when rhu-template type changes
     *                        https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks
     */
    _Template.prototype.attributeChangedCallback = function(name, oldValue, newValue)
    {
        // Trigger parse on type change
        if (oldValue != newValue) _parse(newValue, this);
    };
    _RHU.definePublicAccessors(_Template, {
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
    _RHU.definePublicAccessors(_Template.prototype, {
        type: {
            get() 
            {
                return this.getAttribute("rhu-type");
            },
            set(type)
            {
                this.setAttribute("rhu-type", type);
            }
        },

        /**
         * @get{public} childNodes{-} Template elements dont have childNodes
         */   
        childNodes: {
            get() 
            {
                let slot = this[_symbols._slot];
                if (slot) return slot.childNodes;
                else throw new Error(`Cannot get 'childNodes' of template without a slot.`);
            }
        },
        /**
         * @get{public} children{-} Template elements dont have children
         */
        children: {
            get() 
            {
                let slot = this[_symbols._slot];
                if (slot) return slot.children;
                else throw new Error(`Cannot get 'children' of template without a slot.`);
            }
        }
    });
    /**  
     * @func{public override} Override append to use slot
     * @param ...items{Object} items being appended
     */
    _Template.prototype.append = function(...items) 
    {
        let slot = this[_symbols._slot];
        if (slot) slot.append(...items);
        else throw new Error(`Cannot call 'append' on template without a slot.`);
    };
    /**  
     * @func{public override} Override prepend to use slot
     * @param ...items{Object} items being prepended
     */
    _Template.prototype.prepend = function(...items) 
    {
        let slot = this[_symbols._slot];
        if (slot) slot.prepend(...items);
        else throw new Error(`Cannot call 'prepend' on template without a slot.`);
    };
    /**  
     * @func{public override} Override appendChild to use slot
     * @param item{Object} item being appended
     */
    _Template.prototype.appendChild = function(item)
    {
        let slot = this[_symbols._slot];
        if (slot) slot.appendChild(item);
        else throw new Error(`Cannot call 'appendChild' on template without a slot.`);
    };
    /**  
     * @func{public override} Override replaceChildren to use slot
     * @param ...items{Object} items to replace children with
     */
    _Template.prototype.replaceChildren = function(...items) 
    {
        let slot = this[_symbols._slot];
        if (slot) slot.replaceChildren(...items);
        else throw new Error(`Cannot call 'replaceChildren' on template without a slot.`);
    };
    _RHU.inherit(_Template, HTMLElement);

    // ------------------------------------------------------------------------------------------------------

    /**
     * @class{RHU.Template} Describes a RHU template
     * @param object{Object} object type of template
     * @param type{string} type name of template
     * @param source{string} HTML of template
     * @param options{Object} TODO(randomuserhi): document this object
     */
    let Template = function(object, type, source, options = {})
    {
        /**
         * @property{private} _type{string} name of component
         * @property{private} _source{string} HTML source of component
         * @property{private} _options{Object} TODO(randomuserhi): document this object
         */

        if (new.target === undefined) throw new TypeError("Constructor Template requires 'new'.");
        if (type == "") throw new SyntaxError("'type' cannot be blank.");
        if (typeof type !== "string") throw new TypeError("'type' must be a string.");
        if (typeof source !== "string") throw new TypeError("'source' must be a string.");
        if (!_RHU.isConstructor(object)) throw new TypeError("'object' must be a constructor.");

        /** 
         * Set prototype of object to make it a template
         * NOTE(randomuserhi): setPrototypeOf is not very performant due to how they are handled
         *                     internally: https://mathiasbynens.be/notes/prototypes
         *                     In this case, it should only be called on template definition, which should
         *                     only run once which is fine.
         */
        Object.setPrototypeOf(object.prototype, this);

        // Create definition
        this[_symbols._type] = type;
        this[_symbols._source] = source;
        this[_symbols._options] = options;

        // Add constructor to template map
        if (_templates.has(type)) console.warn(`Template template '${type}' already exists. Definition will be overwritten.`);
        _templates.set(type, object);
    };

    let _default = function() {};
    _default.prototype = Object.create(Template.prototype);

    let _templates = new Map();

    // ------------------------------------------------------------------------------------------------------

    let _parse = function(type, element)
    {
        element[_symbols._constructed] = false;

        let _slot = element[_symbols._slot];

        // Get children elements
        let frag = new DocumentFragment();
        if (exists(_slot)) frag.append(..._slot.childNodes);
        else frag.append(...Node_childNodes.call(element));

        // Purge old dom
        HTMLElement.prototype.replaceChildren.call(element);

        // De-construct element (call destructor)
        _deconstruct.call(element)
        // Re-construct element (call constructor)
        _construct.call(element);

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

        // Find append targets
        // NOTE(randomuserhi): This must be performed before generating nested dom by attaching to body
        //                     such that it doesnt pull nested rhu-slot's from other templates as possible
        //                     targets.
        let possibleTargets = doc.getElementsByTagName("rhu-slot");
        // Obtain slot, if there isn't a provided slot then create a new one
        _slot = possibleTargets[0];
        if (!_slot) _slot = document.createElement("rhu-slot");
        element[_symbols._slot] = _slot;

        // Place content into a shadow
        let shadow = document.createElement("rhu-shadow");
        shadow.append(...doc.head.childNodes);
        shadow.append(...doc.body.childNodes);

        // Attach to body to expand nested elements using a shadow (Kinda hacky solution)
        _body.appendChild(shadow);

        // Place items back onto template
        HTMLElement.prototype.appendChild.call(element, shadow);

        // Remove shadow
        shadow.replaceWith(...shadow.childNodes);

        // Append children back into slot
        _slot.append(...frag.childNodes);

        // Call constructor
        constructor.call(element);

        // Set template as constructed
        element[_symbols._constructed] = true;
    }

    // ------------------------------------------------------------------------------------------------------

    _RHU.definePublicProperties(_RHU, {
        Template: {
            enumerable: false,
            value: Template
        }
    });

    _RHU.definePublicAccessors(RHU, {
        Template: {
            get() { return _RHU.Template; }
        }
    });

    // ------------------------------------------------------------------------------------------------------

    let _onDocumentLoad = function()
    {
        window.dispatchEvent(new Event("load-rhu-template"));
        
        _internalLoad();
    }
    if (document.readyState === "loading") 
        document.addEventListener("DOMContentLoaded", _onDocumentLoad);
    else 
        _onDocumentLoad();
	
})((window[Symbol.for("RHU")] || (window[Symbol.for("RHU")] = {})),
   (window["RHU"] || (window["RHU"] = {})));