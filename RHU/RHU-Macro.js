if (!document.currentScript.defer) console.warn("'RHU-Macro.js' should be loaded with either 'defer' keyword or at the end of <body></body>.");

/**
 * @namespace _RHU (Symbol.for("RHU")), RHU
 * NOTE(randomuserhi): _RHU (Symbol.for("RHU")) is the internal library hidden from user, whereas RHU is the public interface.
 *
 * TODO(randomuserhi): Figure out a way to have macros in rhu-querycontainer share tree structure of how they are added to DOM
 *
 * TODO(randomuserhi): Create a "query: false" option that makes macro header not append to querycontainer
 *
 * NOTE(randomuserhi): Not sure if this API is better, or if I should make macros not use the <rhu-macro> header at all and adopt
 *                     a child node as the header much like the deprecated version. It would certainly make the logic a lot nicer
 *                     and you don't have to deal with a querycontainer, but the current API has the benefit of no loose hanging
 *                     reference to macro header. Easier moving of the header etc...
 *                     - Maybe I can support both with a "header: false" option which removes the macro header
 *
 * TODO(randomuserhi): Figure out how I'm gonna handle mutation observers and callbacks, since parsing involves a lot of moving
 *                     DOM elements around, mutation observer will trigger for all of them so you will get unnecessary callbacks.
 *
 * TODO(randomuserhi): Find out a mechanism for handling nested Macro cases such as:
 *                     <rhu-macro>
 *                         <div>
 *                             <rhu-macro></rhu-macro>
 *                         </div>
 *                     </rhu-macro>
 *                     On removal of parent macro, child macro will not be cleared correctly
 *                     depending on formation (e.g if child macro is moved elsewhere (mutated macro contents essentially))
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
     * Create queryContainer that will hold <rhu-macro> headers.
     * This allows for them to still be queried in the DOM via `document.getElementById` and `document.querySelector`
     */
    let _queryContainer = document.createElement("rhu-querycontainer");
    
    /**
     * @func Called on document load and will trigger parsing for <rhu-macro>
     */
    let _internalLoad = function()
    {
        // Append query container to DOM
        _body.append(_queryContainer);
        
        // Register element to begin parsing
        customElements.define("rhu-macro", _Macro);
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
        },
        _parentNode: {
            value: Symbol("macro parentNode")
        },
        _parentElement: {
            value: Symbol("macro parentElement")
        },
        _parentMacro: {
            value: Symbol("macro parentMacro")
        },
        _childMacros: {
            value: Symbol("macro childMacros")
        },
        _owned: {
            value: Symbol("owned macros")
        }
    });

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Set HTMLElement and Node overrides or extended functionality
     */

    /**
     * @func                Create a macro of type.
     * @param type{String}  Type of macro.
     * @return{HTMLElement} Macro element.
     */
    HTMLDocument.prototype.createMacro = function(type)
    {
        let element = this.createElement("rhu-macro");
        // NOTE(randomuserhi): Since `_internalLoad` is called after `load-rhu-template` callback,
        //                     `type` accessor hasn't been declared yet, so we use setAttribute.
        element.setAttribute("rhu-type", type);
        return element;
    };

    /**
     * @func                Override removeChild functionality to handle <rhu-macro> headers that are stored in queryContainer
     * @param node{Node}    Node to remove.
     * @return{Node}        Node removed.
     */
    let Node_removeChild = Node.prototype.removeChild; // NOTE(randomuserhi): Store a reference to original function to use.
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

    // NOTE(randomuserhi): Store a reference to base accessors for parentElement and parentNode to use.
    let Node_parentElement = Object.getOwnPropertyDescriptor(Node.prototype, "parentElement").get;
    let Node_parentNode = Object.getOwnPropertyDescriptor(Node.prototype, "parentNode").get;

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Define custom element <rhu-macro> logic
     */

    /**
     * @func Constructor for <rhu-macro> element
     */
    let _construct = function()
    {
        /**
         * @property{symbol} _content{Array[Node]}              List of nodes that compose this macro
         * @property{symbol} _constructed{Boolean}              If true, node has finished parsing and is constructed
         * @property{symbol} _parentMacro{HTMLElement}          parent macro if this macro is part of a nested macro
         * @property{symbol} _childMacros{Array[HTMLElement]}   child macros if this macro is the parent of a nested macro
         * @property{symbol} _parentNode{Node}                  parentNode of macro, not the parentNode of <rhu-macro> header.
         * @property{symbol} _parentElement{HTMLElement}        parentElement of macro, not the parentElement of <rhu-macro> header.
         */

        this[_symbols._content] = [];
        this[_symbols._constructed] = false;
        this[_symbols._parentMacro] = null;
        this[_symbols._childMacros] = [];
        this[_symbols._parentNode] = null;
        this[_symbols._parentElement] = null;
    }

    /**
     * @func Destructor for <rhu-macro> element
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

    /**
     * @class{_Macro} Custom element for <rhu-macro>
     */
    let _Macro = function()
    {
        let el = Reflect.construct(HTMLElement, [], _Macro);

        _construct.call(el);

        return el;
    }
    /**
     * @func Handle connected callback to consume macro header and set parent properties appropriately.
     */
    _Macro.prototype.connectedCallback = function()
    {
        // Get parent node and element
        let parentNode = Node_parentNode.call(this);
        let parentElement = Node_parentElement.call(this);

        // Check that macro is constructed, is attached to a parent, and has not been moved to queryContainer
        if (exists(parentNode) && !_queryContainer.contains(parentNode) && this[_symbols._constructed] === true)
        {
            // Set constructed to false as we resume construction
            this[_symbols._constructed] = false;
            
            // Replace macro header (<rhu-macro>) with its content
            HTMLElement.prototype.replaceWith.call(this, ...this[_symbols._content]);
            
            // Set nodes
            this[_symbols._parentNode] = parentNode;
            this[_symbols._parentElement] = parentElement;
            if (parentNode.getRootNode() === document)
            {
                let parentMacro = this[_symbols._parentMacro];

                // Append macro to query container for document queries if its not part of shadow dom
                // and it is not owned by another macro
                if (exists(parentMacro) && _queryContainer.contains(parentMacro)) HTMLElement.prototype.append.call(this[_symbols._parentMacro], this);
                else _queryContainer.append(this);

                HTMLElement.prototype.append.call(this, ...this[_symbols._childMacros])
            }

            // Let the parent know that it has a macro under its ownership
            // NOTE(randomuserhi): A weak map is used such that if macro is discarded without removing from map,
            //                     it can still be garbage collected and removed automatically
            if (!exists(parentNode[_symbols._owned])) parentNode[_symbols._owned] = new WeakMap();
            parentNode[_symbols._owned].set(this);

            // Exit construction state.
            this[_symbols._constructed] = true;
        }
    }
    _Macro.prototype.disconnectedCallback = function() // Element.prototype.remove
    {
        // Check that macro is constructed
        if (this[_symbols._constructed] === true)
        {
            // Check if parent exists
            let parentNode = this[_symbols._parentNode];
            if (exists(parentNode))
            {
                // If so, then remove macro from its ownership
                // NOTE(randomuserhi): A weak map is used such that if macro is discarded without removing from map,
                //                     it can still be garbage collected and removed automatically.
                if (!exists(parentNode[_symbols._owned])) parentNode[_symbols._owned] = new WeakMap();
                parentNode[_symbols._owned].delete(this);
            }

            // Update parent properties
            this[_symbols._parentNode] = Node_parentNode.call(this);
            this[_symbols._parentElement] = Node_parentElement.call(this);

            // If we were not re-attached to a new parent, remove macro from DOM
            if (!exists(this[_symbols._parentNode])) this.remove();
        }
    }
    /**
     *@func Override default remove behaviour to remove macro content.
     */
    _Macro.prototype.remove = function()
    {
        HTMLElement.prototype.append.call(this, ...this[_symbols._content]);
        Element.prototype.remove.call(this);
    }
    /**  
     * @func{override} callback that is triggered when rhu-macro type changes
     *                 https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks
     */
    _Macro.prototype.attributeChangedCallback = function(name, oldValue, newValue)
    {
        // Trigger parse on type change
        if (oldValue != newValue) _parse(newValue, this);
    };
    _RHU.definePublicAccessors(_Macro, {
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
    _RHU.definePublicAccessors(_Macro.prototype, {
        /**
         * @get type{String} Get type of macro
         * @set type{String} Set type of macro
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
        },
        /**
         * @get parentNode{Node} Get parent node of macro, not macro head (<rhu-macro>)
         */ 
        parentNode: {
            get() 
            {
                return this[_symbols._parentNode];
            }
        },
        /**
         * @get parentElement{Element} Get parent element of macro, not macro head (<rhu-macro>)
         */ 
        parentElement: {
            get() 
            {
                return this[_symbols._parentElement];
            }
        },

        /**
         * @get childNodes{-} Macro elements dont have childNodes
         */   
        childNodes: {
            get() 
            {
                throw new Error("'Macro' does not have children.");
            }
        },
        /**
         * @get children{-} Macro elements dont have children
         */
        children: {
            get() 
            {
                throw new Error("'Macro' does not have children.");
            }
        }
    });
    /**  
     * @func Macro elements cant be appended to
     */
    _Macro.prototype.append = function() 
    {
        throw new Error("'Macro' cannot append items.");
    };
    /**  
     * @func Macro elements cant be prepended to
     */
    _Macro.prototype.prepend = function() 
    {
        throw new Error("'Macro' cannot prepend items.");
    };
    /**  
     * @func Macro elements cant be appended to
     */
    _Macro.prototype.appendChild = function()
    {
        throw new Error("'Macro' cannot append child.");
    };
    /**  
     * @func Macro elements cant be appended to
     */
    _Macro.prototype.replaceChildren = function() 
    {
        throw new Error("'Macro' cannot replace children.");
    };
    _RHU.inherit(_Macro, HTMLElement);

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Macro definition
     */

    /**
     * @class{RHU.Macro}        Describes a RHU macro
     * @param object{Object}    Object definition for macro
     * @param type{string}      type name of macro
     * @param source{string}    HTML source of macro
     * @param options{Object}   TODO(randomuserhi): document this object
     */
    let Macro = function(object, type, source, options = {})
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

    // Store a default definition to use when macro type cannot be found.
    let _default = function() {};
    _default.prototype = Object.create(Macro.prototype);

    let _templates = new Map();

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Parsing logic
     */

    /**
     * TODO(randomuserhi): Document this
     */
    let stack = [];
    /**
     * @func                        Parse a given macro
     * @param type{String}          Type of macro.
     * @param element{HTMLElement}  Macro element <rhu-macro>
     */
    let _parse = function(type, element)
    {
        element[_symbols._constructed] = false;

        // Purge old dom
        HTMLElement.prototype.replaceChildren.call(element);
        let content = element[_symbols._content];
        
        // mark old location to re-insert content to
        // TODO(randomuserhi): If macro is blank, use the macro itself as the insertion point...
        //                     so dom shows <rhu-macro></rhu-macro>
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

        // Append parent based on stack
        if (stack.length > 0) 
        {
            let parent = stack[stack.length - 1];
            element[_symbols._parentMacro] = parent;
            parent[_symbols._childMacros].push(element);
        }

        // Update construction stack
        stack.push(element);

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

        // Update construction stack
        stack.pop();
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
        //                     custom element otherwise custom element will parse with undefined templates (since
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