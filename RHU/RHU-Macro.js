if (!document.currentScript.defer) console.warn("'RHU-Macro.js' should be loaded with either 'defer' keyword or at the end of <body></body>.");

/**
 * @namespace RHU
 *
 * TODO(randomuserhi): Figure out a way to have macros in rhu-querycontainer share tree structure of how they are added to DOM
 *
 * NOTE(randomuserhi): Not sure if this API is better, or if I should make macros not use the <rhu-macro> header at all and adopt
 *                     a child node as the header much like the deprecated version. It would certainly make the logic a lot nicer,
 *                     but this has other benefits with moving macros around without .content etc...
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

    let _queryContainer = document.createElement("rhu-querycontainer");
    let _internalLoad = function()
    {
        //Append query container to DOM
        _body.append(_queryContainer);
        
        customElements.define("rhu-macro", _Macro);
    }

    let _globalSymbols = _RHU._globalSymbols;
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
        },
        _parentNode: {
            value: Symbol("macro parentNode")
        },
        _parentElement: {
            value: Symbol("macro parentElement")
        },
        _owned: {
            value: Symbol("owned macros")
        }
    });

    // ------------------------------------------------------------------------------------------------------

    HTMLDocument.prototype.createMacro = function(type)
    {
        let element = this.createElement("rhu-macro");
        element.type = type;
        return element;
    };

    let Node_removeChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function(node) 
    {
        if (!exists(this[_symbols._owned])) this[_symbols._owned] = new WeakMap();
        if (this[_symbols._owned].has(node))
        {
            node.remove();
            return node;
        }

        return Node_removeChild.call(this, node);        
    }

    let Node_parentElement = Object.getOwnPropertyDescriptor(Node.prototype, "parentElement").get;
    let Node_parentNode = Object.getOwnPropertyDescriptor(Node.prototype, "parentNode").get;

    // ------------------------------------------------------------------------------------------------------

    let _construct = function()
    {
        this[_symbols._content] = [];
        this[_symbols._constructed] = false;
        this[_symbols._parentNode] = null;
        this[_symbols._parentElement] = null;
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
         *                     from creating a ton of macros. Benchmarking may be required
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
         *                     Element -> Proxy Object (from Object.create) -> _Macro.prototype -> HTMLElement.prototype
         *
         *                     This proxy object is what gets extended with user functionality.
         */
        Object.setPrototypeOf(this, Object.create(_Macro.prototype));
    }

    let _Macro = function()
    {
        let el = Reflect.construct(HTMLElement, [], _Macro);

        _construct.call(el);

        return el;
    }
    _Macro.prototype.connectedCallback = function()
    {
        let parentNode = Node_parentNode.call(this);
        let parentElement = Node_parentElement.call(this);
        if (exists(parentNode) && parentNode !== _queryContainer && this[_symbols._constructed] === true)
        {
            this[_symbols._constructed] = false;
            
            HTMLElement.prototype.replaceWith.call(this, ...this[_symbols._content]);
            this[_symbols._parentNode] = parentNode;
            this[_symbols._parentElement] = parentElement;
            if (parentNode.getRootNode() === document)
                _queryContainer.append(this); // Append macro to query container for queries if its not part of shadow dom

            if (!exists(parentNode[_symbols._owned])) parentNode[_symbols._owned] = new WeakMap();
            parentNode[_symbols._owned].set(this);

            this[_symbols._constructed] = true;
        }
    }
    _Macro.prototype.disconnectedCallback = function() // Element.prototype.remove
    {
        if (this[_symbols._constructed] === true)
        {
            let parentNode = this[_symbols._parentNode];
            if (exists(parentNode))
            {
                if (!exists(parentNode[_symbols._owned])) parentNode[_symbols._owned] = new WeakMap();
                parentNode[_symbols._owned].delete(this);
            }
            this[_symbols._parentNode] = Node_parentNode.call(this);
            this[_symbols._parentElement] = Node_parentElement.call(this);
            if (!exists(this[_symbols._parentNode])) this.remove();
        }
    }
    _Macro.prototype.remove = function()
    {
        HTMLElement.prototype.append.call(this, ...this[_symbols._content]);
        Element.prototype.remove.call(this);
    }
    /**  
     * @func{public override} callback that is triggered when rhu-macro type changes
     *                        https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks
     */
    _Macro.prototype.attributeChangedCallback = function(name, oldValue, newValue)
    {
        // Trigger parse on type change
        if (oldValue != newValue) _parse(newValue, this);
    };
    _RHU.definePublicAccessors(_Macro, {
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
    _RHU.definePublicAccessors(_Macro.prototype, {
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
        parentNode: {
            get() 
            {
                return this[_symbols._parentNode];
            }
        },
        parentElement: {
            get() 
            {
                return this[_symbols._parentElement];
            }
        },

        /**
         * @get{public} childNodes{-} Macro elements dont have childNodes
         */   
        childNodes: {
            get() 
            {
                throw new Error("'Macro' does not have children.");
            }
        },
        /**
         * @get{public} children{-} Macro elements dont have children
         */
        children: {
            get() 
            {
                throw new Error("'Macro' does not have children.");
            }
        }
    });
    /**  
     * @func{public override} Override append to use slot
     * @param ...items{Object} items being appended
     */
    _Macro.prototype.append = function(...items) 
    {
        throw new Error("'Macro' cannot append items.");
    };
    /**  
     * @func{public override} Override prepend to use slot
     * @param ...items{Object} items being prepended
     */
    _Macro.prototype.prepend = function(...items) 
    {
        throw new Error("'Macro' cannot prepend items.");
    };
    /**  
     * @func{public override} Override appendChild to use slot
     * @param item{Object} item being appended
     */
    _Macro.prototype.appendChild = function(item)
    {
        throw new Error("'Macro' cannot append child.");
    };
    /**  
     * @func{public override} Override replaceChildren to use slot
     * @param ...items{Object} items to replace children with
     */
    _Macro.prototype.replaceChildren = function(...items) 
    {
        throw new Error("'Macro' cannot replace children.");
    };
    _RHU.inherit(_Macro, HTMLElement);

    // ------------------------------------------------------------------------------------------------------

    /**
     * @class{RHU.Macro} Describes a RHU macro
     * @param object{Object} object type of macro
     * @param type{string} type name of macro
     * @param source{string} HTML of macro
     * @param options{Object} TODO(randomuserhi): document this object
     */
    let Macro = function(object, type, source, options = {})
    {
        /**
         * @property{private} _type{string} name of component
         * @property{private} _source{string} HTML source of component
         * @property{private} _options{Object} TODO(randomuserhi): document this object
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
         *                     In this case, it should only be called on Macro definition, which should
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

    let _default = function() {};
    _default.prototype = Object.create(Macro.prototype);

    let _templates = new Map();

    // ------------------------------------------------------------------------------------------------------

    let _parse = function(type, element)
    {
        element[_symbols._constructed] = false;

        // Purge old dom
        HTMLElement.prototype.replaceChildren.call(element);
        let content = element[_symbols._content];
        
        // mark old location
        let insertion = document.createElement("rhu-shadow");
        if (exists(content[0])) content[0].parentNode.insertBefore(insertion, content[0]);
        else if (exists(element.parentNode)) 
        {
            if (element.parentNode.contains(element) && Node_parentNode.call(element) === element.parentNode) 
                element.parentNode.insertBefore(insertion, element);
            else 
            {
                // NOTE(randomuserhi): If there is no content and element isn't located at insertion point (its in the query container)
                //                     the macro has no idea where to insert its content, thus the warning.
                //                     This should only happen if you set the type to undefined since otherwise you should have
                //                     declared content.
                console.warn("<rhu-macro> insertion point lost. Inserting to end of original parent.")
                element.parentNode.append(insertion);
            }
        }
        else if (exists(Node_parentNode.call(element))) Node_parentNode.call(element).insertBefore(insertion, element);

        // Purge old dom content
        if (exists(content))
            for (let el of content)
                el.remove();


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

        // Place content into a shadow
        let shadow = document.createElement("rhu-shadow");
        shadow.append(...doc.head.childNodes);
        shadow.append(...doc.body.childNodes);
        element[_symbols._content] = [...shadow.childNodes];

        // Attach to body to expand nested elements using a shadow (Kinda hacky solution)
        _body.appendChild(shadow);

        // Place items back onto macro
        HTMLElement.prototype.appendChild.call(element, shadow);

        // Remove shadow
        shadow.replaceWith(...shadow.childNodes);

        // Call constructor
        constructor.call(element);

        // Set macro as constructed
        element[_symbols._constructed] = true;

        // Insert element in old location
        insertion.replaceWith(element);
    }

    // ------------------------------------------------------------------------------------------------------

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

    // ------------------------------------------------------------------------------------------------------

    let _onDocumentLoad = function()
    {
        window.dispatchEvent(new Event("load-rhu-macro"));
        
        _internalLoad();
    }
    if (document.readyState === "loading") 
        document.addEventListener("DOMContentLoaded", _onDocumentLoad);
    else 
        _onDocumentLoad();
    
})((window[Symbol.for("RHU")] || (window[Symbol.for("RHU")] = {})),
   (window["RHU"] || (window["RHU"] = {})));