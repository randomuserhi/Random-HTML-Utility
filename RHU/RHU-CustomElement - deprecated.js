/**
 * RHU - Random HTML Utility
 * @randomuserhi.github.io
 */

"use strict";

if (!document.currentScript.defer) console.warn("'RHU-CustomElement.js' should be loaded with either 'defer' keyword or at the end of <body></body>.");

if (window[Symbol.for("RHU")] === undefined ||
    window[Symbol.for("RHU")] === null)
    throw new Error("Missing RHU dependency.");

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
            value: Symbol("CustomElement type")
        },
        _source: {
            value: Symbol("CustomElement source")
        },
        _options: {
            value: Symbol("CustomElement options")
        },
        _constructed: {
            value: Symbol("CustomElement constructed")
        },
        _shadow: {
            value: Symbol("shadow dom")
        }
    });

    // ------------------------------------------------------------------------------------------------------

    /**
     * @func                    Creates a RHU CustomElement
     * @param object{Object}    Object type of CustomElement
     * @param type{string}      Type name of CustomElement
     * @param source{string}    HTML of CustomElement
     * @param options{Object}   TODO(randomuserhi): document this object
     */
    let CustomElement = function(object, type, source, options = { })
    {
        if (new.target !== undefined) throw new TypeError("CustomElement cannot be called with 'new'.");
        if (type == "") throw new SyntaxError("'type' cannot be blank.");
        if (typeof type !== "string") throw new TypeError("'type' must be a string.");
        if (typeof source !== "string") throw new TypeError("'source' must be a string.");
        if (!_RHU.isConstructor(object)) throw new TypeError("'object' must be a constructor.");

        /**
         * @class{dynamic} Dynamically define a class for custom element
         */
        let custom = function()
        {
            let construct = Reflect.construct(HTMLElement, [], custom);

            (function() {

                /**
                 * @property{symbol} _shadow{Node}  ShadowDom of element
                 */

                let o = {
                    strict: false,
                    mode: "closed"
                };
                if (exists(options))
                    for (let key in o) 
                        if (exists(options[key])) 
                            o[key] = options[key];

                // Create shadow dom
                this[_symbols._shadow] = this.attachShadow({ mode: o.mode });
                let _shadow = this[_symbols._shadow];

                // Get elements from parser 
                let doc = _RHU.domParser.parseFromString(exists(source) ? source : "", "text/html");

                // Create properties
                let referencedElements = doc.querySelectorAll("*[rhu-id]");
                let properties = {};
                for (let el of referencedElements)
                {
                    let identifier = el.getAttribute("rhu-id");
                    el.removeAttribute("rhu-id");
                    if (Object.prototype.hasOwnProperty.call(properties, identifier)) throw new SyntaxError(`Identifier '${identifier}' already exists.`);
                    if (options.strict && identifier in this) throw new SyntaxError(`Identifier '${identifier}' already exists.`);
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
                    _RHU.definePublicAccessor(this, options.encapsulate, {
                        get() { return properties; }
                    });
                }
                else _RHU.assign(this, properties);

                // Place content into shadow
                _shadow.append(...doc.head.childNodes);
                _shadow.append(...doc.body.childNodes);

                // Store old location
                let insertion = document.createElement("div");
                if (exists(this.parentNode))
                    this.parentNode.insertBefore(insertion, this);

                // Attach element to body to expand children
                _body.append(this);

                // Restore location
                if (exists(insertion.parentNode))
                    insertion.replaceWith(this);
                else
                    this.remove();
                
                // Add default styles
                _RHU.insertDefaultStyles(_shadow);

                // Call constructor
                object.call(this);

            }).call(construct);

            return construct;
        }
        /**
         * @get shadow{ShadowDom} ShadowDom of custom element.
         */
        Object.defineProperty(custom.prototype, "shadow", {
            get() 
            {
                return this[_symbols._shadow];
            }
        });
        _RHU.inherit(custom, HTMLElement);
        // Extend prototype by object
        Object.assign(custom.prototype, object.prototype);
        custom.constructor = custom;

        // As per creating custom elements, define them 
        customElements.define(`rhu-${type}`, custom);
    };

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Create interface for CustomElement
     */

    _RHU.definePublicProperties(_RHU, {
        CustomElement: {
            enumerable: false,
            value: CustomElement
        }
    });

    _RHU.definePublicAccessors(RHU, {
        CustomElement: {
            get() { return _RHU.CustomElement; }
        }
    });

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Create and trigger onload event
     */

    let _onDocumentLoad = function()
    {
        window.dispatchEvent(new Event("load-rhu-customelement"));
    }
    if (document.readyState === "loading") 
        document.addEventListener("DOMContentLoaded", _onDocumentLoad);
    // Document may have loaded already since the script is declared as defer, in this case just call onload
    else 
        _onDocumentLoad();
    
})((window[Symbol.for("RHU")] || (window[Symbol.for("RHU")] = {})), // Internal library that can only be accessed via Symbol.for("RHU")
   (window["RHU"] || (window["RHU"] = {}))); // Public interfact for library