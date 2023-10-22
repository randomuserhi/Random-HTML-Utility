declare namespace RHU {
    interface Modules {
        "components/molecules/filterlist/style": {
            wrapper: Style.ClassName;
            content: Style.ClassName;
            path: Style.ClassName<{
                item: Style.ClassName;
            }>;
            filteritem: Style.ClassName<{
                content: Style.ClassName;
                children: Style.ClassName;
                nochildren: Style.ClassName;
                expanded: Style.ClassName;
                active: Style.ClassName;
            }>;
            dropdown: Style.ClassName;
        };
    }
}

RHU.module(new Error(), "components/molecules/filterlist/style",
    { Style: "rhu/style", theme: "main/theme" },
    function({ Style, theme })
    {
        const style = Style(({ style }) => {
            const wrapper = style.class`
            position: relative;
            width: 25%;
            min-width: 200px;
            flex-shrink: 0;
            `;

            const content = style.class`
            position: sticky;
            top: var(--Navbar_height);
            width: 100%;
            height: calc(100vh - var(--Navbar_height));
            overflow-y: auto;
            padding: 8px 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            `

            const path = style.class<{
                item: RHU.Style.ClassName;
            }>`
            display: flex;
            `;
            style`
            ${path} > li::after {
                content: "/";
                padding: 3px; 0;
            }
            `;

            path.item = style.class`
            cursor: pointer;
            -webkit-user-select: none;
            user-select: none;
            color: inherit;
            text-decoration: inherit;
            `;
            
            const filteritem = style.class<{
                content: RHU.Style.ClassName;
                children: RHU.Style.ClassName;
                nochildren: RHU.Style.ClassName;
                expanded: RHU.Style.ClassName;
                active: RHU.Style.ClassName;
            }>`
            cursor: pointer;
            -webkit-user-select: none;
            user-select: none;
            color: inherit;
            text-decoration: inherit;
            `;

            filteritem.active = style.class`
            background-color: #eee;
            `;

            filteritem.nochildren = style.class``;

            filteritem.children = style.class`
            display: none;
            padding-left: 10px;
            `;

            filteritem.content = style.class`
            display: flex;
            align-items: center;
            `;

            // https://docsstyleguide.z13.web.core.windows.net/icon-font.html#docons
            const dropdown = style.class`
            display: flex;
            justify-content: center;
            align-items: center;
            `;
            style`
            ${dropdown}::before {
                font-family: docons;
                font-size: .55rem;
                font-weight: 600;
                padding: 0 3px;
                content: "Ｔ";

                transition: transform .15s ease-in-out;
                transform: rotate(0);
            }
            ${dropdown}:hover {
                cursor: pointer;
            }

            ${filteritem.nochildren}${dropdown}::before {
                opacity: 0;
                pointer-events: none;
            }
            ${filteritem.nochildren}${dropdown}:hover {
                cursor: unset;
            }
            `;

            filteritem.expanded = style.class``;
            style`
            ${filteritem.expanded}>${filteritem.children} {
                display: block;
            }
            ${filteritem.expanded}>${filteritem.content}>${dropdown}::before {
                transform: rotate(90deg);
            }
            `;

            return {
                wrapper,
                content,
                path,
                filteritem,
                dropdown,
            };
        });

        return style;
    }
);