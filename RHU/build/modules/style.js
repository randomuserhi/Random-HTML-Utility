(function () {
    let RHU = window.RHU;
    if (RHU === null || RHU === undefined)
        throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module(new Error(), "rhu/style", {}, function () {
        let id = 69;
        let cn = function (name) {
            if (RHU.exists(name)) {
                this.name = name;
            }
            else {
                this.name = `rhu_${++id}`;
            }
        };
        cn.prototype[Symbol.toPrimitive] = function () {
            return this.name;
        };
        let css = function (style) {
            let result = "";
            for (const [key, value] of Object.entries(style)) {
                let prop = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
                result += `${prop}:${value};`;
            }
            return result;
        };
        let Style = function (factory) {
            let generatedCode = "";
            let generator = function (first, ...interpolations) {
                generatedCode += first[0];
                for (let i = 0; i < interpolations.length; ++i) {
                    const interpolation = interpolations[i];
                    if (typeof interpolation === "object") {
                        if (interpolation instanceof cn) {
                            generatedCode += `.${interpolation}`;
                        }
                        else {
                            generatedCode += css(interpolation);
                        }
                    }
                    else {
                        generatedCode += interpolation;
                    }
                    generatedCode += first[i + 1];
                }
            };
            generator.class = function (first, ...interpolations) {
                const classname = new cn();
                if (first.length > 1 || first[0] !== '' || interpolations.length !== 0) {
                    generatedCode += `.${classname} {${first[0]}`;
                    for (let i = 0; i < interpolations.length; ++i) {
                        const interpolation = interpolations[i];
                        if (typeof interpolation === "object") {
                            if (interpolation instanceof cn) {
                                generatedCode += interpolation;
                            }
                            else {
                                generatedCode += css(interpolation);
                            }
                        }
                        else {
                            generatedCode += interpolation;
                        }
                        generatedCode += first[i + 1];
                    }
                    generatedCode += "}";
                }
                return classname;
            };
            const exports = factory({ style: generator, css, cn: () => new cn() });
            generatedCode = generatedCode.replace(/(\r\n|\n|\r)/gm, "").replace(/ +/g, ' ').trim();
            let el = document.createElement("style");
            el.innerHTML = generatedCode;
            document.head.append(el);
            return exports;
        };
        return Style;
    });
})();
