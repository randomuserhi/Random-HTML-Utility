(function() {
    "use strict";

    let RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module({ module: "rhu/event", trace: new Error(), hard: [] }, function()
    {
        if (RHU.exists(RHU.eventTarget))
            console.warn("Overwriting RHU.EventTarget...");

        RHU.eventTarget = function(target)
        {
            // create a node for handling events with EventTarget
            let node = document.createTextNode(null);
            let addEventListener = node.addEventListener.bind(node);
            target.addEventListener = function (type, listener, options) {
                addEventListener(type, (e) => { listener(e.detail); }, options);
            };
            target.removeEventListener = node.removeEventListener.bind(node);
            target.dispatchEvent = node.dispatchEvent.bind(node);
        };
    });
})();