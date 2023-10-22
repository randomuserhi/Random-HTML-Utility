declare namespace RHU {
    interface Modules {
        "docuscript/components/molecules/codeblock": "docuscript/molecules/codeblock";
    }

    namespace Macro {
        interface TemplateMap {
            "docuscript/molecules/codeblock": RHUDocuscript.Molecules.Codeblock;
        }
    }
}

declare namespace RHUDocuscript {
    namespace Molecules {
        interface Codeblock extends HTMLDivElement {
            code: HTMLDivElement;
        }
    }
}

RHU.module(new Error(), "docuscript/components/molecules/codeblock", { 
    Macro: "rhu/macro", style: "docuscript/components/molecules/codeblock/style",
}, function({ 
    Macro, style,
}) {
    const codeblock = Macro((() => {
        const codeblock = function(this: RHUDocuscript.Molecules.Codeblock) {
        } as RHU.Macro.Constructor<RHUDocuscript.Molecules.Codeblock>;

        codeblock.prototype.appendChild = function(...args) {
            return HTMLElement.prototype.appendChild.call(this.code, ...args);
        }

        return codeblock;
    })(), "docuscript/molecules/codeblock", //html
        `
        <div rhu-id="code"></div>
        `, {
            element: //html
            `<div></div>`
        });

    return codeblock;
});