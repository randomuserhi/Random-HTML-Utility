declare namespace RHU {
    interface Modules {
        "docuscript/style": {
            body: Style.ClassName;
        };
    }
}

RHU.module(new Error(), "docuscript/style",
    { Style: "rhu/style", theme: "main/theme" },
    function({ Style, theme })
    {
        const style = Style(({ style }) => {
            const body = style.class`
            `;

            // HEADINGS
            style`
            ${body} h1, h2, h3, h4, h5, h6 {
                padding-bottom: 8px;
                padding-top: 16px;
                font-weight: 700;
            }

            ${body} h1 {
                font-size: 2.5rem;
            }
            ${body} h2 {
                font-size: 2rem;
            }
            ${body} h3 {
                font-size: 1.8rem;
            }
            ${body} h4 {
                font-size: 1.5rem;
            }
            ${body} h5 {
                font-size: 1.3rem;
            }
            ${body} h6 {
                font-size: 1.125rem;
            }
            `;

            return {
                body,
            };
        });

        return style;
    }
);