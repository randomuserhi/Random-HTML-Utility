import { SignalEvent } from "./signal.js";
declare class RHU_CLOSURE {
    static instance: RHU_CLOSURE;
    static is: (object: any) => object is RHU_CLOSURE;
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
    readonly elements: Node[];
    readonly [Symbol.iterator]: () => IterableIterator<Node>;
    readonly [DOM]: HTML<T>;
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
    [DOM]: RHU_DOM<T>;
    [Symbol.iterator]: () => IterableIterator<Node>;
};
export type html<T extends FACTORY | Record<PropertyKey, any>> = T extends FACTORY ? ReturnType<T> extends HTML ? ReturnType<T> : never : HTML<T>;
export declare const isHTML: <T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(object: any) => object is HTML<T>;
type First = TemplateStringsArray;
type Single = Node | string | HTML | RHU_NODE | RHU_CLOSURE | SignalEvent<any>;
type Interp = Single | (Single[]);
interface RHU_HTML {
    <T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(html: HTML<T>): RHU_DOM<T>;
    <T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(first: First, ...interpolations: Interp[]): HTML<T>;
    observe(node: Node): void;
    close(): RHU_CLOSURE;
    readonly closure: RHU_CLOSURE;
    open<T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(html: HTML<T> | RHU_NODE<T>): RHU_NODE<T>;
    bind<T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(html: HTML<T> | RHU_NODE<T>, name: PropertyKey): RHU_NODE<T>;
    box<T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(html: HTML<T> | RHU_NODE<T>): RHU_NODE<T>;
    children<T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(html: HTML<T> | RHU_NODE<T>, cb: (children: RHU_CHILDREN) => void): RHU_NODE<T>;
}
export declare const html: RHU_HTML;
declare global {
    interface GlobalEventHandlersEventMap {
        "mount": CustomEvent;
        "dismount": CustomEvent;
    }
}
export {};
