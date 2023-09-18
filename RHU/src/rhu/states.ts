import { isFunction } from "./utils";

interface Symbols {
    readonly state: unique symbol;
    readonly valueOf: unique symbol;
}
const symbols: Symbols = {
    state: Symbol("RHU.State"),
    valueOf: Symbol("RHU.State.valueOf"),
} as Symbols;
const registerState = (state: State<any>, name?: string) => {
    const _state: any = state;
    _state[Symbol.toPrimitive] = state.valueOf;
    _state.toString = () => state.valueOf().toString();
    _state[Symbol.toStringTag] = "RHU.State";
    Object.defineProperty(_state, symbols.valueOf, {
        get() { return _state.valueOf(); },
    });
    _state[symbols.state] = name ? name : "[[RHU.State]]";
};
export const isState = <T = any>(obj: any): obj is State<T> => true && obj[symbols.state];

export interface State<T> {
    readonly [symbols.state]: string;
    readonly [symbols.valueOf]: T;
    readonly [Symbol.toPrimitive]: () => T;
    readonly [Symbol.toStringTag]: string;
    readonly toString: () => T;
    readonly valueOf: () => T;
}

export interface SetState<T> {
    (setter: (old: T) => T): void;
    (value: T): void;
}

export const vof = <T>(state: State<T>) => state.valueOf();

const createState = <T>(_expr: () => T, name?: string): State<T> => {
    // NOTE(randomuserhi): bind expression function to undefined to prevent
    //                     use of `this` in the expression.
    const unbound = _expr.bind(undefined);
    const state: any = function(this: any, ...args: any[]): any {
        return expr(() => (_expr() as Function).call(this, ...args));
    };
    state.valueOf = unbound;
    registerState(state, name);
    return state;
};

const stateProxyHandler: ProxyHandler<any> = {
    get(parent, prop, receiver) {
        if (prop === "valueOf" || prop === Symbol.toPrimitive || prop === symbols.state || prop === symbols.valueOf) {
            return parent[prop];
        }

        const stateName = parent[symbols.state] + `.${String(prop)}`;
        const target = parent.valueOf();
        const value = target[prop];
        if (value instanceof Function) {
            // NOTE(randomuserhi): Special version of createState where the function call
            //                     correctly handles `this` property

            // NOTE(randomuserhi): bind expression function to undefined to prevent
            //                     use of `this` in the expression.
            const state: any = function(this: any, ...args: any[]): any {
                return expr(() => {
                    // NOTE(randomuserhi): Get latest target and value (in case of updates) 
                    const target = parent.valueOf();
                    const _this = this === receiver ? target : this;
                    return target[prop].call(_this, ...args);
                }, `${stateName}()`);
            };
            state.valueOf = () => target[prop];
            registerState(state, stateName);

            // Return proxy to handler further chaining
            return new Proxy(state, stateProxyHandler);
        }
        return expr(() => target[prop], stateName);
    }
};

export const expr = <T>(expr: () => T, name?: string): State<T> =>
    new Proxy(createState(expr, name), stateProxyHandler);

export const useState = <T>(init: T): [State<T>, SetState<T>] => {
    let value = init;
    const state: State<T> = expr(() => value);
    const setState: SetState<T> = (setter) => {
        if (isFunction(setter)) {
            value = setter(value);
        } else {
            value = setter;
        }
        // Some function that handles updating post state change
        // this can be calling events (state.onChange, state.addEventListener("change"))
        // or triggering changes in HTML DOM elements that contain state in their props or content idk...
        // triggerStateUpdate(state);
    }
    return [state, setState];
};