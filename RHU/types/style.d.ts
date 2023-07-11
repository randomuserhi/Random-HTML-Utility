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
        <T extends Style.CSSStyle>(declaration: T & Style.CSSStyle): T & Style.CSSStyle;

        el<Tag extends keyof HTMLElementTagNameMap>(tag: Tag): symbol; 
        /** @deprecated */
        el<Tag extends keyof HTMLElementDeprecatedTagNameMap>(tag: Tag): symbol; 
        el(tag: string): symbol; 
    }

    namespace Style
    {
        // TODO(randomuserhi): Move "__style__" into a type variable to make it easier to rename
        type CSSStyle<T extends CSSStyle = {}> = Omit<T, "__style__"> & ({
            // NOTE(randomuserhi): Used as generic structure definition
            [Property in PropertyKey]?: Style.StyleDeclaration | CSSStyle;
        } | {
            // NOTE(randomuserhi): Used as a more precise definition on top of generic structure definition
            //                     generic structure definition is needed otherwise this will throw errors
            //                     when in use.
            [Property in ("__style__" | string & {} | number | symbol)]?: Property extends "__style__" ? Style.StyleDeclaration : CSSStyle; 
        });

        type StyleDeclaration = {
            [Property in Style.CSSProperty]?: Property extends keyof Style.CSSPropertiesMap ? Style.CSSPropertiesMap[Property] : CSSAny;
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
        type CSSAny = CSSString | number;
        type CSSString = string & {};

        interface CSSPropertiesMap
        {
            display: "none" | "block" | "flex" | "grid" | CSSString;

            color: Color | CSSString;

            "background-color": Color | CSSString;
            backgroundColor: Color | CSSString;

            "border-radius": CSSAny;
            borderRadius: CSSAny;
        }

        type CSSProperty = CSSAny | keyof CSSPropertiesMap;    
    }
}