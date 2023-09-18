define(["require", "exports", "./utils"], function (require, exports, utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.useState = exports.expr = exports.vof = exports.isState = void 0;
    const symbols = {
        state: Symbol("RHU.State"),
        value: Symbol("RHU.State.valueOf"),
    };
    const registerState = (state, name) => {
        const _state = state;
        _state[Symbol.toPrimitive] = state.valueOf;
        _state.toString = () => state.valueOf().toString();
        _state[Symbol.toStringTag] = "RHU.State";
        Object.defineProperty(_state, symbols.value, {
            get() { return _state.valueOf(); },
        });
        _state[symbols.state] = name ? name : "[[RHU.State]]";
    };
    const isState = (obj) => true && obj[symbols.state];
    exports.isState = isState;
    const vof = (state) => state.valueOf();
    exports.vof = vof;
    const createState = (_expr, name) => {
        const unbound = _expr.bind(undefined);
        const state = function (...args) {
            return (0, exports.expr)(() => _expr().call(this, ...args));
        };
        state.valueOf = unbound;
        registerState(state, name);
        return state;
    };
    const stateProxyHandler = {
        get(parent, prop, receiver) {
            if (prop === "valueOf" || prop === Symbol.toPrimitive || prop === symbols.state || prop === symbols.value) {
                return parent[prop];
            }
            const stateName = parent[symbols.state] + `.${String(prop)}`;
            const target = parent.valueOf();
            const value = target[prop];
            if (value instanceof Function) {
                const state = function (...args) {
                    return (0, exports.expr)(() => {
                        const target = parent.valueOf();
                        const _this = this === receiver ? target : this;
                        return target[prop].call(_this, ...args);
                    }, `${stateName}()`);
                };
                state.valueOf = () => target[prop];
                registerState(state, stateName);
                return new Proxy(state, stateProxyHandler);
            }
            return (0, exports.expr)(() => target[prop], stateName);
        }
    };
    const expr = (expr, name) => new Proxy(createState(expr, name), stateProxyHandler);
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
