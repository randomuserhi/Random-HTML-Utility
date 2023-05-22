declare global
{
    interface RHU
    {

        Macro?: RHU.Macro
    }

    namespace RHU
    {
        interface Macro
        {
            
            (constructor: Function, type: string, source: string, options: RHU.Macro.Options): void,
            
            parseDomString(str: string): DocumentFragment,
            
            parse(element: Element, type?: string, force?: boolean): void,

            observe(target: Node): void
        }

        namespace Macro
        {
            interface Options
            {

            }
        }
    }

    interface Document
    {
        
        createMacro: (type: string) => Element,
        
        Macro: (type: string, attributes: Record<string, string>) => string
    }

    interface Element
    {

        rhuMacro: string
    }
}

export {}