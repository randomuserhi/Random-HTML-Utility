declare namespace RHU {
    interface Modules {
        "components/organisms/exampleComponent": "organisms/exampleComponent";
    }

    namespace Macro {
        interface TemplateMap {
            "organisms/exampleComponent": Organisms.exampleComponent;
        }
    }
}

declare namespace Organisms {
    interface exampleComponent extends HTMLDivElement {
    }
}

RHU.module(new Error(), "components/organisms/exampleComponent", { 
    Macro: "rhu/macro", style: "components/organsisms/exampleComponent/style",
}, function({ 
    Macro, style,
}) {
    const exampleComponent = Macro((() => {
        const exampleComponent = function(this: Organisms.exampleComponent) {
            
        } as RHU.Macro.Constructor<Organisms.exampleComponent>;

        return exampleComponent
    })(), "organisms/exampleComponent", //html
        `
        <span>content</span>
        <span>content</span>
        `, {
            element: //html
            `<div class="${style.wrapper}"></div>`
        });

    return exampleComponent;
});