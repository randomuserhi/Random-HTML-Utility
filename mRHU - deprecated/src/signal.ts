
export interface SignalEvent<T = any> {
    (): T;
    equals(other: T): boolean;
    on(callback: Callback<T>, options?: { signal?: AbortSignal, condition?: () => boolean }): Callback<T>;
    off(handle: Callback<T>): boolean;
    release(): void;
    check(): number;
    string: (value: T) => string;
}
const proto = {};

const noStringOp = (v: any) => `${v}`;

export interface Signal<T> extends SignalEvent<T> {
    (value: T): T;
    guard?: (newValue: T, oldValue: T) => T;
}

type Callback<T> = (value: T) => void;
type Equality<T> = (a?: T, b?: T) => boolean;

export const isSignal: <T>(obj: any) => obj is SignalEvent<T> = Object.prototype.isPrototypeOf.bind(proto);

// NOTE(randomuserhi): pass into equality to always update signal regardless of if the value is equal or not
export const always: Equality<any> = () => false;

// NOTE(randomuserhi): Exact same issue as React where if you change an object instead of treating it as immutable, the change does not propagate through the signal
//                     to change an object you need to pass a new object into the signal or repass the old reference with a custom equality operator
export function signal<T>(value: T, equality?: Equality<T>): Signal<T> {
    const ref = { value };
    const callbacks = {
        value: new Map<Callback<T>, undefined | (() => boolean)>(), 
        buffer: new Map<Callback<T>, undefined | (() => boolean)>()
    };
    const signal = function(...args: [T, ...any[]]) {
        if (args.length !== 0) {
            let [ value ] = args;
            if (signal.guard !== undefined) {
                value = signal.guard(value, ref.value);
            }
            if (
                (equality === undefined && ref.value !== value) || 
                (equality !== undefined && !equality(ref.value, value))
            ) {
                // Get any effects that depend on this signal
                const dependencies = dependencyMap.get(signal);
                
                // Call destructors PRIOR updating the internal value
                // destructors should run accessing the old value of the updating signal
                if (dependencies !== undefined) {
                    for (const effect of dependencies) {
                        for (const destructor of effect[destructors]) {
                            destructor();
                        }
                    }
                }

                // Update value and trigger regular callbacks
                ref.value = value;
                for (const [callback, condition] of callbacks.value) {
                    if (condition !== undefined && !condition()) {
                        continue;
                    }
                    callback(ref.value);
                    callbacks.buffer.set(callback, condition);
                }
                callbacks.value.clear();
                const temp = callbacks.buffer;
                callbacks.buffer = callbacks.value;
                callbacks.value = temp;

                // Trigger effect dependencies AFTER updating internal value
                if (dependencies !== undefined) {
                    for (const effect of dependencies) {
                        effect();
                    }
                }
            }
        }
        return ref.value;
    } as Signal<T>;
    signal.on = function(callback, options): Callback<T> {
        if (!callbacks.value.has(callback)) {
            // Check condition, if it fails, don't even add callback
            if (options?.condition !== undefined && !options.condition()) {
                return callback;
            }

            callback(ref.value);
            callbacks.value.set(callback, options?.condition);
            if (options?.signal !== undefined) {
                options.signal.addEventListener("abort", () => callbacks.value.delete(callback), { once: true });
            }
        }
        return callback;
    };
    signal.off = function(callback): boolean {
        return callbacks.value.delete(callback);
    };
    signal.equals = function(other): boolean {
        if (equality === undefined) {
            return ref.value === other;
        }
        return equality(ref.value, other);
    };
    signal.release = function() {
        callbacks.value.clear();
        callbacks.buffer.clear();
    };
    signal.check = function() {
        for (const [callback, condition] of callbacks.value) {
            if (condition !== undefined && !condition()) {
                continue;
            }
            callbacks.buffer.set(callback, condition);
        }
        callbacks.value.clear();
        const temp = callbacks.buffer;
        callbacks.buffer = callbacks.value;
        callbacks.value = temp;

        return callbacks.value.size;
    };
    signal.string = noStringOp;
    (signal as any)[Symbol.toPrimitive] = function(hint: "string" | "number" | "default") {
        if ((ref.value as any)[Symbol.toPrimitive]) {
            return (ref.value as any)[Symbol.toPrimitive](hint);
        } else {
            return ref.value;
        }
    };
    Object.setPrototypeOf(signal, proto);
    return signal;
}

const destructors = Symbol("effect.destructors");
export interface Effect {
    (): void;
    [destructors]: (() => void)[];
    release(): void;
    check(): boolean;
}

const effectProto = {};
Object.setPrototypeOf(effectProto, proto);
export const isEffect: (obj: any) => obj is Effect = Object.prototype.isPrototypeOf.bind(effectProto);

export function effect(expression: () => ((() => void) | void), dependencies: SignalEvent[], options?: { signal?: AbortSignal, condition?: () => boolean }): Effect {
    const effect = function() {
        // Check guard
        if (!effect.check()) return;

        // Clear destructors
        effect[destructors] = [];

        // Execute effect
        const destructor = expression();
        if (destructor !== undefined) {
            effect[destructors].push(destructor);
        }
    } as Effect;

    // Add effect to dependency map
    let deps: WeakRef<Set<Effect>>[] | undefined = [];
    for (const signal of dependencies) {
        if (isEffect(signal)) throw new Error("Effect cannot be used as a dependency.");
        if (!dependencyMap.has(signal)) {
            dependencyMap.set(signal, new Set());
        }
        const dependency = dependencyMap.get(signal)!;
        dependency.add(effect);

        // Keep track of all dependencies this effect is attached to
        deps.push(new WeakRef(dependency));
    }

    effect.release = function() {
        if (deps === undefined) return;
        for (const ref of deps) {
            ref.deref()?.delete(effect);
        }
        deps = undefined;
    };

    effect.check = function() {
        if (options?.condition !== undefined) {
            if (!options.condition()) {
                effect.release();
                return false;
            }
        }
        return true;
    };

    Object.setPrototypeOf(effect, effectProto);

    if (options?.signal !== undefined) {
        options.signal.addEventListener("abort", () => {
            effect.release();
        }, { once: true });
    }

    // Execute effect for the first time
    effect();

    return effect;
}
const dependencyMap = new WeakMap<SignalEvent, Set<Effect>>();

export interface Computed<T> extends SignalEvent<T> {
    (): T;
    effect: Effect;
}

export function computed<T>(expression: (set: Signal<T>) => ((() => void) | void), dependencies: SignalEvent[], equality?: Equality<T>, options?: { signal?: AbortSignal, guard?: () => boolean }): Computed<T> {
    const value = signal(undefined as T, equality);
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
    computed.effect = effect(() => expression(value), dependencies, options);
    computed.release = computed.effect.release;
    computed.check = function() {
        if (!computed.effect.check()) {
            value.release();
        }
        return value.check();
    };
    computed.string = noStringOp;
    (computed as any)[Symbol.toPrimitive] = function(hint: "string" | "number" | "default") {
        return (value as any)[Symbol.toPrimitive](hint);
    };
    Object.setPrototypeOf(computed, proto);

    return computed;
}