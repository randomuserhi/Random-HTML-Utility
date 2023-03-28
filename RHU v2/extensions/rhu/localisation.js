(function() {
    "use strict";

    let RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module({ module: "x-rhu/localisation", hard: ["Map"] }, function()
    {
        //TODO(randomuserhi): read from a config and enable performance logging etc...

        if (RHU.exists(RHU.Localisation))
            console.warn("Overwriting RHU.Localisation...");

        let Localisation = RHU.Localisation = {};

        // NOTE(randomuserhi): Store a reference to base functions that will be overridden
        let Element_setAttribute = Element.prototype.setAttribute;
        let Node_childNodes = Object.getOwnPropertyDescriptor(Node.prototype, "childNodes").get;
        let Node_parentNode = Object.getOwnPropertyDescriptor(Node.prototype, "parentNode").get;

        RHU.definePublicAccessor(Element.prototype, "rhuLoc", {
            get() 
            {
                let attribute = Element.prototype.getAttribute.call(this, "rhu-loc"); 
                if (RHU.exists(attribute)) return attribute;
                else return undefined;
            },
            set(value)
            { 
                Element_setAttribute.call(this, "rhu-loc", value);
                Localisation.parse(this, value);
            }
        });

        Localisation.parse = function(el, loc)
        {

        };
    });
})();