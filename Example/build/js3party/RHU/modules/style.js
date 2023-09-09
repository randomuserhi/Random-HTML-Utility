(function () {
    let RHU = window.RHU;
    if (RHU === null || RHU === undefined)
        throw new Error("No RHU found. Did you import RHU before running?");
    RHU.import(RHU.module({ trace: new Error(),
        name: "rhu/style", hard: [],
        callback: function () {
            if (RHU.exists(RHU.Style))
                console.warn("Overwriting RHU.Style...");
            let propStack = [];
            let styleHandler = {
                set: function (target, prop, newValue) {
                    let parentProp = propStack.length > 0 ? propStack[propStack.length - 1] : undefined;
                    console.log(`${String(parentProp)} ${String(prop)}`);
                    propStack.push(prop);
                    if (!RHU.exists(target[prop])) {
                        if ((typeof prop === 'string' || prop instanceof String)
                            && /__[_$a-zA-Z0-9]*__/g.test(prop)) {
                            target[prop] = {};
                        }
                        else {
                            target[prop] = new Proxy({}, styleHandler);
                        }
                    }
                    if (typeof newValue === 'object' && newValue !== null) {
                        for (let [key, value] of Object.entries(newValue)) {
                            target[prop][key] = value;
                        }
                    }
                    else {
                        target[prop] = newValue;
                    }
                    propStack.pop();
                    return true;
                }
            };
            let Style = RHU.Style = function (generator) {
                let style = {};
                let handler = {
                    set: function (target, prop, newValue) {
                        propStack.push(prop);
                        if (!RHU.exists(target[prop])) {
                            if ((typeof prop === 'string' || prop instanceof String)
                                && /__[_$a-zA-Z0-9]*__/g.test(prop)) {
                                target[prop] = {};
                            }
                            else {
                                target[prop] = new Proxy({}, styleHandler);
                            }
                        }
                        if (typeof newValue === 'object' && newValue !== null) {
                            for (let [key, value] of Object.entries(newValue)) {
                                target[prop][key] = value;
                            }
                        }
                        else {
                            target[prop] = newValue;
                        }
                        propStack.pop();
                        return true;
                    }
                };
                let proxy = new Proxy(style, handler);
                generator(proxy);
                return style;
            };
            Style.mediaQuery = function (generator) {
                let style = {};
                let proxy = new Proxy(style, styleHandler);
                generator(proxy);
                return style;
            };
            let style = RHU.Style((style) => {
                let common = {
                    color: "aliceblue"
                };
                style.__style__ = {};
                style.button = {
                    __style__: {
                        display: "flex",
                        border: {
                            borderRadius: 1
                        }
                    },
                    text: {
                        __style__: {
                            display: "block"
                        }
                    },
                    ":hover": {
                        __style__: common
                    }
                };
                style.query = {
                    __type__: "MEDIA_QUERY",
                    __query__: "cringe",
                    mobile: {
                        __style__: common
                    }
                };
                return style;
            });
            console.log(style);
        }
    }));
})();
