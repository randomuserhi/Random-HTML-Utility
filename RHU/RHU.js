/**
 * RHU - Random HTML Utility
 * @randomuserhi.github.io
 */

"use strict";

/**
 * @namespace RHU
 *
 * TODO(randomuserhi): Documentation!
 */
(function (_RHU, RHU) 
{

    let exists = function(obj)
    {
        return obj !== null && obj !== undefined;
    };

    let properties = function(obj, options = {}, operation = null)
    {
        let opt = {
            enumerable: undefined,
            configurable: undefined,
            properties: undefined,
            symbols: undefined,
            hasOwn: undefined,
            writable: undefined,
            get: undefined,
            set: undefined
        }
        for (let key in opt) if (exists(options[key])) opt[key] = options[key];

        /** 
         * NOTE(randomuserhi): In the event that Map() is not supported:
         *                     Can use an object {} and then do `properties[descriptor] = undefined`,
         *                     then use `for (let key in properties)` to return an array of properties.
         */
        let properties = new Map();
        let iterate = function(props, descriptors)
        {
            for (let p of props)
            {
                let descriptor = descriptors[p];
                let valid = true;
                
                if (opt.enumerable && descriptor.enumerable != opt.enumerable) valid = false;
                if (opt.configurable && descriptor.configurable != opt.configurable) valid = false;
                if (opt.writable && descriptor.writable != opt.writable) valid = false;
                if (opt.get == false && descriptor.get) valid = false;
                else if (opt.get == true && !descriptor.get) valid = false;
                if (opt.set == false && descriptor.set) valid = false;
                else if (opt.set == true && !descriptor.set) valid = false;

                if (valid) 
                {
                    if (!exists(properties.get(p)) && exists(operation))
                        operation(obj, p);
                    properties.set(p);
                }
            }
        }
        
        /**
         * NOTE(randomuserhi): Reflect.ownKeys() gets both symbols and non-symbols so it may be worth using that
         *                     when symbols is undefined
         */

        let curr = obj;
        do
        {
            let descriptors = Object.getOwnPropertyDescriptors(curr);
            
            if (!opt.symbols || opt.symbols == true)
            {
                let props = Object.getOwnPropertyNames(curr);
                iterate(props, descriptors);
            }
            
            if (!opt.symbols || opt.symbols == true)
            {
                let props = Object.getOwnPropertySymbols(curr);
                iterate(props, descriptors);
            }
        } while((curr = Object.getPrototypeOf(curr)) && !opt.hasOwn)
        
        return properties;
    };

    // TODO(randomuserhi): To make life easier for `RHU_STRICT_MODE`, I can check the prefix of p for a _ and make it not enumerable for `definePublicProperty` and `definePublicAccessor`
    //                     but this does mean that the function name isn't fully descriptive, maybe make it an option for { makePrivateNonEnumerable: true }

    let defineProperty = function(obj, p, o, options = {})
    {
        let opt = {
            replace: false,
            warn: false,
            err: false
        };
        for (let key in opt) if (exists(options[key])) opt[key] = options[key];

        if (opt.replace || !properties(obj, { hasOwn: true }).has(p))
        {
            delete obj[p]; // NOTE(randomuserhi): Should throw an error in Strict Mode when trying to delete a property of 'configurable: false'
            Object.defineProperty(obj, p, o);
            return true;
        }
        if (opt.warn) console.warn(`Failed to define property '${p}', it already exists. Try 'replace: true'`);
        if (opt.err) console.error(`Failed to define property '${p}', it already exists. Try 'replace: true'`);
        return false;
    };

    let definePublicProperty = function(obj, p, o, options = {})
    {
        let opt = {
            writable: true,
            enumerable: true
        };
        defineProperty(obj, p, Object.assign(opt, o), options);
    };

    let definePublicAccessor = function(obj, p, o, options = {})
    {
        let opt = {
            configurable: true,
            enumerable: true
        };
        defineProperty(obj, p, Object.assign(opt, o), options);
    };

    let defineProperties = function(obj, p, options = {})
    {
        for (let key in p)
        {
            if (p.hasOwnProperty(key))
            {
                defineProperty(obj, key, p[key], options);
            }
        }
    };

    let definePublicProperties = function(obj, p, options = {})
    {
        let opt = function()
        {
            this.writable = true;
            this.enumerable = true;
        };
        for (let key in p)
        {
            if (p.hasOwnProperty(key))
            {
                let o = Object.assign(new opt(), p[key]);
                defineProperty(obj, key, o, options);
            }
        }
    };

    let definePublicAccessors = function(obj, p, options = {})
    {
        let opt = function()
        {
            this.configurable = true;
            this.enumerable = true;
        };
        for (let key in p)
        {
            if (p.hasOwnProperty(key))
            {
                let o = Object.assign(new opt(), p[key]);
                defineProperty(obj, key, o, options);
            }
        }
    };

    let assign = function(target, source)
    {
        if (target === source) return;
        defineProperties(target, Object.getOwnPropertyDescriptors(source));
    };

    if (window.hasOwnProperty("RHU_STRICT_MODE"))
    {
        defineProperties(_RHU, {
            defineProperty: {
                enumerable: true,
                value: defineProperty 
            },
            definePublicProperty: {
                enumerable: true,
                value: definePublicProperty
            },
            definePublicAccessor: {
                enumerable: true,
                value: definePublicAccessor
            },
            defineProperties: {
                enumerable: true,
                value: defineProperties
            },
            definePublicProperties: {
                enumerable: true,
                value: definePublicProperties
            },
            definePublicAccessors: {
                enumerable: true,
                value: definePublicAccessors
            },

            assign: {
                enumerable: true,
                value: assign
            },

            properties: {
                enumerable: true,
                value: properties
            },

            exists: {
                enumerable: true,
                value: exists
            }
        });

        defineProperties(RHU, {
            defineProperty: { 
                enumerable: true,
                get() { return _RHU.defineProperty; }, 
                set(value) { _RHU.defineProperty = value; } 
            },
            definePublicProperty: { 
                enumerable: true,
                get() { return _RHU.definePublicProperty; }, 
                set(value) { _RHU.definePublicProperty = value; }
            },
            definePublicAccessor: {
                enumerable: true,
                get() { return _RHU.definePublicAccessor; }, 
                set(value) { _RHU.definePublicAccessor = value; }
            },
            defineProperties: {
                enumerable: true,
                get() { return _RHU.defineProperties; }, 
                set(value) { _RHU.defineProperties = value; }
            },
            definePublicProperties: {
                enumerable: true,
                get() { return _RHU.definePublicProperties; }, 
                set(value) { _RHU.definePublicProperties = value; }
            },
            definePublicAccessors: {
                enumerable: true,
                get() { return _RHU.definePublicAccessors; }, 
                set(value) { _RHU.definePublicAccessors = value; }
            },

            assign: {
                enumerable: true,
                get() { return _RHU.assign },
                set(value) { _RHU.assign = value }
            },

            properties: {
                enumerable: true,
                get() { return _RHU.properties; }, 
                set(value) { _RHU.properties = value; }
            },

            exists : {
                enumerable: true,
                get() { return _RHU.exists; }, 
                set(value) { _RHU.exists = value; }
            }
        });
    }
    else
    {
        definePublicProperties(_RHU, {
            defineProperty: {
                enumerable: true,
                value: defineProperty 
            },
            definePublicProperty: {
                enumerable: true,
                value: definePublicProperty
            },
            definePublicAccessor: {
                enumerable: true,
                value: definePublicAccessor
            },
            defineProperties: {
                enumerable: true,
                value: defineProperties
            },
            definePublicProperties: {
                enumerable: true,
                value: definePublicProperties
            },
            definePublicAccessors: {
                enumerable: true,
                value: definePublicAccessors
            },

            assign: {
                enumerable: true,
                value: assign
            },

            properties: {
                enumerable: true,
                value: properties
            },

            exists: {
                enumerable: true,
                value: exists
            }
        });

        definePublicAccessors(RHU, {
            defineProperty: { 
                enumerable: true,
                get() { return _RHU.defineProperty; }, 
                set(value) { _RHU.defineProperty = value; } 
            },
            definePublicProperty: { 
                enumerable: true,
                get() { return _RHU.definePublicProperty; }, 
                set(value) { _RHU.definePublicProperty = value; }
            },
            definePublicAccessor: {
                enumerable: true,
                get() { return _RHU.definePublicAccessor; }, 
                set(value) { _RHU.definePublicAccessor = value; }
            },
            defineProperties: {
                enumerable: true,
                get() { return _RHU.defineProperties; }, 
                set(value) { _RHU.defineProperties = value; }
            },
            definePublicProperties: {
                enumerable: true,
                get() { return _RHU.definePublicProperties; }, 
                set(value) { _RHU.definePublicProperties = value; }
            },
            definePublicAccessors: {
                enumerable: true,
                get() { return _RHU.definePublicAccessors; }, 
                set(value) { _RHU.definePublicAccessors = value; }
            },

            assign: {
                enumerable: true,
                get() { return _RHU.assign },
                set(value) { _RHU.assign = value }
            },

            properties: {
                enumerable: true,
                get() { return _RHU.properties; }, 
                set(value) { _RHU.properties = value; }
            },

            exists : {
                enumerable: true,
                get() { return _RHU.exists; }, 
                set(value) { _RHU.exists = value; }
            }
        });
    }

})((window[Symbol.for("RHU")] || (window[Symbol.for("RHU")] = {})),
   (window["RHU"] || (window["RHU"] = {})));

/**
 * @namespace RHU
 */
(function (_RHU, RHU) 
{
    /**
     * @property{public static readonly} domParser{DOMParser} Stores an instance of a DOMParser for parsing 
     */
    let domParser = new DOMParser();

    /**
     * @func{public static} Append RHU default styles to an element
     * @param element{HTMLElement} element to append style to
     */
    let insertDefaultStyles = function(element) 
    {
        let style = document.createElement("style");
        style.innerHTML = `rhu-slot,rhu-shadow,rhu-macro { display: contents; }`;
        element.prepend(style);
    }
    insertDefaultStyles(document.head);

    // TODO(randomuserhi): fix these property definitions:

    _RHU.definePublicProperty(_RHU, "domParser", { value: domParser });
    _RHU.definePublicProperty(_RHU, "insertDefaultStyles", { value: insertDefaultStyles });

    _RHU.definePublicAccessor(RHU, "domParser", { get() { return _RHU.domParser; }, set(value) { return _RHU.domParser; } });
    _RHU.definePublicAccessor(RHU, "insertDefaultStyles", { get() { return _RHU.insertDefaultStyles; }, set(value) { return _RHU.insertDefaultStyles; } });

    /**
     * @class{_Slot} Describes a custom HTML element
     * NOTE(randomuserhi): This definition might be a bit redundant... consider removing
     */
    let _Slot = function()
    {
        let construct = Reflect.construct(HTMLElement, [], _Slot);

        (function() {

        }).call(construct);

        return construct;
    };
    /**
     * Inherit from HTMLElement
     */
    _Slot.prototype = Object.create(HTMLElement.prototype);
    // As per creating custom elements, define them 
    customElements.define("rhu-slot", _Slot);

    /**
     * @class{_Shadow} Describes a custom HTML element
     * NOTE(randomuserhi): This definition might be a bit redundant... consider removing
     */
    let _Shadow = function()
    {
        let construct = Reflect.construct(HTMLElement, [], _Shadow);

        (function() {

        }).call(construct);

        return construct;
    };
    /**
     * Inherit from HTMLElement
     */
    _Shadow.prototype = Object.create(HTMLElement.prototype);
    // As per creating custom elements, define them 
    customElements.define("rhu-shadow", _Shadow);

    /**
     * TODO(randomuserhi): document this function override, its used to determine what objects to grab
     */
    Object.defineProperty(Node.prototype, "rhuInstance", {
        get() 
        {
            return this;
        }
    });

    /**
     * TODO(randomuserhi): document this function => used for macros to get content that a node consists of,
     *                     in the case of macros, a macro can consist of multiple nodes
     */
    Object.defineProperty(Node.prototype, "content", {
        get() 
        {
            return [this];
        }
    });

})((window[Symbol.for("RHU")] || (window[Symbol.for("RHU")] = {})),
   (window["RHU"] || (window["RHU"] = {})));