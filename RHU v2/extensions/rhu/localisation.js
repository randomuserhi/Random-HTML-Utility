(function() {
    "use strict";

    let RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module({ module: "x-rhu/localisation", trace: new Error(), hard: ["Map", "RHU.WeakCollection"], soft: ["RHU.Macro"] }, function(e)
    {
        //TODO(randomuserhi): read from a config and enable performance logging etc...

        if (RHU.exists(RHU.Localisation))
            console.warn("Overwriting RHU.Localisation...");

        let Localisation = RHU.Localisation = {};

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
            get() 
            {
                let attribute = Element_getAttribute(this, "rhu-loc"); 
                if (RHU.exists(attribute)) return attribute;
                else return undefined;
            },
            set(value)
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
                Localisation.parse(el, currentSchema);
        };

        let watching = new RHU.WeakCollection();
        Localisation.parse = function(el, schema)
        {
            if (Element_hasAttribute(el, "rhu-loc"))
            {
                // NOTE(randomuserhi): Applying rhu-loc to a rhu-macro causes undefined behaviour due to
                //                     the destructive nature of rhu-macro (deleting properties etc...)
                // TODO(randomuserhi): Update to new dependency API where bug is fixed so 'e' can be used to check
                //                     dependency instead of RHU.exists
                //if (e.soft.has.includes("RHU.Macro") && Element_hasAttribute(el, "rhu-macro"))
                if (RHU.exists(RHU.Macro) && Element_hasAttribute(el, "rhu-macro"))
                {
                    console.error("RHU Macros cannot have localisation applied to them.");
                    watching.delete(el);
                    return;
                }
                if (RHU.exists(schema))
                {
                    let type = Element_getAttribute(el, "rhu-loc");
                    RHU.parseOptions(el, schema[el.rhuLoc]);
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
                        {
                            // Check if the node is a HTMLElement (TextNodes or CharacterData won't have getAttribute)
                            if (isElement(node))
                            {
                                let type = Element_getAttribute(node, "rhu-loc");
                                if (RHU.exists(type)) Localisation.parse(node, currentSchema);
                            }
                        }
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