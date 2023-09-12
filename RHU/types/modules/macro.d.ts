declare namespace RHU
{
    interface Modules
    {
        "rhu/macro": RHU.Macro;
    }

    interface Macro
    {
        
        <T extends RHU.Macro.Templates>(constructor: Function, type: T, source: string, options: RHU.Macro.Options): T;
        
        parseDomString(str: string): DocumentFragment;
        
        parse(element: Element, type?: string & {} | RHU.Macro.Templates | undefined | null, force?: boolean): void;

        observe(target: Node): void;
    }

    namespace Macro
    {
        interface Options
        {

            element?: string;

            floating?: boolean;

            strict?: boolean;

            encapsulate?: PropertyKey;
            
            content?: PropertyKey;
        }

        interface Constructor<T extends Element = Element>
        {
            (this: T): void;
            prototype: T;
        }

        type Templates = keyof TemplateMap;
        interface TemplateMap
        {

        }
    }
}

type Macro = HTMLElement | {};

interface Node
{
    macro: Macro;
}

interface Document
{
    
    createMacro<T extends string & keyof RHU.Macro.TemplateMap>(type: T): RHU.Macro.TemplateMap[T];
    
    Macro<T extends string & keyof RHU.Macro.TemplateMap>(type: T, attributes: Record<string, string>): string;
}

interface Element
{
    rhuMacro: string;
}