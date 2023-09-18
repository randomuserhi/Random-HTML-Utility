import { isFunction } from "./utils";

export interface State<T> {
    readonly [Symbol.toPrimitive]: () => T;
}

export interface SetState<T> {
    (setter: (old: T) => T): void;
    (value: T): void;
}

export const vof = <T>(state: State<T>) => state.valueOf();

/*// Patch function calls to auto-convert states values
const prefix = <T, P extends keyof T>(obj: T, prop: P, prefix: (...args: any[]) => any[]) => {
    if (!(obj[prop] instanceof Function)) {
        throw new TypeError(`.${String(prop)} must be a function.`);
    }
    if ((obj[prop] as any).patched) {
        return;
    }

    const original = obj[prop];
    const patch: any = function(this: any, ...args: any[]) {
        console.log(`${String(prop)}:`);
        console.log(args);
        obj[prop] = original;
        const result = this[prop](...prefix(...args));
        obj[prop] = patch;
        return result;
    };
    patch.patched = true; // change to local symbol?
    obj[prop] = patch;
};

// Patch function calls to auto-convert states values
const __prefix = (...args: any) => {
    return args.map((a: any) => { 
        if (a === undefined || a === null) {
            return a;
        }
        
        // TODO(randomuserhi): check if any args are states and do valueOf only if they are a state
        return a.valueOf();
    })
};
prefix(Function.prototype, "call", __prefix);
prefix(Function.prototype, "apply", __prefix);
prefix(Function.prototype, "bind", __prefix);*/

const createState = <T>(_expr: () => T): State<T> => {
    // NOTE(randomuserhi): bind expression function to undefined to prevent
    //                     use of `this` in the expression.
    const unbound = _expr.bind(undefined);
    const state: any = function(this: any, ...args: any[]): any {
        return expr(() => (_expr() as Function).call(this, ...args));
    };
    state.valueOf = unbound;
    state[Symbol.toPrimitive] = state.valueOf;
    return state;
};

const stateProxyHandler: ProxyHandler<any> = {
    get(parent, prop, receiver) {
        if (prop === "valueOf" || prop === Symbol.toPrimitive) {
            return parent[prop];
        }

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
                }); // TODO(randomuserhi): This is meant to represent [[object StateFunctionCall]]
            };
            state.valueOf = () => target[prop];
            state[Symbol.toPrimitive] = state.valueOf;

            // Return proxy to handler further chaining
            return new Proxy(state, stateProxyHandler);
        }
        return expr(() => target[prop]);
    }
};

export const expr = <T>(expr: () => T): State<T> =>
    new Proxy(createState(expr), stateProxyHandler); // TODO(randomuserhi): This is meant to represent [[object StateObject]]

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