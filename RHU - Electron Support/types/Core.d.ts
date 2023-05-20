// TODO(randomuserhi): documentation

declare global
{
    namespace Core
    {
        export interface Core
        {
            exists(this: Core.Core, object: any) : boolean,
            
            parseOptions(this: Core.Core, template: any, opt: any): any,
            
            /**
             * TODO(randomuserhi): document this function
             *
             * @param options - some options idk
             * @returns A dependency object
             */
            dependencies(this: Core.Core, options?: { hard?: string[], soft?: string[], trace?: Error }): Dependencies,

            path: {
                join(...paths: string[]): string,
                isAbsolute(path: string): boolean
            }
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
    }
}

export {};