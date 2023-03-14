/**
 * RHU - Random HTML Utility
 * @randomuserhi.github.io
 */
"use strict";

if (window[Symbol.for("RHU")] === undefined ||
    window[Symbol.for("RHU")] === null)
    throw new Error("Missing RHU dependency.");

/**
 * @namespace _RHU (Symbol.for("RHU")), RHU
 * NOTE(randomuserhi): _RHU (Symbol.for("RHU")) is the internal library hidden from user, whereas RHU is the public interface.
 */
(function (_RHU, RHU) 
{

	/**
	 * @namespace _RHU._WebSockets (Symbol.for("RHU")), RHU.WebSockets
	 */
	(function (_WebSockets, WebSockets) 
	{
		let exists = _RHU.exists;

		// NOTE(randomuserhi): readyStates of websockets from https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
		//                     Technically redundant due to WebSocket.CONNECTING etc...
		let CONNECTING = WebSocket.CONNECTING;
		let OPEN = WebSocket.OPEN;
		let CLOSING = WebSocket.CLOSING;
		let CLOSED = WebSocket.CLOSED;
		
		// TODO(randomuserhi): Documentation

		let ws = function(url, protocols = [])
		{
			let construct = Reflect.construct(WebSocket, [url, protocols], ws);

			(function()
			{
				this.queue = [];

				this.addEventListener("open", (e) => {
					// Send messages in queue, NOTE(randomuserhi): A simple for loop can be used, but this
					//                                             just shows shift() function exists :)
					while (this.queue.length) 
						WebSocket.prototype.send.call(this, this.queue.shift());
				});

			}).call(construct);

			return construct;
		}
		ws.prototype.send = function(data)
		{
			if (this.readyState === RHU.WebSockets.OPEN)
				WebSocket.prototype.send.call(this, data);
			else
				this.queue.push(data);
		}
		RHU.inherit(ws, WebSocket);

		let wsClient = function(webSocket, constructor)
		{
			// NOTE(randomuserhi): Technically not needed, but I think using new keyword makes the syntax nicer.
			if (new.target === undefined) throw new TypeError("Constructor Component requires 'new'.");
			
			if (WebSocket !== webSocket && !Object.isPrototypeOf.call(WebSocket, webSocket)) 
				throw new TypeError("WebSocket must be inherited from or of type 'WebSocket'.");

			// TODO(randomuserhi): Documentation...
			let construct = function(...args)
			{
				this.args = args;

				RHU.EventTarget.call(this);

				let parsedParams = {
					url: undefined,
					protocols: []
				};
				let params = constructor.call(this, ...args);
				RHU.parseOptions(parsedParams, params);
				this.ws = new webSocket(parsedParams.url, parsedParams.protocols);
			
				this.ws.addEventListener("close", (e) => { this.dispatchEvent(new CustomEvent("close", { detail: e })); if (exists(this.onclose)) this.onclose(e) });
				this.ws.addEventListener("error", (e) => { this.dispatchEvent(new CustomEvent("error", { detail: e })); if (exists(this.onerror)) this.onerror(e) });
				this.ws.addEventListener("message", (e) => { this.dispatchEvent(new CustomEvent("message", { detail: e })); if (exists(this.onmessage)) this.onmessage(e) });
				this.ws.addEventListener("open", (e) => { this.dispatchEvent(new CustomEvent("open", { detail: e })); if (exists(this.onopen)) this.onopen(e) });
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
		}

		/** ------------------------------------------------------------------------------------------------------
	     * NOTE(randomuserhi): Create interface for WebSockets API
	     */

		_RHU.definePublicProperties(_WebSockets, {
			ws: {
				enumerable: false,
				value: ws
			},
	        wsClient: {
	            enumerable: false,
	            value: wsClient
	        },
	        CONNECTING: {
	        	enumerable: false,
	        	writeable: false,
	        	value: CONNECTING
	        },
	        OPEN: {
	        	enumerable: false,
	        	writeable: false,
	        	value: OPEN
	        },
	        CLOSING: {
	        	enumerable: false,
	        	writeable: false,
	        	value: CLOSING
	        },
	        CLOSED: {
	        	enumerable: false,
	        	writeable: false,
	        	value: CLOSED
	        }
	    });

	    _RHU.definePublicAccessors(WebSockets, {
	    	ws: {
				get() { return _WebSockets.ws; }
			},
	        wsClient: {
	            get() { return _WebSockets.wsClient; }
	        },
	        CONNECTING: {
	        	get() { return _WebSockets.CONNECTING; }
	        },
	        OPEN: {
	        	get() { return _WebSockets.OPEN; }
	        },
	        CLOSING: {
	        	get() { return _WebSockets.CLOSING; }
	        },
	        CLOSED: {
	        	get() { return _WebSockets.CLOSED; }
	        }
	    });

	})((_RHU.WebSockets || (_RHU.WebSockets = {})),
	   (RHU.WebSockets || (RHU.WebSockets = {})));

})((window[Symbol.for("RHU")] || (window[Symbol.for("RHU")] = {})), // Internal library that can only be accessed via Symbol.for("RHU")
   (window["RHU"] || (window["RHU"] = {}))); // Public interfact for library