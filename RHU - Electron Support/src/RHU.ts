(function() {
    
    // Core Implementation for initial import
    let core: Core.Core;
    (function() {

        core = {
            exists: function(object: any)
            {
                return object !== null && object !== undefined;
            },
            parseOptions: function(this: Core.Core, template: any, opt: any)
            {
                if (!this.exists(opt)) return template;
                if (!this.exists(template)) return template;
                
                let result = template;
                Object.assign(result, opt);
                return result;
            },
            dependencies: function(this: Core.Core, options?: { hard?: string[], soft?: string[], trace?: Error }): Core.Dependencies
            {
                let opt: { hard: string[], soft: string[], trace: Error } = {
                    hard: [], 
                    soft: [],
                    trace: undefined
                };
                this.parseOptions(opt, options);
    
                let check = (items: string[]): Core.Dependency => {
                    let has: string[] = [];
                    let missing: string[] = [];
                    let set: Record<string, boolean> = {};
                    for (let path of items)
                    {
                        if (this.exists(set[path])) continue;
    
                        set[path] = true;
                        let traversal = path.split(".");
                        let obj = window;
                        for (; traversal.length !== 0 && this.exists(obj); obj = obj[traversal.shift()]) {
                            // No body needed, since for loop handles traversal
                        }
                        if (this.exists(obj))
                            has.push(path);
                        else
                            missing.push(path);
                    }
                    return {
                        has: has,
                        missing: missing
                    };
                };
    
                let hard = check(opt.hard);
                let soft = check(opt.soft);

                return {
                    hard: hard,
                    soft: soft,
                    trace: opt.trace
                };
            },
            path: {
                // Adapted from: https://stackoverflow.com/a/55142565/9642458
                join: function(...paths: string[]): string
                {
                    //NOTE(randomuserhi): Assumes '/' seperator, errors will occure when '\' is used.
                    const separator: string = "/"; 
                    paths = paths.map((part, index) => {
                        if (index) 
                            part = part.replace(new RegExp("^" + separator), "");
                        if (index !== paths.length - 1) 
                            part = part.replace(new RegExp(separator + "$"), "");
                        return part;
                    });
                    return paths.join(separator);
                },
                // NOTE(randomuserhi): Uses POSIX standard, so '/file' is an absolute path.
                isAbsolute: function(path: string): boolean
                {
                    return /^([a-z]+:)?[\\/]/i.test(path);
                }
            },
            config: undefined,
            loader: undefined
        };

    })();

    // Check for dependencies
    let result = core.dependencies({
        hard: [
            "document.createElement",
            "document.head",
            "document.createTextNode",
            "window.Function",
            "Map",
            "Set",
            "Reflect"
        ]
    });
    if (result.hard.missing.length !== 0)
    {
        let msg = `RHU was unable to import due to missing dependencies.`;
        if (core.exists(result.trace))
            msg += `\n${result.trace.stack.split("\n").splice(1).join("\n")}\n`;
        for (let dependency of result.hard.missing)
        {
            msg += (`\n\tMissing '${dependency}'`);
        }
        console.error(msg);
        return;
    }

    // TODO(randomuserhi): refactor + cleanup + typescript the below sections

    // Load config
    (function() {

        let loaded;
            
        let scripts = document.getElementsByTagName("script");
        for (let s of scripts) 
        {
            var type = String(s.type).replace(/ /g, "");
            if (type.match(/^text\/x-rhu-config(;.*)?$/) && !type.match(/;executed=true/)) 
            {
                s.type += ";executed=true";
                loaded = Function(`"use strict"; let RHU = { config: {} }; ${s.innerHTML}; return RHU;`)();
            }
        }

        let RHU = {
            config: {}
        };
        core.parseOptions(RHU, loaded);
        core.config = {
            root: undefined,
            extensions: [],
            modules: [],
            includes: {}
        };
        core.parseOptions(core.config, RHU.config);

    })();

    // Script loader
    (function() {

        let config = core.config;
        let root = {
            location: config.root,
            script: "",
            params: {}
        };

        // Get root location if unable to load from config
        if (core.exists(document.currentScript))
        {
            if (!core.exists(root.location))
            {
                let s: HTMLScriptElement = document.currentScript as HTMLScriptElement;
                root.location = s.src.match(/(.*)[/\\]/)[1] || "";
                root.script = s.innerHTML;
                let params = (new URL(s.src)).searchParams;
                for (let key of params.keys())
                {
                    root.params[key] = params.get(key);
                }
            }
        }
        else console.warn("Unable to find script element."); // NOTE(randomuserhi): Not sure if this is a fatal error or not...

        core.loader = {

        };

    })();

    // RHU implementation
    (function() {

        if (core.exists(window.RHU)) 
            console.warn("Overwriting global RHU...");

        let RHU = window.RHU = {
            version: "1.0.0"
        };

    })();

})();