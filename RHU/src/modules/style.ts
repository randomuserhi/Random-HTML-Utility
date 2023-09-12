(function() {
    
    let RHU: RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module(new Error(), "rhu/style", 
        {},
        function()
        {
            // TODO(randomuserhi): Documentation
            
            let id = 69;

            interface ClassNameConstructor
            {
                new(name?: string): RHU.Style.ClassName;
                prototype: RHU.Style.ClassName;
            }

            let cn = function(this: RHU.Style.ClassName, name: string)
            {
                if (RHU.exists(name))
                {
                    this.name = name;
                }
                else
                {
                    this.name = `rhu_${++id}`;
                }
            } as any as ClassNameConstructor;
            cn.prototype[Symbol.toPrimitive] = function()
            {
                return this.name;
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
                                const parse = prop as RHU.Style.CSSProperties.border;
                                result += `
                                border-radius: ${parse["border-radius"] || parse.borderRadius};
                                `;
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
                generator.class = function (first: TemplateStringsArray, ...interpolations: (string | RHU.Style.StyleDeclaration)[]): RHU.Style.ClassName
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
                    return classname;
                }
                const exports = factory({ style: generator, css, cn: () => new cn() });
                
                generatedCode = generatedCode.replace(/(\r\n|\n|\r)/gm, "").replace(/ +/g, ' ').trim();
                let el = document.createElement("style");
                el.innerHTML = generatedCode;
                document.head.append(el);

                return exports;
            } as RHU.Style;
        
            return Style;
        }
    );

})();