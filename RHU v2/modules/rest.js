"use strict";

{
	let RHU = window.RHU;
	if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
	RHU.module({ module: "rhu/rest", hard: [] }, function(e)
	{
		//TODO(randomuserhi): read from a config and enable performance logging etc...

		if (RHU.exists(RHU.Rest))
			console.warn("Overwriting RHU.Rest...");

		let Rest = RHU.Rest = {};

		Rest.fetch = function(options)
		{
			let opt = {
	            url: undefined,
	            fetch: undefined,
	            callback: undefined,
	            parser: undefined
	        }
	        RHU.parseOptions(opt, options);

	        if (!RHU.exists(opt.url)) throw new SyntaxError("No fetch url was provided.");
			if (!RHU.exists(opt.fetch)) throw new SyntaxError("No fetch options were provided.");
			if (!RHU.exists(opt.callback)) throw new SyntaxError("No callback was provided.");

			let parsedPayload = { 
				urlParams: {},
				body: undefined
			};

			/** 
			 * NOTE(randomuserhi): parser check is handled outside the function such that
			 *                     the generated function object does not need to do a redundant
			 *                     check.
			 */
			if (RHU.exists(opt.parser))
			{
				return (async function(...params)
				{
					let payload = opt.parser(...params);
					
					for (let key in parsedPayload) if (RHU.exists(payload[key])) parsedPayload[key] = payload[key];

					opt.fetch.body = parsedPayload.body;
					let url = new URL(opt.url);
					for (let key in parsedPayload.urlParams) url.searchParams.append(key, parsedPayload.urlParams[key]);
					const response = await fetch(url, opt.fetch);
					return await opt.callback(response);
				});
			}
			else
			{
				return (async function(payload)
				{
			        for (let key in parsedPayload) if (RHU.exists(payload[key])) parsedPayload[key] = payload[key];

					opt.fetch.body = parsedPayload.body;
					let url = new URL(opt.url);
					for (let key in parsedPayload.urlParams) url.searchParams.append(key, parsedPayload.urlParams[key]);
					const response = await fetch(url, opt.fetch);
					return await opt.callback(response);
				});
			}
		}

		Rest.fetchJSON = function(options)
		{
			let opt = {
	            url: undefined,
	            fetch: undefined,
	            callback: undefined,
	            parser: undefined
	        }
	        RHU.parseOptions(opt, options);

	        if (!RHU.exists(opt.url)) throw new SyntaxError("No fetch url was provided.");
			if (!RHU.exists(opt.fetch)) throw new SyntaxError("No fetch options were provided.");
			if (!RHU.exists(opt.callback)) throw new SyntaxError("No callback was provided.");

			if (!RHU.exists(opt.fetch.headers)) opt.fetch.headers = {};
			opt.fetch.headers["Content-Type"] = "application/json";

			/** 
			 * NOTE(randomuserhi): parser check is handled outside the function such that
			 *                     the generated function object does not need to do a redundant
			 *                     check.
			 */
			if (RHU.exists(opt.parser)) 
			{
				let parser = opt.parser;
				opt.parser = function(...params) {
					let payload = parser(...params)

					if (RHU.exists(payload.body)) payload.body = JSON.stringify(payload.body);
					return payload;
				}
			}
			else
			{
				opt.parser = function(payload) {
					if (RHU.exists(payload.body)) payload.body = JSON.stringify(payload.body);
					return payload;
				}
			}
			
			return _fetch(opt);
		}
	});
}