(function() {
    
    const RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module(new Error(), "rhu/rest",
        {},    
        function() {
            const Rest: RHU.Rest = {
                fetch: function<T, P extends (...params: any[]) => RHU.Rest.Payload>(options: RHU.Rest.Options<T, P>): RHU.Rest.FetchFunc<T, P> | RHU.Rest.FetchFunc<T, RHU.Rest.ParserFunc> {
                    interface partialOpt extends Omit<Omit<RHU.Rest.Options<T, P>, "fetch">, "callback">
                    {
                        fetch?: RequestInit;
                        callback?: (result: Response) => Promise<T>;
                    }
                    const partialOpt: partialOpt = {
                        url: "",
                        fetch: undefined,
                        callback: undefined,
                        parser: undefined
                    };
                    RHU.parseOptions(partialOpt, options);

                    if (!RHU.exists(partialOpt.fetch)) throw new SyntaxError("No fetch options were provided.");
                    if (!RHU.exists(partialOpt.callback)) throw new SyntaxError("No callback was provided.");
        
                    const opt: RHU.Rest.Options<T, P> = partialOpt as RHU.Rest.Options<T, P>;

                    /** 
                     * NOTE(randomuserhi): parser check is handled outside the function such that
                     *                     the generated function object does not need to do a redundant
                     *                     check.
                     */
                    if (RHU.exists(opt.parser)) {
                        return (async function(...params: Parameters<P>) {
                            const payload: RHU.Rest.Payload = { 
                                urlParams: {},
                                body: null
                            };
                            RHU.parseOptions(payload, opt.parser!(...params));
        
                            // NOTE(randomuserhi): clone opt.fetch so we do not effect the original settings.
                            const init: RequestInit = RHU.clone(opt.fetch);
                            init.body = payload.body;

                            const url = new URL(opt.url);
                            for (const key in payload.urlParams) url.searchParams.append(key, payload.urlParams[key]);
                            
                            const response = await fetch(url, init);
                            return await opt.callback(response);
                        });
                    } else {
                        return (async function(payload: RHU.Rest.Payload) {
                            const parsedPayload: RHU.Rest.Payload = { 
                                urlParams: {},
                                body: null
                            };
                            RHU.parseOptions(parsedPayload, payload);
        
                            // NOTE(randomuserhi): clone opt.fetch so we do not effect the original settings.
                            const init: RequestInit = RHU.clone(opt.fetch);
                            init.body = payload.body;    

                            const url = new URL(opt.url);
                            for (const key in parsedPayload.urlParams) url.searchParams.append(key, parsedPayload.urlParams[key]);
                            const response = await fetch(url, init);
                            return await opt.callback(response);
                        });
                    }
                },

                fetchJSON: function<T, Parser extends (...params: any[]) => RHU.Rest.Payload>(options: RHU.Rest.Options<T, Parser>): RHU.Rest.FetchFunc<T, Parser> {
                    interface partialOpt extends Omit<Omit<Omit<RHU.Rest.Options<T, Parser>, "url">, "fetch">, "callback">
                    {
                        url?: string | URL;
                        fetch?: RequestInit;
                        callback?: (result: Response) => Promise<T>;
                    }
                    const partialOpt: partialOpt = {
                        url: undefined,
                        fetch: undefined,
                        callback: undefined,
                        parser: undefined
                    };
                    RHU.parseOptions(partialOpt, options);

                    if (!RHU.exists(partialOpt.url)) throw new SyntaxError("No fetch url was provided.");
                    if (!RHU.exists(partialOpt.fetch)) throw new SyntaxError("No fetch options were provided.");
                    if (!RHU.exists(partialOpt.callback)) throw new SyntaxError("No callback was provided.");

                    const headers: Headers = new Headers(partialOpt.fetch.headers);
                    headers.set("Content-Type", "application/json");
                    partialOpt.fetch.headers = headers;

                    const opt: RHU.Rest.Options<T, Parser> = partialOpt as RHU.Rest.Options<T, Parser>;

                    /** 
                     * NOTE(randomuserhi): parser check is handled outside the function such that
                     *                     the generated function object does not need to do a redundant
                     *                     check.
                     */
                    if (RHU.exists(opt.parser)) {
                        const parser = opt.parser;
                        opt.parser = function(...params: any[]): RHU.Rest.Payload {
                            const payload = parser(...params);

                            if (RHU.exists(payload.body)) payload.body = JSON.stringify(payload.body);
                            return payload;
                        } as Parser;
                    } else {
                        opt.parser = function(payload) {
                            if (RHU.exists(payload.body)) payload.body = JSON.stringify(payload.body);
                            return payload;
                        } as Parser;
                    }
                    
                    return Rest.fetch<T, Parser>(opt);
                }
            };

            return Rest;
        }
    );

})();