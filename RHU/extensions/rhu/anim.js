(function() {
    "use strict";

    let RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module({ module: "x-rhu/anim", trace: new Error(), hard: [] }, function()
    {
        if (RHU.exists(RHU.Anim))
            console.warn("Overwriting RHU.Anim...");
    });
})();