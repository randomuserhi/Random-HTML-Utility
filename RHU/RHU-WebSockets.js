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
		let CONNECTING = 0;
		let OPEN = 1;
		let CLOSING = 2;
		let CLOSED = 3;
		
		// TODO(randomuserhi): Document this
		// TODO(randomuserhi): Utilize symbols and getters / setters to protect key features
		// TODO(randomuserhi): Improve the API cause calling `RHU.WebSockets.wsClient.prototype.send.call` on front end 
		//                     is really stupid and unintuitive. Should really be inheritance based similar to 
		//                     RHU.Component etc...
		let wsClient = function(url, protocols = [], events = null)
		{
			this.close = undefined;
			this.error = undefined;
			this.message = undefined;
			this.open = function(e) { console.log(`WebSocket connected using protocol '${this.ws.protocol}'.`); };
			if (exists(events)) for (let key in this) if (exists(events[key])) this[key] = events[key];

			this.ws = new WebSocket(url, protocols);

			this.queue = [];

			this.addEventListener = this.ws.addEventListener;
			this.removeEventListener = this.ws.removeEventListener;

			if (exists(this.close)) this.ws.addEventListener("close", (e) => { this.close(e); });
			if (exists(this.error)) this.ws.addEventListener("error", (e) => this.error(e));
			if (exists(this.message)) this.ws.addEventListener("message", (e) => this.message(e));
			if (exists(this.open)) 
				this.ws.addEventListener("open", (e) => {
					this.open(e);

					// Send messages in queue
					for (let msg of this.queue) wsClient.prototype.send.call(this, msg);
				});
		};
		wsClient.prototype.send = function(data) 
		{
			if (this.ws.readyState === RHU.WebSockets.OPEN)
				this.ws.send(data);
			else
			{
				this.queue.push(data);
			}
		};

		/** ------------------------------------------------------------------------------------------------------
	     * NOTE(randomuserhi): Create interface for WebSockets API
	     */

		_RHU.definePublicProperties(_WebSockets, {
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