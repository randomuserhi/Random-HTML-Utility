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
        <T extends Style.RestrictProps<T> & Style.DeclarationSchema<Style.CSSAll>>(generator: (root: T) => void): ReadOnly<T>;
        mediaQuery<T extends Style.RestrictProps<T> & Style.DeclarationSchema<Style.CSSAll>>(generator: (root: Style.CSSMediaQuery<T>) => void): Style.CSSMediaQuery<T>;

        el<Tag extends keyof HTMLElementTagNameMap>(tag: Tag): symbol; 
        /** @deprecated */
        el<Tag extends keyof HTMLElementDeprecatedTagNameMap>(tag: Tag): symbol; 
        el(tag: string): symbol; 
    }

    namespace Style
    {
        // Utility types
        interface StyleTypeMap
        {
            "CLASS": CSSStyle;
            "MEDIA_QUERY": CSSMediaQuery;
        }
        type CSSAll = StyleTypeMap[keyof StyleTypeMap];

        type TypesIn<T> = T[keyof T];
        type DeclarationObject<T> = T & {
            [Property: string]: TypesIn<T> | CSSAll | undefined; 
        }
        type DeclarationSchema<AcceptedTokens = CSSStyle> = {
            [Property in string]?: AcceptedTokens
        }

        // NOTE(randomuserhi): Special properties in styles utilize `__${string}__` pattern, the following are utility types for
        //                     handling them.
        type RestrictProps<T> = {
            [K in keyof T]: K extends `__${string}__` ? never : T[K];
        }
        type StripRestrictedProps<T> = {
            [K in keyof T as K extends `__${string}__` ? never : K]: T[K];
        }
        type CSSToken<Schema, Token> = StripRestrictedProps<Schema> & DeclarationObject<Token>;

        // Declaration Types
        interface CSSStyleProperties
        {
            __type__?: "CLASS";
            __style__?: StyleDeclaration;
        }
        //type CSSStyle<T extends DeclarationSchema = {}> = Omit<T, keyof CSSStyleProperties> & DeclarationObject<CSSStyleProperties>; /* deprecated type definition */
        //type CSSStyle<T extends DeclarationSchema = {}> = Omit<StripRestrictedProps<T>, keyof CSSStyleProperties> & DeclarationObject<CSSStyleProperties>; /* deprecated type definition */
        type CSSStyle<T extends DeclarationSchema = {}> = CSSToken<T, CSSStyleProperties>;
        
        interface CSSMediaQueryProperties
        {
            __type__: "MEDIA_QUERY";
            __query__?: string;
        }
        //type CSSMediaQuery<T extends DeclarationSchema<CSSStyle | CSSMediaQuery> = {}> = Omit<T, keyof (CSSStyleProperties | CSSMediaQueryProperties)> & DeclarationObject<CSSMediaQueryProperties>; /* deprecated type definition */
        //type CSSMediaQuery<T extends DeclarationSchema<CSSStyle | CSSMediaQuery> = {}> = Omit<StripRestrictedProps<T>, keyof (CSSStyleProperties | CSSMediaQueryProperties)> & DeclarationObject<CSSMediaQueryProperties>; /* deprecated type definition */
        type CSSMediaQuery<T extends DeclarationSchema<CSSStyle | CSSMediaQuery> = {}> = CSSToken<T, CSSMediaQueryProperties>;

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