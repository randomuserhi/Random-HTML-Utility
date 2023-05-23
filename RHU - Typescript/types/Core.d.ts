// TODO(randomuserhi): documentation
// Types used for library code

declare global
{
    interface Core
    {
        /**
         * Checks if a given object is not `null` / `undefined`
         *
         * @param {any} object
         * @returns {boolean} `true` if the object is not `null` / `undefined`, otherwise `false`
         */
        exists<T>(object: T | undefined | null) : object is T;
        
        /**
         * Parses destructured parameters into a given template.
         * This operation is in-place and will overwrite `template` parameter.
         * 
         * @param {T} template 
         * @param {any} options 
         * @returns {T} returns the original template
         */
        parseOptions<T extends {}>(template: T, options: any | undefined | null): T;
        
        /**
         * Checks what dependencies exist in a given dependency
         *
         * @param {Core.Dependencies} options - Properties of the dependency
         * @param {string[]} [options.hard] - Hard dependencies that are required
         * @param {string[]} [options.soft] - Soft dependencies that are not necessarily required
         * @param {Error} [options.trace] - Error trace for where the dependencies came from
         * @returns {Core.ResolvedDependencies} A resolved dependency object
         */
        dependencies(options?: RHU.Dependencies): RHU.ResolvedDependencies;

        path: {

            join(...paths: string[]): string;

            isAbsolute(path: string): boolean;
        },

        readyState: string;

        config: RHU.Config;

        loader: Core.Loader;

        moduleLoader: Core.ModuleLoader;
    }

    namespace Core
    {
        interface Root
        {

            location: string;

            script: string;

            params: Record<string, string>;

            path(path: string): string;
        }

        interface Loader
        {
            
            timeout: number;

            head: HTMLHeadElement;

            root: Core.Root;

            JS(path: string, module: RHU.Module, callback?: (isSuccessful: boolean) => void): boolean;
        }

        interface ModuleLoader
        {
            importList: Set<ModuleLoader.Import>;
            watching: RHU.Module[];
            imported: RHU.Module[];

            run: (module: RHU.Module) => void;

            execute: (module: RHU.Module) => boolean;
            
            reconcile: (allowPartial?: boolean) => void;

            load: (module: RHU.Module) => void;

            onLoad: (isSuccessful: boolean, module: Core.ModuleLoader.Import) => void;

            onComplete: () => void;
        }

        namespace ModuleLoader
        {
            interface Import
            {
                path: string;
                name: string;
                type: string;
            }
        }
    }
}

export {};