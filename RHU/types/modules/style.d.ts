// TODO(randomuserhi): comments and documentation
//                     especially important here since a lot of types here are defined with strict intent
//                     and are quite complex

interface RHU
{

    Style?: RHU.Style;
}

declare namespace RHU
{
    interface Style
    {
        
    }

    namespace Style
    {
        type StyleDeclaration = {
            [Property in Style.CSSProperty]?: Property extends keyof Style.CSSPropertiesMap ? Style.CSSPropertiesMap[Property] : CSSValue;
        };

        // CSS types

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
        type CSSString = string & {};

        type CSSKey = CSSString;
        type CSSFlatValue = CSSString | number;
        type CSSValue = CSSFlatValue | {};

        namespace CSSProperties
        {
            interface border
            {
                "border-radius"?: CSSFlatValue;
                borderRadius?: CSSFlatValue;
            }

            type All = border;
        }

        type CSSPropertiesMap = CSSProperties.All &
        {
            display?: "none" | "block" | "flex" | "grid" | CSSString;

            color?: Color | CSSString;

            "background-color"?: Color | CSSString;
            backgroundColor?: Color | CSSString;

            "border"?: CSSString | CSSProperties.border;
        }

        type CSSProperty = CSSKey | keyof CSSPropertiesMap;    
    }
}