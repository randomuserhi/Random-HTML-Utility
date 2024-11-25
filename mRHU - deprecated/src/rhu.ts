interface PropertyOptions
{
    enumerable?: boolean;
    configurable?: boolean;
    symbols?: boolean;
    hasOwn?: boolean;
    writable?: boolean;
    get?: boolean;
    set?: boolean;
}

interface PropertyFlags
{
    replace?: boolean;
    warn?: boolean;
    err?: boolean;
}

export function exists<T>(obj: T | undefined | null): obj is T {
    return obj !== null && obj !== undefined;
}

export function parseOptions<T extends {}>(template: T, options: any | undefined | null): T {
    if (!exists(options)) return template;
    if (!exists(template)) return template;
    
    const result = template;
    Object.assign(result, options);
    return result;
}

export function properties(object: any, options: PropertyOptions = {}, operation?: (object: any, property: PropertyKey) => void): Set<PropertyKey> {
    if (!exists(object)) throw TypeError("Cannot get properties of 'null' or 'undefined'.");

    const opt: PropertyOptions = {
        enumerable: undefined,
        configurable: undefined,
        symbols: undefined,
        hasOwn: undefined,
        writable: undefined,
        get: undefined,
        set: undefined
    };
    parseOptions(opt, options);

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
                    if (exists(operation)) operation(curr, p);
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
        
        if (!exists(opt.symbols) || opt.symbols === false) {
            const props = Object.getOwnPropertyNames(curr);
            iterate(props, descriptors);
        }
        
        if (!exists(opt.symbols) || opt.symbols === true) {
            const props = Object.getOwnPropertySymbols(curr);
            iterate(props, descriptors);
        }
    } while((curr = Object.getPrototypeOf(curr)) && !opt.hasOwn);
    
    return properties;
}

export function defineProperty(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: PropertyFlags): boolean {
    const opt: PropertyFlags = {
        replace: true,
        warn: false,
        err: false
    };
    parseOptions(opt, flags);

    if (opt.replace || !properties(object, { hasOwn: true }).has(property)) {
        delete object[property];  // NOTE(randomuserhi): Should throw an error in Strict Mode when trying to delete a property of 'configurable: false'.
        //                     Also will not cause issues with inherited properties as `delete` only removes own properties.    
        Object.defineProperty(object, property, options);
        return true;
    }
    if (opt.warn) console.warn(`Failed to define property '${property.toString()}', it already exists. Try 'replace: true'`);
    if (opt.err) console.error(`Failed to define property '${property.toString()}', it already exists. Try 'replace: true'`);
    return false;
}
export function definePublicProperty(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: PropertyFlags) {
    const opt: PropertyDescriptor = {
        writable: true,
        enumerable: true
    };
    return defineProperty(object, property, Object.assign(opt, options), flags);
}
export function definePublicAccessor(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: PropertyFlags) {
    const opt: PropertyDescriptor = {
        configurable: true,
        enumerable: true
    };
    return defineProperty(object, property, Object.assign(opt, options), flags);
}

export function defineProperties(object: any, props: { [x: PropertyKey]: PropertyDescriptor }, flags?: PropertyFlags) {
    for (const key of properties(props, { hasOwn: true }).keys()) {
        if (Object.hasOwnProperty.call(props, key)) {
            defineProperty(object, key, props[key], flags);
        }
    }
}
export function definePublicProperties(object: any, props: { [x: PropertyKey]: PropertyDescriptor }, flags?: PropertyFlags) {
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

    for (const key of properties(props, { hasOwn: true }).keys()) {
        if (Object.hasOwnProperty.call(props, key)) {
            const o = Object.assign(new opt(), props[key]);
            defineProperty(object, key, o, flags);
        }
    }
}
export function definePublicAccessors(object: any, props: { [x: PropertyKey]: PropertyDescriptor }, flags?: PropertyFlags) {
    interface opt
    {
        new(): PropertyDescriptor,
        prototype: PropertyDescriptor
    }
    const opt = function(this: PropertyDescriptor) {
        this.configurable = true;
        this.enumerable = true;
    } as Function as opt;

    for (const key of properties(props, { hasOwn: true }).keys()) {
        if (Object.hasOwnProperty.call(props, key)) {
            const o = Object.assign(new opt(), props[key]);
            defineProperty(object, key, o, flags);
        }
    }
}

export function assign<T>(target: T, source: any, options?: PropertyFlags): T {
    if (target === source) return target;
    defineProperties(target, Object.getOwnPropertyDescriptors(source), options);
    return target;
}

export function deleteProperties(object: any, preserve?: {}): void {
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
    properties(object, { hasOwn: true }, (obj: any, prop: PropertyKey) => {
        if (!exists(preserve) || !properties(preserve, { hasOwn: true }).has(prop))
            delete obj[prop];
    });
}

export function clone<T extends object>(object: any, prototype?: T) : T {
    /** 
     * NOTE(randomuserhi): Performs a shallow clone => references inside the cloned object will be the same
     *                     as original.
     */
    if (exists(prototype)) return assign(Object.create(prototype), object);
    else return assign(Object.create(Object.getPrototypeOf(object)), object);
}

export function clearAttributes(element: HTMLElement): void {
    while(element.attributes.length > 0) element.removeAttribute(element.attributes[0].name);
}

export function getElementById(id: string, clearID: boolean = true): HTMLElement | null {
    const el = document.getElementById(id);
    if (exists(el) && clearID) el.removeAttribute("id");
    return el;
}

export function CreateEvent(type: string, detail: any): CustomEvent {
    return new CustomEvent(type, { detail: detail });
}

export interface Constructor {
    new(...args: any[]): any;
    prototype: any;
}
export type Prototype<T extends Constructor> = T extends { new(...args: any[]): any; prototype: infer Proto; } ? Proto : never;

export interface ReflectConstruct<Base extends Constructor, T> extends Constructor {
    __reflect__(newTarget: any, args: any[]): T | undefined;
    __constructor__(...args: any[]): void;
    __args__(...args: any[]): ConstructorParameters<Base>;
}

export function isConstructor(object: any): boolean {
    try {
        Reflect.construct(String, [], object);
    } catch (e) {
        return false;
    }
    return true;
}

export function inherit(child: Function, base: Function): void {
    // NOTE(randomuserhi): Cause we are using typescript, we don't need this check.
    //if (!isConstructor(child) || !isConstructor(base)) 
    //    throw new TypeError(`'child' and 'base' must be object constructors.`); 

    Object.setPrototypeOf(child.prototype, base.prototype); // Inherit instance properties
    Object.setPrototypeOf(child, base); // Inherit static properties
}

export function reflectConstruct<T extends Constructor, K extends T>(base: T, name: string, constructor: (...args: any[]) => void, argnames?: string[]): ReflectConstruct<T, Prototype<K>> {
    if (!isConstructor(base)) throw new TypeError("'constructor' and 'base' must be object constructors.");

    // Get arguments from constructor or from provided argnames
    let args = argnames;
    if (!exists(args)) {
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
    let definition: (ReflectConstruct<T, Prototype<K>> | undefined);

    const argstr = args.join(",");
    if (!exists(name))
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

    if (!exists(definition)) {
        console.warn("eval() call failed to create reflect constructor. Using fallback...");
        definition = function(this: ReflectConstruct<T, Prototype<K>>, ...args: any[]): unknown {
            return definition!.__reflect__.call(this, new.target, args);
        } as Function as ReflectConstruct<T, Prototype<K>>; // NOTE(randomuserhi): dodgy cast, but needs to be done so we can initially set the definition
    }

    // NOTE(randomuserhi): Careful with naming conflicts since JS may add __constructor__ as a standard function property
    definition.__constructor__ = constructor;
    definition.__args__ = function(): any {
        return [];
    };
    definition.__reflect__ = function(newTarget: any, args: any[] = []) : Prototype<K> | undefined {
        if (exists(newTarget)) {
            const obj = Reflect.construct(base, definition!.__args__(...args), definition!);
            definition!.__constructor__.call(obj, ...args);
            return obj;
        } else definition!.__constructor__.call(this, ...args);
    };

    return definition; 
}