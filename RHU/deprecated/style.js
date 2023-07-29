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
            let isPlainObject = function (obj) {
                return Object.getPrototypeOf(obj) === Object.prototype;
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
                        if (typeof value === "string" || typeof value === "number")
                            target[key] = value;
                        else if (isMediaQuery(value))
                            target[key] = new mediaQuery(value);
                        else if (isStyleBody(value))
                            target[key] = new styleBody(value);
                        else if (isPlainObject(value))
                            target[key] = new styleBody(value);
                        else
                            throw new Error(`Object assigned to ${key} is not a valid style object.`);
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
            RHU.Style.mediaQuery = function (arg) {
                if (RHU.exists(new.target))
                    throw new Error("This function cannot be called with the 'new' keyword.");
                else
                    return new mediaQuery(arg);
            };
            let mediaQuery = function (declaration) {
                let clone = function (target, declaration) {
                    for (let key of Object.keys(declaration)) {
                        let value = declaration[key];
                        if (isMediaQuery(value))
                            target[key] = new mediaQuery(value);
                        else if (isStyleBody(value))
                            target[key] = new styleBody(value);
                        else if (isPlainObject(value))
                            target[key] = new styleBody(value);
                        else
                            throw new Error(`Object assigned to ${key} is not a valid style object.`);
                    }
                };
                clone(this, declaration);
            };
            let isMediaQuery = Object.isPrototypeOf.bind(mediaQuery.prototype);
            let element = Symbol("Element reference");
            RHU.Style.el = function () { return element; };
            let style = RHU.Style({
                display: "flex",
                color: "aqua",
                borderRadius: 10,
                wrapper: {
                    display: "flex"
                },
                grid: {
                    cell: {
                        display: "flex"
                    }
                },
                props: {
                    cell2: {
                        display: "flex"
                    },
                    bruh: {}
                },
                query: RHU.Style.mediaQuery({})
            });
        }
    }));
})();
