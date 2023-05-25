(function() {
    
    let RHU: RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.import(RHU.module({ trace: new Error(),
        name: "rhu/websockets", hard: ["WebSocket", "RHU.eventTarget"],
        callback: function()
        {
            let { RHU } = window.RHU.require(window, this);

            if (RHU.exists(RHU.WebSockets))
                console.warn("Overwriting RHU.WebSockets...");

            let WebSockets: RHU.WebSockets = RHU.WebSockets = {} as RHU.WebSockets;

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

            let ws: RHU.WebSockets.wsConstructor = RHU.reflectConstruct(WebSocket, "RHU.ws", 
            function(this: RHU.WebSockets.ws, url: string | URL, protocols: string | string[] = [])
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
            }) as RHU.WebSockets.wsConstructor;
            ws.__args__ = function(url: string | URL, protocols: string | string[] = [])
            {
                return [url, protocols];
            };
            ws.prototype.send = function(data)
            {
                if (this.readyState === RHU.WebSockets!.OPEN)
                    WebSocket.prototype.send.call(this, data);
                else
                    this.queue.push(data);
            };
            RHU.inherit(ws, WebSocket);
            WebSockets.ws = ws;

            WebSockets.wsClient = function<T extends WebSocketConstructor, Construct extends (...args: any[]) => RHU.WebSockets.Options>(webSocket: T, constructor: Construct)
            {
                // Aliases for generic types
                type wsClient = RHU.WebSockets.wsClient<Socket<T>, Construct>;
                type wsClientConstructor = RHU.WebSockets.wsClientConstructor<Socket<T>, Construct>;
                
                // Utility to get socket type from WebSocketConstructor
                type Socket<T extends { prototype: any }> = T extends { prototype: infer Sock } ? Sock : never; 

                // NOTE(randomuserhi): Technically not needed, but I think using new keyword makes the syntax nicer.
                if (new.target === undefined) throw new TypeError("Constructor Component requires 'new'.");
                
                if (WebSocket as WebSocketConstructor !== webSocket && !Object.isPrototypeOf.call(WebSocket, webSocket)) 
                    throw new TypeError("WebSocket must be inherited from or of type 'WebSocket'.");

                // TODO(randomuserhi): Documentation...
                let construct = function(this: wsClient, ...args: any[])
                {
                    // TODO(randomuserhi): Not sure about saving args like this, seems dodgy way of handling reconnect
                    this.args = args;

                    RHU.eventTarget.call(this);

                    let params: RHU.WebSockets.Options = {
                        url: "",
                        protocols: []
                    };
                    RHU.parseOptions(params, constructor.call(this, ...args));
                    this.ws = new webSocket(params.url, params.protocols) as Socket<T>;

                    this.ws.addEventListener("close", (e) => { this.dispatchEvent(RHU.CustomEvent("close", e)); if (RHU.exists(this.onclose)) this.onclose(e); });
                    this.ws.addEventListener("error", (e) => { this.dispatchEvent(RHU.CustomEvent("error", e)); if (RHU.exists(this.onerror)) this.onerror(e); });
                    this.ws.addEventListener("message", (e) => { this.dispatchEvent(RHU.CustomEvent("message", e)); if (RHU.exists(this.onmessage)) this.onmessage(e); });
                    this.ws.addEventListener("open", (e) => { this.dispatchEvent(RHU.CustomEvent("open", e)); if (RHU.exists(this.onopen)) this.onopen(e); });
                } as Function as wsClientConstructor;
                construct.prototype.reconnect = function(this: wsClient, ...args: Parameters<Construct>)
                {
                    construct.call(this, ...(args.length === 0 ? this.args : args));
                };
                construct.prototype.send = function(this: wsClient, data)
                {
                    this.ws.send(data);
                };
                construct.prototype.close = function(this: wsClient, code?: number, reason?: string)
                {
                    this.ws.close(code, reason);
                };

                return construct;
            } as Function as RHU.WebSockets.wsClientGenerator;
        }
    }));

})();