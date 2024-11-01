A common paradigm in reactive UI are signals. These represent states which react to changes, invoking behaviour.
## Basics

To import signals in mRHU:

```typescript
import { signal, computed, effect } from "rhu/signal.js";
```

You can create a signal and then react to changes:

```typescript
const state = signal<number>(0); // The parameter passed here 
                                 // is simply the initial state 
                                 // of the signal
state.on((value) => console.log(value)); // Invoke behaviour on state change

// "0"

// Change state
state(0); // 
state(1); // "1"
state(1); // 
state(2); // "2"

// Get state
console.log(state()); // "2"
```

Notice how the `console.log` only executes when the value changes.

For more complex objects you may need to provide your own equality operator since JavaScript doesn't allow operator overloading:

```typescript
interface Vec2 { x: number, y: number };
function Vec2Equality(a?: Vec2, b?: Vec2) {
    if (a === undefined || b === undefined) return false;
    if (a.x !== b.x || a.y !== b.y) return false;
    return true;
}

const state = signal<Vec2>({ x: 0, y: 0 }, Vec2Equality);
state.on((value) => console.log(value));

// { x: 0, y: 0 }

state({ x: 0, y: 0 }); // 
state({ x: 1, y: 0 }); // { x: 1, y: 0 }
state({ x: 1, y: 0 }); // 
state({ x: 0, y: 0 }); // { x: 0, y: 0 }
```

If you want your state to only accept specific values, you can assign a guard to your signal:

```typescript
const state = signal<number>(0);
// Do not accept negative values
state.guard((newValue, oldValue) => {
    if (value <= 0) return oldValue;
    return newValue;
});
state.on((value) => console.log(value));

// "0"

state(0); // 
state(1); // "1"

state(-1); // 
console.log(state()) // "1"

state(2); // "2"
```

## Computed

You may want to have a computed state which is some state that is the result of some operation on many other states:

```typescript
const a = signal<number>(0);
const b = signal<number>(0);
const times = computed<number>((state) => {
    state(a() * b());
}, [a, b]);
// The first parameter is a function which updates the current
// `state` of the computed signal.
// The second parameter is a list of states that this computed
// state depends on. In this case it depends on `a` and `b`.
// These dependencies can include other computed states.

times.on((value) => console.log(value));

// "0"

a(0); //
b(0); //
a(1); //
b(1); // "1"
```

As with signals, computed also accepts an equality operator for its internal state:

```typescript
interface Vec2 { x: number, y: number };
function Vec2Equality(a?: Vec2, b?: Vec2) {
    if (a === undefined || b === undefined) return false;
    if (a.x !== b.x || a.y !== b.y) return false;
    return true;
}

const a = signal<Vec2>({ x: 0, y: 0 }, Vec2Equality);
const b = signal<Vec2>({ x: 0, y: 0 }, Vec2Equality);
const times = computed<Vec2>((state) => {
    const va = a();
    const vb = b(); 
    state({ 
        x: va.x * vb.x, 
        y: va.y * vb.y
    });
}, [a, b], Vec2Equality);

times.on((value) => console.log(value));

// { x: 0, y: 0 }

a({ x: 0, y: 0 }); //
b({ x: 0, y: 0 }); //
a({ x: 1, y: 0 }); //
b({ x: 1, y: 0 }); // { x: 1, y: 0 }
```

Computed also accepts a destructor function, which is returned by the behaviour, that executes just before a state changes. This can be used to free resources:

```typescript
const a = signal<number>(0);

const comp = computed<number>((state) => {
    // This runs after the state update
    // and thus a() gives the new value to
    // acquire.
    console.log(`behaviour: ${a()}`);

    return () => {
        // Since this runs prior the state updates;
        // a() will give the old value allowing you
        // to release the old resource.
        console.log(`destructor: ${a()}`);
    }
}, [a]);

// "behaviour: 0"

a(1); // "destructor: 0"
      // "behaviour: 1"
```

## Effect

You may want to perform some behaviour when many states change. This can be done using effect:

```typescript
const a = signal<number>(0);
const b = signal<number>(0);
const onAB = effect(() => {
    console.log(`A ${a()}, B ${b()}`);
}, [a, b]);
// The first parameter is a function that executes when any
// of the dependencies change.
// The second parameter is a list of states that this effect
// depends on. In this case it depends on `a` and `b`.

// "A 0, B 0"

a(0); //
b(0); //
a(1); // "A 1, B 0"
b(1); // "A 1, B 1"
```

Effect also accepts a destructor function, which is returned by the behaviour, that executes just before a state changes. This can be used to free resources:

```typescript
const a = signal<number>(0);

const eff = effect(() => {
    // This runs after the state update
    // and thus a() gives the new value to
    // acquire.
    console.log(`behaviour: ${a()}`);

    return () => {
        // Since this runs prior the state updates;
        // a() will give the old value allowing you
        // to release the old resource.
        console.log(`destructor: ${a()}`);
    }
}, [a]);

// "behaviour: 0"

a(1); // "destructor: 0"
      // "behaviour: 1"
```

## Releasing Signal / Effect / Computed

`signal`, `computed` and `effect` all remain active and in memory as long as the signals / computed states / callbacks they depend on remain active and in memory.

To free the resources and stop a `signal`, `computed` or `effect` from running and using memory, simply call `release()` on it:

> Note that releasing a `signal` simply clears its assigned callbacks

```typescript
const a = signal<number>(0);

a.on(() => {
    console.log(`signal: ${a()}`);
}, { signal: abortSignal });

// "signal: 0"

const eff = effect(() => {
    console.log(`effect: ${a()}`);
}, [a]);

// "effect: 0"

const comp = computed<number>((state) => {
    console.log(`computed: ${a()}`);
    state(a());
}, [a]);

// "computed: 0"

a(1); // "signal: 1"
      // "effect: 1"
      // "computed: 1"
signal.release();
a(2); // "effect: 2"
      // "computed: 2"
eff.release();
a(3); // "computed: 3"
comp.release();
a(4); // 
```

> **Much like event listeners, it's really important to release `effect` or `computed` when they are no longer in use otherwise they create memory leaks.**
> 
> *If all the original signals an `effect` or `computed` depend on get garbage collected, the `effect` and `computed` is also garbage collected. This rule only applies when constantly creating new effects on a persistent dependency.*

`signal`, `computed` and `effect` also support the [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) paradigm from event listeners:
```typescript
const controller = new AbortController();
const abortSignal = controller.signal;

const a = signal<number>(0);

a.on(() => {
    console.log(`signal: ${a()}`);
}, { signal: abortSignal });

// "signal: 0"

const eff = effect(() => {
    console.log(`effect: ${a()}`);
}, [a], { signal: abortSignal });

// "effect: 0"

const comp = computed<number>((state) => {
    console.log(`computed: ${a()}`);
    state(a());
}, [a], undefined, { signal: abortSignal });

// "computed: 0"

a(1); // "signal: 1"
      // "effect: 1"
      // "computed: 1"
controller.abort();
a(2); // 
```

%% TODO(randomuserhi): Document condition option that allows signals to be destroyed when guard returns false %%

```typescript
const state = signal<number>(0);
state.on((value) => console.log(value), { condition: () => testSignal() <= 5 });

state(1); // "1"
state(2); // "2"
state(3); // "3"
state(4); // "4"
state(5); // "5"

state(6); //
state(7); //
state(1); //
state(2); //

// works on effect and computed as well (part of their options param)
```

This useful to prevent memory leaks from elements that should be garbage collected once removed from DOM, but can't as a signal is holding a reference to it:

```typescript
const el = document.createElement("div");

const state = signal<number>(0);

// Store a weakref to the element such that
// when it is garbage collected, the signal destroys
// its callback.
const ref = new WeakRef(el);
state.on((value) => {
    const el = ref.deref();
    if (el === undefined) return;
    el.innerText = `${value}`;
}, { condition: () => ref.deref() !== undefined });
```

> Note that the condition only triggers when a state change is invoked (writes, not reads). Thus if the signal is never written to again, the element can get garbage collected but not the callback.
> 
> This includes memoization such that writing the same value to the signal also will not trigger a guard check.
> 
> This behaviour extends to `computed` and `effect` where if no changes are ever invoked, the callbacks cannot be garbage collected.
> 
> To manually trigger a condition check simply use `.check()`, for example in the above code snippet `state.check()` would check all conditions on all of the callbacks assigned to `state`.