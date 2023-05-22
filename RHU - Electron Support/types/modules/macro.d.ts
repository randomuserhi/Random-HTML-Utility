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
            parse,
            parseDomString,
            watching
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
        createMacro: (type: string) => RHU.Macro
    }
}

export {}