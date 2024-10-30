A common paradigm in reactive UI are signals. These represent states which react to changes, invoking behaviour.
## Basics

To import signals in mRHU:

```typescript
import { signal, computed, effect } from "rhu/signal.js";
```

You can create a signal and then react to changes:

```typescript
const state = signal<number>(0);
state.on((value) => console.log(value));

state(0); // 
state(1); // "1"
state(1); // 
state(2); // "2"
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

state({ x: 0, y: 0 }); // 
state({ x: 1, y: 0 }); // "{ x: 1, y: 0 }"
state({ x: 1, y: 0 }); // 
state({ x: 0, y: 0 }); // "{ x: 0, y: 0 }"
```

If you want your state to only accept specific values, you can assign a guard to your signal:

```typescript
const state = signal<number>(0);
state.guard((value) => {
    if (value < 0) 
});
state.on((value) => console.log(value));

state(0); // 
state(1); // "1"
state(1); // 
state(2); // "2"
```