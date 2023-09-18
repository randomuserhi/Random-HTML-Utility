define(["require", "exports", "./utils"], function (require, exports, utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.useState = exports.expr = exports.vof = void 0;
    const vof = (state) => state[Symbol.toPrimitive]();
    exports.vof = vof;
    const createState = (expr) => {
        const unbound = expr.bind(undefined);
        const state = function (...args) {
            return expr().call(this, ...args);
        };
        state[Symbol.toPrimitive] = unbound;
        return state;
    };
    const stateProxyHandler = {
        get(state, prop, receiver) {
            if (prop === Symbol.toPrimitive) {
                return state[Symbol.toPrimitive];
            }
            const target = (0, exports.vof)(state);
            const value = target[prop];
            if (value instanceof Function) {
                return createState(() => function (...args) {
                    return (0, exports.expr)(() => {
                        const target = (0, exports.vof)(state);
                        const value = target[prop];
                        const _this = this === receiver ? target : this;
                        return value.call(_this, ...args);
                    });
                });
            }
            else if (value instanceof Object) {
                return (0, exports.expr)(() => target[prop]);
            }
            return createState(() => target[prop]);
        }
    };
    const expr = (expr) => new Proxy(createState(expr), stateProxyHandler);
    exports.expr = expr;
    const useState = (init) => {
        let value = init;
        const state = (0, exports.expr)(() => value);
        const setState = (setter) => {
            if ((0, utils_1.isFunction)(setter)) {
                value = setter(value);
            }
            else {
                value = setter;
            }
        };
        return [state, setState];
    };
    exports.useState = useState;
});
