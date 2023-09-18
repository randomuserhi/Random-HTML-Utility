define(["require", "exports", "./utils"], function (require, exports, utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.useState = exports.expr = exports.withStates = exports.vof = void 0;
    const vof = (state) => state.valueOf();
    exports.vof = vof;
    const prefix = (obj, prop, prefix) => {
        if (!(obj[prop] instanceof Function)) {
            throw new TypeError(`.${String(prop)} must be a function.`);
        }
        if (obj[prop].patched) {
            throw new TypeError(`.${String(prop)} is already patched.`);
        }
        const original = obj[prop];
        const patch = function (...args) {
            console.log(`${String(prop)}:`);
            console.log(args);
            obj[prop] = original;
            const result = this[prop](...prefix(...args));
            obj[prop] = patch;
            return result;
        };
        patch.patched = true;
        obj[prop] = patch;
        return original;
    };
    const __prefix = (...args) => {
        return args.map((a) => {
            if (a === undefined || a === null) {
                return a;
            }
            return a.valueOf();
        });
    };
    const withStates = (expr) => {
        const __Function_call = prefix(Function.prototype, "call", __prefix);
        const __Function_apply = prefix(Function.prototype, "apply", __prefix);
        const __Function_bind = prefix(Function.prototype, "bind", __prefix);
        expr();
        Function.prototype.call = __Function_call;
        Function.prototype.apply = __Function_apply;
        Function.prototype.bind = __Function_bind;
    };
    exports.withStates = withStates;
    const createState = (_expr) => {
        const unbound = _expr.bind(undefined);
        const state = function (...args) {
            return (0, exports.expr)(() => _expr().call(this, ...args));
        };
        state.valueOf = unbound;
        state[Symbol.toPrimitive] = state.valueOf;
        return state;
    };
    const stateProxyHandler = {
        get(parent, prop, receiver) {
            if (prop === "valueOf" || prop === Symbol.toPrimitive) {
                return parent[prop];
            }
            const target = parent.valueOf();
            const value = target[prop];
            if (value instanceof Function) {
                const state = function (...args) {
                    return (0, exports.expr)(() => {
                        const target = parent.valueOf();
                        const _this = this === receiver ? target : this;
                        return target[prop].call(_this, ...args);
                    });
                };
                state.valueOf = () => target[prop];
                state[Symbol.toPrimitive] = state.valueOf;
                return new Proxy(state, stateProxyHandler);
            }
            return (0, exports.expr)(() => target[prop]);
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
