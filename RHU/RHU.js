/**
 * RHU - Random HTML Utility
 * @randomuserhi.github.io
 */

"use strict";

/**
 * @namespace _RHU (Symbol.for("RHU")), RHU
 * 
 * NOTE(randomuserhi): _RHU (Symbol.for("RHU")) is the internal library hidden from user, whereas RHU is the public interface.
 */
(function (_RHU, RHU) 
{
    /**
     * NOTE(randomuserhi): Because a lot of these functions refer to each other via their local name vs RHU or _RHU,
     *                     they will function properly even when RHU.function is reassigned. They will not function properly
     *                     if RHU.function.property is changed since the function object is still referenced.
     */

    /**  
     * @func                                    Gets a specific DOM element from web page by its ID
     * @param id{string}                        ID of element
     * @param clearID{boolean:optional(true)}   If false, will not remove the ID attribute from html element, otherwise will clear ID attribute
     * @return{HTMLElement}                     Element grabbed by its id
     */
    let getElementById = function(id, clearID = true)
    {
        let el = document.getElementById(id);
        if (clearID) el.removeAttribute("id");
        return el;
    };

    /**
     * @func                    Checks whether an object exists.
     * @param   obj{Object}     Object to check.
     * @return  {Boolean}       True if the object is not null or undefined, otherwise false.
     */
    let exists = function(obj)
    {
        return obj !== null && obj !== undefined;
    };

    /**
     * @func                                        Get the properties for a given object.
     * @param   obj{Object}                         Object to get properties of.
     * @param   options{Object:optional(null)}      Options for the query:
     *                                              - enumerable    :  true/false/undefined => gets enumerable properties
     *                                              - configurable  :  true/false/undefined => gets configurable properties
     *                                              - symbols       :  true/false/undefined => gets symbols
     *                                              - hasOwn        :  true/false/undefined => gets properties that object owns
     *                                              - writable      :  true/false/undefined => gets writeable properties
     *                                              - get           :  true/false/undefined => gets get accessors
     *                                              - set           :  true/false/undefined => gets set accessors
     * @param   operation{Object}                   Function to call on each property queried.
     * @return  {Map[String => _]}                  True if the object is not null or undefined, otherwise false.
     */
    let properties = function(obj, options = {}, operation = null)
    {
        if (!exists(obj)) throw TypeError("Cannot get properties of 'null' or 'undefined'.");

        let opt = {
            enumerable: undefined,
            configurable: undefined,
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
                    if (!properties.has(p) && exists(operation))
                        operation(curr, p);
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

    /**
     * @func                                    Defines a property with descriptor on target object
     * @param   obj{Object}                     Object to assign property to.
     * @param   p{String}                       Name of property.
     * @param   o{Object}                       Property descriptor (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)
     * @param   options{Object:optional({})}    Options for the descriptor:
     *                                          - replace  :  true/false => If true, replace property if it is already defined.
     *                                          - warn     :  true/false => If unable to define property, log a warning.
     *                                          - err      :  true/false => If unable to define a property, throw an error.
     * @return  {Boolean}                       True if property was successfully defined, otherwise false.
     */
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

    /**
     * @func                                    Defines a property with descriptor on target object with { writable: true, enumerable: true } by default.
     * @param   obj{Object}                     Object to assign property to.
     * @param   p{String}                       Name of property.
     * @param   o{Object}                       Property descriptor (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)
     * @param   options{Object:optional({})}    Options for the descriptor:
     *                                          - replace  :  true/false => If true, replace property if it is already defined.
     *                                          - warn     :  true/false => If unable to define property, log a warning.
     *                                          - err      :  true/false => If unable to define a property, throw an error.
     * @return  {Boolean}                       True if property was successfully defined, otherwise false.
     */
    let definePublicProperty = function(obj, p, o, options = {})
    {
        let opt = {
            writable: true,
            enumerable: true
        };
        return defineProperty(obj, p, Object.assign(opt, o), options);
    };

    /**
     * @func                                    Defines a property with descriptor on target object with { configurable: true, enumerable: true } by default.
     * @param   obj{Object}                     Object to assign property to.
     * @param   p{String}                       Name of property.
     * @param   o{Object}                       Property descriptor (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)
     * @param   options{Object:optional({})}    Options for the descriptor:
     *                                          - replace  :  true/false => If true, replace property if it is already defined.
     *                                          - warn     :  true/false => If unable to define property, log a warning.
     *                                          - err      :  true/false => If unable to define a property, throw an error.
     * @return  {Boolean}                       True if property was successfully defined, otherwise false.
     */
    let definePublicAccessor = function(obj, p, o, options = {})
    {
        let opt = {
            configurable: true,
            enumerable: true
        };
        return defineProperty(obj, p, Object.assign(opt, o), options);
    };

    /**
     * @func                                    Defines multiple properties with descriptors on target object.
     * @param   obj{Object}                     Object to assign property to.
     * @param   p{String}                       Property descriptors: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties
     * @param   options{Object:optional({})}    Options for the descriptor:
     *                                          - replace  :  true/false => If true, replace property if it is already defined.
     *                                          - warn     :  true/false => If unable to define property, log a warning.
     *                                          - err      :  true/false => If unable to define a property, throw an error.
     */
    let defineProperties = function(obj, p, options = {})
    {
        for (let key of properties(p, { hasOwn: true }).keys())
        {
            if (Object.prototype.hasOwnProperty.call(p, key))
            {
                defineProperty(obj, key, p[key], options);
            }
        }
    };

    /**
     * @func                                    Defines multiple properties with descriptors on target object with { writable: true, enumerable: true } by default.
     * @param   obj{Object}                     Object to assign property to.
     * @param   p{String}                       Property descriptors: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties
     * @param   options{Object:optional({})}    Options for the descriptor:
     *                                          - replace  :  true/false => If true, replace property if it is already defined.
     *                                          - warn     :  true/false => If unable to define property, log a warning.
     *                                          - err      :  true/false => If unable to define a property, throw an error.
     */
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
            if (Object.prototype.hasOwnProperty.call(p, key))
            {
                let o = Object.assign(new opt(), p[key]);
                defineProperty(obj, key, o, options);
            }
        }
    };

    /**
     * @func                                    Defines multiple properties with descriptors on target object with { configurable: true, enumerable: true } by default.
     * @param   obj{Object}                     Object to assign property to.
     * @param   p{String}                       Property descriptors: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties
     * @param   options{Object:optional({})}    Options for the descriptor:
     *                                          - replace  :  true/false => If true, replace property if it is already defined.
     *                                          - warn     :  true/false => If unable to define property, log a warning.
     *                                          - err      :  true/false => If unable to define a property, throw an error.
     */
    let definePublicAccessors = function(obj, p, options = {})
    {
        let opt = function()
        {
            this.configurable = true;
            this.enumerable = true;
        };
        for (let key of properties(p, { hasOwn: true }).keys())
        {
            if (Object.prototype.hasOwnProperty.call(p, key))
            {
                let o = Object.assign(new opt(), p[key]);
                defineProperty(obj, key, o, options);
            }
        }
    };

    /**
     * @func                                                   Assigns a source object's properties to a target
     * @param   target{Object}                                 Object to assign properties to.
     * @param   source{String}                                 Source object to get properties from.
     * @param   options{Object:optional({ replace: true })}    Options for the assignment:
     *                                                         - replace  :  true/false => If true, replace property if it is already defined.
     *                                                         - warn     :  true/false => If unable to define property, log a warning.
     *                                                         - err      :  true/false => If unable to define a property, throw an error.
     * @return  {Object}                                       target after assignment
     */
    let assign = function(target, source, options = { replace: true })
    {
        if (target === source) return target;
        defineProperties(target, Object.getOwnPropertyDescriptors(source), options);
        return target;
    };

    /**
     * @func                                        Deletes all owned properties from an object.
     * @param   object{Object}                      Object to delete properties from.
     * @param   preserve{Object:optional(null)}     Object containing properties to not delete.
     */
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
        properties(object, { hasOwn: true }, (obj, prop) => {
            if (!exists(preserve) || !properties(preserve, { hasOwn: true }).has(prop))
                delete obj[prop];
        });
    };

    /**
     * @func                                        Perform a shallow copy of an object.
     * @param   object{Object}                      Object to copy
     * @param   prototype{Object:optional(null)}    Prototype of cloned object.
     * @return  {Object}                            Cloned object.
     */
    let clone = function(object, prototype = null)
    {
        /** 
         * NOTE(randomuserhi): Performs a shallow clone => references inside the cloned object will be the same
         *                     as original.
         */
        if (exists(prototype)) return assign(Object.create(prototype), object);
        else return assign(Object.create(Object.getPrototypeOf(object)), object);
    };

    /**
     * @func                                        Delete target objects owned properties and set prototype.
     * @param   object{Object}                      Object to redefine.
     * @param   prototype{Object}                   Prototype to switch to.
     * @param   preserve{Object:optional(null)}     Properties to not delete whilst redefining.
     * @return  {Object}                            Redefined object.
     */
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

    /**
     * @func                    Checks if an object can be used as a constructor.
     * @param   object{Object}  Object to check.
     * @return  {Boolean}       True if object can be used as constructor, otherwise false.
     *
     * https://stackoverflow.com/a/46759625/9642458
     * NOTE(randomuserhi): Will fail for construtable functions that error on new.target != null, such as
     *                     Symbol, in which it will return false despite new Symbol() throwing error.
     */
    let isConstructor = function (func) 
    {
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

    /**
     * @func                    Makes a child class inherit from a base class.
     * @param   child{Object}   Child class.
     * @param   base{Object}    Base class.
     * 
     * NOTE(randomuserhi): Doesn't support inheritting objects, only function constructors.
     */
    let inherit = function(child, base)
    {
        if (!isConstructor(child) || !isConstructor(base)) throw new TypeError(`'child' and 'base' must be object constructors.`); 

        Object.setPrototypeOf(child.prototype, base.prototype); // Inherit instance properties
        Object.setPrototypeOf(child, base); // Inherit static properties
    }

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Define accessors between local functions (completely hidden), 
     *                     _RHU (private access) and RHU (public access)
     */

    defineProperties(_RHU, {
        isConstructor: {
            value: isConstructor
        }
    })

    definePublicProperties(_RHU, {
        getElementById: {
            enumerable: false,
            value: getElementById
        },

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
        getElementById: {
            enumerable: false,
            value: getElementById
        },
        
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
 * @namespace _RHU (Symbol.for("RHU")), RHU
 * 
 * NOTE(randomuserhi): _RHU (Symbol.for("RHU")) is the internal library hidden from user, whereas RHU is the public interface.
 */
(function (_RHU, RHU) 
{
    /**
     * @property domParser{DOMParser} Stores an instance of a DOMParser for parsing.
     */
    let domParser = new DOMParser();

    /**
     * @func                        Append RHU default styles to an element.
     * @param element{HTMLElement}  Element to append style to.
     */
    let insertDefaultStyles = function(element) 
    {
        let style = document.createElement("style");
        style.innerHTML = `rhu-slot,rhu-shadow,rhu-macro { display: contents; } rhu-querycontainer { display: none; }`;
        element.prepend(style);
    }
    // Insert default style to head.
    insertDefaultStyles(document.head);

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Define accessors between local functions (completely hidden), 
     *                     _RHU (private access) and RHU (public access)
     */

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

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Declare some default custom elements. Since these have no functionality at the moment,
     *                     they are redundant.
     */

    /**
     * @class{_Slot} Describes a custom HTML element.
     * NOTE(randomuserhi): This definition might be a bit redundant... consider removing.
     */
    let _Slot = function()
    {
        let construct = Reflect.construct(HTMLElement, [], _Slot);

        (function() {

        }).call(construct);

        return construct;
    };
    _Slot.prototype = Object.create(HTMLElement.prototype);
    customElements.define("rhu-slot", _Slot);

    /**
     * @class{_Shadow} Describes a custom HTML element.
     * NOTE(randomuserhi): This definition might be a bit redundant... consider removing.
     */
    let _Shadow = function()
    {
        let construct = Reflect.construct(HTMLElement, [], _Shadow);

        (function() {

        }).call(construct);

        return construct;
    };
    _Shadow.prototype = Object.create(HTMLElement.prototype);
    customElements.define("rhu-shadow", _Shadow);

    /**
     * @class{_QueryContainer} Describes a custom HTML element.
     * NOTE(randomuserhi): This definition might be a bit redundant... consider removing.
     */
    let _QueryContainer = function()
    {
        let construct = Reflect.construct(HTMLElement, [], _QueryContainer);

        (function() {

        }).call(construct);

        return construct;
    };
    _QueryContainer.prototype = Object.create(HTMLElement.prototype);
    customElements.define("rhu-querycontainer", _QueryContainer);

    /** ------------------------------------------------------------------------------------------------------
     * NOTE(randomuserhi): Declare some global symbols for access to specific private properties.
     *                     Symbols are used as they are completely abstracted away from the user, and act
     *                     as a form of name mangling to prevent name-collision.
     */

    /**
     * Local property `_symbols` to store symbols
     */
    let _symbols = {};
    _RHU.defineProperties(_symbols, {
        /**
         * @symbol{_instance} Used when determining what object to grab from an element when processing it.
         */
        _instance: {
            value: Symbol("rhu instance")
        }
    });

    /**
     * Hook local property `_symbols` to _RHU
     */
    _RHU.defineProperties(_RHU, {
        /**
         * @symbol{_globalSymbols} Stores global symbols to be accessed by other scripts.
         */
        _globalSymbols: {
            value: _symbols
        }
    })

    /**
     * Add a new instance property to Node.prototype so when accessing any DOM Node,
     * the instance can be grabbed.
     *
     * NOTE(randomuserhi): This is an overridable accessor.
     */
    _RHU.defineProperties(Node.prototype, {
        [_symbols._instance]: {
            get() { return this; }
        },
        instance: {
            configurable: true,
            enumerable: true,
            get() { return this[_symbols._instance]; }
        }
    });

})((window[Symbol.for("RHU")] || (window[Symbol.for("RHU")] = {})), // Internal library that can only be accessed via Symbol.for("RHU")
   (window["RHU"] || (window["RHU"] = {}))); // Public interfact for library