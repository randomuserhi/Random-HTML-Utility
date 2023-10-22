declare namespace RHU {
    interface Modules {
        "main": void;
    }

    namespace Macro {
        interface TemplateMap {
            "App": App;
        }
    }
}

interface App extends HTMLDivElement {
    body: HTMLDivElement;
}

RHU.module(new Error(), "main", { 
    Macro: "rhu/macro", Style: "rhu/style", 
    theme: "main/theme",
    navbar: "components/organisms/navbar", 
    docpages: "components/organisms/docpages",
}, function({ 
    Macro, Style, theme, 
    navbar, docpages,
}) {
    const style = Style(({ style }) => {
        const spacer = style.class`
        position: relative;

        width: 100%;
        height: var(--Navbar_height);
        `;

        style/*css*/`
        :root {
            --font-family: "IBM Plex Sans";
            --font-size: 1rem;
        }

        body {
            font-family: var(--font-family);
            font-size: var(--font-size);
        }
        `

        return {
            spacer,
        };
    });
    
    Macro((() => {
        const appmount = function(this: App) {
            this.classList.toggle(`${theme}`, true);

            // TODO(randomuserhi): Change to load landing page, and allow switching to different content/pages:
            this.body.replaceChildren(document.createMacro(docpages));
        } as RHU.Macro.Constructor<App>;

        return appmount
    })(), "App", //html
        `
        <rhu-macro rhu-type="${navbar}"></rhu-macro>
        <div class="${style.spacer}"></div>
        <div rhu-id="body">
        </div>
        `, {
            element: //html
            `<div class="${theme}"></div>`
        });
});