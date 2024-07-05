import { WeakCollection } from "./weak.js";

const _isDirty = Symbol("isDirty");
const _callbacks = Symbol("callbacks");

interface SignalEvent<T = any> {
    (): T;
    equals(other: T): boolean;
    on(callback: Callback<T>): Callback<T>;
    off(handle: Callback<T>): boolean;
}
const proto = {};

export interface Signal<T = any> extends SignalEvent<T> {
    (value: T): T;
}

type Callback<T = any> = (value: T) => void;
type Equality<T = any> = (a: T, b: T) => boolean;

const dependencyMap = new WeakMap<SignalEvent, WeakCollection<Computed>>();
const dirtySet = new Set<Computed>();
function markDirty(signal: SignalEvent, root: boolean = true) {
    const dependencies = dependencyMap.get(signal);
    if (dependencies === undefined) return;
    for (const computed of dependencies) {
        computed[_isDirty] = true;
        dirtySet.add(computed);
        markDirty(computed, false);
    }

    if (root) {
        for (const dirty of dirtySet) {
            for (const callback of dirty[_callbacks]) {
                callback(dirty());
            }
        }
        dirtySet.clear();
    }
}
(globalThis as any).signals = dependencyMap;

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
                for (const callback of callbacks) {
                    callback(ref.value);
                }
                markDirty(signal);
            }
        }
        return ref.value;
    } as Signal<T>;
    signal.on = function(callback: Callback<T>): Callback<T> {
        if (!callbacks.has(callback)) {
            callback(ref.value);
            callbacks.add(callback);
        }
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

export interface Computed<T = any> extends SignalEvent<T> {
    [_isDirty]: boolean;
    [_callbacks]: Set<Callback<T>>;
}

export function computed<T = any>(expression: () => T, dependencies: Signal[], equality?: Equality<T>): Computed<T> {
    const ref: { value: T } = { value: undefined! };
    const callbacks = new Set<Callback<T>>();
    const computed = function() {
        if (computed[_isDirty]) {
            ref.value = expression();
        }
        return ref.value;
    } as Computed<T>;
    computed.on = function(callback: Callback<T>): Callback<T> {
        if (!callbacks.has(callback)) {
            callback(computed());
            callbacks.add(callback);
        }
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
    computed[_isDirty] = false;
    computed[_callbacks] = callbacks;
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