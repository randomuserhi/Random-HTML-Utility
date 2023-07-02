interface RHU
{

    Style?: RHU.Style;
}

declare namespace RHU
{
    interface Style
    {
        new (generator: (style: Style.CSSBlock) => void): Style.CSSBlock;
        // TODO(randomuserhi): This partially works, I need to expand `T` to convert it into a type
        //                     where the values are `{}`
        <T extends {}>(style: T & Style.BodyDeclaration): Style.CSSBody<Style.StyledType<T>>;

        el<Tag extends keyof HTMLElementTagNameMap>(tag: Tag): symbol; 
        /** @deprecated */
        el<Tag extends keyof HTMLElementDeprecatedTagNameMap>(tag: Tag): symbol; 
        el(tag: string): symbol; 
    }

    namespace Style
    {
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
            [Property in StyledKeys<T>]: T[Property]
        }

        type CSSBody<T extends {} = {}> = StyledType<T> & BodyDeclaration &
        {
            [Symbol.toPrimitive]: (hint: "number" | "string" | "default") => string | undefined | null; 
            toString(): string;
        }

        interface CSSBlock extends BlockDeclaration
        {

        }

        type BlockDeclaration = Record<PropertyKey, CSSBlock | CSSBody>;

        type BodyDeclaration = {
            [Property in Style.CSSProperty]?: (Property extends keyof Style.CSSPropertiesMap ? Style.CSSPropertiesMap[Property] : CSSAny) | BodyDeclaration | BodyDeclaration[];
        };

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

        interface CSSPropertiesMap
        {
            display: "none" | "block" | "flex";

            color: Color | CSSAny;

            "background-color": Color | CSSAny;
            backgroundColor: Color | CSSAny;

            "border-radius": CSSAny;
            borderRadius: CSSAny;
        }

        type CSSProperty = CSSAny | keyof CSSPropertiesMap;    
    }
}