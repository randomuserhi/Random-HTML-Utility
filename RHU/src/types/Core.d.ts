// TODO(randomuserhi): documentation
// Types used for library code

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

    path: {

        join(...paths: string[]): string;

        isAbsolute(path: string): boolean;
    },

    readyState: RHU.ReadyState;

    config: RHU.Config;

    loader: Core.Loader;

    moduleLoader: Core.ModuleLoader;
}

declare namespace Core
{
    interface Root
    {

        location: string;

        script: string;

        params: Record<string, string>;

        path(path: string): string;
    }

    interface ModuleIdentifier
    {
        name: string;
        type: string;
    }

    interface Loader
    {
        
        timeout: number;

        head: HTMLHeadElement;

        root: Core.Root;

        JS(path: string, module: Core.ModuleIdentifier, callback?: (isSuccessful: boolean) => void): boolean;
    }

    interface ModuleLoader
    {
        loading: Set<ModuleLoader.Import>;
        watching: RHU.Module[];
        imported: RHU.Module[];
        skipped: RHU.Module[];
        cache: Map<string, any>;
        
        set(module: string, obj: any): void;
        get(module: string): any;
        onLoad(module: Core.ModuleLoader.Import): void;

        execute(module: RHU.Module): void;
        reconcile(module: RHU.Module): void;
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