import { isFunction } from "./utils";

export interface State<T> {
    readonly [Symbol.toPrimitive]: () => T;
}

export interface SetState<T> {
    (setter: (old: T) => T): void;
    (value: T): void;
}

export const vof = <T>(state: State<T>) => state[Symbol.toPrimitive]();

const createState = <T>(expr: () => T): State<T> => {
    // NOTE(randomuserhi): bind expression function to undefined to prevent
    //                     use of `this` in the expression.
    const unbound = expr.bind(undefined);
    const state: any = function(this: any, ...args: any[]): any {
        return (expr() as Function).call(this, ...args);
    };
    state[Symbol.toPrimitive] = unbound;
    return state;
};

const stateProxyHandler: ProxyHandler<any> = {
    get(state, prop, receiver) {
        if (prop === Symbol.toPrimitive) {
            return state[Symbol.toPrimitive];
        }

        const target = vof(state as State<any>);
        const value = target[prop];
        if (value instanceof Function) {
            return createState(() => function(this: any, ...args: any[]) {
                return expr(() => {
                    // NOTE(randomuserhi): Get latest target and value (in case of updates) 
                    const target = vof(state as State<any>);
                    const value = target[prop];
                    const _this = this === receiver ? target : this;
                    return value.call(_this, ...args);
                }); // TODO(randomuserhi): This is meant to represent [[object StateFunctionCall]]
            });
        } else if (value instanceof Object) {
            return expr(() => target[prop]);
        }
        return createState(() => target[prop]);
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