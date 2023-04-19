(function() {
    "use strict";

    let RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module({ module: "rhu/websockets", trace: new Error(), hard: ["WebSocket", "RHU.eventTarget"] }, function()
    {
        if (RHU.exists(RHU.WebSockets))
            console.warn("Overwriting RHU.WebSockets...");

        let WebSockets = RHU.WebSockets = {};

        RHU.definePublicAccessors(WebSockets, {
            CONNECTING: {
                get: function() { return WebSocket.CONNECTING; }
            },
            OPEN: {
                get: function() { return WebSocket.OPEN; }
            },
            CLOSING: {
                get: function() { return WebSocket.CLOSING; }
            },
            CLOSED: {
                get: function() { return WebSocket.CLOSED; }
            }
        });

        let ws = RHU.reflectConstruct(WebSocket, "RHU.ws", function(url, protocols = [])
        {
            /**
             * @property{public}    queue{List[String]}     List of enqueued messages to be sent.   
             */

            this.queue = [];

            this.addEventListener("open", () => {
                // Send messages in queue, NOTE(randomuserhi): A simple for loop can be used, but this
                //                                             just shows shift() function exists :)
                while (this.queue.length) 
                    WebSocket.prototype.send.call(this, this.queue.shift());
            });
        });
        ws.__args__ = function(url, protocols = [])
        {
            return [url, protocols];
        };
        ws.prototype.send = function(data)
        {
            if (this.readyState === RHU.WebSockets.OPEN)
                WebSocket.prototype.send.call(this, data);
            else
                this.queue.push(data);
        };
        RHU.inherit(ws, WebSocket);
        WebSockets.ws = ws;

        WebSockets.wsClient = function(webSocket, constructor)
        {
            // NOTE(randomuserhi): Technically not needed, but I think using new keyword makes the syntax nicer.
            if (new.target === undefined) throw new TypeError("Constructor Component requires 'new'.");
            
            if (WebSocket !== webSocket && !Object.isPrototypeOf.call(WebSocket, webSocket)) 
                throw new TypeError("WebSocket must be inherited from or of type 'WebSocket'.");

            // TODO(randomuserhi): Documentation...
            let construct = function(...args)
            {
                this.args = args;

                RHU.eventTarget.call(this);

                let parsedParams = {
                    url: undefined,
                    protocols: []
                };
                let params = constructor.call(this, ...args);
                RHU.parseOptions(parsedParams, params);
                this.ws = new webSocket(parsedParams.url, parsedParams.protocols);
            
                this.ws.addEventListener("close", (e) => { this.dispatchEvent(RHU.CustomEvent("close", e)); if (RHU.exists(this.onclose)) this.onclose(e); });
                this.ws.addEventListener("error", (e) => { this.dispatchEvent(RHU.CustomEvent("error", e)); if (RHU.exists(this.onerror)) this.onerror(e); });
                this.ws.addEventListener("message", (e) => { this.dispatchEvent(RHU.CustomEvent("message", e)); if (RHU.exists(this.onmessage)) this.onmessage(e); });
                this.ws.addEventListener("open", (e) => { this.dispatchEvent(RHU.CustomEvent("open", e)); if (RHU.exists(this.onopen)) this.onopen(e); });
            };
            construct.prototype.reconnect = function(...args)
            {
                construct.call(this, ...(args.length === 0 ? this.args : args));
            };
            construct.prototype.send = function(data)
            {
                this.ws.send(data);
            };
            construct.prototype.close = function(...args)
            {
                this.ws.close(...args);
            };

            return construct;
        };
    });
})();