import { exists } from "./rhu.js";
import { ClassName } from "./style.js";

export type ThemeVariable<T extends {} = {}> = {
    [Symbol.toPrimitive]: () => string;
    name: string;
} & T;

interface ThemeVariableConstructor {
    new<T extends{} = {}>(name?: string): ThemeVariable<T>;
    prototype: ThemeVariable;
}

interface Generator {
    (first: TemplateStringsArray, ...interpolations: (string | ThemeVariable)[]): ThemeVariable;
}

interface Factory  {
    theme: Generator;
}

let id = 69;

export const ThemeVariable = function(this: ThemeVariable, name: string) {
    if (exists(name)) {
        this.name = name;
    } else {
        this.name = `--rhu-${++id}`;
    }
} as any as ThemeVariableConstructor;
ThemeVariable.prototype[Symbol.toPrimitive] = function() {
    return `var(${this.name})`;
};

export function Theme<T extends {} = {}>(factory: (worker: Factory) => T): ClassName<T> {
    const cn = new ClassName<T>();
    let generatedCode = `.${cn} {`;
    const generator = function<T extends {} = {}>(first: TemplateStringsArray, ...interpolations: (string | ThemeVariable)[]): ThemeVariable<T> {
        const themeVar = new ThemeVariable() as ThemeVariable;
        generatedCode += `${themeVar.name}:${first[0]}`;
        for (let i = 0; i < interpolations.length; ++i) {
            const interpolation = interpolations[i];
            generatedCode += interpolation;
            generatedCode += first[i + 1];
        }
        generatedCode += `;`;
        return themeVar as ThemeVariable & T;
    };
    const exports = factory({ theme: generator });
    generatedCode += "}";

    generatedCode = generatedCode.replace(/(\r\n|\n|\r)/gm, "").replace(/ +/g, ' ').trim();
    const el = document.createElement("style");
    el.innerHTML = generatedCode;
    document.head.append(el);

    Object.assign(cn, exports);
    return cn;
}