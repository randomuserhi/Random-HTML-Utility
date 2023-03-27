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
    });
})();