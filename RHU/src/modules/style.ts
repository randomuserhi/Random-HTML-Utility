(function() {
    
    let RHU: RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.import(RHU.module({ trace: new Error(),
        name: "rhu/style", hard: [],
        callback: function()
        {
            if (RHU.exists(RHU.Style))
                console.warn("Overwriting RHU.Style...");

            RHU.Style = function()
            {
                
            } as Function as RHU.Style;

            let element = Symbol("Element reference");
            RHU.Style.el = function() { return element; };
        }
    }));

})();