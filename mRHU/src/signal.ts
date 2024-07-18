
interface SignalEvent<T = any> {
    (): T;
    equals(other: T): boolean;
    on(callback: Callback<T>, options?: { signal?: AbortSignal }): Callback<T>;
    off(handle: Callback<T>): boolean;
}
const proto = {};

export interface Signal<T> extends SignalEvent<T> {
    (value: T): T;
    guard?: (value: T) => T;
}

type Callback<T> = (value: T) => void;
type Equality<T> = (a: T, b: T) => boolean;

export const isSignal: <T>(obj: any) => obj is SignalEvent<T> = Object.prototype.isPrototypeOf.bind(proto);

// NOTE(randomuserhi): pass into equality to always update signal regardless of if the value is equal or not
export const always: Equality<any> = () => false;

// NOTE(randomuserhi): Exact same issue as React where if you change an object instead of treating it as immutable, the change does not propagate through the signal
//                     to change an object you need to pass a new object into the signal or repass the old reference with a custom equality operator
export function signal<T>(value: T, equality?: Equality<T>): Signal<T> {
    const ref = { value };
    const callbacks = new Set<Callback<T>>();
    const signal = function(...args: [T, ...any[]]) {
        if (args.length !== 0) {
            let [ value ] = args;
            if (signal.guard !== undefined) {
                value = signal.guard(value);
            }
            if (
                (equality === undefined && ref.value !== value) || 
                (equality !== undefined && !equality(ref.value, value))
            ) {
                ref.value = value;
                for (const callback of callbacks) {
                    callback(ref.value);
                }
                triggerEffects(signal);
            }
        }
        return ref.value;
    } as Signal<T>;
    signal.on = function(callback, options): Callback<T> {
        if (!callbacks.has(callback)) {
            callback(ref.value);
            callbacks.add(callback);
            if (options?.signal !== undefined) {
                options.signal.addEventListener("abort", () => callbacks.delete(callback), { once: true });
            }
        }
        return callback;
    };
    signal.off = function(callback): boolean {
        return callbacks.delete(callback);
    };
    signal.equals = function(other): boolean {
        if (equality === undefined) {
            return ref.value === other;
        }
        return equality(ref.value, other);
    };
    Object.setPrototypeOf(signal, proto);
    return signal;
}

export interface Effect {
    (): void;
}

const effectProto = {};
Object.setPrototypeOf(effectProto, proto);
export const isEffect: (obj: any) => obj is Effect = Object.prototype.isPrototypeOf.bind(effectProto);

export function effect(expression: () => void, dependencies: SignalEvent[], options?: { signal?: AbortSignal }): Effect {
    expression();
    const effect = function() {
        expression();
    } as Effect;
    Object.setPrototypeOf(effect, effectProto);

    // Add effect to dependency map
    for (const signal of dependencies) {
        if (isEffect(signal)) throw new Error("Effect cannot be used as a dependency.");
        if (!dependencyMap.has(signal)) {
            dependencyMap.set(signal, new Set());
        }
        const dependency = dependencyMap.get(signal)!;
        dependency.add(effect);
        
        if (options?.signal !== undefined) {
            options.signal.addEventListener("abort", () => dependency.delete(effect), { once: true });
        }
    }

    return effect;
}
const dependencyMap = new WeakMap<SignalEvent, Set<Effect>>();
function triggerEffects(signal: SignalEvent) {
    const dependencies = dependencyMap.get(signal);
    if (dependencies === undefined) return;
    for (const effect of dependencies) {
        effect();
    }
}

export interface Computed<T> extends SignalEvent<T> {
    (): T;
    effect: Effect;
}

export function computed<T>(expression: () => T, dependencies: SignalEvent[], equality?: Equality<T>): Computed<T> {
    const value = signal(expression(), equality);
    const computed = function() {
        return value();
    } as Computed<T>;
    computed.on = function(callback, options): Callback<T> {
        value.on(callback, options);
        return callback;
    };
    computed.off = function(callback): boolean {
        return value.off(callback);
    };
    computed.equals = function(other): boolean {
        return value.equals(other);
    };
    computed.effect = effect(() => value(expression()), dependencies);
    Object.setPrototypeOf(computed, proto);

    return computed;
}