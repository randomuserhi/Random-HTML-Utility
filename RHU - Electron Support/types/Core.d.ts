// TODO(randomuserhi): documentation

declare global
{
    export interface Core
    {
        exists(object: any) : boolean,
        
        parseOptions<Type>(template: Type, opt: any): Type,
        
        /**
         * TODO(randomuserhi): document this function
         *
         * @param options - some options idk
         * @returns A dependency object
         */
        dependencies(options?: { hard?: string[], soft?: string[], trace?: Error }): Core.Dependencies,

        path: {

            join(...paths: string[]): string,

            isAbsolute(path: string): boolean
        },

        readyState: Core.ReadyState,

        config: {

            root: string,

            extensions: string[],

            modules: string[],

            includes: Record<string, string>
        },

        loader: Core.Loader
    }

    namespace Core
    {
        export enum ReadyState
        {
            Loading = "loading",
            Complete = "complete"
        }

        export interface Root
        {

            location: string, 

            script: string, 

            params: Record<string, string>,

            path(path: string): string
        }

        export interface Loader
        {
            
            timeout: number,

            head: HTMLHeadElement,

            root: Core.Root,

            JS(path: string, module: Core.Module, callback?: () => void): boolean
        }

        export interface Dependency
        {

            has: string[],

            missing: string[]
        }

        export interface Dependencies
        {

            hard: Dependency, 

            soft: Dependency,

            trace: Error
        }

        export interface Module
        {

            name: string,

            type?: Module.Type   
        }

        namespace Module
        {
            export enum Type 
            {

                Extension = "x-module",

                Module = "module"
            }
        }
    }
}

export {};