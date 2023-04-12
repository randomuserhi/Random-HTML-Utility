/**
 * RHU - Random HTML Utility
 * @randomuserhi.github.io
 */

(function() {
    "use strict";

    // TODO(randomuserhi): Config setting for performance (record timings)
    // TODO(randomuserhi): Documentation
    // TODO(randomuserhi): Splitting up key parts and custom compiler to merge them

    // TODO(randomuserhi): make sure that core (everything prior to checking main dependencies and running RHU),
    //                     is FULLY browser compatible
    //                     This lets RHU know if it will run on a given browser

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
                hard: [], 
                soft: [],
                trace: undefined
            };
            this.parseOptions(opt, _opt);

            let check = (items) => {
                let has = [];
                let missing = [];
                let set = {};
                for (let path of items)
                {
                    if (core.exists(set[path])) continue;

                    set[path] = true;
                    let traversal = path.split(".");
                    let obj = window;
                    for (; traversal.length !== 0 && this.exists(obj); obj = obj[traversal.shift()]) {
                        // Not needed body, since for loop handles traversal
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

            // TODO(randomuserhi): Returns dependencies that were available at the moment of module execution
            //                     Since the dependencies that are actually available at the current point in time
            //                     may change (soft dependencies), use RHU.exists to determine if it exists or not. 
            return {
                hard: hard,
                soft: soft,
                trace: opt.trace
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
                });
                return paths.join(separator);
            },
            // NOTE(randomuserhi): Uses POSIX standard, so '/file' is an absolute path.
            isAbsolute: function(path)
            {
                return /^([a-z]+:)?[\\/]/i.test(path);
            }
        }
    };

    // Check for dependencies
    {
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
        }
    }

    {
        // Initialize RHU
        if (window.RHU)
        {
            console.warn("Overwriting global RHU...");
        }
        
        window.RHU = {};
        let RHU = window.RHU;

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
                modules: [],
                includes: {}
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
                        console.error("Cannot load item that is both an x-module and a module.");
                        return;
                    }

                    let script = document.createElement("script");
                    script.type = "text/javascript";
                    script.src = path;
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
                            console.error(`Unable to find x-module '${handler.extension}'.`);
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
            RHU.isMobile = function()
            {
                // Courtesy of http://detectmobilebrowsers.com/
                if (RHU.exists(navigator.userAgentData) && RHU.exists(navigator.userAgentData.mobile)) return navigator.userAgentData.mobile;
                else return ((a) => /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw-(n|u)|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(-|_)|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-(m|p|t)|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c(-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac( |-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c(-|0|1)|47|mc|nd|ri)|sgh-|shar|sie(-|m)|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl|tdg-|tel(i|m)|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(a.substr(0,4)))(navigator.userAgent||navigator.vendor||window.opera);
            };

            RHU.exists = function(obj)
            {
                return obj !== null && obj !== undefined;
            };

            RHU.properties = function(obj, options = {}, operation = undefined)
            {
                if (!RHU.exists(obj)) throw TypeError("Cannot get properties of 'null' or 'undefined'.");

                let opt = {
                    enumerable: undefined,
                    configurable: undefined,
                    symbols: undefined,
                    hasOwn: undefined,
                    writable: undefined,
                    get: undefined,
                    set: undefined
                };
                RHU.parseOptions(opt, options);

                /** 
                 * NOTE(randomuserhi): In the event that Set() is not supported:
                 *                     Can use an object {} and then do `properties[descriptor] = undefined`,
                 *                     then use `for (let key in properties)` to return an array of properties.
                 */
                let properties = new Set();
                let iterate = function(props, descriptors)
                {
                    for (let p of props)
                    {
                        let descriptor = descriptors[p];
                        let valid = true;
                        
                        if (opt.enumerable && descriptor.enumerable !== opt.enumerable) valid = false;
                        if (opt.configurable && descriptor.configurable !== opt.configurable) valid = false;
                        if (opt.writable && descriptor.writable !== opt.writable) valid = false;
                        if (opt.get === false && descriptor.get) valid = false;
                        else if (opt.get === true && !descriptor.get) valid = false;
                        if (opt.set === false && descriptor.set) valid = false;
                        else if (opt.set === true && !descriptor.set) valid = false;

                        if (valid) 
                        {
                            if (!properties.has(p))
                            {
                                if (RHU.exists(operation)) operation(curr, p);
                                properties.add(p);
                            }
                        }
                    }
                };
                
                /**
                 * NOTE(randomuserhi): Reflect.ownKeys() gets both symbols and non-symbols so it may be worth using that
                 *                     when symbols is undefined
                 */

                let curr = obj;
                do
                {
                    let descriptors = Object.getOwnPropertyDescriptors(curr);
                    
                    if (!RHU.exists(opt.symbols) || opt.symbols === false)
                    {
                        let props = Object.getOwnPropertyNames(curr);
                        iterate(props, descriptors);
                    }
                    
                    if (!RHU.exists(opt.symbols) || opt.symbols === true)
                    {
                        let props = Object.getOwnPropertySymbols(curr);
                        iterate(props, descriptors);
                    }
                } while((curr = Object.getPrototypeOf(curr)) && !opt.hasOwn);
                
                return properties;
            };

            RHU.defineProperty = function(obj, p, o, options = {})
            {
                let opt = {
                    replace: false,
                    warn: false,
                    err: false
                };
                for (let key in opt) if (RHU.exists(options[key])) opt[key] = options[key];

                if (opt.replace || !RHU.properties(obj, { hasOwn: true }).has(p))
                {
                    delete obj[p];  // NOTE(randomuserhi): Should throw an error in Strict Mode when trying to delete a property of 'configurable: false'.
                                    //                     Also will not cause issues with inherited properties as `delete` only removes own properties.    
                    Object.defineProperty(obj, p, o);
                    return true;
                }
                if (opt.warn) console.warn(`Failed to define property '${p}', it already exists. Try 'replace: true'`);
                if (opt.err) console.error(`Failed to define property '${p}', it already exists. Try 'replace: true'`);
                return false;
            };

            RHU.definePublicProperty = function(obj, p, o, options = {})
            {
                let opt = {
                    writable: true,
                    enumerable: true
                };
                return RHU.defineProperty(obj, p, Object.assign(opt, o), options);
            };

            RHU.definePublicAccessor = function(obj, p, o, options = {})
            {
                let opt = {
                    configurable: true,
                    enumerable: true
                };
                return RHU.defineProperty(obj, p, Object.assign(opt, o), options);
            };

            RHU.defineProperties = function(obj, p, options = {})
            {
                for (let key of RHU.properties(p, { hasOwn: true }).keys())
                {
                    if (Object.hasOwnProperty.call(p, key))
                    {
                        RHU.defineProperty(obj, key, p[key], options);
                    }
                }
            };

            RHU.definePublicProperties = function(obj, p, options = {})
            {
                let opt = function()
                {
                    this.configurable = true;
                    this.writable = true;
                    this.enumerable = true;
                };
                for (let key of RHU.properties(p, { hasOwn: true }).keys())
                {
                    if (Object.hasOwnProperty.call(p, key))
                    {
                        let o = Object.assign(new opt(), p[key]);
                        RHU.defineProperty(obj, key, o, options);
                    }
                }
            };

            RHU.definePublicAccessors = function(obj, p, options = {})
            {
                let opt = function()
                {
                    this.configurable = true;
                    this.enumerable = true;
                };
                for (let key of RHU.properties(p, { hasOwn: true }).keys())
                {
                    if (Object.hasOwnProperty.call(p, key))
                    {
                        let o = Object.assign(new opt(), p[key]);
                        RHU.defineProperty(obj, key, o, options);
                    }
                }
            };

            RHU.assign = function(target, source, options = { replace: true })
            {
                if (target === source) return target;
                RHU.defineProperties(target, Object.getOwnPropertyDescriptors(source), options);
                return target;
            };

            RHU.delete = function(object, preserve = undefined)
            {
                if (object === preserve) return;

                /**
                 * Since preserve uses hasOwnProperty, inherited properties of preserve are not preserved:
                 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Enumerability_and_ownership_of_properties
                 *
                 * Since traversing and deleting a prototype can effect other objects, we do not recursively delete
                 * through the prototype.
                 *
                 * TODO(randomuserhi): Option to skip properties that are non-configurable (aka cannot be deleted).
                 *                     Right now we just throw an error.
                 */
                RHU.properties(object, { hasOwn: true }, (obj, prop) => {
                    if (!RHU.exists(preserve) || !RHU.properties(preserve, { hasOwn: true }).has(prop))
                        delete obj[prop];
                });
            };

            RHU.clone = function(object, prototype = undefined)
            {
                /** 
                 * NOTE(randomuserhi): Performs a shallow clone => references inside the cloned object will be the same
                 *                     as original.
                 */
                if (RHU.exists(prototype)) return RHU.assign(Object.create(prototype), object);
                else return RHU.assign(Object.create(Object.getPrototypeOf(object)), object);
            };

            RHU.redefine = function (object, prototype, preserve = undefined) 
            {
                /**
                 * NOTE(randomuserhi): redefines an objects type (prototype), removing old values, but does not 
                 *                     call the new types constructor.
                 */
                RHU.deleteProperties(object, preserve);
                Object.setPrototypeOf(object, prototype);
                return object;
            };

            RHU.isConstructor = function(func) 
            {
                try 
                {
                    Reflect.construct(String, [], func);
                } 
                catch (e) 
                {
                    return false;
                }
                return true;
            };

            RHU.inherit = function(child, base)
            {
                if (!RHU.isConstructor(child) || !RHU.isConstructor(base)) throw new TypeError(`'child' and 'base' must be object constructors.`); 

                Object.setPrototypeOf(child.prototype, base.prototype); // Inherit instance properties
                Object.setPrototypeOf(child, base); // Inherit static properties
            };

            RHU.reflectConstruct = function(child, base, constructor)
            {
                if (!RHU.isConstructor(child) || !RHU.isConstructor(base)) throw new TypeError(`'child' and 'base' must be object constructors.`);

                return function(newTarget, args = [])
                {
                    if (RHU.exists(newTarget))
                    {
                        let obj = Reflect.construct(base, args, child);
                        constructor.call(obj, ...args);
                        return obj;
                    }
                    else constructor.call(this, ...args);
                };
            };

            RHU.parseOptions = function(template, opt, inplace = true)
            {
                if (!RHU.exists(opt)) return template;
                if (!RHU.exists(template)) return template;
                
                let result = template;
                if (!inplace) result = RHU.clone(template);
                // NOTE(randomuserhi): Object.assign as opposed to assign method defined in RHU
                //                     is because we want a soft copy (ignoring getters and setters)
                //                     RHU copies everything including getters and setters
                Object.assign(result, opt);
                return result;
            };

            RHU.clearAttributes = function(element)
            {
                while(element.attributes.length > 0) element.removeAttribute(element.attributes[0].name);
            };

            RHU.getElementById = function(id, clearID = true)
            {
                let el = document.getElementById(id);
                if (clearID) el.removeAttribute("id");
                return el;
            };
        }

        // Load scripts and manage dependencies
        {
            core.readyState = "loading";
            RHU.definePublicAccessor(RHU, "readyState", {
                get: function() { return core.readyState; }
            });
            core.imports = []; // List of imports in order of execution
            RHU.definePublicAccessor(RHU, "imports", {
                get: function() { 
                    let obj = [...core.imports];
                    obj.toString = function() {
                        let msg = "Imports in order of execution:";
                        for (let item of obj)
                        {
                            msg += `\n${core.exists(item.module) ? item.module : "Unknown"}${core.exists(item.trace) ? "\n" + item.trace : ""}`;
                        }
                        return msg;
                    };
                    return obj; 
                }
            });

            let config = core.config;
            let loader = core.loader;
            let extensions = new Set();
            let modules = new Set();
            let includes = new Map();
            
            let watching = [];

            // TODO(randomuserhi): cleanup code, handleSoft here is kinda tacked on
            let execute = function(item, callback, handleSoft = true, logging = false)
            {
                let result = core.dependencies(item.dependencies);
                if (result.hard.missing.length === 0 && (handleSoft && result.soft.missing.length === 0))
                {
                    core.imports.push({
                        module: item.dependencies.module,
                        trace: core.exists(result.trace) ? result.trace.stack.split("\n")[1] : undefined
                    });
                    callback(result);
                    return true;
                }
                else if (logging)
                {
                    let msg = `could not loaded as not all hard dependencies were found.`;
                    if (core.exists(result.trace))
                        msg += `\n${result.trace.stack.split("\n").splice(1).join("\n")}\n`;
                    for (let dependency of result.hard.missing)
                    {
                        msg += (`\n\tMissing '${dependency}'`);
                    }

                    if (core.exists(item.dependencies.module))
                        console.warn(`Module, '${item.dependencies.module}', ${msg}`);
                    else
                        console.warn(`Unknown module ${msg}`);
                }
                return false;
            };

            let onload = function(success, handle)
            {
                if (success)
                {
                    let old = watching;
                    watching = [];
                    for (let item of old)
                    {
                        if (!execute(item, item.callback))
                            watching.push(item);
                    }
                }

                let handler = {
                    extension: undefined,
                    module: undefined
                };
                core.parseOptions(handler, handle);

                if (core.exists(handler.extension) && core.exists(handler.module))
                {
                    console.error("Cannot handle loading of item that is both an x-module and a module.");
                    return;
                }

                if (core.exists(handler.extension))
                    extensions.delete(handler.extension);
                else if (core.exists(handler.module))
                    modules.delete(handler.module);

                if (extensions.size === 0 && modules.size === 0)
                    oncomplete();
            };

            let oncomplete = function()
            {
                core.readyState = "complete";

                // Attempt to reconcile remaining modules and dependencies
                { // First handle dependencies that are fully accepted (no missing hard AND soft dependencies)
                    let oldLen = watching.length;
                    do
                    {
                        oldLen = watching.length;

                        let old = watching;
                        watching = [];
                        for (let item of old)
                            if (!execute(item, item.callback))
                                watching.push(item);
                    } while(oldLen !== watching.length);
                }
                { // Handle dependencies that are accepted (missing soft dependencies)
                    let oldLen = watching.length;
                    do
                    {
                        oldLen = watching.length;

                        let old = watching;
                        watching = [];
                        for (let item of old)
                            if (!execute(item, item.callback, false))
                                watching.push(item);
                    } while(oldLen !== watching.length);
                }

                // print modules that failed to reconcile
                for (let item of watching)
                    execute(item, item.callback, false, true);

                // NOTE(randomuserhi): Callbacks using '.' are treated as a single key: window[key],
                //                     so callback.special accesses window["callback.special"]
                if (core.exists(core.loader.root.params.load))
                    if (core.exists(window[core.loader.root.params.load]))
                        window[core.loader.root.params.load]();
                    else console.error(`Callback for 'load' event called '${core.loader.root.params.load}' does not exist.`);
                RHU.dispatchEvent(new CustomEvent("load"));
            };

            RHU.module = function(dependencies, callback)
            {
                if (core.readyState !== "complete")
                {
                    watching.push({
                        dependencies: dependencies,
                        callback: callback
                    });
                }
                else execute(dependencies, callback, true);
            };

            for (let extension of config.extensions)
            {
                if (typeof extension === "string" && extension)
                    extensions.add(extension);
            }
            for (let module of config.modules)
            {
                if (typeof module === "string" && module)
                    modules.add(module);
            }
            for (let path in config.includes)
            {
                if (typeof path !== "string" || path === "") continue;

                let isAbsolute = core.path.isAbsolute(path);
                for (let include of config.includes[path])
                {
                    if (typeof include !== "string" || include === "") continue;

                    if (isAbsolute)
                        includes.set(core.path.join(path, `${include}.js`), include);
                    else
                        includes.set(loader.root.path(core.path.join(path, `${include}.js`)), include);
                }
            }
            
            if (extensions.size === 0 && modules.size === 0 && includes.size === 0)
                oncomplete();
            else
            {
                for (let extension of extensions.keys())
                    loader.JS(loader.root.path(core.path.join("extensions", `${extension}.js`)), { extension: extension }, (success) => { onload(success, { extension : extension }); });
                for (let module of modules.keys())
                    loader.JS(loader.root.path(core.path.join("modules", `${module}.js`)), { module: module }, (success) => { onload(success, { module: module }); });
                for (let include of includes.keys())
                {
                    let module = includes.get(include);
                    loader.JS(include, { module: module }, (success) => { onload(success, { module: module }); });
                }
            }
        }

        // RHU is ready, but not yet loaded content
        // NOTE(randomuserhi): Callbacks using '.' are treated as a single key: window[key],
        //                     so callback.special accesses window["callback.special"]
        if (core.exists(core.loader.root.params.ready))
            if (core.exists(window[core.loader.root.params.ready]))
                window[core.loader.root.params.ready]();
            else console.error(`Callback for 'ready' event called '${core.loader.root.params.ready}' does not exist.`);
    }
})();