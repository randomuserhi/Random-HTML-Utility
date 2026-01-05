/// signal.ts 
///
/// @randomuserhi

/** Type representing a signal callback for type `T` */
type Callback<T> = (value: T) => void;

/** Type representing an equality check between 2 objects of type `T` */
type Equality<T> = (a?: T, b?: T) => boolean;

/** Common interface shared by all signals */
export interface SignalBase<T = any> {
    /** @returns Value stored within the signal */
    (): T;

    /** toPrimitive conversion for type coercion. Typically just returns the stored internal value. */
    [Symbol.toPrimitive](hint: "string" | "number" | "default"): any;

    /**
     * Check if the value within the signal equals another according to
     * its equality function.
     *
     * @param other Value to compare.
     * @returns True if the value of the signal matches, otherwise false.
     */
    equals(other: T): boolean;

    /**
     * Trigger `callback` when the signal value changes.
     *
     * @param callback The callback to be triggered.
     * 
     * @param options.signal An AbortSignal which when triggered will automatically remove this callback from the signal.
     * 
     * @param options.condition A user provided function that when returns true, will remove this callback from the signal.
     *                          This condition is only checked on state changes to the signal (writes, not reads).
     *                          This includes memoization such that writing the same value to the signal also will not trigger a guard check.
     * 
     * @returns the callback given - which is used as the handle when removing callbacks.
     */
    on(callback: Callback<T>, options?: { signal?: AbortSignal, condition?: () => boolean }): Callback<T>;

    /** Remove the provided `callback` from the signal. */
    off(handle: Callback<T>): boolean;

    /** Triggers signal as if a value change occured */
    trigger(): void;

    /** Triggers signal with the given value, circumventing the equality checks */
    trigger(value: T): void;

    /** Removes all attached callbacks from the signal. */
    release(): void;

    /** Manually trigger a check that all callbacks are valid as determined by `condition` option in `signal.on(callback, options)`. */
    check(): number;

    /** User provided ToString() method that is used when converting the signal to string. */
    string: (value: T) => string;

    /** Debug name that can be used for debugging. */
    __name__: string | undefined;
}

/** Default string operation that all signals use as `ToString` */
const noStringOp = (v: any) => `${v}`;

/**
 * Equality operator that always returns false. Forces signals to always update on writes.
 * Often used for signals of objects where Javascript equality is based on the reference.
 */
export const always: Equality<any> = () => false;

/**
 * Symbol used for accessing internal state of objects.
 * We expose the internal state through this symbol for reflect / debugging purposes.
 */
const internal = Symbol("Signal.[[Internal]]");

/** Internal dependency map that maps signals to what effects depend on them. */
const dependencyMap = new WeakMap<SignalBase, Set<Effect>>();

export interface Signal<T> extends SignalBase<T> {
    /** Write a new value to the signal. */
    (value: T): T;

    /**
     * User provided function that is called when the signal is written to.
     * The returned value is what actually gets written.
     *
     * This allows the signal to guard against invalid values.
     */
    guard?: (newValue: T, oldValue: T) => T;

    /** Internal state, exposed for reflection / debugging purposes. */
    [internal]: {
        /** Internal value of the signal. */
        value: T;

        /** Callbacks attached to the signal. */
        callbacks: Map<Callback<T>, undefined | (() => boolean)>;

        /** Equality operator used by the signal */
        readonly equality?: Equality<T>;
    }
}

/**
 * Signal base prototype object.
 * 
 * Used for identifying signal objects.
 */
const signalProto = {};

/** Utility function that checks if the provided object is a signal. */
export const isSignal: <T>(obj: any) => obj is SignalBase<T> = Object.prototype.isPrototypeOf.bind(signalProto) as any;

/**
 * Signal prototype implementation.
 */
const signalImpl = {
    on(this: Signal<any>, callback, options) {
        const self = this[internal];

        if (!self.callbacks.has(callback)) {
            // If the callback does not already exist, add it.

            // Check condition, if it fails, don't even add callback.
            if (options?.condition !== undefined && !options.condition()) {
                return callback;
            }

            // Add callback to signal's internal book keeping.
            self.callbacks.set(callback, options?.condition);

            if (options?.signal !== undefined) {
                // If required, create abort signal event to clear callback.
                options.signal.addEventListener("abort", () => self.callbacks.delete(callback), { once: true });
            }

            // Trigger callback for current value.
            try {
                callback(self.value);
            } catch (e) {
                console.error(e);
            }
        }
        return callback;
    },
    off(this: Signal<any>, callback) {
        const self = this[internal];
        return self.callbacks.delete(callback);
    },
    equals(this: Signal<any>, other: any) {
        const self = this[internal];

        if (self.equality === undefined) {
            return self.value === other;
        }
        return self.equality(self.value, other);
    },
    release(this: Signal<any>) {
        const self = this[internal];

        // Clear callbacks
        self.callbacks.clear();

        // Remove from dependency map
        dependencyMap.delete(this);
    },
    check(this: Signal<any>) {
        const self = this[internal];

        // Iterate through callback conditions
        for (const [callback, condition] of self.callbacks) {
            if (condition !== undefined && !condition()) {
                // If a condition exists and it returns false, delete the callback. 
                self.callbacks.delete(callback);
            }
        }

        return self.callbacks.size;
    },
    trigger(this: Signal<any>, ...args: [...any[]]) {
        const self = this[internal];
        
        let value: any;
        if (args.length === 0) {
            value = self.value;
        } else {
            value = args[0];
        }
        
        // Get any effects that depend on this signal
        const dependencies = dependencyMap.get(this);

        // Call and clear destructors PRIOR updating the internal value
        // destructors should run accessing the old value of the updating signal
        if (dependencies !== undefined) {
            for (const effect of dependencies) {
                const { destructor } = effect[internal];
                if (destructor !== undefined) {
                    try {
                        destructor();
                    } catch (e) {
                        console.error(e);
                    }

                    effect[internal].destructor = undefined;
                }
            }
        }

        // Update value and trigger regular callbacks, removing callbacks as per conditions.
        self.value = value;
        for (const [callback, condition] of self.callbacks) {
            // Skip and remove callbacks that are no longer valid as per their condition.
            if (condition !== undefined && !condition()) {
                self.callbacks.delete(callback);
                continue;
            }

            try {
                callback(self.value);
            } catch (e) {
                console.error(e);
            }
        }

        // Trigger effect dependencies AFTER updating internal value
        if (dependencies !== undefined) {
            for (const effect of dependencies) {
                effect(internal);
            }
        }
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    [Symbol.toPrimitive](this: Signal<any>, hint) {
        const self = this[internal];
        return self.value;
    }
} as SignalBase;
Object.setPrototypeOf(signalImpl, signalProto);

/** 
 * Creates a signal
 *
 * @param value Starting value of the signal
 * @param equality Equality function used to determine if two values of type `T` are equal, if not provided, default javscript equality (`===`) is used.
 */
export function signal<T>(value: T, equality?: Equality<T>): Signal<T> {
    // Instantiate main object and interface
    const signal = ((...args: [T, ...any[]]) => {
        const self = signal[internal];

        if (args.length !== 0) {
            // Handle `signal(value)` call.

            let [value] = args;
            if (signal.guard !== undefined) {
                // If a guard is provided, obtain value from guard.
                try {
                    value = signal.guard(value, self.value);
                } catch (e) {
                    console.error(e);
                }
            }
            // Check equality - use the provided equality operator if provided.
            let isNotEqual = (self.equality === undefined && self.value !== value);
            if (!isNotEqual && self.equality !== undefined) {
                try {
                    isNotEqual = !self.equality(self.value, value);
                } catch (e) {
                    console.error(e);
                }
            }
            if (isNotEqual) {
                // If new value is not equal to current value, trigger state change.
                signal.trigger(value);
            }
        }

        // Both `signal()` and `signal(value)` calls return the internal value.
        return self.value;
    }) as Signal<T>;
    signal.string = noStringOp;
    Object.setPrototypeOf(signal, signalImpl);

    // Generate internal state
    signal[internal] = {
        value,
        equality,
        callbacks: new Map<Callback<T>, undefined | (() => boolean)>()
    };

    return signal;
}

export interface Effect {
    /** 
     * Exectues the effect regardless of dependencies. 
     *
     * Executes effect destructor when NOT provided the internal flag. This is because signals trigger destructors manually to
     * ensure proper order of events.
     * 
     * When called externally, the destructors should run immediately. 
     */
    (caller?: typeof internal): void;

    /**
     * Releases the effect, removing it from internal dependency chain.
     * The effect is no longer triggered when its dependencies change.
     */
    release(): void;

    // Manually trigger a check that the effect is still valid as determined by `condition` option. 
    check(): boolean;

    /** Internal state, exposed for reflection / debugging purposes. */
    [internal]: {
        /** Destructor thats called prior the effect triggering. */
        destructor: (() => void) | void | undefined;

        /** 
         * Keeps track of dependency sets this effect is apart of.
         * 
         * Uses a weak ref such that when a dependency is cleaned up, the set can be GC'd even if this effect holds a reference to it.
         */
        dependencySets: (WeakRef<Set<Effect>>[]) | undefined;

        /**
         * The abort signal the effect is assigned.
         * When the abort signal is triggered, the effect automatically destroys itself.
         */
        signal?: AbortSignal;

        /**
         * A condition that determines when the effect should destroy itself.
         * This condition is checked when the effect is due to be triggered.
         */
        condition?: () => boolean
    }

    /** Debug name that can be used for debugging. */
    __name__: string | undefined;
}

/** 
 * Effect base prototype object.
 * 
 * Used for identifying effect objects.
 */
const effectProto = {};
export const isEffect: (obj: any) => obj is Effect = Object.prototype.isPrototypeOf.bind(effectProto) as any;

/**
 * Effect prototype implementation.
 */
const effectImpl = {
    release(this: Effect) {
        const self = this[internal];

        // Call and clear destructor if present
        if (self.destructor !== undefined) {
            try {
                self.destructor();
            } catch (e) {
                console.error(e);
            }

            self.destructor = undefined;
        }

        // Remove effect from dependency map
        if (self.dependencySets === undefined) return;
        for (const ref of self.dependencySets) {
            ref.deref()?.delete(this);
        }
        self.dependencySets = undefined;
    },
    check(this: Effect) {
        const self = this[internal];
        if (self.condition !== undefined) {
            if (!self.condition()) {
                this.release();
                return false;
            }
        }
        return true;
    }
} as Effect;
Object.setPrototypeOf(effectImpl, effectProto);

/** 
 * Creates an effect
 *
 * @param expression Effect that occures when the given dependencies change.
 * @param dependencies List if signals / computed dependencies. The effect is triggered when any one of these change.
 * @param options.signal An AbortSignal which when triggered will automatically remove this callback from the signal.
 * @param options.condition A user provided function that when returns true, will release this effect.
 *                          This condition is only checked on state changes.
 */
export function effect(expression: () => ((() => void) | void | undefined), dependencies: SignalBase[], options?: { signal?: AbortSignal, condition?: () => boolean }): Effect {
    // Instantiate main object and interface
    const effect = ((caller?: typeof internal) => {
        const self = effect[internal];

        // Call and clear destructor if not called internally as signals have different
        // execution order for the destructor.
        if (caller !== internal && self.destructor !== undefined) {
            try {
                self.destructor();
            } catch (e) {
                console.error(e);
            }
            self.destructor = undefined;
        }

        // Check guard
        if (!effect.check()) return;

        // Execute effect
        self.destructor = expression();
    }) as Effect;
    Object.setPrototypeOf(effect, effectImpl);

    // Generate internal state
    effect[internal] = {
        destructor: undefined,
        dependencySets: [],

        signal: options?.signal,
        condition: options?.condition
    };
    const self = effect[internal];

    // Add effect to dependency map
    for (const signal of dependencies) {

        if (isEffect(signal)) throw new Error("Effect cannot be used as a dependency.");
        if (!isSignal(signal)) throw new Error("Only signals can be used as a dependency.");

        if (!dependencyMap.has(signal)) {
            dependencyMap.set(signal, new Set());
        }
        const dependency = dependencyMap.get(signal)!;
        dependency.add(effect);

        // Keep track of all dependencies this effect is attached to.
        //
        // We do not need to check for duplicates as there are no side effects if this contains the same 
        // dependency set twice.
        self.dependencySets!.push(new WeakRef(dependency));
    }

    if (options?.signal !== undefined) {
        // If required, create abort signal event to clear effect.
        options.signal.addEventListener("abort", () => { effect.release(); }, { once: true });
    }

    // Execute effect for the first time manually
    effect();

    return effect;
}

export interface Computed<T> extends SignalBase<T> {
    /** Get the value of the computed signal */
    (): T;

    /** Internal state, exposed for reflection / debugging purposes. */
    [internal]: {
        /** The expression the computed signal is using */
        readonly expression: (set: Signal<T>) => ((() => void) | void);

        /** The internal effect */
        readonly effect: Effect;

        /** The internal signal */
        readonly value: Signal<T>;
    }
}

/**
 * Computed prototype implementation.
 */
const computedImpl = {
    on(this: Computed<any>, callback, options) {
        const self = this[internal];
        return self.value.on(callback, options);
    },
    equals(this: Computed<any>, other) {
        const self = this[internal];
        return self.value.equals(other);
    },
    release(this: Computed<any>) {
        const self = this[internal];
        self.effect.release();
        self.value.release();
    },
    check(this: Computed<any>) {
        const self = this[internal];

        if (!self.effect.check()) {
            // If the effect is released, release the internal signal as well.
            self.value.release();
        }
        return 0;
    },
    trigger(this: Computed<any>, ...args: [...any[]]) {
        const self = this[internal];
        (self.value.trigger as any)(...args);
    },
    [Symbol.toPrimitive](this: Computed<any>, hint) {
        const self = this[internal];
        return self.value[Symbol.toPrimitive](hint);
    }
} as SignalBase;
Object.setPrototypeOf(computedImpl, signalProto);

/** 
 * Creates a computed signal.
 * 
 * Syntax sugar around a signal and effect, where effect updates the signal.
 *
 * @param expression Effect that occures when the given dependencies change, provides the internal signal to update the computed state.
 * @param dependencies List if signals / computed dependencies. The effect is triggered when any one of these change.
 * @param options.signal An AbortSignal which when triggered will automatically remove this callback from the signal.
 * @param options.condition A user provided function that when returns true, will release this effect.
 *                          This condition is only checked on state changes.
 * @param options.guard User provided function that is called when the signal is written to.
 *                      The returned value is what actually gets written.
 *                      This allows the signal to guard against invalid values.
 */
export function computed<T>(expression: (set: Signal<T>) => ((() => void) | void), dependencies: SignalBase[], equality?: Equality<T>, options?: { signal?: AbortSignal, condition?: () => boolean, guard?: () => boolean }): Computed<T> {
    // Instantiate main object and interface
    const computed = function () {
        const self = computed[internal];
        return self.value();
    } as Computed<T>;
    computed.string = noStringOp;
    Object.setPrototypeOf(computed, computedImpl);

    // Generate internal state
    computed[internal] = {
        expression,
        value: signal(undefined as T, equality),
    } as any;
    // NOTE(randomuserhi): is set after such that `.expression` is constructed and valid.
    (computed[internal].effect as any) = effect(() => computed[internal].expression(computed[internal].value), dependencies, options);

    return computed;
}

