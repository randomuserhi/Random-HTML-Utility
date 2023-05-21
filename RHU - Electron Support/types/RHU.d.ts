// TODO(randomuserhi): documentation

declare global
{
    export interface RHU_t
    {

        version: string,

        readyState: RHU_t.ReadyState,

        isMobile(): boolean,

        exists(object: any): boolean,

        parseOptions<T>(template: T, options: any): T,

        properties(object: any, options: RHU_t.Properties.Options, operation?: (object: any, property: PropertyKey) => void): Set<PropertyKey>,

        defineProperty(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: RHU_t.Properties.Flags): boolean,

        definePublicProperty(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: RHU_t.Properties.Flags): boolean,
        
        definePublicAccessor(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: RHU_t.Properties.Flags): boolean,

        defineProperties(object: any, properties: { [x: PropertyKey]: PropertyDescriptor }, flags?: RHU_t.Properties.Flags): void,
        
        definePublicProperties(object: any, properties: { [x: PropertyKey]: PropertyDescriptor }, flags?: RHU_t.Properties.Flags): void,

        definePublicAccessors(object: any, properties: { [x: PropertyKey]: PropertyDescriptor }, flags?: RHU_t.Properties.Flags): void,

        assign<T>(target: T, source: any, options?: RHU_t.Properties.Flags): T,
        
        delete(object: any, preserve: {}): void,

        clone<T extends object>(object: object, prototype: T) : T,
        clone<T extends object>(object: T) : T,

        isConstructor(object: any): boolean,

        inherit(child: Function, base: Function): void,

        reflectConstruct(base: Function, name: string, constructor: Function, argnames?: string[]): RHU_t.ReflectConstruct,

        clearAttributes(element: HTMLElement): void,

        getElementById(id: string, clearID: boolean): HTMLElement
    }

    namespace RHU_t
    {
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

        export enum ReadyState
        {
            Loading = "loading",
            Complete = "complete"
        }

        export interface ReflectConstruct extends Function
        {
            __reflect__: Function;
            __constructor__: Function;
            __args__: Function;
        }
    }

    interface Window
    {
        RHU: RHU_t
    }
}

export {}