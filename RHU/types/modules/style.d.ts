interface RHU
{

    Style?: RHU.Style;
}

declare namespace RHU
{
    interface Style
    {
        new<T extends {}>(generator: (style: Style.StyledType<T> & Style.Block) => void): Style.StyledType<T> & Style.Block;
        <T extends {}>(style: Style.StyledType<T> & Style.BodyDeclaration): Style.StyledType<T> & Style.Body;

        mediaQuery<T extends {}>(body: Style.StyledType<T> & Style.BlockDeclaration): Style.StyledType<T> & Style.MediaQuery;

        el<Tag extends keyof HTMLElementTagNameMap>(tag: Tag): symbol; 
        /** @deprecated */
        el<Tag extends keyof HTMLElementDeprecatedTagNameMap>(tag: Tag): symbol; 
        el(tag: string): symbol; 
    }

    namespace Style
    {
        // Types for declaring style type structures

        type CSSMediaQuery<T extends {} = {}> = RHU.Style.StyledType<T> & RHU.Style.MediaQuery;
        type CSSBody<T extends {} = {}> = RHU.Style.StyledType<T> & RHU.Style.BodyDeclaration;
        type CSSBlock<T extends {} = {}> = RHU.Style.StyledType<T> & RHU.Style.BlockDeclaration;

        // Utilities used for type inference

        // Obtains all keys of an object that are styled objects and not CSS properties
        // E.g: { display: "flex", button: { display: "flex" }, wrapper: { ... } } returns the type "button" | "wrapper"
        //
        // https://stackoverflow.com/questions/69464179/how-to-extract-keys-of-certain-type-from-object
        type StyledKeys<T extends {}> = {
            [Property in keyof T]: T[Property] extends BodyDeclaration ? Property: never;
        }[keyof T]
        
        // Converts an object type to an object type containing only the keys which are styled objects
        // E.g: { display: "flex", button: { display: "flex" }, wrapper: { ... } } returns the type { button: { ... }, wrapper: { ... } }
        type StyledType<T extends {}> = {
            [Property in StyledKeys<T>]: T[Property];
        }

        // Object types

        type Body = BodyDeclaration &
        {
            [Symbol.toPrimitive]: (hint: "number" | "string" | "default") => string | undefined | null; 
            toString(): string;
        }

        type MediaQuery = BlockDeclaration &
        {
            query: string;
        }

        type Block = BlockDeclaration &
        {

        }

        // Declaration types 

        type BlockDeclaration = {
            [Property in PropertyKey]: Body | BodyDeclaration | MediaQuery;
        }
        type BodyDeclaration = {
            [Property in Style.CSSProperty]?: (Property extends keyof Style.CSSPropertiesMap ? Style.CSSPropertiesMap[Property] : CSSAny) | BodyDeclaration | BodyDeclaration[];
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