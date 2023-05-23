// TODO(randomuserhi): documentation
// Types used for library code

declare global
{
    interface Constructor
    {
        new(...args: any[]): any;
        prototype: any;
    }
    type Prototype<T extends Constructor> = T extends { new(...args: any[]): any; prototype: infer Proto; } ? Proto : never;

    interface RHU extends EventTarget
    {
        readonly version: string;

        readonly ReadyState: {
            readonly Loading: string,
            readonly Complete: string
        };

        readonly Module: {
            readonly Type: {
                readonly Module: string,
                readonly Extension: string
            }
        };

        readonly readyState: string;
        readonly config: RHU.Config;

        isMobile(): boolean;

        exists<T>(object: T | null | undefined): object is T;

        parseOptions<T extends {}>(template: T, options: any | null | undefined): T;

        properties(object: any, options: RHU.Properties.Options, operation?: (object: any, property: PropertyKey) => void): Set<PropertyKey>;

        defineProperty(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: RHU.Properties.Flags): boolean;

        definePublicProperty(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: RHU.Properties.Flags): boolean;
        
        definePublicAccessor(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: RHU.Properties.Flags): boolean;

        defineProperties(object: any, properties: { [x: PropertyKey]: PropertyDescriptor }, flags?: RHU.Properties.Flags): void;
        
        definePublicProperties(object: any, properties: { [x: PropertyKey]: PropertyDescriptor }, flags?: RHU.Properties.Flags): void;

        definePublicAccessors(object: any, properties: { [x: PropertyKey]: PropertyDescriptor }, flags?: RHU.Properties.Flags): void;

        assign<T>(target: T, source: any, options?: RHU.Properties.Flags): T;
        
        deleteProperties(object: any, preserve?: {}): void;

        clone<T extends object>(object: object, prototype: T) : T;
        clone<T extends object>(object: T) : T;

        isConstructor(object: any): boolean;

        inherit(child: Function, base: Function): void;

        reflectConstruct<T extends Constructor, K extends T>(base: T, name: string, constructor: (...args: any[]) => void, argnames?: string[]): RHU.ReflectConstruct<T, Prototype<K>>;

        clearAttributes(element: HTMLElement): void;

        getElementById(id: string, clearID: boolean): HTMLElement | null;

        module(dependencies: RHU.Module, callback: (result?: RHU.ResolvedDependencies) => void): void;

        readonly imports: RHU.Module[];

        addEventListener<T extends keyof RHU.EventMap>(type: string, listener: (this: RHU, ev: RHU.EventMap[T]) => any, options?: boolean | AddEventListenerOptions): void;

        addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;

        removeEventListener<T extends keyof RHU.EventMap>(type: string, listener: (this: RHU, ev: RHU.EventMap[T]) => any, options?: boolean | EventListenerOptions): void;

        removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
    
        CustomEvent<T = any>(type: string, detail: T): CustomEvent<T>;
    }

    namespace RHU
    {
        interface Config
        {

            readonly root?: string;

            readonly extensions: string[];

            readonly modules: string[];

            readonly includes: Record<string, string>;
        }

        interface EventMap
        {
            "load": LoadEvent;
        }

        interface LoadEvent
        {
            
        }

        namespace Properties
        {
            interface Options
            {
                enumerable?: boolean;
                configurable?: boolean;
                symbols?: boolean;
                hasOwn?: boolean;
                writable?: boolean;
                get?: boolean;
                set?: boolean;
            }

            interface Flags
            {
                replace?: boolean;
                warn?: boolean;
                err?: boolean;
            }
        }

        interface ReflectConstruct<Base extends Constructor, T> extends Constructor
        {
            __reflect__(newTarget: any, args: any[]): T | undefined;
            __constructor__(...args: any[]): void;
            __args__(...args: any[]): ConstructorParameters<Base>;
        }

        interface Dependencies
        {
            hard?: string[];
            soft?: string[];
            trace?: Error;
        }

        interface ResolvedDependency
        {
            has: string[];
            missing: string[];
        }

        interface ResolvedDependencies
        {
            hard: ResolvedDependency;
            soft: ResolvedDependency;
            trace?: Error;
        }

        interface Module extends RHU.Dependencies
        {
            name?: string;
            type?: string;
            callback?: (result: RHU.ResolvedDependencies) => void;
        }
    }

    interface Window
    {
        RHU: RHU
    }
}

export {}