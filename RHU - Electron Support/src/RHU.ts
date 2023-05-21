(function() {

    const LOADING: string = "loading";
    const COMPLETE: string = "complete";

    // Core Implementation for initial import
    let core: Core;
    (function() {

        core = {
            exists: function(object: any)
            {
                return object !== null && object !== undefined;
            },
            parseOptions: function<T>(template: T, opt: any): T
            {
                if (!core.exists(opt)) return template;
                if (!core.exists(template)) return template;
                
                let result = template;
                Object.assign(result, opt);
                return result;
            },
            dependencies: function(options?: { hard?: string[], soft?: string[], trace?: Error }): Core.Dependencies
            {
                let opt: { hard: string[], soft: string[], trace: Error } = {
                    hard: [], 
                    soft: [],
                    trace: undefined
                };
                core.parseOptions(opt, options);
    
                let check = (items: string[]): Core.Dependency => {
                    let has: string[] = [];
                    let missing: string[] = [];
                    let set: Record<string, boolean> = {};
                    for (let path of items)
                    {
                        if (core.exists(set[path])) continue;
    
                        set[path] = true;
                        let traversal = path.split(".");
                        let obj = window;
                        for (; traversal.length !== 0 && core.exists(obj); obj = obj[traversal.shift()]) {
                            // No body needed, since for loop handles traversal
                        }
                        if (core.exists(obj))
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
                    paths = paths.map((part: string, index: number) => {
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

            readyState: LOADING,
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

    // Load config
    (function() {

        let loaded: { config: {} };
            
        let scripts = document.getElementsByTagName("script");
        for (let s of scripts) 
        {
            let type = String(s.type).replace(/ /g, "");
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

    // Initialize rest of core (script loader and root config)
    (function() {

        let config = core.config;
        let root: { location: string, script: string, params: Record<string, string> } = {
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

        // Create loader
        core.loader = {
            timeout: 15 * 1000,
            head: document.head,
            root: Object.assign({
                path: function(this: Core.Root, path: string): string
                {
                    return core.path.join(this.location, path);
                }
            }, root),
            JS: function(this: Core.Loader, path: string, module: Core.Module, callback?: (successful: boolean) => void): boolean
            {
                let mod: Core.Module = {
                    name: undefined,
                    type: Core.Module.Type.Module
                };
                core.parseOptions(mod, module);

                if (!core.exists(mod.name))
                {
                    console.error("Cannot load module without a name.");
                    return false;
                }

                if (!core.exists(mod.type))
                {
                    console.error("Cannot load module without a type.");
                    return false;
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
                    if (core.exists(mod.type))
                        console.error(`Unable to find ${mod.type}, '${mod.name}'.`);
                    else
                        console.error(`Unable to load script: [RHU]/${path}`);
                    handled = true;
                    if (core.exists(callback)) callback(false);
                };
                script.onerror = onerror;
                setTimeout(onerror, this.timeout);
                
                this.head.append(script);

                return true;
            }
        };

    })();

    // RHU implementation
    (function() {

        if (core.exists(window.RHU)) 
            console.warn("Overwriting global RHU...");

        let RHU: RHU = window.RHU = {
            version: "1.0.0",

            ReadyState: {
                Loading: LOADING,
                Complete: COMPLETE
            },

            readyState: LOADING,

            isMobile: function(): boolean
            {
                // Courtesy of http://detectmobilebrowsers.com/
                if (RHU.exists((navigator as any).userAgentData) && RHU.exists((navigator as any).userAgentData.mobile)) return (navigator as any).userAgentData.mobile;
                else return ((a) => /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw-(n|u)|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(-|_)|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-(m|p|t)|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c(-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac( |-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c(-|0|1)|47|mc|nd|ri)|sgh-|shar|sie(-|m)|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl|tdg-|tel(i|m)|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(a.substr(0,4)))(navigator.userAgent||(navigator as any).vendor||(window as any).opera);
            },

            exists: function(obj: any): boolean
            {
                return obj !== null && obj !== undefined;
            },

            parseOptions: function<T>(template: T, options: any): T
            {
                if (!RHU.exists(options)) return template;
                if (!RHU.exists(template)) return template;
                
                let result = template;
                Object.assign(result, options);
                return result;
            },

            properties: function(object: any, options: RHU.Properties.Options = {}, operation?: (object: any, property: PropertyKey) => void): Set<PropertyKey>
            {
                if (!RHU.exists(object)) throw TypeError("Cannot get properties of 'null' or 'undefined'.");

                let opt: RHU.Properties.Options = {
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
                let properties = new Set<PropertyKey>();
                let iterate = function
                <Type extends keyof ({ [x: PropertyKey]: TypedPropertyDescriptor<any> } & { [x: PropertyKey]: PropertyDescriptor })>
                (props: Type[], descriptors: { [x: PropertyKey]: TypedPropertyDescriptor<any> } & { [x: PropertyKey]: PropertyDescriptor }): void
                {
                    for (let p of props)
                    {
                        let descriptor = descriptors[p];
                        let valid = true;
                        
                        // TODO(randomuserhi): Fairly sure these conditions are incorrect, need double checking
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
                let curr = object;
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
            },

            defineProperty: function(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: RHU.Properties.Flags): boolean
            {
                let opt: RHU.Properties.Flags = {
                    replace: true,
                    warn: false,
                    err: false
                };
                RHU.parseOptions(opt, flags);
    
                if (opt.replace || !RHU.properties(object, { hasOwn: true }).has(property))
                {
                    delete object[property];  // NOTE(randomuserhi): Should throw an error in Strict Mode when trying to delete a property of 'configurable: false'.
                                    //                     Also will not cause issues with inherited properties as `delete` only removes own properties.    
                    Object.defineProperty(object, property, options);
                    return true;
                }
                if (opt.warn) console.warn(`Failed to define property '${property.toString()}', it already exists. Try 'replace: true'`);
                if (opt.err) console.error(`Failed to define property '${property.toString()}', it already exists. Try 'replace: true'`);
                return false;
            },
            definePublicProperty: function(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: RHU.Properties.Flags)
            {
                let opt: PropertyDescriptor = {
                    writable: true,
                    enumerable: true
                };
                return RHU.defineProperty(object, property, Object.assign(opt, options), flags);
            },
            definePublicAccessor: function(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: RHU.Properties.Flags)
            {
                let opt: PropertyDescriptor = {
                    configurable: true,
                    enumerable: true
                };
                return RHU.defineProperty(object, property, Object.assign(opt, options), flags);
            },

            defineProperties: function(object, properties: { [x: PropertyKey]: PropertyDescriptor }, flags?: RHU.Properties.Flags)
            {
                for (let key of RHU.properties(properties, { hasOwn: true }).keys())
                {
                    if (Object.hasOwnProperty.call(properties, key))
                    {
                        RHU.defineProperty(object, key, properties[key], flags);
                    }
                }
            },
            definePublicProperties: function(object, properties: { [x: PropertyKey]: PropertyDescriptor }, flags?: RHU.Properties.Flags)
            {
                interface opt
                {
                    new(): PropertyDescriptor,
                    prototype: PropertyDescriptor
                }
                let opt = function(this: PropertyDescriptor)
                {
                    this.configurable = true;
                    this.writable = true;
                    this.enumerable = true;
                } as Function as opt;

                for (let key of RHU.properties(properties, { hasOwn: true }).keys())
                {
                    if (Object.hasOwnProperty.call(properties, key))
                    {
                        let o = Object.assign(new opt(), properties[key]);
                        RHU.defineProperty(object, key, o, flags);
                    }
                }
            },
            definePublicAccessors: function(object, properties: { [x: PropertyKey]: PropertyDescriptor }, flags?: RHU.Properties.Flags)
            {
                interface opt
                {
                    new(): PropertyDescriptor,
                    prototype: PropertyDescriptor
                }
                let opt = function(this: PropertyDescriptor)
                {
                    this.configurable = true;
                    this.enumerable = true;
                } as Function as opt;

                for (let key of RHU.properties(properties, { hasOwn: true }).keys())
                {
                    if (Object.hasOwnProperty.call(properties, key))
                    {
                        let o = Object.assign(new opt(), properties[key]);
                        RHU.defineProperty(object, key, o, flags);
                    }
                }
            },

            assign: function<T>(target: T, source: any, options?: RHU.Properties.Flags): T
            {
                if (target === source) return target;
                RHU.defineProperties(target, Object.getOwnPropertyDescriptors(source), options);
                return target;
            },

            deleteProperties: function(object: any, preserve: {}): void
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
                RHU.properties(object, { hasOwn: true }, (obj: any, prop: PropertyKey) => {
                    if (!RHU.exists(preserve) || !RHU.properties(preserve, { hasOwn: true }).has(prop))
                        delete obj[prop];
                });
            },

            clone: function<T extends object>(object: any, prototype?: T) : T
            {
                /** 
                 * NOTE(randomuserhi): Performs a shallow clone => references inside the cloned object will be the same
                 *                     as original.
                 */
                if (RHU.exists(prototype)) return RHU.assign(Object.create(prototype), object);
                else return RHU.assign(Object.create(Object.getPrototypeOf(object)), object);
            },

            isConstructor: function(object: any): boolean
            {
                try 
                {
                    Reflect.construct(String, [], object);
                } 
                catch (e) 
                {
                    return false;
                }
                return true;
            },

            inherit: function(child: Function, base: Function): void
            {
                // NOTE(randomuserhi): Cause we are using typescript, we don't need this check.
                //if (!RHU.isConstructor(child) || !RHU.isConstructor(base)) throw new TypeError(`'child' and 'base' must be object constructors.`); 

                Object.setPrototypeOf(child.prototype, base.prototype); // Inherit instance properties
                Object.setPrototypeOf(child, base); // Inherit static properties
            },

            // NOTE(randomuserhi): Disabled, since 'name' is no longer needed with electron + typescript
            //reflectConstruct: function(base: Function, name: string, constructor: Function, argnames?: string[]): RHU.ReflectConstruct
            
            reflectConstruct: function(base: Function, constructor: Function, argnames?: string[]): RHU.ReflectConstruct
            {
                // NOTE(randomuserhi): Cause we are using typescript, we don't need this check.
                //if (!RHU.isConstructor(base)) throw new TypeError(`'constructor' and 'base' must be object constructors.`);

                // Get arguments from constructor or from provided argnames
                let args = argnames;
                if (!RHU.exists(args))
                {
                    args = ["...args"];

                    let STRIP_COMMENTS = /((\/\/.*$)|(\/\*.*\*\/))/mg;
                    let funcString = constructor.toString().replace(STRIP_COMMENTS, "");
                    if (funcString.indexOf("function") === 0)
                    {
                        let s = funcString.substring("function".length).trimStart();
                        args = s.substring(s.indexOf("(") + 1, s.indexOf(")"))
                            .split(",")
                            .map((a) => {
                                let clean = a.trim();
                                // Remove optional assignment in parameters
                                clean = clean.split(/[ =]/)[0];
                                return clean;
                            })
                            .filter((c) => c !== "");
                    }
                }

                // Create function definition with provided signature
                let definition: RHU.ReflectConstruct;

                // NOTE(randomuserhi): Disabled, since eval() is a security risk on electron + typescript can handle drawbacks of not having this implemented
                /*let argstr = args.join(",");
                if (!RHU.exists(name))
                    name = constructor.name;
                name.replace(/[ \t\r\n]/g, "");
                if (name === "") name = "__ReflectConstruct__";
                let parts = name.split(".").filter(c => c !== "");
                let evalStr = "{ let ";
                for (let i = 0; i < parts.length - 1; ++i)
                {
                    let part = parts[i];
                    evalStr += `${part} = {}; ${part}.`;
                }
                evalStr += `${parts[parts.length - 1]} = function(${argstr}) { return definition.__reflect__.call(this, new.target, [${argstr}]); }; definition = ${parts.join(".")} }`;
                eval(evalStr);*/

                if (!RHU.exists(definition))
                {
                    //console.warn("eval() call failed to create reflect constructor. Using fallback...");
                    definition = function(...args: any[]): unknown
                    {
                        return definition.__reflect__.call(this, new.target, args);
                    } as Function as RHU.ReflectConstruct; // NOTE(randomuserhi): dodgy cast, but needs to be done so we can initially set the definition
                }

                // NOTE(randomuserhi): Careful with naming conflicts since JS may add __constructor__ as a standard function property
                definition.__constructor__ = constructor;
                definition.__args__ = function()
                {
                    return [];
                };
                definition.__reflect__ = function(newTarget: unknown, args: any[] = []) : unknown
                {
                    if (RHU.exists(newTarget))
                    {
                        let obj = Reflect.construct(base, definition.__args__(...args), definition);
                        definition.__constructor__.call(obj, ...args);
                        return obj;
                    }
                    else definition.__constructor__.call(this, ...args);
                };

                return definition; 
            },

            clearAttributes: function(element: HTMLElement): void
            {
                while(element.attributes.length > 0) element.removeAttribute(element.attributes[0].name);
            },

            getElementById: function(id: string, clearID: boolean = true): HTMLElement
            {
                let el = document.getElementById(id);
                if (clearID) el.removeAttribute("id");
                return el;
            }
        };

        RHU.definePublicAccessor(RHU, "readyState", {
            get: function() { return core.readyState; }
        });

    })();

    // Load external scripts and extensions whilst managing dependencies
    (function() {

    })();

})();