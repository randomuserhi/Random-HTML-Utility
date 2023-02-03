/**
 * RHU - Random HTML Utility
 * @randomuserhi.github.io
 */

"use strict";

/**
 * @namespace RHU
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
            Object.defineProperty(obj, p, o);
            return true;
        }
        if (opt.warn) console.warn(`Failed to define property '${p}', it already exists. Try 'replace: true'`);
        if (opt.err) console.error(`Failed to define property '${p}', it already exists. Try 'replace: true'`);
        return false;
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

    let hasValue = function(obj, value)
    {
        for (let prop of properties(obj).keys())
        {
            if (value === obj[prop]) return true;
        }
        return false;
    };

    /**
     * NOTE(randomuserhi): `exceptions = window`, prevents objects such as HTMLElement from becoming frozen.
     *                     Because it uses `window` if public variables (declared by `var` or `window[]`) reference 
     *                     RHU objects, this will stop them from locking. This is a useful feature, if people want 
     *                     to keep certain RHU objects mutable.
     * NOTE(randomuserhi): warning produced is nothing to worry about: 
     *                     https://stackoverflow.com/questions/36060329/window-webkitstorageinfo-is-deprecated-warning-while-iterating-window-object
     */
    let useStrict = function(obj, exceptions = window)
    {
        Object.freeze(obj);
        for (let prop of properties(obj).keys())
        {
            let o = obj[prop];
            if (o && !hasValue(exceptions, o)) Object.freeze(o, exceptions);
        }
    };

    defineProperty(_RHU, "useStrict", { value: () => { useStrict(_RHU); } });
    defineProperty(_RHU, "defineProperty", { writable: true, value: defineProperty });
    defineProperty(_RHU, "defineProperties", { writable: true, value: defineProperties });
    defineProperty(_RHU, "properties", { writable: true, value: properties });
    defineProperty(_RHU, "exists", { writable: true, value: exists });

    defineProperty(RHU, "useStrict", { get() { return _RHU.useStrict; } });
    defineProperty(RHU, "defineProperty", { get() { return _RHU.defineProperty; }, set(value) { _RHU.defineProperty = value; } });
    defineProperty(RHU, "defineProperties", { get() { return _RHU.defineProperties; }, set(value) { _RHU.defineProperties = value; } });
    defineProperty(RHU, "properties", { get() { return _RHU.properties; }, set(value) { _RHU.properties = value; } });
    defineProperty(RHU, "exists", { get() { return _RHU.exists; }, set(value) { _RHU.exists = value; } });

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

    _RHU.defineProperty(_RHU, "domParser", { writable: true, value: domParser });
    _RHU.defineProperty(_RHU, "insertDefaultStyles", { writable: true, value: insertDefaultStyles });

    _RHU.defineProperty(RHU, "domParser", { get() { return _RHU.domParser; }, set(value) { return _RHU.domParser; } });
    _RHU.defineProperty(RHU, "insertDefaultStyles", { get() { return _RHU.insertDefaultStyles; }, set(value) { return _RHU.insertDefaultStyles; } });

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