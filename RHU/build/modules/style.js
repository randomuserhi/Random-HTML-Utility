(function () {
    let RHU = window.RHU;
    if (RHU === null || RHU === undefined)
        throw new Error("No RHU found. Did you import RHU before running?");
    RHU.import(RHU.module({ trace: new Error(),
        name: "rhu/style", hard: [],
        callback: function () {
            if (RHU.exists(RHU.Style))
                console.warn("Overwriting RHU.Style...");
            const symbols = {
                name: Symbol("style name"),
            };
            RHU.Style = function (arg) {
                if (RHU.exists(new.target))
                    return new styleBlock(arg);
                else
                    return new styleBody(arg);
            };
            let styleBlock = function (generator) {
                throw new Error("Not implemented yet.");
            };
            let styleBody = function (declaration) {
                let clone = function (target, declaration) {
                    for (let key of Object.keys(declaration)) {
                        let value = declaration[key];
                        if (typeof value === "string")
                            target[key] = value;
                        else if (isStyleBody(value))
                            target[key] = new styleBody(value);
                        else
                            target[key] = new styleBody(value);
                    }
                };
                clone(this, declaration);
            };
            styleBody.prototype[Symbol.toPrimitive] = function (hint) {
                if (hint !== "number")
                    return this.toString();
                return null;
            };
            styleBody.prototype.toString = function () {
                throw new Error("Not implemented yet.");
            };
            let isStyleBody = Object.isPrototypeOf.bind(styleBody.prototype);
            RHU.Style.mediaQuery = function (declaration) {
                throw new Error("Not implemented yet.");
            };
            let element = Symbol("Element reference");
            RHU.Style.el = function () { return element; };
        }
    }));
})();
