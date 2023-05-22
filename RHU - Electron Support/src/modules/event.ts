(function() {
    let RHU: RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module({ name: "rhu/event", trace: new Error(), hard: [] }, function()
    {
        if (RHU.exists(RHU.eventTarget))
            console.warn("Overwriting RHU.EventTarget...");

        RHU.eventTarget = function(target)
        {
            // create a node for handling events with EventTarget
            let node = document.createTextNode(null);
            let addEventListener: (type: string, callback: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => void
             = node.addEventListener.bind(node);
            target.addEventListener = function (type: string, listener: (any) => void, options?: boolean | EventListenerOptions): void {
                addEventListener(type, (e: CustomEvent) => { listener(e.detail); }, options);
            };
            target.removeEventListener = node.removeEventListener.bind(node);
            target.dispatchEvent = node.dispatchEvent.bind(node);
        };

        RHU.CustomEvent = function(type: string, detail: any): CustomEvent
        {
            return new CustomEvent(type, { detail: detail });
        };
    });
})();