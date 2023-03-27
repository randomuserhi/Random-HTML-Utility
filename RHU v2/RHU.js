/**
 * RHU - Random HTML Utility
 * @randomuserhi.github.io
 */

"use strict";

// TODO(randomuserhi): Config setting for 

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
                error: true,
                module: "Module",
                hard: [], 
                soft: []
            };
            this.parseOptions(opt, _opt);

            let check = (items) => {
                let has = [];
                let missing = [];
                for (let path of items)
                {
                    let traversal = path.split(".");
                    let obj = window;
                    for (; traversal.length !== 0 && this.exists(obj); obj = obj[traversal.shift()]) {}
                    if (this.exists(obj))
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
            if (opt.error && hard.missing.length !== 0)
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
                    missing: [...hard.missing, ...soft.missing]
                },
                hard: hard,
                soft: soft,
                has: function(dependency)
                {
                    return this.info.has.includes(dependency);
                },
                missing: function(dependency)
                {
                    return this.info.missing.includes(dependency);
                }
            };
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
            "document.createElement",
            "document.head",
            "document.createTextNode",
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
        {
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
                modules: []
            };
            core.parseOptions(core.config, RHU.config);
        }

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
            else console.warn("Unable to find script element."); // NOTE(randomuserhi): Not sure if this is a fatal error or not...

            $.loader = {
                timeout: 15 * 1000,
                head: document.head,
                root: Object.assign({
                    path: function(path)
                    {
                        return core.path.join(this.location, path);
                    }
                }, root),
                JS: function(path, options, callback)
                {
                    let handler = {
                        extension: undefined,
                        module: undefined
                    };
                    core.parseOptions(handler, options);

                    if (core.exists(handler.module) && core.exists(handler.extension))
                    {
                        console.error("Cannot load item that is both an extension and a module.");
                        return;
                    }

                    let script = document.createElement("script");
                    script.type = "text/javascript";
                    script.src = this.root.path(path);
                    let handled = false;
                    script.onload = function()
                    {
                        handled = true;
                        if (core.exists(callback)) callback(true);
                    };
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
                        if (core.exists(callback)) callback(false);
                    };
                    script.onerror = onerror;
                    setTimeout(onerror, this.timeout);
                    
                    this.head.append(script);
                }
            };
        })(core); //not sure if I should expose it on RHU or leave it on local core implementation

        // Event Handler
        {
            // create a node for handling events with EventTarget
            let node = document.createTextNode(null);
            let addEventListener = node.addEventListener.bind(node);
            RHU.addEventListener = function (type, listener, options) {
                addEventListener(type, (e) => { listener(e.detail); }, options);
            };
            RHU.removeEventListener = node.removeEventListener.bind(node);
            RHU.dispatchEvent = node.dispatchEvent.bind(node);
        }

        // Core
        {
            RHU.exists = function(obj)
            {
                return obj !== null && obj !== undefined;
            };
        }

        // Load scripts and manage dependencies
        {
            RHU.readyState = "loading";

            let config = core.config;
            let loader = core.loader;
            let extensions = new Map();
            let modules = new Map();
            
            let watching = [];

            function execute(item, callback)
            {
                let result = core.dependencies(item.dependencies);
                if (result.hard.missing.length === 0)
                    callback(result);
                else
                {
                    if (core.exists(item.dependencies.module))
                    {
                        console.warn(`Module, '${item.dependencies.module}', could not loaded as not all hard dependencies were found.`);
                        console.groupCollapsed(`[${item.dependencies.module}] Trace:`);
                    }
                    else
                    {
                        console.warn(`Unknown module could not loaded as not all hard dependencies were found.`);
                        console.groupCollapsed(`[unknown] Trace:`);
                    }
                    for (let dependency of result.hard.missing)
                    {
                        console.warn(`Missing '${dependency}'`);
                    }
                    console.groupEnd();
                }
            }

            function onload(success, handle)
            {
                if (success)
                {
                    let newWatching = [];
                    for (let item of watching)
                    {
                        let result = core.dependencies(item.dependencies);
                        if (result.info.missing.length === 0)
                            item.callback(result);
                        else
                            newWatching.push(item);
                    }
                    watching = newWatching;
                }

                let handler = {
                    extension: undefined,
                    module: undefined
                };
                core.parseOptions(handler, handle);

                if (core.exists(handler.extension) && core.exists(handler.module))
                {
                    console.error("Cannot handle loading of item that is both an extension and a module.");
                    return;
                }

                if (core.exists(handler.extension))
                    extensions.delete(handler.extension);
                else if (core.exists(handler.module))
                    modules.delete(handler.module);

                if (extensions.size === 0 && modules.size === 0)
                    oncomplete();
            }

            function oncomplete()
            {
                RHU.dispatchEvent(new CustomEvent("load"));
                RHU.readyState = "complete";
            
                for (let item of watching)
                {
                    execute(item, item.callback);
                }
            }

            RHU.module = function(dependencies, callback)
            {
                let opt = { 
                    module: undefined,
                    hard: [], 
                    soft: []
                };
                this.parseOptions(opt, dependencies);
                opt.error = false;

                if (RHU.readyState !== "complete")
                {
                    watching.push({
                        dependencies: opt,
                        callback: callback
                    });
                }
                else
                {
                    execute(opt, callback);
                }
            };

            for (let extension of config.extensions)
            {
                extensions.set(extension);
                loader.JS(core.path.join("extensions", `${extension}.js`), { extension: extension }, (success) => { onload(success, { extension : extension }); });
            }
            for (let module of config.modules)
            {
                modules.set(module);
                loader.JS(core.path.join("modules", `${module}.js`), { module: module }, (success) => { onload(success, { module: module }); });
            }
        }
    }

}