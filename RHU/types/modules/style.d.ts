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
        <T extends Style.CSSStyle>(declaration: Style.CSSStyle<T>): Style.CSSStyle<T>;

        el<Tag extends keyof HTMLElementTagNameMap>(tag: Tag): symbol; 
        /** @deprecated */
        el<Tag extends keyof HTMLElementDeprecatedTagNameMap>(tag: Tag): symbol; 
        el(tag: string): symbol; 
    }

    namespace Style
    {
        // TODO(randomuserhi): Change structure to use Omit<T, keyof StyleProperties> etc...

        // TODO(randomuserhi): Move "__style__" into a type variable to make it easier to rename
        type CSSStyle<T extends {
            [Property in PropertyKey]?: CSSStyle
        } = {}> = Omit<T, "__style__"> & {
            __style__?: StyleDeclaration;
            [Property: PropertyKey]: StyleDeclaration | CSSStyle | undefined; 
        };
        // TODO(randomuserhi): Move "__style__" into a type variable to make it easier to rename
        type CSSMediaQuery<T extends {
            [Property in PropertyKey]?: CSSStyle
        } = {}> = T & {
            query?: string;
            [Property: PropertyKey]: string | CSSStyle | undefined; 
        }

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