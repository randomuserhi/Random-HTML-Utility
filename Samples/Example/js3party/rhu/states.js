define(["require", "exports", "./utils"], function (require, exports, utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.useState = exports.debug = exports.expr = exports.vof = exports.isState = void 0;
    const symbols = {
        state: Symbol("RHU.State"),
        valueOf: Symbol("RHU.State.valueOf"),
        debug: Symbol("RHU.State.debug"),
        debugInfo: Symbol("RHU.State.debugInfo"),
    };
    const registerState = (state, name, debugInfo) => {
        const _state = state;
        _state[Symbol.toPrimitive] = state.valueOf;
        _state.toString = () => state.valueOf().toString();
        _state[Symbol.toStringTag] = "RHU.State";
        Object.defineProperty(_state, symbols.valueOf, {
            get() { return _state.valueOf(); },
        });
        _state[symbols.state] = name ? name : "[[RHU.State]]";
        _state[symbols.debugInfo] = debugInfo ? debugInfo : {
            sequence: [{
                    prop: "[[RHU.State]]",
                }],
        };
        _state[symbols.debug] = () => {
            const debugInfo = _state[symbols.debugInfo];
            let logStr = "";
            let objects = [];
            for (const { prop, args } of debugInfo.sequence) {
                const functionCall = args !== undefined;
                const hasArgs = functionCall && args.length !== 0;
                logStr += `.${String(prop)}${functionCall ? hasArgs ? "(%o)" : "()" : ""}`;
                if (functionCall && hasArgs) {
                    objects.push(args);
                }
            }
            console.log(logStr, ...objects);
        };
    };
    const isState = (obj) => true && obj[symbols.state];
    exports.isState = isState;
    const vof = (state) => state.valueOf();
    exports.vof = vof;
    const createState = (expr, name, debugInfo) => {
        const unbound = expr.bind(undefined);
        const state = function (...args) {
            const sequence = [...state[symbols.debugInfo].sequence];
            sequence[sequence.length - 1].args = args;
            return _expr(() => unbound().call(this, ...args), `${state[symbols.state]}(${args})`, {
                sequence: sequence,
            });
        };
        state.valueOf = unbound;
        registerState(state, name, debugInfo);
        return state;
    };
    const immediateProps = new Set([
        Symbol.toPrimitive,
        "valueOf",
        ...Object.values(symbols),
    ]);
    const immediateFunctionalProps = new Set([]);
    const stateProxyHandler = {
        construct(target, args) {
            return _expr(() => new (target.valueOf())(...args), `${target[symbols.state]}.[[construct]](${args})`, {
                sequence: [...target[symbols.debugInfo].sequence, {
                        prop: "[[construct]]",
                        args: args,
                    }],
            });
        },
        get(parent, prop, receiver) {
            if (immediateProps.has(prop)) {
                return parent[prop];
            }
            const stateName = parent[symbols.state] + `.${typeof prop === "symbol" ? `[[${String(prop)}]]` : String(prop)}`;
            const debugInfo = {
                sequence: [...parent[symbols.debugInfo].sequence, {
                        prop: prop,
                    }],
            };
            const target = parent.valueOf();
            const value = target[prop];
            if (value instanceof Function) {
                let state;
                if (immediateFunctionalProps.has(prop)) {
                    state = function (...args) {
                        const target = parent.valueOf();
                        const _this = this === receiver ? target : this;
                        return target[prop].call(_this, ...args);
                    };
                }
                else {
                    state = function (...args) {
                        const debugInfo = {
                            sequence: [...parent[symbols.debugInfo].sequence, {
                                    prop: prop,
                                    args: args,
                                }],
                        };
                        return _expr(() => {
                            const target = parent.valueOf();
                            const _this = this === receiver ? target : this;
                            return target[prop].call(_this, ...args);
                        }, `${stateName}(${args})`, debugInfo);
                    };
                }
                state.valueOf = () => target[prop];
                registerState(state, stateName, debugInfo);
                return new Proxy(state, stateProxyHandler);
            }
            return _expr(() => target[prop], stateName, debugInfo);
        }
    };
    const _expr = (expr, name, debugInfo) => new Proxy(createState(expr, name, debugInfo), stateProxyHandler);
    const expr = (expr) => new Proxy(createState(expr), stateProxyHandler);
    exports.expr = expr;
    const debug = (state) => {
        if (state[symbols.debug]) {
            state[symbols.debug]();
        }
        else {
            console.warn(`'${String(state)}' is not a [[RHU.State]]`);
        }
    };
    exports.debug = debug;
    const useState = (init) => {
        let value = init;
        const state = _expr(() => value);
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
