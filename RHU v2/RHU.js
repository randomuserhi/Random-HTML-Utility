/**
 * RHU - Random HTML Utility
 * @randomuserhi.github.io
 */

"use strict";

{

    // Core sub-library for functionality pre-RHU
    let core = {
        exists: function(obj)
        {
            return obj !== null && obj !== undefined;    
        },
        parseOptions: function(template, opt)
        {
            if (!this.exists(opt)) return template;
            if (!this.exists(template)) return template;
            
            let result = template;
            Object.assign(result, opt);
            return result;
        },
        dependencies: function(_opt = {})
        {
            let opt = { 
                module: "Module",
                hard: [], 
                soft: []
            };
            this.parseOptions(opt, _opt);

            function check(items)
            {
                let has = [];
                let missing = [];
                for (let path of items)
                {
                    let traversal = path.split(".");
                    let obj = window;
                    for (; traversal.length !== 0; obj = obj[traversal.shift()]) {}
                    if (obj !== null && obj !== undefined)
                        has.push(path)
                    else
                        missing.push(path)
                }
                return {
                    has: has,
                    missing: missing
                };
            }

            let hard = check(opt.hard);
            if (hard.missing.length !== 0)
            {
                for (let dependency of hard.missing)
                {
                    console.error(`Missing dependency '${dependency}'.`);
                }
                throw new Error(`${opt.module} had missing dependencies.`);
            }

            let soft = check(opt.soft);

            return {
                info: {
                    has: [...hard.has, ...soft.has],
                    missing: soft.missing
                },
                has: function(dependency)
                {
                    return this.info.has.includes(dependency);
                }
            }
        },
        path: {
            // Adapted from: https://stackoverflow.com/a/55142565/9642458
            join: function(...paths)
            {
                //NOTE(randomuserhi): Assumes '/' seperator, errors will occure when '\' is used.
                const separator = '/'; 
                paths = paths.map((part, index) => {
                    if (index) 
                        part = part.replace(new RegExp('^' + separator), '');
                    if (index !== paths.length - 1) 
                        part = part.replace(new RegExp(separator + '$'), '');
                    return part;
                })
                return paths.join(separator);
            }
        }
    }

    // Check for dependencies
    core.dependencies({
        module: "RHU",
        hard: [
            "document",
            "document.createElement",
            "window.Function"
        ]
    });

    {
        // Initialize RHU
        if (window.RHU)
        {

        }
        else
        {
            window.RHU = {};
        }

        // Meta
        RHU.version = "1.0.0";

        // Load config into core
        // TODO(randomuserhi): Proper error handling on the eval command to say config loaded incorrectly or something
        (function()
        {

            let loaded;
            
            let scripts = document.getElementsByTagName("script");
            for (let s of scripts) 
            {
                var type = String(s.type).replace(/ /g, "");
                if (type.match(/^text\/x-rhu-config(;.*)?$/) && !type.match(/;executed=true/)) 
                {
                    s.type += ";executed=true";
                    loaded = Function(`"use strict"; RHU = { config: {} }; ${s.innerHTML}; return RHU;`)();
                }
            }

            let RHU = {
                config: {}
            };
            core.parseOptions(RHU, loaded);
            core.config = {
                root: undefined,
                extensions: [],
                modules: []
            };
            core.parseOptions(core.config, RHU.config);

        })();

        // Dynamic script loader
        (function($)
        {

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
                    let s = document.currentScript;
                    root.location = s.src.match(/(.*)[\/\\]/)[1] || "";
                    root.script = s.innerHTML;
                    let params = (new URL(s.src)).searchParams;
                    for (let key of params.keys())
                    {
                        root.params[key] = params.get(key);
                    }
                }
            }
            else console.warn("Unable to find script object."); // NOTE(randomuserhi): Not sure if this is a fatal error or not...

            $.loader = {
                timeout: 15 * 1000,
                head: document.head,
                root: Object.assign({
                    path: function(path)
                    {
                        return core.path.join(this.location, path);
                    }
                }, root),
                JS: function(path, options)
                {
                    let handler = {
                        extension: undefined,
                        module: undefined,
                        callback: undefined
                    };
                    core.parseOptions(handler, options)

                    let script = document.createElement("script");
                    script.type = "text/javascript";
                    script.src = this.root.path(path);
                    let handled = false;
                    script.onload = function()
                    {
                        handled = true;  
                        if (core.exists(handler.callback)) handler.callback();
                    };
                    // TODO(randomuserhi): Handle dependency like if a file is a hard dependency,
                    //                     code needs to know which parts can't run due to this file being missing
                    //                     etc...
                    let onerror = function()
                    {
                        if (handled) return;
                        if (core.exists(handler.module))
                            console.error(`Unable to find module '${handler.module}'.`);
                        else if (core.exists(handler.extension))
                            console.error(`Unable to find extension '${handler.extension}'.`);
                        else
                            console.error(`Unable to load script: [RHU]/${path}`);
                        handled = true;
                    };
                    script.onerror = onerror;
                    setTimeout(onerror, this.timeout);
                    
                    this.head.append(script);
                }
            };
        
        })(core); //not sure if I should expose it on RHU or leave it on local core implementation

        // Core
        (function($)
        {

            $.exists = function(obj)
            {
                return obj !== null && obj !== undefined;
            };
        
        })(RHU);

        // Load scripts
        (function()
        {

            let config = core.config;
            let loader = core.loader;
            
            for (let extension of config.extensions)
            {
                loader.JS(core.path.join("extensions", `${extension}.js`), { extension: extension });
            }
            for (let module of config.modules)
            {
                loader.JS(core.path.join("modules", `${module}.js`), { module: module });
            }

        })();
    }

}