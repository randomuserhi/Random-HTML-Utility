(function () {
    // Core Implementation for initial import
    let core;
    (function (core) {
        core = {
            exists: function (object) {
                return object !== null && object !== undefined;
            },
            parseOptions: function (template, opt) {
                if (!this.exists(opt))
                    return template;
                if (!this.exists(template))
                    return template;
                let result = template;
                Object.assign(result, opt);
                return result;
            },
            dependencies: function (options) {
                let opt = {
                    hard: [],
                    soft: [],
                    trace: undefined
                };
                this.parseOptions(opt, options);
                let check = (items) => {
                    let has = [];
                    let missing = [];
                    let set = {};
                    for (let path of items) {
                        if (core.exists(set[path]))
                            continue;
                        set[path] = true;
                        let traversal = path.split(".");
                        let obj = window;
                        for (; traversal.length !== 0 && this.exists(obj); obj = obj[traversal.shift()]) {
                            // Not needed body, since for loop handles traversal
                        }
                        if (this.exists(obj))
                            has.push(path);
                        else
                            missing.push(path);
                    }
                    return {
                        has: has,
                        missing: missing
                    };
                };
                let hard = check(opt.hard);
                let soft = check(opt.soft);
                // TODO(randomuserhi): Returns dependencies that were available at the moment of module execution
                //                     Since the dependencies that are actually available at the current point in time
                //                     may change (soft dependencies), use RHU.exists to determine if it exists or not. 
                return {
                    hard: hard,
                    soft: soft,
                    trace: opt.trace
                };
            },
            path: {
                // Adapted from: https://stackoverflow.com/a/55142565/9642458
                join: function (...paths) {
                    //NOTE(randomuserhi): Assumes '/' seperator, errors will occure when '\' is used.
                    const separator = "/";
                    paths = paths.map((part, index) => {
                        if (index)
                            part = part.replace(new RegExp("^" + separator), "");
                        if (index !== paths.length - 1)
                            part = part.replace(new RegExp(separator + "$"), "");
                        return part;
                    });
                    return paths.join(separator);
                },
                // NOTE(randomuserhi): Uses POSIX standard, so '/file' is an absolute path.
                isAbsolute: function (path) {
                    return /^([a-z]+:)?[\\/]/i.test(path);
                }
            }
        };
    })(core);
    // Check for dependencies
    let result = core.dependencies({
        hard: [
            "document.createElement",
            "document.head",
            "document.createTextNode",
            "window.Function",
            "Map",
            "Set",
            "Reflect"
        ]
    });
    if (result.hard.missing.length !== 0) {
        let msg = `RHU was unable to import due to missing dependencies.`;
        if (core.exists(result.trace))
            msg += `\n${result.trace.stack.split("\n").splice(1).join("\n")}\n`;
        for (let dependency of result.hard.missing) {
            msg += (`\n\tMissing '${dependency}'`);
        }
        console.error(msg);
        return;
    }
    // RHU implementation
    (function () {
        window.RHU = {
            test: ""
        };
    })();
})();
