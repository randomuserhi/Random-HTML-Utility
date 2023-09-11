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
                let ctx = {
                    prop: prop,
                    value: undefined,
                };
                propStack.push(ctx);
                if (typeof newValue === 'object' && newValue !== null) {
                    if (!RHU.exists(target[prop])) {
                        if ((typeof prop === 'string' || prop instanceof String)
                            && /__[_$a-zA-Z0-9]*__/g.test(prop)) {
                            ctx.value = newValue;
                        }
                        else {
                            ctx.value = new Proxy({}, styleHandler);
                            if (RHU.exists(opt.enter))
                                opt.enter(ctx.prop);
                            for (let [key, value] of Object.entries(newValue)) {
                                ctx.value[key] = value;
                            }
                            if (RHU.exists(opt.exit))
                                opt.exit(ctx.prop, ctx.value);
                        }
                    }
                    target[prop] = ctx.value;
                }
                else {
                    ctx.value = newValue;
                    target[prop] = ctx.value;
                }
                propStack.pop();
                return true;
            };
            let styleHandler = {
                set: function (target, prop, newValue) {
                    return propHandler(target, prop, newValue, {
                        enter: (prop) => {
                            console.log(`enter ${String(prop)}`);
                        },
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
