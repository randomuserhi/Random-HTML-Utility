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
    /**
     * NOTE(randomuserhi): Because a lot of these functions refer to each other via their local name vs RHU or _RHU,
     *                     they will function properly even when RHU.function is reassigned. They will not function properly
     *                     if RHU.function.property is changed since the function object is still referenced.
     */

    let exists = function(obj)
    {
        return obj !== null && obj !== undefined;
    };

    let properties = function(obj, options = {}, operation = null)
    {
        if (!exists(obj)) throw TypeError("Cannot get properties of 'null' or 'undefined'.");

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
                
                if (opt.enumerable && descriptor.enumerable !== opt.enumerable) valid = false;
                if (opt.configurable && descriptor.configurable !== opt.configurable) valid = false;
                if (opt.writable && descriptor.writable !== opt.writable) valid = false;
                if (opt.get === false && descriptor.get) valid = false;
                else if (opt.get === true && !descriptor.get) valid = false;
                if (opt.set === false && descriptor.set) valid = false;
                else if (opt.set === true && !descriptor.set) valid = false;

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
            
            if (!exists(opt.symbols) || opt.symbols === false)
            {
                let props = Object.getOwnPropertyNames(curr);
                iterate(props, descriptors);
            }
            
            if (!exists(opt.symbols) || opt.symbols === true)
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
            delete obj[p]; // NOTE(randomuserhi): Should throw an error in Strict Mode when trying to delete a property of 'configurable: false'.
                           //                     Also will not cause issues with inherited properties as `delete` only removes own properties.    
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
        for (let key of properties(p, { hasOwn: true }).keys())
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
            this.configurable = true;
            this.writable = true;
            this.enumerable = true;
        };
        for (let key of properties(p, { hasOwn: true }).keys())
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
        for (let key of properties(p, { hasOwn: true }).keys())
        {
            if (p.hasOwnProperty(key))
            {
                let o = Object.assign(new opt(), p[key]);
                defineProperty(obj, key, o, options);
            }
        }
    };

    let assign = function(target, source, options = { replace: true })
    {
        if (target === source) return target;
        defineProperties(target, Object.getOwnPropertyDescriptors(source), options);
        return target;
    };

    let deleteProperties = function(object, preserve = null)
    {
        if (object === preserve) return;

        /**
         * Since preserve uses hasOwnProperty, inherited properties of preserve are not preserved:
         * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Enumerability_and_ownership_of_properties
         *
         * Since traversing and deleting a prototype can effect other objects, we do not recursively delete
         * through the prototype.
         *
         * TODO(randomuserhi): Option to skip properties that are non-configurable (aka cannot be deleted).
         *                     Right now we just throw an error.
         */
        for (let key of properties(object, { hasOwn: true }).keys()) 
        {
            if (!exists(preserve) || !properties(preserve, { hasOwn: true }).has(key))
            {
                delete object[key];
            }
        }
    };

    let clone = function(object, prototype = null)
    {
        /** 
         * NOTE(randomuserhi): Performs a shallow clone => references inside the cloned object will be the same
         *                     as original.
         */
        if (exists(prototype)) return assign(Object.create(prototype), object);
        else return assign(Object.create(Object.getPrototypeOf(object)), object);
    };

    let redefine = function (object, prototype, preserve = null) 
    {
        /**
         * NOTE(randomuserhi): redefines an objects type (prototype), removing old values, but does not 
         *                     call the new types constructor.
         */
        deleteProperties(object, preserve);
        Object.setPrototypeOf(object, prototype);
        return object;
    };

    let isConstructor = function (func) 
    {
        /**
         * https://stackoverflow.com/questions/40922531/how-to-check-if-a-javascript-function-is-a-constructor
         *
         * NOTE(randomuserhi): Will fail for construtable functions that error on new.target != null, such as
         *                     Symbol, in which it will return false despite new Symbol() throwing error.
         */
        try 
        {
            Reflect.construct(String, [], func);
        } 
        catch (e) 
        {
            return false;
        }
        return true;
    }

    let inherit = function(child, base)
    {
        if (!isConstructor(child) || !isConstructor(base)) throw new TypeError(`'child' and 'base' must be object constructors.`); 

        /**
         * NOTE(randomuserhi): Doesn't support inheritting objects, only function constructors.
         */
        Object.setPrototypeOf(child.prototype, base.prototype); // Inherit instance properties
        Object.setPrototypeOf(child, base); // Inherit static properties
    }

    // ------------------------------------------------------------------------------------------------------

    defineProperties(_RHU, {
        isConstructor: {
            value: isConstructor
        }
    })

    definePublicProperties(_RHU, {
        defineProperty: {
            enumerable: false,
            value: defineProperty 
        },
        definePublicProperty: {
            enumerable: false,
            value: definePublicProperty
        },
        definePublicAccessor: {
            enumerable: false,
            value: definePublicAccessor
        },
        defineProperties: {
            enumerable: false,
            value: defineProperties
        },
        definePublicProperties: {
            enumerable: false,
            value: definePublicProperties
        },
        definePublicAccessors: {
            enumerable: false,
            value: definePublicAccessors
        },

        delete: {
            enumerable: false,
            value: deleteProperties
        },

        assign: {
            enumerable: false,
            value: assign
        },

        clone: {
            enumerable: false,
            value: clone
        },

        redefine: {
            enumerable: false,
            value: redefine
        },

        properties: {
            enumerable: false,
            value: properties
        },

        exists: {
            enumerable: false,
            value: exists
        },

        inherit: {
            enumerable: false,
            value: inherit
        }
    });

    definePublicAccessors(RHU, {
        defineProperty: { 
            get() { return _RHU.defineProperty; }
        },
        definePublicProperty: { 
            get() { return _RHU.definePublicProperty; }
        },
        definePublicAccessor: {
            get() { return _RHU.definePublicAccessor; }
        },
        defineProperties: {
            get() { return _RHU.defineProperties; }
        },
        definePublicProperties: {
            get() { return _RHU.definePublicProperties; }
        },
        definePublicAccessors: {
            get() { return _RHU.definePublicAccessors; }
        },

        delete: {
            get() { return _RHU.delete; }
        },

        assign: {
            get() { return _RHU.assign; }
        },

        clone: {
            get() { return _RHU.clone; }
        },

        redefine: {
            get() { return _RHU.redefine; }
        },

        properties: {
            get() { return _RHU.properties; }
        },

        exists : {
            get() { return _RHU.exists; }
        },

        inherit : {
            get() { return _RHU.inherit; }
        }
    });

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
        style.innerHTML = `rhu-slot,rhu-shadow,rhu-macro { display: contents; } rhu-querycontainer { display: none; }`;
        element.prepend(style);
    }
    insertDefaultStyles(document.head);

    // ------------------------------------------------------------------------------------------------------

    _RHU.definePublicProperties(_RHU, {
        domParser: { 
            enumerable: false,
            value: domParser
        },

        insertDefaultStyles: {
            enumerable: false,
            value: insertDefaultStyles
        }
    });

    _RHU.definePublicAccessors(RHU, {
        domParser: { 
            get() { return _RHU.domParser; }
        },

        insertDefaultStyles: {
            get() { return _RHU.insertDefaultStyles; }
        }
    });

    // ------------------------------------------------------------------------------------------------------

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
     * @class{_QueryContainer} Describes a custom HTML element
     * NOTE(randomuserhi): This definition might be a bit redundant... consider removing
     */
    let _QueryContainer = function()
    {
        let construct = Reflect.construct(HTMLElement, [], _QueryContainer);

        (function() {

        }).call(construct);

        return construct;
    };
    /**
     * Inherit from HTMLElement
     */
    _QueryContainer.prototype = Object.create(HTMLElement.prototype);
    // As per creating custom elements, define them 
    customElements.define("rhu-querycontainer", _QueryContainer);

    // ------------------------------------------------------------------------------------------------------

    /**
     * TODO(randomuserhi): document how symbols are used to represent special properties used by RHU
     */
    let _symbols = {};
    _RHU.defineProperties(_symbols, {
        _instance: {
            value: Symbol("rhu instance")
        }
    });

    _RHU.defineProperties(_RHU, {
        _globalSymbols: {
            value: _symbols
        }
    })

    _RHU.defineProperties(Node.prototype, {
        /**
         * TODO(randomuserhi): document this function override, its used to determine what objects to grab
         */
        [_symbols._instance]: {
            get() { return this; }
        },
        instance: {
            configurable: true,
            enumerable: true,
            get() { return this[_symbols._instance]; }
        }
    });

})((window[Symbol.for("RHU")] || (window[Symbol.for("RHU")] = {})),
   (window["RHU"] || (window["RHU"] = {})));