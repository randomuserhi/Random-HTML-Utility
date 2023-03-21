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
		const exists = _RHU.exists;

		// NOTE(randomuserhi): readyStates of websockets from https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
		//                     Technically redundant due to WebSocket.CONNECTING etc...
		const CONNECTING = WebSocket.CONNECTING;
		const OPEN = WebSocket.OPEN;
		const CLOSING = WebSocket.CLOSING;
		const CLOSED = WebSocket.CLOSED;
		
		/**
	     * @class{RHU.WebSockets.ws}		Custom web socket class to handle queue messages prior to socket connection
	     * @param url{String}    			Web socket url to connect to
	     * @param protocols{List[String]}   List of web socket protocols this socket accepts
	     */
	   	let _wsConstructor = function(url, protocols = []) 
	   	{
	   		/**
	         * @property{public}	queue{List[String]}		List of enqueued messages to be sent.	
	         */

	   		this.queue = [];

			this.addEventListener("open", (e) => {
				// Send messages in queue, NOTE(randomuserhi): A simple for loop can be used, but this
				//                                             just shows shift() function exists :)
				while (this.queue.length) 
					WebSocket.prototype.send.call(this, this.queue.shift());
			});
	   	};
	   	let _wsReflect = RHU.reflectConstruct(ws, WebSocket, _wsConstructor);
	   	let ws = function(url, protocols = []) { return _wsReflect.call(this, new.target, [ url, protocols ]); };
		ws.prototype.send = function(data)
		{
			if (this.readyState === RHU.WebSockets.OPEN)
				WebSocket.prototype.send.call(this, data);
			else
				this.queue.push(data);
		}
		RHU.inherit(ws, WebSocket);

		/**
	     * @generator{RHU.WebSockets.wsClient}	Generates a socket client class
	     * @param webSocket{Object}    			Web socket the client will manage
	     * @param constructor{Function}   		Constructor function for this socket client
	     */
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

				_RHU.EventTarget.call(this);

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