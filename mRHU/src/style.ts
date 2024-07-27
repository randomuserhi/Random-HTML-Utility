import { exists } from "./rhu.js";
import { ThemeVariable } from "./theme.js";

export type ClassName<T extends {} = {}> = {
    [Symbol.toPrimitive]: () => string;
    name: string;
} & T;
interface ClassNameConstructor {
    new<T extends {} = {}>(name?: string): ClassName<T>;
    prototype: ClassName;
}

let id = 69;

export const ClassName = function(this: ClassName, name: string) {
    if (exists(name)) {
        this.name = name;
    } else {
        this.name = `rhu-${++id}`;
    }
} as any as ClassNameConstructor;
ClassName.prototype[Symbol.toPrimitive] = function() {
    return this.name;
};

const interpret = function(value?: string | number): string | undefined {
    if (typeof value === "number") {
        return `${value}px`;
    }
    return value;
};

export const css = function (style: StyleDeclaration): string {
    let result = "";
    for (const [key, value] of Object.entries(style)) {
        const prop = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
        if (typeof value === "string" || value instanceof String) {
            result += `${prop}:${value};`;
        } else if (typeof value === "number") {
            result += `${prop}:${value}px;`;
        } else {
            // TODO(randomuserhi): Fill out
            switch(prop) {
            case "border": {
                const parse = value as CSSProperties.border;

                const borderRadius = interpret(parse["border-radius"] || parse.borderRadius);
                if (exists(borderRadius)) result += `border-radius: ${borderRadius}; `;
                break;
            }
            }
        }
    }
    return result;
};

interface Generator {
    (first: TemplateStringsArray, ...interpolations: (string | ClassName | ThemeVariable)[]): void;
    class<T extends {} = {}>(first: TemplateStringsArray, ...interpolations: (string | ThemeVariable)[]): ClassName & T;
}

interface Factory  {
    style: Generator;
}

type StyleDeclaration = {
    [Property in CSSProperty]?: Property extends keyof CSSPropertiesMap ? CSSPropertiesMap[Property] : CSSValue;
};

// CSS types

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

// TODO(randomuserhi): Fill out
declare namespace CSSProperties
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

const element: unique symbol = Symbol("style.element");

interface Style {
    <T>(factory: (worker: Factory) => T): T;
    dispose(obj: any): void;
}

export const Style: Style = (<T>(factory: (worker: Factory) => T): T => {
    let generatedCode = "";
    const generator = function (first: TemplateStringsArray, ...interpolations: (string | ClassName | StyleDeclaration)[]): void {
        generatedCode += first[0];
        for (let i = 0; i < interpolations.length; ++i) {
            const interpolation = interpolations[i];
            if (typeof interpolation === "object") {
                if (interpolation instanceof ClassName) {
                    generatedCode += `.${interpolation}`;
                } else if (interpolation instanceof ThemeVariable) {
                    generatedCode += `${interpolation}`;
                } else {
                    generatedCode += css(interpolation);
                }
            } else {
                generatedCode += interpolation;
            }
            generatedCode += first[i + 1];
        }
    } as Generator;
    generator.class = function<T extends {} = {}>(first: TemplateStringsArray, ...interpolations: (string | StyleDeclaration)[]): ClassName & T {
        const classname = new ClassName();
        if (first.length > 1 || first[0] !== '' || interpolations.length !== 0) {
            generatedCode += `.${classname} {${first[0]}`;
            for (let i = 0; i < interpolations.length; ++i) {
                const interpolation = interpolations[i];
                if (typeof interpolation === "object") {
                    if (interpolation instanceof ClassName) {
                        generatedCode += interpolation;
                    } else if (interpolation instanceof ThemeVariable) {
                        generatedCode += `${interpolation}`;
                    } else {
                        generatedCode += css(interpolation);
                    }
                } else {
                    generatedCode += interpolation;
                }
                generatedCode += first[i + 1];
            }
            generatedCode += "}";
        }
        return classname as ClassName & T;
    };
    const exports = factory({ style: generator });

    generatedCode = generatedCode.replace(/(\r\n|\n|\r)/gm, "").replace(/ +/g, ' ').trim();
    const el = document.createElement("style");
    el.innerHTML = generatedCode;
    document.head.append(el);

    (exports as any)[element] = el;

    return exports;
}) as any;

Style.dispose = (style) => {
    const el: HTMLStyleElement | undefined = style[element];
    if (el === undefined) throw new Error("Cannot dispose a non-style object.");
    el.remove();
};