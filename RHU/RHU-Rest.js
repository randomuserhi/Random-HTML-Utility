/**
 * @namespace _RHU (Symbol.for("RHU")), RHU
 * NOTE(randomuserhi): _RHU (Symbol.for("RHU")) is the internal library hidden from user, whereas RHU is the public interface.
 */
(function (_RHU, RHU) 
{

	/**
	 * @namespace _RHU._Rest (Symbol.for("RHU")), RHU.Rest
	 */
	(function (_Rest, Rest) 
	{
		let exists = _RHU.exists;

		/**
		 * TODO(randomuserhi): Support CacheAPI for performance
		 */

		let _fetch = function(options)
		{
			let opt = {
	            url: undefined,
	            fetch: undefined,
	            callback: undefined,
	            parser: undefined
	        }
	        for (let key in opt) if (exists(options[key])) opt[key] = options[key];

	        if (!exists(opt.url)) throw new SyntaxError("No fetch url was provided.");
			if (!exists(opt.fetch)) throw new SyntaxError("No fetch options were provided.");
			if (!exists(opt.callback)) throw new SyntaxError("No callback was provided.");

			/** 
			 * NOTE(randomuserhi): parser check is handled outside the function such that
			 *                     the generated function object does not need to do a redundant
			 *                     check.
			 */
			if (exists(opt.parser))
			{
				return (async function(...payload)
				{
					options.body = opt.parser(...payload);
					const response = await fetch(opt.url, opt.fetch)
					return await opt.callback(response);
				});
			}
			else
			{
				return (async function(payload)
				{
					options.body = payload;
					const response = await fetch(opt.url, opt.fetch)
					return await opt.callback(response);
				});
			}
		}

		let _JSONfetch = function(options)
		{
			let opt = {
	            url: undefined,
	            fetch: undefined,
	            callback: undefined,
	            parser: undefined
	        }
	        for (let key in opt) if (exists(options[key])) opt[key] = options[key];

	        if (!exists(opt.url)) throw new SyntaxError("No fetch url was provided.");
			if (!exists(opt.fetch)) throw new SyntaxError("No fetch options were provided.");
			if (!exists(opt.callback)) throw new SyntaxError("No callback was provided.");

			if (!exists(opt.fetch.headers)) opt.fetch.headers = {};
			opt.fetch.headers["Content-Type"] = "application/json";

			/** 
			 * NOTE(randomuserhi): parser check is handled outside the function such that
			 *                     the generated function object does not need to do a redundant
			 *                     check.
			 */
			if (exists(opt.parser)) 
			{
				let parser = opt.parser;
				opt.parser = function(...payload) {
					return JSON.stringify(parser(...payload));
				}
			}
			else
			{
				opt.parser = function(payload) {
					return JSON.stringify(payload);
				}
			}
			
			return _fetch(opt);
		}

		_RHU.definePublicProperties(_Rest, {
	        fetch: {
	            enumerable: false,
	            value: _fetch
	        },
	        JSONfetch: {
	        	enumerable: false,
	        	value: _JSONfetch
	        }
	    });

	    _RHU.definePublicAccessors(Rest, {
	        fetch: {
	            get() { return _Rest.fetch; }
	        },
	        JSONfetch: {
	        	get() { return _Rest.JSONfetch; }
	        }
	    });

	})((_RHU.Rest || (_RHU.Rest = {})),
	(RHU.Rest || (RHU.Rest = {})));

})((window[Symbol.for("RHU")] || (window[Symbol.for("RHU")] = {})), // Internal library that can only be accessed via Symbol.for("RHU")
   (window["RHU"] || (window["RHU"] = {}))); // Public interfact for library