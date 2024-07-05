interface SignalEvent<T = any> {
    equals(other: T): boolean;
    on(callback: Callback<T>): Callback<T>;
    off(handle: Callback<T>): boolean;
}

interface Signal<T = any> extends SignalEvent<T> {
    (): T;
    (value: T): T;
}

type Callback<T> = (value: T) => void;
type Equality<T> = (a: T, b: T) => boolean;

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

                // TODO(randomuserhi): change event and trigger reaction across signals and computes
            }
        }
        return ref.value;
    };
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
    return signal as Signal<T>;
}

interface Computed<T = any> extends SignalEvent<T> {
    (): T;
}

export function computed<T = any>(expression: () => T, equality?: Equality<T>): Computed<T> {
    // TODO(randomuserhi);
    throw new Error("Not implemented.");
}