interface appmount extends HTMLDivElement
{
}
interface appmountConstructor extends RHU.Macro.Constructor<appmount>
{
    
}

declare namespace RHU { namespace Macro {
    interface TemplateMap
    {
        "appmount": appmount;
    }
}}

RHU.import(RHU.module({ trace: new Error(),
    name: "Main", hard: ["RHU.Macro", "RHU.Style"],
    callback: function()
    {
        let { RHU } = window.RHU.require(window, this);

        let appmount = function(this: appmount)
        {
            
        } as appmountConstructor;
        
        RHU.Macro(appmount, "appmount", //html
            `
            `, {
                element: //html
                `<div class=""></div>`
            });
    }
}));