(function() {
    "use strict";

    let RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module({ module: "x-rhu/localisation", trace: new Error(), hard: ["Map", "RHU.WeakCollection", "RHU.eventTarget"] }, function()
    {
        //TODO(randomuserhi): read from a config and enable performance logging etc...

        if (RHU.exists(RHU.Localisation))
            console.warn("Overwriting RHU.Localisation...");

        let symbols = {
            constructed: Symbol("localisation constructed"),
        };

        let Localisation = RHU.Localisation = {};
        RHU.eventTarget(Localisation);

        // NOTE(randomuserhi): Store a reference to base functions that will be overridden
        let isElement = Object.prototype.isPrototypeOf.bind(HTMLElement.prototype);
        let Element_setAttribute = Function.call.bind(Element.prototype.setAttribute);
        let Element_getAttribute = Function.call.bind(Element.prototype.getAttribute);
        let Element_hasAttribute = Function.call.bind(Element.prototype.hasAttribute);
        let Element_removeAttribute = Function.call.bind(Element.prototype.removeAttribute);

        Element.prototype.setAttribute = function(attrName, value) 
        {
            // Remove localisation functionality if element is no longer considered to be localised
            if (attrName === "rhu-loc") Localisation.parse(this, currentSchema);
            return Element_setAttribute(this, attrName, value);
        };

        Element.prototype.removeAttribute = function(attrName) 
        {
            // Remove localisation functionality if element is no longer considered to be localised
            if (attrName === "rhu-loc") Localisation.parse(this, currentSchema);
            return Element_removeAttribute(this, attrName);
        };

        RHU.definePublicAccessor(Element.prototype, "rhuLoc", {
            get: function() 
            {
                let attribute = Element_getAttribute(this, "rhu-loc"); 
                if (RHU.exists(attribute)) return attribute;
                else return undefined;
            },
            set: function(value)
            { 
                Element_setAttribute(this, "rhu-loc", value);
                Localisation.parse(this, currentSchema);
            }
        });

        let currentSchema = undefined;
        Localisation.setSchema = function(schema)
        {
            currentSchema = schema;
            for (let el of watching)
                Localisation.parse(el, currentSchema, true); // force reparse

            Localisation.dispatchEvent(RHU.CustomEvent("change", currentSchema));
        };
        RHU.definePublicAccessor(Localisation, "schema", {
            get: function() { return currentSchema; },
            set: Localisation.setSchema
        });

        let watching = new RHU.WeakCollection();
        // TODO(randomuserhi): make force default true
        // TODO(randomuserhi): change to accept a schema and element rhu-loc
        //                     if no schema is provided, use current
        Localisation.parse = function(el, schema, force = false)
        {
            // Check if element is eligible for localisation (check hasOwn properties and that it has not been converted into a rhu-loc already)
            // NOTE(randomuserhi): RHU-Macros are not eligible to be rhu-loc due to their destructive nature and vice versa,
            //                     thus this error should be triggered if the element has properties (either from built-in or rhu-macro assigning them)
            // TODO(randomuserhi): Better error message for if its clashing with RHU-Macro or built in changed their specification
            if (!Object.hasOwnProperty.call(el, symbols.constructed) && RHU.properties(el, { hasOwn: true }).size !== 0) 
                throw new TypeError(`Element is not eligible to be used as a rhu-loc.`);

            if (Element_hasAttribute(el, "rhu-loc"))
            {
                if (RHU.exists(schema))
                {
                    let type = Element_getAttribute(el, "rhu-loc");
                    
                    // Check if type has changed
                    if (el[symbols.constructed] !== type || force)
                    {
                        RHU.parseOptions(el, schema[type]);
                        el[symbols.constructed] = type;
                    }
                }

                watching.add(el);
            }
            else
                watching.delete(el);
        };

        let load = function()
        {
            // Parse elements on document
            let elements = document.querySelectorAll("[rhu-loc]");
            for (let el of elements) Localisation.parse(el, currentSchema);

            // Initialize observer
            Localisation.observe(document);
        };

        let recursiveParse = function(node)
        {
            if (isElement(node) && Element_hasAttribute(node, "rhu-loc"))
                Localisation.parse(node, currentSchema);
            for (let child of node.childNodes)
                recursiveParse(child);
        };

        // Setup mutation observer to detect localisation elements being created
        let observer = new MutationObserver(function(mutationList) {
            /**
             * NOTE(randomuserhi): Since mutation observers are asynchronous, the current attribute value
             *                     as read from .getAttribute may not be correct. To remedy this, a dictionary
             *                     storing the atribute changes is used to keep track of changes at the moment
             *                     a mutation occurs.
             *                     ref: https://stackoverflow.com/questions/60593551/get-the-new-attribute-value-for-the-current-mutationrecord-when-using-mutationob
             */
            let attributes = new Map();
            for (const mutation of mutationList) 
            {
                switch (mutation.type)
                {
                case "attributes":
                    {
                        if (mutation.attributeName === "rhu-loc")
                        {
                            if (!attributes.has(mutation.target)) attributes.set(mutation.target, mutation.oldValue);
                            else if (attributes.get(mutation.target) !== mutation.oldValue)
                            {
                                attributes.set(mutation.target, mutation.oldValue);

                                /**
                                 * NOTE(randomuserhi): A performance gain could be done by only parsing the last tracked attribute change
                                 *                     since other changes are redundant as they are replaced by the latest.
                                 *                     This is purely done for the sake of being consistent with what the user may expect.
                                 */
                                Localisation.parse(mutation.target, currentSchema);
                            }
                        }
                    }
                    break;
                case "childList":
                    {
                        for (let node of mutation.addedNodes)
                            recursiveParse(node);
                    }
                    break;
                }
            }

            for (let el of attributes.keys()) 
            {
                let attr = Element_getAttribute(el, "rhu-loc");
                if (attributes.get(el) !== attr)
                    Localisation.parse(el, currentSchema);
            }
        });
        // Allows you to assign localisation observation to other docs to trigger localisation updates
        Localisation.observe = function(target)
        {
            observer.observe(target, {
                attributes: true,
                attributeOldValue: true,
                attributeFilter: [ "rhu-loc" ],
                childList: true,
                subtree: true
            });
        };

        let onDocumentLoad = function()
        {
            // NOTE(randomuserhi): We must call load event first so user-defined types are set first before we load
            //                     custom element otherwise custom element will parse with undefined schema (since
            //                     the schema has not been loaded yet).
            
            window.dispatchEvent(new Event("load-rhu-localisation"));
            
            load();
        };
        if (document.readyState === "loading") 
            document.addEventListener("DOMContentLoaded", onDocumentLoad);
        // Document may have loaded already since the script is declared as defer, in this case just call onload
        else 
            onDocumentLoad();
    });
})();