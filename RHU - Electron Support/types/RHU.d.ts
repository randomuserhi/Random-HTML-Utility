// TODO(randomuserhi): documentation
// Types used for library code

declare global
{
    export interface RHU extends RHU.EventTarget
    {
        version: string,

        ReadyState: {
            Loading: string,
            Complete: string
        },

        Module: {
            Type: {
                Module: string,
                Extension: string
            }
        },

        readyState: string,

        isMobile(): boolean,

        exists(object: any): boolean,

        parseOptions<T>(template: T, options: any): T,

        properties(object: any, options: RHU.Properties.Options, operation?: (object: any, property: PropertyKey) => void): Set<PropertyKey>,

        defineProperty(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: RHU.Properties.Flags): boolean,

        definePublicProperty(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: RHU.Properties.Flags): boolean,
        
        definePublicAccessor(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: RHU.Properties.Flags): boolean,

        defineProperties(object: any, properties: { [x: PropertyKey]: PropertyDescriptor }, flags?: RHU.Properties.Flags): void,
        
        definePublicProperties(object: any, properties: { [x: PropertyKey]: PropertyDescriptor }, flags?: RHU.Properties.Flags): void,

        definePublicAccessors(object: any, properties: { [x: PropertyKey]: PropertyDescriptor }, flags?: RHU.Properties.Flags): void,

        assign<T>(target: T, source: any, options?: RHU.Properties.Flags): T,
        
        deleteProperties(object: any, preserve: {}): void,

        clone<T extends object>(object: object, prototype: T) : T,
        clone<T extends object>(object: T) : T,

        isConstructor(object: any): boolean,

        inherit(child: Function, base: Function): void,

        // NOTE(randomuserhi): Disabled, since 'name' is no longer needed with electron + typescript
        //reflectConstruct(base: Function, name: string, constructor: Function, argnames?: string[]): RHU.ReflectConstruct,

        reflectConstruct(base: Function, constructor: Function, argnames?: string[]): RHU.ReflectConstruct,

        clearAttributes(element: HTMLElement): void,

        getElementById(id: string, clearID: boolean): HTMLElement,

        module(dependencies: RHU.Module, callback: (result?: RHU.ResolvedDependencies) => void): void

        imports: RHU.Module[]
    }

    namespace RHU
    {
        interface EventTarget
        {
            addEventListener(type: string, listener: (any) => void, options?: boolean | EventListenerOptions): void,

            removeEventListener(type: string, callback: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean): void,

            dispatchEvent(event: CustomEvent): boolean
        }

        namespace Properties
        {
            export interface Options
            {
                enumerable?: boolean,
                configurable?: boolean,
                symbols?: boolean,
                hasOwn?: boolean,
                writable?: boolean,
                get?: boolean,
                set?: boolean
            }

            export interface Flags
            {
                replace?: boolean,
                warn?: boolean,
                err?: boolean
            }
        }

        export interface ReflectConstruct extends Function
        {
            __reflect__(newTarget: unknown, args: any[]): unknown;
            __constructor__: Function;
            __args__(...args: any[]): any[];
        }

        export interface Dependencies
        {
            hard?: string[];
            soft?: string[];
            trace?: Error;
        }

        export interface ResolvedDependency
        {
            has: string[],
            missing: string[]
        }

        export interface ResolvedDependencies
        {
            hard: ResolvedDependency, 
            soft: ResolvedDependency,
            trace: Error
        }

        export interface Module extends RHU.Dependencies
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