interface RHU
{

    Style?: RHU.Style;
}

declare namespace RHU
{
    interface Style
    {
        new (generator: (style: RHU.CSSBlock) => void): CSSBlock;
        (style: StyleDeclaration): CSSBody;
        
        el<Tag extends keyof HTMLElementTagNameMap>(tag: Tag): symbol; 
        /** @deprecated */
        el<Tag extends keyof HTMLElementDeprecatedTagNameMap>(tag: Tag): symbol; 
        el(tag: string): symbol; 
    }

    interface CSSBody extends StyleDeclaration
    {
        
    }

    interface CSSBlock extends Record<PropertyKey, CSSBlock | CSSBody>
    {

    }

    type StyleDeclaration = Partial<{
        [property in Style.CSSProperty]: Style.CSSProperties[property] | StyleDeclaration;
    }>;

    namespace Style
    {
        type HTMLElement = keyof HTMLElementTagNameMap;

        type BasicColor = 
            "black" |
            "silver" |
            "gray" |
            "white" |
            "maroon" |
            "red" |
            "purple" |
            "fuchsia" |
            "green" |
            "lime" |
            "olive" |
            "yellow" |
            "navy" |
            "blue" |
            "teal" |
            "aqua";

        // TODO(randomuserhi): Fill out from https://www.w3.org/wiki/CSS/Properties/color/keywords
        type ExtendedColor = 
            "aliceblue" |
            "antiquewhite";

        type Color = BasicColor | ExtendedColor;

        // https://stackoverflow.com/questions/74467392/autocomplete-in-typescript-of-literal-type-and-string
        type CSSAny = string & {};

        interface CSSProperties
        {
            display: "none" | "block" | "flex";

            color: Color | CSSAny;

            "background-color": Color | CSSAny;
            backgroundColor: Color | CSSAny;

            "border-radius": CSSAny;
            borderRadius: CSSAny;

            [property: CSSAny]: CSSAny;
        }

        type CSSProperty = keyof CSSProperties;    
    }
}