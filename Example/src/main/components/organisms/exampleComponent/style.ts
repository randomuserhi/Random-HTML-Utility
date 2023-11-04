declare namespace RHU {
    interface Modules {
        "components/organsisms/exampleComponent/style": {
            wrapper: Style.ClassName;
        };
    }
}

RHU.module(new Error(), "components/organsisms/exampleComponent/style", { 
    Style: "rhu/style" 
}, function({ Style }) {
    const style = Style(({ style }) => {
        const wrapper = style.class`
        display: flex;
        gap: 10px;
        `;

        return {
            wrapper,
        };
    });

    return style;
});