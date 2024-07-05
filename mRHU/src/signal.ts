import { WeakCollection } from "./weak";

const isDirty = Symbol("isDirty");

interface SignalEvent<T = any> {
    equals(other: T): boolean;
    on(callback: Callback<T>): Callback<T>;
    off(handle: Callback<T>): boolean;
}
const proto = {};

interface Signal<T = any> extends SignalEvent<T> {
    (): T;
    (value: T): T;
}

type Callback<T = any> = (value: T) => void;
type Equality<T = any> = (a: T, b: T) => boolean;

const dependencyMap = new WeakMap<SignalEvent, WeakCollection<Computed>>();
function markDirty(signal: SignalEvent) {
    const dependencies = dependencyMap.get(signal);
    if (dependencies === undefined) return;
    for (const computed of dependencies) {
        computed[isDirty] = true;
        markDirty(computed);
    }
}

export function isSignalType<T = any>(obj: any): obj is SignalEvent<T> {
    return Object.prototype.isPrototypeOf.call(proto, obj);
}

// NOTE(randomuserhi): pass into equality to always update signal regardless of if the value is equal or not
export const always: Equality = () => false;

// NOTE(randomuserhi): Exact same issue as React where if you change an object instead of treating it as immutable, the change does not propagate through the signal
//                     to change an object you need to pass a new object into the signal or repass the old reference with a custom equality operator
export function signal<T = any>(value: T, equality?: Equality<T>): Signal<T> {
    const ref = { value };
    const callbacks = new Set<Callback<T>>();
    const signal = function(...args: [T, ...any[]]) {
        if (args.length !== 0) {
            const [ value ] = args;
            if (
                (equality === undefined && ref.value !== value) || 
                (equality !== undefined && !equality(ref.value, value))
            ) {
                ref.value = value;
                markDirty(signal);
            }
        }
        return ref.value;
    } as Signal<T>;
    signal.on = function(callback: Callback<T>): Callback<T> {
        callbacks.add(callback);
        return callback;
    };
    signal.off = function(callback: Callback<T>): boolean {
        return callbacks.delete(callback);
    };
    signal.equals = function(other: T): boolean {
        if (equality === undefined) {
            return ref.value === other;
        }
        return equality(ref.value, other);
    };
    Object.setPrototypeOf(signal, proto);
    return signal;
}

interface Computed<T = any> extends SignalEvent<T> {
    (): T;
    [isDirty]: boolean;
}

export function computed<T = any>(expression: () => T, dependencies: Signal[], equality?: Equality<T>): Computed<T> {
    const ref: { value: T } = { value: undefined! };
    const callbacks = new Set<Callback<T>>();
    const computed = function() {
        if (computed[isDirty]) {
            ref.value = expression();
        }
        return ref.value;
    } as Computed<T>;
    computed.on = function(callback: Callback<T>): Callback<T> {
        callbacks.add(callback);
        return callback;
    };
    computed.off = function(callback: Callback<T>): boolean {
        return callbacks.delete(callback);
    };
    computed.equals = function(other: T): boolean {
        if (equality === undefined) {
            return ref.value === other;
        }
        return equality(ref.value, other);
    };
    (computed as any)[isDirty] = false;
    Object.setPrototypeOf(computed, proto);

    // Add computed to dependency map
    for (const signal of dependencies) {
        if (!dependencyMap.has(signal)) {
            dependencyMap.set(signal, new WeakCollection());
        }
        const dependencies = dependencyMap.get(signal)!;
        dependencies.add(computed);
    }

    return computed;
}