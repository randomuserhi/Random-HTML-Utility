import { exists, parseOptions } from "./rhu.js";

const _fetch = fetch;
export namespace Rest {
    type RequestFunc<P extends any[] = []> = (...params: P) => Promise<RequestInit> | RequestInit; 
    type UrlFunc<P extends any[] = []> = (...params: P) => Promise<URL | string> | URL | string;
    type ParserFunc<P extends any[] = []> = (...params: P) => Promise<Payload> | Payload;
    type FetchFunc<T, P extends any[] = []> = (...params: P) => Promise<T>;

    interface Options<T, P extends any[] = []>
    {
        parser?: ParserFunc<P>;
        fetch: RequestFunc<P>;
        url: UrlFunc<P>;
        callback: (result: Response) => Promise<T>;
    }

    interface Payload
    {
        urlParams?: Record<string, string>;
        body?: BodyInit;
    }

    export function fetch<T, P extends any[] = []>(options: Options<T, P>): FetchFunc<T, P> {
        interface partialOpt extends Omit<Omit<Omit<Options<T, P>, "fetch">, "callback">, "url">
        {
            url?: () => string | URL;
            fetch?: () => RequestInit;
            callback?: (result: Response) => Promise<T>;
        }
        const partialOpt: partialOpt = {
            url: undefined,
            fetch: undefined,
            callback: undefined,
            parser: undefined
        };
        parseOptions(partialOpt, options);

        if (!exists(partialOpt.url)) throw new SyntaxError("No fetch url was provided.");
        if (!exists(partialOpt.fetch)) throw new SyntaxError("No fetch options were provided.");
        if (!exists(partialOpt.callback)) throw new SyntaxError("No callback was provided.");

        const opt: Options<T, P> = partialOpt as Options<T, P>;

        /** 
         * NOTE(randomuserhi): parser check is handled outside the function such that
         *                     the generated function object does not need to do a redundant
         *                     check.
         */
        if (exists(opt.parser)) {
            return (async function(...params: P) {
                const payload: Payload = { 
                    urlParams: {},
                    body: undefined
                };
                parseOptions(payload, opt.parser!(...params));

                const init: RequestInit = await opt.fetch(...params);
                if (exists(payload.body)) {
                    init.body = payload.body;
                }

                const url = new URL(await opt.url(...params));
                for (const key in payload.urlParams) if (exists(payload.urlParams[key])) url.searchParams.append(key, payload.urlParams[key]);
                const response = await _fetch(url, init);
                return await opt.callback(response);
            });
        } else {
            return (async function(...params: P) {
                const init: RequestInit = await opt.fetch(...params); 

                const url = new URL(await opt.url(...params));
                const response = await _fetch(url, init);
                return await opt.callback(response);
            });
        }
    }

    export function fetchJSON<T, P extends any[] = []>(options: Options<T, P>): FetchFunc<T, P> {
        interface partialOpt extends Omit<Omit<Omit<Options<T, P>, "url">, "fetch">, "callback">
        {
            url?: (...params: any[]) => Promise<string | URL> | string | URL;
            fetch?: (...params: any[]) => Promise<RequestInit> | RequestInit;
            callback?: (result: Response) => Promise<T>;
        }
        const partialOpt: partialOpt = {
            url: undefined,
            fetch: undefined,
            callback: undefined,
            parser: undefined
        };
        parseOptions(partialOpt, options);

        if (!exists(partialOpt.url)) throw new SyntaxError("No fetch url was provided.");
        if (!exists(partialOpt.fetch)) throw new SyntaxError("No fetch options were provided.");
        if (!exists(partialOpt.callback)) throw new SyntaxError("No callback was provided.");

        const fetch = partialOpt.fetch;
        partialOpt.fetch = async (...params: any[]) => {
            const request = await fetch(...params);
            const headers: Headers = new Headers(request.headers);
            headers.set("Content-Type", "application/json");
            request.headers = headers;
            return request;
        };

        const opt: Options<T, P> = partialOpt as Options<T, P>;

        /** 
         * NOTE(randomuserhi): parser check is handled outside the function such that
         *                     the generated function object does not need to do a redundant
         *                     check.
         */
        if (exists(opt.parser)) {
            const parser = opt.parser;
            opt.parser = async function(...params: P): Promise<Payload> {
                const payload = await parser(...params);

                if (exists(payload.body)) payload.body = JSON.stringify(payload.body);
                return payload;
            };
        }
        
        return Rest.fetch<T, P>(opt);
    }
}

export type Cookie = {
    name: string;
    value: string;
    expires?: Date;
    maxAge?: number;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: string;
} & Record<string, string>;

function isNonEmptyString(str: string): boolean {
    return typeof str === "string" && !!str.trim();
}

function parseNameValuePair(nameValuePairStr: string) {
    // Parses name-value-pair according to rfc6265bis draft

    let name = "";
    let value = "";
    const nameValueArr = nameValuePairStr.split("=");
    if (nameValueArr.length > 1) {
        name = nameValueArr.shift()!;
        value = nameValueArr.join("="); // everything after the first =, joined by a "=" if there was more than one part
    } else {
        value = nameValuePairStr;
    }
  
    return { name: name, value: value };
}

export namespace Cookie {
    export function jar(...cookies: Cookie[]): string {
        const str = [];
        for (const cookie of cookies) {
            str.push(`${cookie.name}=${cookie.value}`);
        }
        return str.join("; ");
    }

    export function parseSetCookie(setCookie: string) {
        const parts = setCookie.split(";").filter(isNonEmptyString);

        const nameValuePairStr = parts.shift();
        if (nameValuePairStr === undefined) throw new Error(`Unable to parse 'set-cookie' string of value: ${setCookie}`);
        const parsed = parseNameValuePair(nameValuePairStr);
        const name = parsed.name;
        const value = decodeURIComponent(parsed.value);

        const cookie: Cookie = { name, value };

        parts.forEach(function (part) {
            const sides = part.split("=");
            const key = sides.shift()!.trimStart().toLowerCase();
            const value = sides.join("=");
            if (key === "expires") {
                cookie.expires = new Date(value);
            } else if (key === "max-age") {
                cookie.maxAge = parseInt(value, 10);
            } else if (key === "secure") {
                cookie.secure = true;
            } else if (key === "httponly") {
                cookie.httpOnly = true;
            } else if (key === "samesite") {
                cookie.sameSite = value;
            } else {
                cookie[key] = value;
            }
        });

        return cookie;
    }
}