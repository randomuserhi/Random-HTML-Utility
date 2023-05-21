// TODO(randomuserhi): documentation
// Types used for distribution

declare global
{
    namespace RHU
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

        export interface ReflectConstruct extends Function
        {
            __reflect__: Function;
            __constructor__: Function;
            __args__: Function;
        }

        var version: string;

        enum ReadyState 
        {
            Loading = "loading",
            Complete = "complete"
        };

        var readyState: ReadyState;

        function isMobile(): boolean;

        function exists(object: any): boolean;

        function parseOptions<T>(template: T, options: any): T;

        function properties(object: any, options: RHU.Properties.Options, operation?: (object: any, property: PropertyKey) => void): Set<PropertyKey>;

        function defineProperty(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: RHU.Properties.Flags): boolean;

        function definePublicProperty(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: RHU.Properties.Flags): boolean;
        
        function definePublicAccessor(object: any, property: PropertyKey, options: PropertyDescriptor, flags?: RHU.Properties.Flags): boolean;

        function defineProperties(object: any, properties: { [x: PropertyKey]: PropertyDescriptor }, flags?: RHU.Properties.Flags): void;
        
        function definePublicProperties(object: any, properties: { [x: PropertyKey]: PropertyDescriptor }, flags?: RHU.Properties.Flags): void;

        function definePublicAccessors(object: any, properties: { [x: PropertyKey]: PropertyDescriptor }, flags?: RHU.Properties.Flags): void;

        function assign<T>(target: T, source: any, options?: RHU.Properties.Flags): T;
        
        function deleteProperties(object: any, preserve: {}): void;

        function clone<T extends object>(object: object, prototype: T) : T;
        function clone<T extends object>(object: T) : T;

        function isConstructor(object: any): boolean;

        function inherit(child: Function, base: Function): void;

        function reflectConstruct(base: Function, name: string, constructor: Function, argnames?: string[]): RHU.ReflectConstruct;

        function clearAttributes(element: HTMLElement): void;

        function getElementById(id: string, clearID: boolean): HTMLElement;
    }
}

export {}