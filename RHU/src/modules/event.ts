(function() {
    
    const RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module(new Error(), "rhu/event", 
        {},
        function() {
            const isEventListener = function(callback: EventListenerOrEventListenerObject): callback is EventListener {
                return callback instanceof Function;
            };

            const eventTarget = function<T extends EventTarget>(target: T): void {
                // create a node for handling events with EventTarget
                const node = document.createTextNode("");
                const addEventListener: (type: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => void
                = node.addEventListener.bind(node);
                target.addEventListener = function (type: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
                    const context = target;
                    if (isEventListener(callback))
                        addEventListener(type, ((e: CustomEvent) => { callback.call(context, e.detail); }) as EventListener, options);
                    else
                        addEventListener(type, ((e: CustomEvent) => { callback.handleEvent.call(context, e.detail); }) as EventListener, options);
                };
                // TODO(randomuserhi): this doesnt work since the callbacks added are new functions everytime...
                target.removeEventListener = node.removeEventListener.bind(node);
                target.dispatchEvent = node.dispatchEvent.bind(node);
            };

            return eventTarget;
        }
    );

})();