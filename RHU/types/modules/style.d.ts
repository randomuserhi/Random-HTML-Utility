interface RHU
{

    Style?(generator: (style: RHU.StyleBlock) => void): RHU.StyleBlock;
}

declare namespace RHU
{
    interface StyleBlock extends Record<PropertyKey, StyleBlock | StyleDeclaration>
    {

    }

    type StyleDeclaration = Partial<{
        [property in Style.CSSProperty]: Style.CSSProperties[property] | StyleDeclaration;
    }>;

    namespace Style
    {
        type BasicColors = 
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
        type ExtendedColors = 
            "aliceblue" |
            "antiquewhite";

        type Colors = BasicColors | ExtendedColors;

        // https://stackoverflow.com/questions/74467392/autocomplete-in-typescript-of-literal-type-and-string
        type CSSAny = string & {};

        interface CSSProperties
        {
            display: "none" | "block" | "flex";

            color: Colors | CSSAny;

            "background-color": Colors | CSSAny;
            backgroundColor: Colors | CSSAny;

            "border-radius": CSSAny;
            borderRadius: CSSAny;

            [k: CSSAny]: CSSAny;
        }

        type CSSProperty = keyof CSSProperties;    
    }
}