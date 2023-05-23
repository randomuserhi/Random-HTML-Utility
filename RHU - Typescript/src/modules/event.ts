(function() {
    
    let RHU: RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module({ name: "rhu/event", trace: new Error(), hard: [] }, function()
    {
        if (RHU.exists(RHU.eventTarget) || RHU.exists(RHU.CustomEvent))
            console.warn("Overwriting RHU.EventTarget...");

        let isEventListener = function(callback: EventListenerOrEventListenerObject): callback is EventListener
        {
            return callback instanceof Function;
        }

        RHU.eventTarget = function<T extends EventTarget>(target: T): void
        {
            // create a node for handling events with EventTarget
            let node = document.createTextNode("");
            let addEventListener: (type: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => void
             = node.addEventListener.bind(node);
            target.addEventListener = function (type: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
                let context = target;
                if (isEventListener(callback))
                    addEventListener(type, (e: CustomEvent) => { callback.call(context, e.detail); }, options);
                else
                    addEventListener(type, (e: CustomEvent) => { callback.handleEvent.call(context, e.detail); }, options);
            };
            target.removeEventListener = node.removeEventListener.bind(node);
            target.dispatchEvent = node.dispatchEvent.bind(node);
        };
    });

})();