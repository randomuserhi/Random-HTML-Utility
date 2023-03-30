(function() {
    "use strict";

    let RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module({ module: "x-rhu/markdown", trace: new Error(), hard: [] }, function()
    {
        if (RHU.exists(RHU.Markdown))
            console.warn("Overwriting RHU.Markdown...");

        let Markdown = RHU.Markdown = {};
    });
})();