(function() {
    
    let RHU: RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module({ name: "rhu/rest", trace: new Error(), hard: ["fetch", "URL"] }, function()
    {
        if (RHU.exists(RHU.Rest))
            console.warn("Overwriting RHU.Rest...");

        let Rest: RHU.Rest = RHU.Rest = {
            fetch: function<T>(options: RHU.Rest.Options<T>): RHU.Rest.FetchFunction<T>
            {
                let opt: RHU.Rest.Options<T> = {
                    url: undefined,
                    fetch: undefined,
                    callback: undefined,
                    parser: undefined
                };
                RHU.parseOptions(opt, options);

                if (!RHU.exists(opt.url)) throw new SyntaxError("No fetch input was provided.");
                if (!RHU.exists(opt.fetch)) throw new SyntaxError("No fetch options were provided.");
                if (!RHU.exists(opt.callback)) throw new SyntaxError("No callback was provided.");
    
                /** 
                 * NOTE(randomuserhi): parser check is handled outside the function such that
                 *                     the generated function object does not need to do a redundant
                 *                     check.
                 */
                if (RHU.exists(opt.parser))
                {
                    return (async function(...params: any[])
                    {
                        let payload: RHU.Rest.Payload = { 
                            urlParams: {},
                            body: null
                        };
                        RHU.parseOptions(payload, opt.parser(...params));
    
                        // NOTE(randomuserhi): clone opt.fetch so we do not effect the original settings.
                        let init: RequestInit = RHU.clone(opt.fetch);
                        init.body = payload.body;

                        let url = new URL(opt.url);
                        for (let key in payload.urlParams) url.searchParams.append(key, payload.urlParams[key]);
                        
                        const response = await fetch(url, init);
                        return await opt.callback(response);
                    });
                }
                else
                {
                    return (async function(payload: RHU.Rest.Payload)
                    {
                        let parsedPayload: RHU.Rest.Payload = { 
                            urlParams: {},
                            body: null
                        };
                        RHU.parseOptions(parsedPayload, payload);
    
                        // NOTE(randomuserhi): clone opt.fetch so we do not effect the original settings.
                        let init: RequestInit = RHU.clone(opt.fetch);
                        init.body = payload.body;    

                        let url = new URL(opt.url);
                        for (let key in parsedPayload.urlParams) url.searchParams.append(key, parsedPayload.urlParams[key]);
                        const response = await fetch(url, init);
                        return await opt.callback(response);
                    });
                }
            },

            fetchJSON: function<T>(options: RHU.Rest.Options<T>): RHU.Rest.FetchFunction<T>
            {
                let opt: RHU.Rest.Options<T> = {
                    url: undefined,
                    fetch: undefined,
                    callback: undefined,
                    parser: undefined
                };
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
                    opt.parser = function(...params: any[]): RHU.Rest.Payload 
                    {
                        let payload = parser(...params);

                        if (RHU.exists(payload.body)) payload.body = JSON.stringify(payload.body);
                        return payload;
                    };
                }
                else
                {
                    opt.parser = function(payload) 
                    {
                        if (RHU.exists(payload.body)) payload.body = JSON.stringify(payload.body);
                        return payload;
                    };
                }
                
                return Rest.fetch<T>(opt);
            }
        };
    });

})();