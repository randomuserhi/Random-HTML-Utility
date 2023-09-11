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
            let propHandler = function (target, prop, newValue, options) {
                let opt = {
                    enter: undefined,
                    exit: undefined,
                };
                RHU.parseOptions(opt, options);
                let stack = {
                    prop: prop,
                    value: undefined,
                };
                propStack.push(stack);
                if (RHU.exists(opt.enter))
                    opt.enter(stack.prop, stack.value);
                if (typeof newValue === 'object' && newValue !== null) {
                    if (!RHU.exists(target[prop])) {
                        if ((typeof prop === 'string' || prop instanceof String)
                            && /__[_$a-zA-Z0-9]*__/g.test(prop)) {
                            stack.value = newValue;
                        }
                        else {
                            stack.value = new Proxy({}, styleHandler);
                            for (let [key, value] of Object.entries(newValue)) {
                                stack.value[key] = value;
                            }
                            if (RHU.exists(opt.exit))
                                opt.exit(stack.prop, stack.value);
                        }
                    }
                    target[prop] = stack.value;
                }
                else {
                    stack.value = newValue;
                    target[prop] = stack.value;
                }
                propStack.pop();
                return true;
            };
            let styleHandler = {
                set: function (target, prop, newValue) {
                    return propHandler(target, prop, newValue, {
                        exit: (prop, value) => {
                            console.log(`exit ${String(prop)}`);
                            console.log(value);
                        }
                    });
                }
            };
            let Style = RHU.Style = function (generator) {
                let style = {};
                let proxy = new Proxy(style, styleHandler);
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
                    },
                    nested: {
                        __type__: "MEDIA_QUERY",
                        __query__: "cringe",
                    }
                };
                return style;
            });
            console.log(style);
        }
    }));
})();
