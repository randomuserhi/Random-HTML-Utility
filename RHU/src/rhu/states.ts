import { isFunction } from "./utils";

interface Symbols {
    readonly state: unique symbol;
    readonly debug: unique symbol;
    readonly debugInfo: unique symbol;
    readonly valueOf: unique symbol;
}
const symbols: Symbols = {
    state: Symbol("RHU.State"),
    valueOf: Symbol("RHU.State.valueOf"),
    debug: Symbol("RHU.State.debug"),
    debugInfo: Symbol("RHU.State.debugInfo"),
} as Symbols;
const registerState = (state: State<any>, name?: string, debugInfo?: DebugInfo) => {
    const _state: any = state;
    _state[Symbol.toPrimitive] = state.valueOf;
    _state.toString = () => state.valueOf().toString();
    _state[Symbol.toStringTag] = "RHU.State";
    Object.defineProperty(_state, symbols.valueOf, {
        get() { return _state.valueOf(); },
    });
    _state[symbols.state] = name ? name : "[[RHU.State]]";
    
    _state[symbols.debugInfo] = debugInfo ? debugInfo : {
        sequence: [],
    };
    Object.defineProperty(_state, symbols.debug, {
        get() {
            const debugInfo: DebugInfo = _state[symbols.debugInfo];
            let logStr = "[[RHU.State]]";
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
            return _state[symbols.state]; 
        },
    });
};
export const isState = <T = any>(obj: any): obj is State<T> => true && obj[symbols.state];

interface DebugInfo {
    sequence: { prop: PropertyKey, args?: any[] }[];
}
export interface State<T> {
    readonly [symbols.state]: string;
    readonly [symbols.debug]: string;
    readonly [symbols.debugInfo]: DebugInfo;
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

const createState = <T>(expr: () => T, name?: string, debugInfo?: DebugInfo): State<T> => {
    // NOTE(randomuserhi): bind expression function to undefined to prevent
    //                     use of `this` in the expression.
    const unbound = expr.bind(undefined);
    const state: any = function(this: any, ...args: any[]): any {
        return _expr(() => (expr() as Function).call(this, ...args));
    };
    state.valueOf = unbound;
    registerState(state, name, debugInfo);
    return state;
};

// NOTE(randomuserhi): Props that get executed immediately -> no intermediate state
const immediateProps = new Set<PropertyKey>([
    Symbol.toPrimitive,
    ...Object.keys(symbols),
]);
// NOTE(randomuserhi): Props that only execute immediately when called as a function -> no intermediate function call state
const immediateFunctionalProps = new Set<PropertyKey>([
    "valueOf",
    "toString",
]);
const stateProxyHandler: ProxyHandler<any> = {
    get(parent, prop, receiver) {
        if (immediateProps.has(prop)) {
            return parent[prop];
        }

        const stateName = parent[symbols.state] + `.${String(prop)}`;
        const debugInfo: DebugInfo = {
            sequence: [...parent[symbols.debugInfo].sequence, {
                prop: prop,
            }],
        };
        const target = parent.valueOf();
        const value = target[prop];
        if (value instanceof Function) {
            // NOTE(randomuserhi): Special version of createState where the function call
            //                     correctly handles `this` property
            
            let state: any;
            if (immediateFunctionalProps.has(prop)) {
                state = function(this: any, ...args: any[]): any {
                    // NOTE(randomuserhi): Get latest target and value (in case of updates) 
                    const target = parent.valueOf();
                    const _this = this === receiver ? target : this;
                    return target[prop].call(_this, ...args); // return result immediately instead of an intermediate state
                };
            } else {
                state = function(this: any, ...args: any[]): any {
                    const debugInfo: DebugInfo = {
                        sequence: [...parent[symbols.debugInfo].sequence, {
                            prop: prop,
                            args: args,
                        }],
                    };
                    return _expr(() => {
                        // NOTE(randomuserhi): Get latest target and value (in case of updates) 
                        const target = parent.valueOf();
                        const _this = this === receiver ? target : this;
                        return target[prop].call(_this, ...args);
                    }, `${stateName}(${args})`, debugInfo); // return intermediate state as function call
                    // TODO(randomuserhi): truncante args to ... if it is too long in stateName
                };
            }
            state.valueOf = () => target[prop];
            registerState(state, stateName, debugInfo);

            // Return proxy to handler further chaining
            return new Proxy(state, stateProxyHandler);
        }
        return _expr(() => target[prop], stateName, debugInfo);
    }
};

const _expr = <T>(expr: () => T, name?: string, debugInfo?: DebugInfo): State<T> =>
    new Proxy(createState(expr, name, debugInfo), stateProxyHandler);

export const expr = <T>(expr: () => T): State<T> =>
    new Proxy(createState(expr), stateProxyHandler);

export const useState = <T>(init: T): [State<T>, SetState<T>] => {
    let value = init;
    const state: State<T> = _expr(() => value);
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