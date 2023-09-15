(function() {
    
    const RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    interface SymbolCollection
    { 
        readonly name: unique symbol;
    }
    const symbols: SymbolCollection = {
        name: Symbol("style/theme name"),
    } as SymbolCollection;

    interface ClassName extends RHU.Style.ClassName
    {
        [symbols.name]: string;
    }
    interface ClassNameConstructor extends RHU.Style.ClassNameConstructor
    {
        prototype: ClassName;
    }

    interface ThemeVariable extends RHU.Theme.ThemeVariable
    {
        [symbols.name]: string;
    }
    interface ThemeVariableConstructor extends RHU.Theme.ThemeVariableConstructor
    {
        prototype: ThemeVariable;
    }

    // TODO(randomuserhi): Documentation
    RHU.module(new Error(), "rhu/theme/types", 
        {},
        function()
        {
            let id = 69;

            const ThemeVariable = function(this: ThemeVariable, name: string)
            {
                if (RHU.exists(name))
                {
                    this[symbols.name] = name;
                }
                else
                {
                    this[symbols.name] = `--rhu-${++id}`;
                }
            } as any as ThemeVariableConstructor;
            ThemeVariable.prototype[Symbol.toPrimitive] = function()
            {
                return `var(${this[symbols.name]})`;
            }

            return {
                ThemeVariable,
            }
        }
    );
    RHU.module(new Error(), "rhu/theme",
        { types: "rhu/theme/types", Style: "rhu/style/types" },
        function({ types: { ThemeVariable }, Style })
        {
            let Theme = function<T extends {} = {}>(factory: (worker: RHU.Theme.Factory) => T): RHU.Style.ClassName<T>
            {
                const cn = new Style.cn<T>();
                let generatedCode = `.${cn} {`;
                let generator = function<T extends {} = {}>(first: TemplateStringsArray, ...interpolations: (string | RHU.Theme.ThemeVariable)[]): RHU.Theme.ThemeVariable<T>
                {
                    const themeVar = new ThemeVariable() as ThemeVariable;
                    generatedCode += `${themeVar[symbols.name]}:${first[0]}`;
                    for (let i = 0; i < interpolations.length; ++i)
                    {
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
                let el = document.createElement("style");
                el.innerHTML = generatedCode;
                document.head.append(el);

                Object.assign(cn, exports);
                return cn;
            };

            return Theme;
        }
    );

    RHU.module(new Error(), "rhu/style/types",
        {},
        function()
        {
            let id = 69;

            const cn = function(this: ClassName, name: string)
            {
                if (RHU.exists(name))
                {
                    this[symbols.name] = name;
                }
                else
                {
                    this[symbols.name] = `rhu-${++id}`;
                }
            } as any as ClassNameConstructor;
            cn.prototype[Symbol.toPrimitive] = function()
            {
                return this[symbols.name];
            }

            return {
                cn,
            };
        }
    );
    RHU.module(new Error(), "rhu/style", 
        { style: "rhu/style/types", Theme: "rhu/theme/types" },
        function({ style: { cn }, Theme })
        {
            let interpret = function(value?: string | number): string | undefined
            {
                if (typeof value === "number") {
                    return `${value}px`;
                }
                return value;
            }

            let css = function (style: RHU.Style.StyleDeclaration): string
            {
                let result = "";
                for (const [key, value] of Object.entries(style))
                {
                    let prop = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
                    if (typeof value === "string" || value instanceof String) {
                        result += `${prop}:${value};`;
                    } else if (typeof value === "number") {
                        result += `${prop}:${value}px;`;
                    } else {
                        // TODO(randomuserhi): Fill out
                        switch(prop) {
                            case "border":
                                const parse = value as RHU.Style.CSSProperties.border;

                                const borderRadius = interpret(parse["border-radius"] || parse.borderRadius);
                                if (RHU.exists(borderRadius)) result += `border-radius: ${borderRadius}; `;
                                break;
                        }
                    }
                }
                return result;
            };

            let Style = function<T>(factory: (worker: RHU.Style.Factory) => T): T
            {
                let generatedCode = "";
                let generator = function (first: TemplateStringsArray, ...interpolations: (string | RHU.Style.ClassName | RHU.Style.StyleDeclaration)[]): void
                {
                    generatedCode += first[0];
                    for (let i = 0; i < interpolations.length; ++i)
                    {
                        const interpolation = interpolations[i];
                        if (typeof interpolation === "object")
                        {
                            if (interpolation instanceof cn)
                            {
                                generatedCode += `.${interpolation}`;
                            }
                            else if (interpolation instanceof Theme.ThemeVariable)
                            {
                                generatedCode += `${interpolation}`;
                            }
                            else
                            {
                                generatedCode += css(interpolation);
                            }
                        }
                        else
                        {
                            generatedCode += interpolation;
                        }
                        generatedCode += first[i + 1];
                    }
                } as RHU.Style.Generator;
                generator.class = function<T extends {} = {}>(first: TemplateStringsArray, ...interpolations: (string | RHU.Style.StyleDeclaration)[]): RHU.Style.ClassName & T
                {
                    const classname = new cn();
                    if (first.length > 1 || first[0] !== '' || interpolations.length !== 0)
                    {
                        generatedCode += `.${classname} {${first[0]}`;
                        for (let i = 0; i < interpolations.length; ++i)
                        {
                            const interpolation = interpolations[i];
                            if (typeof interpolation === "object")
                            {
                                if (interpolation instanceof cn)
                                {
                                    generatedCode += interpolation;
                                }
                                else if (interpolation instanceof Theme.ThemeVariable)
                                {
                                    generatedCode += `${interpolation}`;
                                }
                                else
                                {
                                    generatedCode += css(interpolation);
                                }
                            }
                            else
                            {
                                generatedCode += interpolation;
                            }
                            generatedCode += first[i + 1];
                        }
                        generatedCode += "}";
                    }
                    return classname as ClassName & T;
                }
                const exports = factory({ style: generator, css, cn: <T extends {} = {}>(name?: string) => new cn(name) as ClassName & T });
                
                generatedCode = generatedCode.replace(/(\r\n|\n|\r)/gm, "").replace(/ +/g, ' ').trim();
                let el = document.createElement("style");
                el.innerHTML = generatedCode;
                document.head.append(el);

                return exports;
            } as RHU.Style;
            Style.cn = cn;
        
            return Style;
        }
    );

})();