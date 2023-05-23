(function() {
    
    let RHU: RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module({ name: "rhu/rest", trace: new Error(), hard: ["fetch", "URL"] }, function()
    {
        if (RHU.exists(RHU.Rest))
            console.warn("Overwriting RHU.Rest...");

        let Rest: RHU.Rest = RHU.Rest = {
            fetch: function<T, P extends (...params: any[]) => RHU.Rest.Payload>(options: RHU.Rest.Options<T, P>): RHU.Rest.FetchFunc<T, P> | RHU.Rest.FetchFunc<T, RHU.Rest.ParserFunc> 
            {
                interface partialOpt extends Omit<Omit<RHU.Rest.Options<T, P>, "fetch">, "callback">
                {
                    fetch?: RequestInit;
                    callback?: (result: Response) => Promise<T>;
                }
                let partialOpt: partialOpt = {
                    url: "",
                    fetch: undefined,
                    callback: undefined,
                    parser: undefined
                };
                RHU.parseOptions(partialOpt, options);

                if (!RHU.exists(partialOpt.fetch)) throw new SyntaxError("No fetch options were provided.");
                if (!RHU.exists(partialOpt.callback)) throw new SyntaxError("No callback was provided.");
    
                let opt: RHU.Rest.Options<T, P> = partialOpt as RHU.Rest.Options<T, P>;

                /** 
                 * NOTE(randomuserhi): parser check is handled outside the function such that
                 *                     the generated function object does not need to do a redundant
                 *                     check.
                 */
                if (RHU.exists(opt.parser))
                {
                    return (async function(...params: Parameters<P>)
                    {
                        let payload: RHU.Rest.Payload = { 
                            urlParams: {},
                            body: null
                        };
                        RHU.parseOptions(payload, opt.parser!(...params));
    
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

            fetchJSON: function<T, Parser extends (...params: any[]) => RHU.Rest.Payload>(options: RHU.Rest.Options<T, Parser>): RHU.Rest.FetchFunc<T, Parser>
            {
                interface partialOpt extends Omit<Omit<Omit<RHU.Rest.Options<T, Parser>, "url">, "fetch">, "callback">
                {
                    url?: string | URL;
                    fetch?: RequestInit;
                    callback?: (result: Response) => Promise<T>;
                }
                let partialOpt: partialOpt = {
                    url: undefined,
                    fetch: undefined,
                    callback: undefined,
                    parser: undefined
                };
                RHU.parseOptions(partialOpt, options);

                if (!RHU.exists(partialOpt.url)) throw new SyntaxError("No fetch url was provided.");
                if (!RHU.exists(partialOpt.fetch)) throw new SyntaxError("No fetch options were provided.");
                if (!RHU.exists(partialOpt.callback)) throw new SyntaxError("No callback was provided.");

                if (!RHU.exists(partialOpt.fetch.headers)) partialOpt.fetch.headers = {};
                partialOpt.fetch.headers["Content-Type"] = "application/json";

                let opt: RHU.Rest.Options<T, Parser> = partialOpt as RHU.Rest.Options<T, Parser>;

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
                    } as Parser;
                }
                else
                {
                    opt.parser = function(payload) 
                    {
                        if (RHU.exists(payload.body)) payload.body = JSON.stringify(payload.body);
                        return payload;
                    } as Parser;
                }
                
                return Rest.fetch<T, Parser>(opt);
            }
        };
    });

})();