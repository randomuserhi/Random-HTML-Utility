/// signal.ts 
///
/// @randomuserhi

// TODO(randomuserhi): Reformat in such a way that its easily convertible to be used in JS without modules.

/** Type representing a signal callback for type `T` */
type Callback<T> = (value: T) => void;

/** Type representing an equality check between 2 objects of type `T` */
type Equality<T> = (a?: T, b?: T) => boolean;

/** Common interface shared by all signals */
export interface SignalBase<T = any> {
    /** @returns Value stored within the signal */
    (): T;

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
 * Signal prototype object.
 * 
 * Used for identifying signal objects.
 */
const signalProto = {};

/** Utiltiy function that checks if the provided object is a signal. */
export const isSignal: <T>(obj: any) => obj is SignalBase<T> = Object.prototype.isPrototypeOf.bind(signalProto);

/** 
 * Creates a signal
 *
 * @param value Starting value of the signal
 * @param equality Equality function used to determine if two values of type `T` are equal, if not provided, default javscript equality (`===`) is used.
 */
export function signal<T>(value: T, equality?: Equality<T>): Signal<T> {
    // Recycled buffer used to reduce garbage collections
    let _callbacks = new Map<Callback<T>, undefined | (() => boolean)>();

    // Instantiate main object and interface
    const signal = function Signal(...args: [T, ...any[]]) {
        const self = signal[internal];

        if (args.length !== 0) {
            // Handle `signal(value)` call.

            let [ value ] = args;
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

                // Get any effects that depend on this signal
                const dependencies = dependencyMap.get(signal);
                
                // Call destructors PRIOR updating the internal value
                // destructors should run accessing the old value of the updating signal
                if (dependencies !== undefined) {
                    for (const effect of dependencies) {
                        const { destructor } = effect[internal];
                        if (destructor !== undefined) {
                            try {
                                destructor();
                            } catch(e) {
                                console.error(e);
                            }
                        }
                    }
                }

                // Update value and trigger regular callbacks, removing callbacks as per conditions.
                self.value = value;
                for (const [callback, condition] of self.callbacks) {
                    // Skip callbacks that are no longer valid as per their condition.
                    if (condition !== undefined && !condition()) {
                        continue;
                    }
                    
                    try {
                        callback(self.value);
                    } catch (e) {
                        console.error(e);
                    }

                    // Add callback to list as it is still valid.
                    _callbacks.set(callback, condition);
                }

                // Clear old callbacks list and swap with `recycledCbBuffer`.
                // This is done to reduce garbage collections.
                self.callbacks.clear();
                const temp = _callbacks;
                _callbacks = self.callbacks;
                self.callbacks = temp;

                // Trigger effect dependencies AFTER updating internal value
                if (dependencies !== undefined) {
                    for (const effect of dependencies) {
                        effect[internal].trigger();
                    }
                }
            }
        }

        // Both `signal()` and `signal(value)` calls return the internal value.
        return self.value;
    } as Signal<T>;
    signal.on = function(callback, options): Callback<T> {
        const self = signal[internal];

        if (!self.callbacks.has(callback)) {
            // If the callback does not already exist, add it.

            // Check condition, if it fails, don't even add callback.
            if (options?.condition !== undefined && !options.condition()) {
                return callback;
            }

            // Trigger callback for current value.
            try {
                callback(self.value);
            } catch (e) {
                console.error(e);
            }

            // Add callback to signal's internal book keeping.
            self.callbacks.set(callback, options?.condition);
            
            if (options?.signal !== undefined) {
                // If required, create abort signal event to clear callback.
                options.signal.addEventListener("abort", () => self.callbacks.delete(callback), { once: true });
            }
        }
        return callback;
    };
    signal.off = function(callback): boolean {
        const self = signal[internal]; 

        return self.callbacks.delete(callback);
    };
    signal.equals = function(other): boolean {
        const self = signal[internal]; 

        if (self.equality === undefined) {
            return self.value === other;
        }
        return self.equality(self.value, other);
    };
    signal.release = function() {
        const self = signal[internal]; 

        // Clear callbacks
        self.callbacks.clear();

        // Remove from dependency map
        dependencyMap.delete(signal);
    };
    signal.check = function() {
        const self = signal[internal]; 

        for (const [callback, condition] of self.callbacks) {
            if (condition !== undefined && !condition()) {
                continue;
            }

            // Add callback to list as it is still valid.
            _callbacks.set(callback, condition);
        }

        // Clear old callbacks list and swap with `self._callbacks`.
        // This is done to reduce garbage collections.
        self.callbacks.clear();
        const temp = _callbacks;
        _callbacks = self.callbacks;
        self.callbacks = temp;

        return self.callbacks.size;
    };
    signal.string = noStringOp;
    (signal as any)[Symbol.toPrimitive] = function(hint: "string" | "number" | "default") {
        const self = signal[internal]; 

        if ((self.value as any)[Symbol.toPrimitive]) {
            return (self.value as any)[Symbol.toPrimitive](hint);
        } else {
            return self.value;
        }
    };
    Object.setPrototypeOf(signal, signalProto);

    // Generate internal state
    signal[internal] = {
        value,
        equality,
        callbacks: new Map<Callback<T>, undefined | (() => boolean)>()
    };

    return signal;
}

export interface Effect {
    /** Exectues the effect regardless of dependencies. */
    (): void;

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

        /** Internally used to trigger the effect without calling the destructors */
        trigger(): void;
    }

    /** Debug name that can be used for debugging. */
    __name__: string | undefined;
}

/** 
 * Effect prototype object.
 * 
 * Used for identifying effect objects.
 */
const effectProto = {};
export const isEffect: (obj: any) => obj is Effect = Object.prototype.isPrototypeOf.bind(effectProto);

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
    // Keep track of dependency sets this effect is apart of.
    // Use a weak ref such that when a dependency is cleaned up, the set can be GC'd even if this effect holds a reference to it.
    let dependencySets: (WeakRef<Set<Effect>>[]) | undefined = [];
    
    // Instantiate main object and interface
    const effect = function Effect() {
        const self = effect[internal];
        self.destructor?.();
        self.trigger();
    } as Effect;
    effect.release = function() {
        if (dependencySets === undefined) return;
        for (const ref of dependencySets) {
            ref.deref()?.delete(effect);
        }
        dependencySets = undefined;
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

    // Generate internal state
    effect[internal] = {
        destructor: undefined,
        trigger: function() {
            const self = effect[internal];

            // Check guard
            if (!effect.check()) return;

            // Execute effect
            self.destructor = expression();
        }
    };

    // Add effect to dependency map
    for (const signal of dependencies) {
        if (isEffect(signal)) throw new Error("Effect cannot be used as a dependency.");
        if (!isSignal(signal)) throw new Error("Only signals can be used as a dependency.");

        if (!dependencyMap.has(signal)) {
            dependencyMap.set(signal, new Set());
        }
        const dependency = dependencyMap.get(signal)!;
        dependency.add(effect);

        // Keep track of all dependencies this effect is attached to
        dependencySets.push(new WeakRef(dependency));
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
    const computed = function() {
        const self = computed[internal];
        return self.value();
    } as Computed<T>;
    computed.on = function(callback, options): Callback<T> {
        const self = computed[internal];
        return self.value.on(callback, options);
    };
    computed.equals = function(other): boolean {
        const self = computed[internal];
        return self.value.equals(other);
    };
    computed.release = function() {
        const self = computed[internal];
        self.effect.release();
        self.value.release();
    };
    computed.check = function() {
        const self = computed[internal];

        if (!self.effect.check()) {
            // If the effect is released, release the internal signal as well.
            self.value.release();
        }
        return 0;
    };
    computed.string = noStringOp;
    (computed as any)[Symbol.toPrimitive] = function(hint: "string" | "number" | "default") {
        const self = computed[internal];
        return (self.value as any)[Symbol.toPrimitive](hint);
    };
    Object.setPrototypeOf(computed, signalProto);

    // Generate internal state
    computed[internal] = {
        expression,
        value: signal(undefined as T, equality),
    } as any;
    // NOTE(randomuserhi): is set after such that `.expression` is constructed and valid.
    (computed[internal].effect as any) = effect(() => computed[internal].expression(computed[internal].value), dependencies, options);

    return computed;
}

