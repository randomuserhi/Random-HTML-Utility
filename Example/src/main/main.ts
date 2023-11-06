declare namespace RHU { 
    interface Modules {
        "Main": void;
    }

    namespace Macro {
        interface TemplateMap
        {
            "App": App;
        }
    }
}

interface App extends HTMLDivElement
{
}

RHU.module(new Error(), "Main", { 
    Style: "rhu/style", Macro: "rhu/macro",
    exampleComponent: "components/organisms/exampleComponent"
}, function({ 
    Style, Macro, exampleComponent 
}) {
    const style = Style(({ style }) => {
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
    
    Macro((() => {
        const App = function(this: App)
        {
            
        } as RHU.Macro.Constructor<App>;

        return App;
    })(), "App", //html
        `
        <rhu-macro rhu-type="${exampleComponent}"></rhu-macro>
        `, {
            element: //html
            `<div class="${style.wrapper}"></div>`
        });
});