import { Signal, SignalEvent } from "./signal.js";
declare class RHU_COLLECTION<T extends Record<PropertyKey, any> = Record<PropertyKey, any>> {
    private set;
    constructor(owner: HTML<T>, ...nodes: (HTML | Node)[]);
    static unbind(node: HTML | Node): void;
    remove(...nodes: (HTML | Node)[]): void;
    append(...nodes: (HTML | Node)[]): void;
    insertBefore(node: (HTML | Node), child?: (HTML | Node)): void;
    private readonly owner;
    private _first;
    private _last;
    private _length;
    get first(): Node | HTML<Record<PropertyKey, any>>;
    readonly last: Node;
    get length(): number;
    [Symbol.iterator](): Generator<Node | HTML<Record<PropertyKey, any>>, void, unknown>;
}
declare class RHU_CLOSURE {
    static instance: RHU_CLOSURE;
    static is: (object: any) => object is RHU_CLOSURE;
}
declare class RHU_MARKER {
    private name?;
    bind(name?: PropertyKey): this;
    static is: (object: any) => object is RHU_MARKER;
}
declare class RHU_NODE<T extends Record<PropertyKey, any> = Record<PropertyKey, any>> {
    readonly node: HTML<T>;
    private name?;
    private isOpen;
    bind(name?: PropertyKey): this;
    open(): this;
    private boxed?;
    box(boxed?: boolean): this;
    constructor(node: HTML<T>);
    static is: (object: any) => object is RHU_NODE;
}
type RHU_CHILDREN = NodeListOf<ChildNode>;
export declare const DOM: unique symbol;
declare class RHU_DOM<T extends Record<PropertyKey, any> = Record<PropertyKey, any>> {
    readonly elements: RHU_COLLECTION;
    readonly first: Node;
    readonly last: Node;
    readonly parent: Node | null;
    readonly remove: RHU_COLLECTION["remove"];
    readonly append: RHU_COLLECTION["append"];
    readonly insertBefore: RHU_COLLECTION["insertBefore"];
    readonly replaceWith: (...nodes: (HTML | Node)[]) => void;
    readonly [Symbol.iterator]: () => IterableIterator<Node>;
    readonly [DOM]: HTML<T>;
    readonly ref: {
        deref(): HTML<T> | undefined;
        hasref(): boolean;
    };
    private binds;
    close: RHU_CLOSURE;
    private onChildren?;
    children(cb?: (children: RHU_CHILDREN) => void): this;
    private boxed;
    box(boxed?: boolean): this;
    static is: (object: any) => object is RHU_DOM;
}
type FACTORY<T extends Record<PropertyKey, any> = Record<PropertyKey, any>> = (...args: any[]) => HTML<T>;
type HTML<T extends Record<PropertyKey, any> = Record<PropertyKey, any>> = T & {
    readonly [DOM]: RHU_DOM<T>;
    [Symbol.iterator]: () => IterableIterator<Node>;
};
export type html<T extends FACTORY | Record<PropertyKey, any>> = T extends FACTORY ? ReturnType<T> extends HTML ? ReturnType<T> : never : HTML<T>;
export declare const isHTML: <T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(object: any) => object is HTML<T>;
type First = TemplateStringsArray;
type Single = Node | string | HTML | RHU_NODE | RHU_CLOSURE | RHU_MARKER | SignalEvent<any>;
type Interp = Single | (Single[]);
interface RHU_HTML {
    <T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(html: HTML<T>): RHU_DOM<T>;
    <T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(first: First, ...interpolations: Interp[]): HTML<T>;
    observe(node: Node): void;
    close(): RHU_CLOSURE;
    readonly closure: RHU_CLOSURE;
    marker(name?: PropertyKey): RHU_MARKER;
    open<T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(html: HTML<T> | RHU_NODE<T>): RHU_NODE<T>;
    bind<T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(html: HTML<T> | RHU_NODE<T>, name: PropertyKey): RHU_NODE<T>;
    box<T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(html: HTML<T> | RHU_NODE<T>): RHU_NODE<T>;
    children<T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(html: HTML<T> | RHU_NODE<T>, cb: (children: RHU_CHILDREN) => void): RHU_NODE<T>;
    map<T, H extends Record<PropertyKey, any> = Record<PropertyKey, any>, K = T extends any[] ? number : T extends Map<infer K, any> ? K : any, V = T extends (infer V)[] ? V : T extends Map<any, infer V> ? V : any>(signal: Signal<T>, factory: (kv: [k: K, v: V], el?: HTML<H>) => HTML<H> | undefined): HTML<{
        readonly signal: Signal<T>;
    }>;
    map<T, H extends Record<PropertyKey, any> = Record<PropertyKey, any>, K = any, V = any>(signal: Signal<T>, factory: (kv: [k: K, v: V], el?: HTML<H>) => HTML<H> | undefined, iterator: (value: T) => IterableIterator<[key: K, value: V]>): HTML<{
        readonly signal: Signal<T>;
    }>;
    ref<T extends object, R extends object>(target: T, obj: R): {
        deref(): R | undefined;
        hasref(): boolean;
    };
    ref<T extends object>(obj: T): {
        deref(): T | undefined;
        hasref(): boolean;
    };
    append(target: Node | HTML, ...nodes: (Node | HTML)[]): void;
    insertBefore(target: Node | HTML, node: (Node | HTML), ref: (Node | HTML)): void;
    remove(target: Node | HTML, ...nodes: (Node | HTML)[]): void;
    replaceWith(target: Node | HTML, ...nodes: (Node | HTML)[]): void;
}
export declare const html: RHU_HTML;
declare global {
    interface GlobalEventHandlersEventMap {
        "mount": CustomEvent;
        "dismount": CustomEvent;
    }
}
export {};
