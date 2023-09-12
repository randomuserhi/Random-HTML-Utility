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

interface appmount extends HTMLDivElement
{
}

RHU.module(new Error(), "Main", 
    { Style: "rhu/style", Macro: "rhu/macro" },
    function({ Style, Macro }) {
        const style = Style(({ style, css }) => {
            const wrapper = style.class`
            display: flex;
            gap: 10px;
            width: 100%;
            height: 100%;
            background-color: blue;
            padding: 10px;
            ${css({
                border: {
                    borderRadius: 5
                }
            })}
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
        
        Macro((() => {
            const appmount = function(this: appmount)
            {
                
            } as RHU.Macro.Constructor<appmount>;

            return appmount;
        })(), "appmount", //html
            `
            <div>
            </div>
            `, {
                element: //html
                `<div class="${style.wrapper}"></div>`
            });
    }
);