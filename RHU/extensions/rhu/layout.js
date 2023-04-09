(function() {
    "use strict";

    let RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module({ module: "x-rhu/layout", trace: new Error(), hard: ["RHU.Macro"] }, function()
    {
        if (RHU.exists(RHU.Layout))
            console.warn("Overwriting RHU.Layout...");

        let Layout = RHU.Layout = function()
        {
        };
        Layout.prototype.boomer = function()
        {
        	console.log("lmao");
        };
    });
})();