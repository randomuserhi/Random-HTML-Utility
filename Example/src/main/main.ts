interface appmount extends HTMLDivElement
{
}
interface appmountConstructor extends RHU.Macro.Constructor<appmount>
{
    
}

declare namespace RHU { 
    interface Modules {
        "Main": void;
    }

    namespace Macro {
        interface TemplateMap
        {
            "appmount": appmount;
        }
    }
}

RHU.module(new Error(), "Main", 
    { Style: "rhu/style", Macro: "rhu/macro" },
    function({ Style, Macro })
    {
        const style = Style(({ style, css }) => {
            const wrapper = style.class`
            display: flex;
            gap: 10px;
            width: 100%;
            height: 100%;
            background-color: blue;
            padding: 10px;
            `;

            style`
            ${wrapper}>div {
                width: 100%;
                height: 10px;
                background-color: white;
            }
            `;

            return {
                wrapper
            }
        });

        const appmount = function(this: appmount)
        {
            
        } as appmountConstructor;
        
        Macro(appmount, "appmount", //html
            `
            <div>
            </div>
            `, {
                element: //html
                `<div class="${style.wrapper}"></div>`
            });
    }
);

RHU.module(new Error(), "Main2" as RHU.Module.Exports, 
    { Style: "rhu/style", Macro: "rhu/macros" as RHU.Module.Exports },
    function({ Style, Macro })
    {
        const style = Style(({ style, css }) => {
            const wrapper = style.class`
            display: flex;
            gap: 10px;
            width: 100%;
            height: 100%;
            background-color: blue;
            padding: 10px;
            `;

            style`
            ${wrapper}>div {
                width: 100%;
                height: 10px;
                background-color: white;
            }
            `;

            return {
                wrapper
            }
        });

        console.log(Macro);
    }
);