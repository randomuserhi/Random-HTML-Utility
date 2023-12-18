(function() {
    
    // Core Implementation for initial import
    let core: Core;
    (function() {

        core = {
            exists: function<T>(object: T | undefined | null): object is T {
                return object !== null && object !== undefined;
            },
            parseOptions: function<T extends {}>(template: T, opt: any | undefined | null): T {
                if (!core.exists(opt)) return template;
                if (!core.exists(template)) return template;
                
                const result = template;
                Object.assign(result, opt);
                return result;
            },
            path: {
                // Adapted from: https://stackoverflow.com/a/55142565/9642458
                join: function(...paths: string[]): string {
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
                isAbsolute: function(path: string): boolean {
                    return /^([a-z]+:)?[\\/]/i.test(path);
                }
            },

            readyState: "loading"
        } as Core;

    })();

    // TODO(randomuserhi): Checks for required JS stuff?

    // Load config
    (function() {

        let loaded: unknown;
            
        const scripts = document.getElementsByTagName("script");
        for (const s of scripts) {
            const type = String(s.type).replace(/ /g, "");
            if (type.match(/^text\/x-rhu-config(;.*)?$/) && !type.match(/;executed=true/)) {
                s.type += ";executed=true";
                loaded = Function(`"use strict"; const RHU = { config: {} }; ${s.innerHTML}; return RHU;`)();
            }
        }

        const Options = {
            config: {}
        };
        core.parseOptions(Options, loaded);
        core.config = {
            root: undefined,
            extensions: [],
            modules: [],
            includes: {}
        };
        core.parseOptions(core.config, Options.config);

    })();

    // Initialize rest of core (script loader and root config)
    (function() {

        const config = core.config;
        const root: { location?: string, script: string, params: Record<string, string> } = {
            location: config.root,
            script: "",
            params: {}
        };

        // Get root location if unable to load from config
        if (core.exists(document.currentScript)) {
            if (!core.exists(root.location)) {
                const s = document.currentScript as HTMLScriptElement;
                const r = s.src.match(/(.*)[/\\]/);
                root.location = "";
                if (core.exists(r)) root.location = r[1] || "";
                root.script = s.innerHTML;
                const params = (new URL(s.src)).searchParams;
                for (const key of params.keys()) {
                    root.params[key] = params.get(key)!;
                }
            }
        }

        if (!core.exists(root.location)) throw new Error("Unable to get root location.");

        // Create loader
        core.loader = {
            timeout: 15 * 1000,
            head: document.head,
            root: Object.assign({
                path: function(this: Core.Root, path: string): string {
                    return core.path.join(this.location, path);
                }
            }, root as { location: string, script: string, params: Record<string, string> }),
            JS: function(this: Core.Loader, path: string, module: Core.ModuleIdentifier, callback?: (isSuccessful: boolean) => void): boolean {
                const mod: Core.ModuleIdentifier = {
                    name: "",
                    type: "module"
                };
                core.parseOptions(mod, module);

                if (!core.exists(mod.name) || mod.name === "") {
                    console.error("Cannot load module without a name.");
                    return false;
                }

                if (!core.exists(mod.type) || mod.type === "") {
                    console.error("Cannot load module without a type.");
                    return false;
                }

                const script = document.createElement("script");
                script.type = "text/javascript";
                script.src = path;
                let handled = false;
                script.onload = function() {
                    handled = true;
                    if (core.exists(callback)) callback(true);
                };
                const onerror = function() {
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

        const RHU: typeof window.RHU = window.RHU = {
            version: "1.0.0",

            MODULE: "module",
            EXTENSION: "x-module",

            LOADING: "loading",
            COMPLETE: "complete",

            isMobile: function(): boolean {
                // Courtesy of http://detectmobilebrowsers.com/
                if (RHU.exists((navigator as any).userAgentData) && RHU.exists((navigator as any).userAgentData.mobile)) return (navigator as any).userAgentData.mobile;
                else return ((a) => /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw-(n|u)|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(-|_)|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-(m|p|t)|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c(-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac( |-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c(-|0|1)|47|mc|nd|ri)|sgh-|shar|sie(-|m)|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl|tdg-|tel(i|m)|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(a.substr(0,4)))(navigator.userAgent||(navigator as any).vendor||(window as any).opera);
            },

            exists: function<T>(obj: T | undefined | null): obj is T {
                return obj !== null && obj !== undefined;
            },

            parseOptions: function<T extends {}>(template: T, options: any | undefined | null): T {
                if (!RHU.exists(options)) return template;
                if (!RHU.exists(template)) return template;
                
                const result = template;
                Object.assign(result, options);
                return result;
            },

            properties: function(object: any, options: RHU.Properties.Options = {}, operation?: (object: any, property: PropertyKey) => void): Set<PropertyKey> {
                if (!RHU.exists(object)) throw TypeError("Cannot get properties of 'null' or 'undefined'.");

                const opt: RHU.Properties.Options = {
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
                const properties = new Set<PropertyKey>();
                const iterate = function
                <T extends keyof ({ [x: PropertyKey]: TypedPropertyDescriptor<any> } & { [x: PropertyKey]: PropertyDescriptor })>
                (props: T[], descriptors: { [x: PropertyKey]: TypedPropertyDescriptor<any> } & { [x: PropertyKey]: PropertyDescriptor }): void {
                    for (const p of props) {
                        const descriptor = descriptors[p];
                        let valid = true;
                        
                        // TODO(randomuserhi): Fairly sure these conditions are incorrect, need double checking
                        if (opt.enumerable && descriptor.enumerable !== opt.enumerable) valid = false;
                        if (opt.configurable && descriptor.configurable !== opt.configurable) valid = false;
                        if (opt.writable && descriptor.writable !== opt.writable) valid = false;
                        if (opt.get === false && descriptor.get) valid = false;
                        else if (opt.get === true && !descriptor.get) valid = false;
                        if (opt.set === false && descriptor.set) valid = false;
                        else if (opt.set === true && !descriptor.set) valid = false;

                        if (valid) {
                            if (!properties.has(p)) {
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
                do {
                    const descriptors = Object.getOwnPropertyDescriptors(curr);
                    
                    if (!RHU.exists(opt.symbols) || opt.symbols === false) {
                        const props = Object.getOwnPropertyNames(curr);
                        iterate(props, descriptors);
                    }
                    
                    if (!RHU.exists(opt.symbols) || opt.symbols === true) {
                        const props = Object.getOwnPropertySymbols(curr);
                        iterate(props, descriptors);
                    }
                } while((curr = Object.getPrototypeOf(curr)) && !opt.hasOwn);
                
                return properties;
            },

            defineProperty: function(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: RHU.Properties.Flags): boolean {
                const opt: RHU.Properties.Flags = {
                    replace: true,
                    warn: false,
                    err: false
                };
                RHU.parseOptions(opt, flags);
    
                if (opt.replace || !RHU.properties(object, { hasOwn: true }).has(property)) {
                    delete object[property];  // NOTE(randomuserhi): Should throw an error in Strict Mode when trying to delete a property of 'configurable: false'.
                    //                     Also will not cause issues with inherited properties as `delete` only removes own properties.    
                    Object.defineProperty(object, property, options);
                    return true;
                }
                if (opt.warn) console.warn(`Failed to define property '${property.toString()}', it already exists. Try 'replace: true'`);
                if (opt.err) console.error(`Failed to define property '${property.toString()}', it already exists. Try 'replace: true'`);
                return false;
            },
            definePublicProperty: function(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: RHU.Properties.Flags) {
                const opt: PropertyDescriptor = {
                    writable: true,
                    enumerable: true
                };
                return RHU.defineProperty(object, property, Object.assign(opt, options), flags);
            },
            definePublicAccessor: function(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: RHU.Properties.Flags) {
                const opt: PropertyDescriptor = {
                    configurable: true,
                    enumerable: true
                };
                return RHU.defineProperty(object, property, Object.assign(opt, options), flags);
            },

            defineProperties: function(object: any, properties: { [x: PropertyKey]: PropertyDescriptor }, flags?: RHU.Properties.Flags) {
                for (const key of RHU.properties(properties, { hasOwn: true }).keys()) {
                    if (Object.hasOwnProperty.call(properties, key)) {
                        RHU.defineProperty(object, key, properties[key], flags);
                    }
                }
            },
            definePublicProperties: function(object: any, properties: { [x: PropertyKey]: PropertyDescriptor }, flags?: RHU.Properties.Flags) {
                interface opt
                {
                    new(): PropertyDescriptor,
                    prototype: PropertyDescriptor
                }
                const opt = function(this: PropertyDescriptor) {
                    this.configurable = true;
                    this.writable = true;
                    this.enumerable = true;
                } as Function as opt;

                for (const key of RHU.properties(properties, { hasOwn: true }).keys()) {
                    if (Object.hasOwnProperty.call(properties, key)) {
                        const o = Object.assign(new opt(), properties[key]);
                        RHU.defineProperty(object, key, o, flags);
                    }
                }
            },
            definePublicAccessors: function(object: any, properties: { [x: PropertyKey]: PropertyDescriptor }, flags?: RHU.Properties.Flags) {
                interface opt
                {
                    new(): PropertyDescriptor,
                    prototype: PropertyDescriptor
                }
                const opt = function(this: PropertyDescriptor) {
                    this.configurable = true;
                    this.enumerable = true;
                } as Function as opt;

                for (const key of RHU.properties(properties, { hasOwn: true }).keys()) {
                    if (Object.hasOwnProperty.call(properties, key)) {
                        const o = Object.assign(new opt(), properties[key]);
                        RHU.defineProperty(object, key, o, flags);
                    }
                }
            },

            assign: function<T>(target: T, source: any, options?: RHU.Properties.Flags): T {
                if (target === source) return target;
                RHU.defineProperties(target, Object.getOwnPropertyDescriptors(source), options);
                return target;
            },

            deleteProperties: function(object: any, preserve?: {}): void {
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

            clone: function<T extends object>(object: any, prototype?: T) : T {
                /** 
                 * NOTE(randomuserhi): Performs a shallow clone => references inside the cloned object will be the same
                 *                     as original.
                 */
                if (RHU.exists(prototype)) return RHU.assign(Object.create(prototype), object);
                else return RHU.assign(Object.create(Object.getPrototypeOf(object)), object);
            },

            isConstructor: function(object: any): boolean {
                try {
                    Reflect.construct(String, [], object);
                } catch (e) {
                    return false;
                }
                return true;
            },

            inherit: function(child: Function, base: Function): void {
                // NOTE(randomuserhi): Cause we are using typescript, we don't need this check.
                //if (!RHU.isConstructor(child) || !RHU.isConstructor(base)) 
                //    throw new TypeError(`'child' and 'base' must be object constructors.`); 

                Object.setPrototypeOf(child.prototype, base.prototype); // Inherit instance properties
                Object.setPrototypeOf(child, base); // Inherit static properties
            },

            reflectConstruct: function<T extends Constructor, K extends T>(base: T, name: string, constructor: (...args: any[]) => void, argnames?: string[]): RHU.ReflectConstruct<T, Prototype<K>> {
                if (!RHU.isConstructor(base)) throw new TypeError("'constructor' and 'base' must be object constructors.");

                // Get arguments from constructor or from provided argnames
                let args = argnames;
                if (!RHU.exists(args)) {
                    args = ["...args"];

                    const STRIP_COMMENTS = /((\/\/.*$)|(\/\*.*\*\/))/mg;
                    const funcString = constructor.toString().replace(STRIP_COMMENTS, "");
                    if (funcString.indexOf("function") === 0) {
                        const s = funcString.substring("function".length).trimStart();
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
                let definition: (RHU.ReflectConstruct<T, Prototype<K>> | undefined);

                const argstr = args.join(",");
                if (!RHU.exists(name))
                    name = constructor.name;
                name.replace(/[ \t\r\n]/g, "");
                if (name === "") name = "__ReflectConstruct__";
                const parts = name.split(".").filter(c => c !== "");
                let evalStr = "{ let ";
                for (let i = 0; i < parts.length - 1; ++i) {
                    const part = parts[i];
                    evalStr += `${part} = {}; ${part}.`;
                }
                evalStr += `${parts[parts.length - 1]} = function(${argstr}) { return definition.__reflect__.call(this, new.target, [${argstr}]); }; definition = ${parts.join(".")} }`;
                eval(evalStr);

                if (!RHU.exists(definition)) {
                    console.warn("eval() call failed to create reflect constructor. Using fallback...");
                    definition = function(this: RHU.ReflectConstruct<T, Prototype<K>>, ...args: any[]): unknown {
                        return definition!.__reflect__.call(this, new.target, args);
                    } as Function as RHU.ReflectConstruct<T, Prototype<K>>; // NOTE(randomuserhi): dodgy cast, but needs to be done so we can initially set the definition
                }

                // NOTE(randomuserhi): Careful with naming conflicts since JS may add __constructor__ as a standard function property
                definition.__constructor__ = constructor;
                definition.__args__ = function(): any {
                    return [];
                };
                definition.__reflect__ = function(newTarget: any, args: any[] = []) : Prototype<K> | undefined {
                    if (RHU.exists(newTarget)) {
                        const obj = Reflect.construct(base, definition!.__args__(...args), definition!);
                        definition!.__constructor__.call(obj, ...args);
                        return obj;
                    } else definition!.__constructor__.call(this, ...args);
                };

                return definition; 
            },

            clearAttributes: function(element: HTMLElement): void {
                while(element.attributes.length > 0) element.removeAttribute(element.attributes[0].name);
            },

            getElementById: function(id: string, clearID: boolean = true): HTMLElement | null {
                const el = document.getElementById(id);
                if (RHU.exists(el) && clearID) el.removeAttribute("id");
                return el;
            },

            CustomEvent: function(type: string, detail: any): CustomEvent {
                return new CustomEvent(type, { detail: detail });
            }
        } as typeof window.RHU;

        RHU.definePublicAccessor(RHU, "readyState", {
            get: function() { return core.readyState; }
        });

        RHU.definePublicAccessor(RHU, "config", {
            get: function() { return core.config; }
        });

    })();

    // Load external scripts and extensions whilst managing dependencies
    (function() {
        const require = (object: RHU.Module.Require, result: any, missing: string[]) => {
            for (const [key, value] of Object.entries(object)) {
                if (typeof value === "string" || value instanceof String) {
                    const [loaded, module] = core.moduleLoader.get(value as string);
                    if (loaded) {
                        result[key] = module;
                    } else {
                        missing.push(value as string);
                    }
                } else {
                    require(value, result, missing);
                }
            }
        };

        // Define core module loader
        core.moduleLoader = {
            loading: new Set<Core.ModuleLoader.Import>(),
            failed: [],
            watching: [],
            imported: [],
            skipped: [],
            cache: new Map(),

            set: function(module, obj) {
                if (this.cache.has(module)) 
                    return false;

                this.cache.set(module, obj);
            },
            get: function(module: string) {
                if (this.cache.has(module)) {
                    return [true, this.cache.get(module)];
                } else {
                    return [false, undefined];
                }
            },
            onLoad: function(module) {
                // Remove module from import list
                this.loading.delete(module);
            },

            execute: function(module) {
                if (RHU.exists(module.name)) {
                    if (this.cache.has(module.name)) {
                        console.warn(`${module.name} was skipped as a module of the same name was already imported.${core.exists(module.trace.stack) 
                            ? "\n" + module.trace.stack.split("\n")[1] 
                            : ""}`);
                        this.skipped.push(module);
                        return;
                    }
                }

                const missing: string[] = [];
                const req = {};
                require(module.require, req, missing);
                if (missing.length === 0) {
                    try {
                        const result = module.callback(req);
                        if (RHU.exists(module.name)) {
                            this.set(module.name, result);
                        }
                        this.imported.push(module);
                    } catch (e) {
                        console.error(`Failed to import ${module.name} ${core.exists(module.trace.stack) 
                            ? "\n" + module.trace.stack.split("\n")[1] 
                            : ""}`);
                        console.error(e.toString());
                        this.failed.push(module);
                    }
                } else {
                    this.watching.push(module);
                }
            },
            reconcile: function(module) {
                this.watching.push(module);

                let oldLen = this.watching.length;
                do {
                    oldLen = this.watching.length;

                    const old = this.watching;
                    this.watching = [];
                    for (const module of old) {
                        this.execute(module);
                    }
                } while(oldLen !== this.watching.length);
            },
        };

        // Define module functions of RHU
        const RHU: typeof window.RHU = window.RHU;
        // NOTE(randomuserhi): Function used for type inference by typescript
        RHU.module = function(trace, name, require, callback) {
            core.moduleLoader.reconcile({
                trace: trace,
                name: name,
                require: require,
                callback: callback,
            });
            return undefined as any;
        };
        RHU.require = function(trace, require, callback) {
            core.moduleLoader.reconcile({
                trace: trace,
                require: require,
                callback: callback,
            });
            return undefined as any;
        };
        RHU.status = function() {
            console.log(RHU.imports.toString());
            console.log(RHU.waiting.toString());
            console.error(RHU.failed.toString());
        };
        RHU.definePublicAccessor(RHU, "imports", {
            get: function(): RHU.Module[] { 
                const obj: RHU.Module[] = [...core.moduleLoader.imported];
                obj.toString = function(): string {
                    let msg = `Imports in order of execution [${obj.length}]:`;
                    for (const module of obj) {
                        const name = RHU.exists(module.name) ? module.name : "[rhu/require]";
                        msg += `\n${name}${core.exists(module.trace.stack) 
                            ? "\n" + module.trace.stack.split("\n")[1] 
                            : ""}`;
                    }
                    return msg;
                };
                return obj; 
            }
        });
        RHU.definePublicAccessor(RHU, "waiting", {
            get: function(): RHU.Module[] { 
                const obj: RHU.Module[] = [...core.moduleLoader.watching];
                obj.toString = function(): string {
                    let msg = `Modules being watched [${obj.length}]:`;
                    for (const module of obj) {
                        const name = RHU.exists(module.name) ? module.name : "[rhu/require]";
                        msg += `\n${name}${core.exists(module.trace.stack) 
                            ? "\n" + module.trace.stack.split("\n")[1] 
                            : ""}${(() => {
                            const missing: string[] = [];
                            require(module.require, {}, missing);
                            let list = "";
                            for (const module of missing) {
                                list += `\n\t- '${module}' is missing`;
                            }
                            return list;
                        })()}`;
                    }
                    return msg;
                };
                return obj; 
            }
        });
        RHU.definePublicAccessor(RHU, "failed", {
            get: function(): RHU.Module[] { 
                const obj: RHU.Module[] = [...core.moduleLoader.failed];
                obj.toString = function(): string {
                    let msg = `Modules that failed to import [${obj.length}]:`;
                    for (const module of obj) {
                        const name = RHU.exists(module.name) ? module.name : "[rhu/require]";
                        msg += `\n${name}${core.exists(module.trace.stack) 
                            ? "\n" + module.trace.stack.split("\n")[1] 
                            : ""}`;
                    }
                    return msg;
                };
                return obj; 
            }
        });

        // 1) Obtain list of imports to load
        for (const module of core.config.modules) {
            core.moduleLoader.loading.add({
                path: core.loader.root.path(core.path.join("modules", `${module}.js`)),
                name: module,
                type: RHU.MODULE
            });
        }
        for (const module of core.config.extensions) {
            core.moduleLoader.loading.add({
                path: core.loader.root.path(core.path.join("extensions", `${module}.js`)),
                name: module,
                type: RHU.EXTENSION
            });
        }
        for (const includePath in core.config.includes) {
            if (typeof includePath !== "string" || includePath === "") continue;

            const isAbsolute = core.path.isAbsolute(includePath);
            for (const module of core.config.includes[includePath]) {
                if (typeof module !== "string" || module === "") continue;

                let path: string;
                if (isAbsolute) path = core.path.join(includePath, `${module}.js`);
                else path = core.loader.root.path(core.path.join(includePath, `${module}.js`));
            
                core.moduleLoader.loading.add({
                    path: path,
                    name: module,
                    type: RHU.MODULE
                });
            }
        }

        // Start importing modules
        for (const module of core.moduleLoader.loading) {
            core.loader.JS(module.path, {
                name: module.name,
                type: module.type
            }, () => core.moduleLoader.onLoad(module));
        }

    })();

})();