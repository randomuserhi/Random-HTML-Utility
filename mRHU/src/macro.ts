import { isSignal, signal, Signal, SignalEvent } from "./signal.js";

export abstract class RHU_NODE {
    static is: (object: any) => object is RHU_NODE = Object.prototype.isPrototypeOf.bind(RHU_NODE.prototype);
}

export class RHU_CLOSURE extends RHU_NODE {
    static instance = new RHU_CLOSURE();
    static is: (object: any) => object is RHU_CLOSURE = Object.prototype.isPrototypeOf.bind(RHU_CLOSURE.prototype);
}

export class RHU_ELEMENT<T = any, Frag extends Node = Node> extends RHU_NODE {
    protected _bind?: PropertyKey;
    public bind(key?: PropertyKey) {
        this._bind = key;
        return this;
    }

    protected boxed: boolean = false;
    public box() {
        this.boxed = true;
        return this;
    }
    public unbox() {
        this.boxed = true;
        return this;
    }

    public callbacks = new Set<(element: T, children: RHU_CHILDREN, dom: Node[]) => void>();
    public then(callback: (element: T, children: RHU_CHILDREN, dom: Node[]) => void) {
        this.callbacks.add(callback);
        return this;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public copy(): RHU_ELEMENT<T, Frag> {
        throw new Error("Invalid operation.");
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected _dom(target?: Record<PropertyKey, any>, children?: RHU_CHILDREN): [instance: T, fragment: Frag, dom: Node[]] {
        throw new Error("Invalid operation.");
    }

    public dom<B extends T | void = void>(target?: Record<PropertyKey, any>, children?: RHU_CHILDREN): [instance: B extends void ? T : B, fragment: Frag] {
        const result = this._dom(target, children);

        // trigger callbacks
        for (const callback of this.callbacks) {
            callback(result[0], children === undefined ? NoChildren : children, result.pop() as Node[]);
        }

        return result as any;
    }

    static is: (object: any) => object is RHU_ELEMENT = Object.prototype.isPrototypeOf.bind(RHU_ELEMENT.prototype);
}
type ElementInstance<T extends RHU_ELEMENT> = T extends RHU_ELEMENT<infer Bindings> ? Bindings : never;

export class RHU_ELEMENT_OPEN<T extends RHU_ELEMENT = any> extends RHU_NODE {
    public element: T;

    constructor(element: T) {
        super();

        this.element = element;
    }

    public box() {
        this.element.box();
        return this;
    }

    public unbox() {
        this.element.unbox();
        return this;
    }

    public copy(): RHU_ELEMENT_OPEN<T> {
        return new RHU_ELEMENT_OPEN<T>(this.element.copy() as T);
    }

    public bind(key?: PropertyKey) {
        this.element.bind(key);
        return this;
    }

    public then(callback: (element: ElementInstance<T>, children: RHU_CHILDREN, dom: Node[]) => void) {
        this.element.then(callback);
        return this;
    }

    public dom<B extends ElementInstance<T> | void = void>(target?: Record<PropertyKey, any>, children?: RHU_CHILDREN) {
        return this.element.dom<B>(target, children);
    }

    static is: (object: any) => object is RHU_ELEMENT_OPEN = Object.prototype.isPrototypeOf.bind(RHU_ELEMENT_OPEN.prototype);
}

export class RHU_SIGNAL<T = any> extends RHU_ELEMENT<Signal<T>> {
    constructor(binding: PropertyKey, toString?: (value: T) => string) {
        super();
        this.bind(binding);
        if (toString !== undefined) this.string(toString);
    }

    protected _toString?: (value: T) => string;
    public string(toString: (value: T) => string) {
        this._toString = toString;
    }

    protected _value: T;
    public value(value: T) {
        this._value = value;
        return this;
    }

    public copy(): RHU_SIGNAL<T> {
        const copy = new RHU_SIGNAL<T>(this._bind!);
        copy._value = this._value;
        copy._toString = this._toString;
        copy.boxed = this.boxed;
        for (const callback of this.callbacks.values()) {
            copy.then(callback);
        }
        return copy;
    }

    protected _dom(target?: Record<PropertyKey, any>): [instance: Signal<T>, fragment: Node, dom: Node[]] {
        let instance: Signal<T> | undefined = undefined;

        const doBinding = target !== undefined && this._bind !== undefined && this._bind !== null;

        // Try get an existing binding
        if (doBinding) {
            // If the target contains the same binding and it is a signal, share it (share signal object across multiple text nodes)
            if (target[this._bind!] !== undefined && !isSignal(target[this._bind!])) throw new Error(`The binding '${this._bind!.toString()}' already exists.`); 
            instance = target[this._bind!];
        }

        // If no instance from binding, create one
        if (instance === undefined) {
            instance = signal(this._value);
        }

        // Create binding
        if (doBinding) target[this._bind!] = instance;

        // create text node and signal event
        const toString = this._toString;
        const node = document.createTextNode(`${this._value}`);
        const ref = new WeakRef(node);
        instance.on((value) => {
            const node = ref.deref();
            if (node === undefined) return;
            if (toString) {
                node.nodeValue = `${toString(value)}`;
            } else {
                node.nodeValue = `${value}`;
            }
        }, { condition: () => ref.deref() !== undefined });

        return [instance, node, [node]];
    }

    public static is: (object: any) => object is RHU_SIGNAL = Object.prototype.isPrototypeOf.bind(RHU_SIGNAL.prototype);
}

export class MacroElement {
    public readonly dom: Node[];

    constructor(dom: Node[], bindings?: any) {
        this.dom = dom;

        if (bindings !== undefined && bindings !== null) {
            Object.assign(this, bindings);
        }
    }

    public static is: (object: any) => object is MacroElement = Object.prototype.isPrototypeOf.bind(MacroElement.prototype);
}
export type RHU_CHILDREN = NodeListOf<ChildNode>;
type MacroClass = new (dom: Node[], bindings: any, children: RHU_CHILDREN, ...args: any[]) => any;
type MacroParameters<T extends MacroClass> = T extends new (dom: Node[], bindings: any, children: RHU_CHILDREN, ...args: infer P) => any ? P : never;

// An empty HTMLCollection to represent an empty list of children
const NoChildren = document.createDocumentFragment().childNodes;

export class RHU_MACRO<T extends MacroClass = MacroClass> extends RHU_ELEMENT<InstanceType<T>, DocumentFragment> {
    public type: T;
    public html: RHU_HTML;
    public args: MacroParameters<T>;
    
    constructor(html: RHU_HTML, type: T, args: MacroParameters<T>) {
        super();
        this.html = html;
        this.type = type;
        this.args = args;
    }

    public open(): RHU_ELEMENT_OPEN<RHU_MACRO<T>> {
        return new RHU_ELEMENT_OPEN<RHU_MACRO<T>>(this);
    }

    public copy(): RHU_MACRO<T> {
        const copy = new RHU_MACRO<T>(this.html, this.type, this.args).bind(this._bind);
        copy.boxed = this.boxed;
        for (const callback of this.callbacks.values()) {
            copy.then(callback);
        }
        return copy;
    }

    protected _dom(target?: Record<PropertyKey, any>, children?: RHU_CHILDREN): [instance: InstanceType<T>, fragment: DocumentFragment, dom: Node[]] {
        // parse macro
        const [b, frag] = this.html.dom();
        const dom = [...frag.childNodes];

        // create instance
        const instance = new this.type(dom, b, children === undefined ? NoChildren : children, ...this.args);

        // create bindings
        if (target !== undefined && this._bind !== undefined && this._bind !== null) {
            if (this._bind in target) throw new SyntaxError(`The binding '${this._bind.toString()}' already exists.`);
            target[this._bind] = instance; 
        }

        return [instance, frag, dom];
    }

    public static is: (object: any) => object is RHU_MACRO = Object.prototype.isPrototypeOf.bind(RHU_MACRO.prototype);
}
export type MACRO<F extends FACTORY<any>> = RHU_MACRO<F extends FACTORY<infer T> ? T : any>;

interface FACTORY_HTML {
    <T extends {} = any>(first: RHU_HTML["first"], ...interpolations: RHU_HTML["interpolations"]): RHU_HTML<T>;
    readonly close: RHU_CLOSURE;
}

export const html: FACTORY_HTML = function <T extends {} = any>(first: RHU_HTML["first"], ...interpolations: RHU_HTML["interpolations"]): RHU_HTML<T> {
    return new RHU_HTML<T>(first, interpolations);
} as FACTORY_HTML;
(html as any).close = RHU_CLOSURE.instance;

// TODO(randomuserhi): Nested parsing error handling -> display stack trace of parser to make debugging easier
export class RHU_HTML<T extends Record<PropertyKey, any> = any> extends RHU_ELEMENT<T, DocumentFragment> {
    public static empty = html``;
    
    private first: TemplateStringsArray;
    private interpolations: (string | RHU_NODE | SignalEvent<any> | (string | RHU_NODE | SignalEvent<any>)[])[];
    
    constructor(first: RHU_HTML["first"], interpolations: RHU_HTML["interpolations"]) {
        super();
        
        this.first = first;
        this.interpolations = interpolations;
    }
    
    public readonly close = RHU_CLOSURE.instance;
    public open(): RHU_ELEMENT_OPEN<RHU_HTML<T>> {
        return new RHU_ELEMENT_OPEN<RHU_HTML<T>>(this);
    }

    public copy(): RHU_HTML<T> {
        const copy = new RHU_HTML<T>(this.first, this.interpolations).bind(this._bind);
        copy.boxed = this.boxed;
        for (const callback of this.callbacks.values()) {
            copy.then(callback);
        }
        return copy;
    }
    
    private stitch(interp: string | RHU_NODE | SignalEvent<any> | (string | RHU_NODE | SignalEvent<any>)[], slots: (RHU_ELEMENT | SignalEvent<any>)[]): string | undefined {
        if (isFactory(interp)) {
            throw new SyntaxError("Macro Factory cannot be used to construct a HTML fragment. Did you mean to call the factory?");
        }
        const index = slots.length;
        if (RHU_ELEMENT.is(interp) || isSignal(interp)) {
            slots.push(interp);
            return `<rhu-slot rhu-internal="${index}"></rhu-slot>`;
        } else if (RHU_ELEMENT_OPEN.is(interp)) {
            slots.push(interp.element);
            return `<rhu-slot rhu-internal="${index}">`;
        } else if (RHU_CLOSURE.is(interp)) {
            return `</rhu-slot>`;
        } else {
            return undefined;
        }
    }
    
    protected _dom(target?: Record<PropertyKey, any>): [instance: T, fragment: DocumentFragment, dom: Node[]] {
        // stitch together source
        let source = this.first[0];
        const slots: (RHU_ELEMENT | SignalEvent<any>)[] = [];
        for (let i = 1; i < this.first.length; ++i) {
            const interp = this.interpolations[i - 1];
            const result = this.stitch(interp, slots);
            if (result !== undefined) {
                source += result;
            } else if (Array.isArray(interp)) {
                const array = interp as (string | RHU_NODE | SignalEvent<any>)[];
                for (const interp of array) {
                    const result = this.stitch(interp, slots);
                    if (result !== undefined) {
                        source += result;
                    } else {
                        source += interp;
                    }
                }
            } else {
                source += interp;
            }

            source += this.first[i];
        }

        // parse source
        const template = document.createElement("template");
        template.innerHTML = source;
        const fragment = template.content;

        // Remove nonsense text nodes
        document.createNodeIterator(fragment, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const value = node.nodeValue;
                if (value === null || value === undefined) node.parentNode?.removeChild(node);
                else if (value.trim() === "") node.parentNode?.removeChild(node);
                return NodeFilter.FILTER_REJECT;
            }
        }).nextNode();

        // create bindings
        let instance: Record<PropertyKey, any>;
        const hasBinding = this._bind !== null && this._bind !== undefined;
        if (target !== undefined && !hasBinding && !this.boxed) instance = target;
        else instance = {};
        for (const el of fragment.querySelectorAll("*[m-id]")) {
            const key = el.getAttribute("m-id")!;
            el.removeAttribute("m-id");
            if (key in instance) throw new Error(`The binding '${key}' already exists.`);
            instance[key] = el; 
        }
        if (target !== undefined && hasBinding) {
            if (this._bind! in target) throw new SyntaxError(`The binding '${this._bind!.toString()}' already exists.`);
            target[this._bind!] = instance; 
        }

        // parse slots
        for (const slotElement of fragment.querySelectorAll("rhu-slot[rhu-internal]")) {
            try {
                const attr = slotElement.getAttribute("rhu-internal");
                if (attr === undefined || attr === null) {
                    throw new Error("Could not find internal attribute.");
                }
                const i = parseInt(attr);
                if (isNaN(i)) {
                    throw new Error("Could not find slot id.");
                }

                const slot = slots[i];
                if (!isSignal(slot)) {
                    const frag = slot.dom(instance, slotElement.childNodes)[1];
                    slotElement.replaceWith(frag);
                } else {
                    const node = document.createTextNode(`${slot()}`);
                    const ref = new WeakRef(node);
                    slot.on((value) => {
                        const node = ref.deref();
                        if (node === undefined) return;
                        node.nodeValue = `${value}`;
                    }, { condition: () => ref.deref() !== undefined });
                    slotElement.replaceWith(node);
                }
            } catch (e) {
                slotElement.replaceWith();
                console.error(e);
                continue;
            }
        }

        return [instance, fragment, [...fragment.childNodes]];
    }

    static is: (object: any) => object is RHU_HTML = Object.prototype.isPrototypeOf.bind(RHU_HTML.prototype);
}
export type HTML<T extends Record<PropertyKey, any> = any> = RHU_HTML<T>;
export type html<T extends () => RHU_HTML<any>> = ReturnType<T> extends RHU_HTML<infer Binds> ? Binds : any;

export type RHU_COMPONENT = RHU_HTML | RHU_MACRO;

const isFactorySymbol = Symbol("factory");
interface FACTORY<T extends MacroClass> {
    (...args: MacroParameters<T>): RHU_MACRO<T>;
    readonly close: RHU_CLOSURE;
    readonly [isFactorySymbol]: boolean;
}
function isFactory(object: any): object is FACTORY<typeof MacroElement> {
    if (object === null || object === undefined) return false;
    return object[isFactorySymbol] === true;
} 
export type Macro<F extends FACTORY<any>> = F extends FACTORY<infer T> ? InstanceType<T> : any;

interface MacroNamespace {
    <T extends MacroClass>(type: T, html: (...args: MacroParameters<T>) => RHU_HTML): FACTORY<T>;
    signal<T>(binding: string, value?: T, toString?: (value: T) => string): RHU_SIGNAL<T>;
    create<T extends RHU_MACRO>(macro: T): T extends RHU_MACRO<infer R> ? InstanceType<R> : never;
    observe(node: Node): void;
    map: typeof MapFactory;
    set: typeof SetFactory;
    list: typeof ListFactory;
}

export const Macro = (<T extends MacroClass>(type: T, html: (...args: MacroParameters<T>) => RHU_HTML): FACTORY<T> => {
    const factory: FACTORY<T> = function(...args: MacroParameters<T>) {
        return new RHU_MACRO<T>(html(...args), type, args);
    } as FACTORY<T>;
    (factory as any).close = RHU_CLOSURE.instance;
    (factory as any)[isFactorySymbol] = true;
    return factory; 
}) as MacroNamespace;
Macro.signal = <T>(binding: PropertyKey, value?: T, toString?: (value: T) => string) => new RHU_SIGNAL<T>(binding, toString).value(value!);
Macro.create = <M extends RHU_MACRO>(macro: M): M extends RHU_MACRO<infer T> ? InstanceType<T> : never => {
    const [instance, frag] = macro.dom();
    return instance;
};

// Helper macros for lists and maps
const empty: any[] = [];
type SetValue<T extends Set<any>> = T extends Set<infer V> ? V : unknown;
export class RHU_MAP<K, V, Wrapper extends RHU_COMPONENT = any, Item extends RHU_COMPONENT = any> extends MacroElement {
    constructor(dom: Node[], bindings: ElementInstance<Wrapper>, children: RHU_CHILDREN, wrapperFactory: RHU_COMPONENT, itemFactory: RHU_COMPONENT, append?: SetValue<RHU_MAP<K, V, Wrapper, Item>["onappend"]>, update?: SetValue<RHU_MAP<K, V, Wrapper, Item>["onupdate"]>, remove?: SetValue<RHU_MAP<K, V, Wrapper, Item>["onremove"]>) {
        super(dom, bindings); 

        if (RHU_HTML.is(wrapperFactory)) {
            this.wrapper = bindings;
        } else if (RHU_MACRO.is(wrapperFactory)) {
            this.wrapper = new wrapperFactory.type(dom, bindings, NoChildren, ...wrapperFactory.args);
            // trigger callbacks - NOTE(randomuserhi): Since we dodge calling .dom() on the wrapper, we have to do this
            for (const callback of wrapperFactory.callbacks) {
                callback(this.wrapper, NoChildren, this.wrapper.dom);
            }
        } else {
            throw new SyntaxError("Unsupported wrapper factory type.");
        }
        this.itemFactory = itemFactory;

        if (append !== undefined) this.onappend.add(append);
        if (update !== undefined) this.onupdate.add(update);
        if (remove !== undefined) this.onremove.add(remove);
    }

    private itemFactory: RHU_COMPONENT;
    public wrapper: ElementInstance<Wrapper>;
    public onappend = new Set<(wrapper: ElementInstance<Wrapper>, dom: Node[], item: ElementInstance<Item>, key: K, value: V) => void>();
    public onupdate = new Set<(item: ElementInstance<Item>, key: K, value: V) => void>();
    public onremove = new Set<(wrapper: ElementInstance<Wrapper>, dom: Node[], item: ElementInstance<Item>, key: K, value: V) => void>();

    private _items = new Map<K, { bindings: ElementInstance<Item>, value: V, dom: Node[] }>(); 
    private items = new Map<K, { bindings: ElementInstance<Item>, value: V, dom: Node[] }>();

    public *entries(): IterableIterator<[key: K, value: V, item: ElementInstance<Item>]> {
        for (const [key, item] of this.items.entries()) {
            yield [key, item.value, item.bindings];
        }
    }

    public *values(): IterableIterator<[value: V, item: ElementInstance<Item>]> {
        for (const item of this.items.values()) {
            yield [item.value, item.bindings];
        }
    }

    public *keys(): IterableIterator<K> {
        for (const key of this.items.keys()) {
            yield key;
        }
    }

    public clear() {
        this.assign(empty);
    }

    get size() {
        return this.items.size;
    }

    public has(key: K) {
        return this.items.has(key);
    }

    public get(key: K) {
        return this.items.get(key)?.value;
    }

    public getElement(key: K) {
        return this.items.get(key)?.bindings;
    }

    public set(key: K, value: V) {
        let item = this.items.get(key);
        if (item === undefined) {
            const [bindings, frag] = this.itemFactory.dom();
            item = { bindings, value, dom: [...frag.childNodes] };
            for (const callback of this.onappend) callback(this.wrapper, item.dom, item.bindings, key, value);
        }
        for (const callback of this.onupdate) callback(item.bindings, key, value);
        this.items.set(key, item);
    }

    public remove(key: K) {
        if (!this.items.has(key)) return;
        const item = this.items.get(key)!;
        if (this.onremove.size === 0) {
            for (const node of item.dom) {
                node.parentNode?.removeChild(node);
            }
        } else {
            for (const callback of this.onremove) callback(this.wrapper, item.dom, item.bindings, key, item.value);
        }
    }

    public assign(entries: Iterable<[key: K, value: V]>) {
        for (const [key, value] of entries) {
            let el = this.items.get(key);
            if (el === undefined) el = this._items.get(key);
            if (el === undefined) {
                const [bindings, frag] = this.itemFactory.dom();
                el = { bindings, value, dom: [...frag.childNodes] };
                for (const callback of this.onappend) callback(this.wrapper, el.dom, el.bindings, key, value);
            }
            if (this.onupdate !== undefined) {
                for (const callback of this.onupdate) callback(el.bindings, key, value);
            }
            this._items.set(key, el);
        }
        
        for (const [key, item] of this.items) {
            if (this._items.has(key)) continue;
            if (this.onremove.size === 0) {
                for (const node of item.dom) {
                    node.parentNode?.removeChild(node);
                }
            } else {
                for (const callback of this.onremove) callback(this.wrapper, item.dom, item.bindings, key, item.value);
            }
        }
        
        const temp = this.items;
        this.items = this._items;
        this._items = temp;
        this._items.clear();
    }
}
// NOTE(randomuserhi): Bindings on wrapper or item are ignored.
const MapFactory = function<K, V, Wrapper extends RHU_COMPONENT, Item extends RHU_COMPONENT>(wrapper: Wrapper, item: Item, append?: SetValue<RHU_MAP<K, V, Wrapper, Item>["onappend"]>, update?: SetValue<RHU_MAP<K, V, Wrapper, Item>["onupdate"]>, remove?: SetValue<RHU_MAP<K, V, Wrapper, Item>["onremove"]>) {
    return new RHU_MACRO(RHU_HTML.is(wrapper) ? wrapper : wrapper.html, RHU_MAP<K, V, Wrapper, Item>, [wrapper, item, append, update, remove]);
};
Macro.map = MapFactory;
export class RHU_SET<V, Wrapper extends RHU_COMPONENT = any, Item extends RHU_COMPONENT = any> extends MacroElement {
    constructor(dom: Node[], bindings: ElementInstance<Wrapper>, children: RHU_CHILDREN, wrapperFactory: RHU_COMPONENT, itemFactory: RHU_COMPONENT, append?: SetValue<RHU_SET<V, Wrapper, Item>["onappend"]>, update?: SetValue<RHU_SET<V, Wrapper, Item>["onupdate"]>, remove?: SetValue<RHU_SET<V, Wrapper, Item>["onremove"]>) {
        super(dom, bindings); 

        if (RHU_HTML.is(wrapperFactory)) {
            this.wrapper = bindings;
        } else if (RHU_MACRO.is(wrapperFactory)) {
            this.wrapper = new wrapperFactory.type(dom, bindings, NoChildren, ...wrapperFactory.args);
            // trigger callbacks - NOTE(randomuserhi): Since we dodge calling .dom() on the wrapper, we have to do this
            for (const callback of wrapperFactory.callbacks) {
                callback(this.wrapper, NoChildren, this.wrapper.dom);
            }
        } else {
            throw new SyntaxError("Unsupported wrapper factory type.");
        }
        this.itemFactory = itemFactory;

        if (append !== undefined) this.onappend.add(append);
        if (update !== undefined) this.onupdate.add(update);
        if (remove !== undefined) this.onremove.add(remove);
    }

    private itemFactory: RHU_COMPONENT;
    public wrapper: ElementInstance<Wrapper>;
    public onappend = new Set<(wrapper: ElementInstance<Wrapper>, dom: Node[], item: ElementInstance<Item>, value: V) => void>();
    public onupdate = new Set<(item: ElementInstance<Item>, value: V) => void>();
    public onremove = new Set<(wrapper: ElementInstance<Wrapper>, dom: Node[], item: ElementInstance<Item>, value: V) => void>();

    private _items = new Map<V, { bindings: ElementInstance<Item>, dom: Node[] }>(); 
    private items = new Map<V, { bindings: ElementInstance<Item>, dom: Node[] }>();

    public *entries(): IterableIterator<[value: V, item: ElementInstance<Item>]> {
        for (const [key, item] of this.items.entries()) {
            yield [key, item.bindings];
        }
    }

    public clear() {
        this.assign(empty);
    }

    get size() {
        return this.items.size;
    }

    public has(value: V) {
        return this.items.has(value);
    }

    public getElement(value: V) {
        return this.items.get(value)?.bindings;
    }

    public add(value: V) {
        let item = this.items.get(value);
        if (item === undefined) {
            const [bindings, frag] = this.itemFactory.dom();
            item = { bindings, dom: [...frag.childNodes] };
            for (const callback of this.onappend) callback(this.wrapper, item.dom, item.bindings, value);
        }
        for (const callback of this.onupdate) callback(item.bindings, value);
        this.items.set(value, item);
    }

    public remove(value: V) {
        if (!this.items.has(value)) return;
        const item = this.items.get(value)!;
        if (this.onremove.size === 0) {
            for (const node of item.dom) {
                node.parentNode?.removeChild(node);
            }
        } else {
            for (const callback of this.onremove) callback(this.wrapper, item.dom, item.bindings, value);
        }
    }

    public assign(entries: Iterable<V>) {
        for (const value of entries) {
            let el = this.items.get(value);
            if (el === undefined) el = this._items.get(value);
            if (el === undefined) {
                const [bindings, frag] = this.itemFactory.dom();
                el = { bindings, dom: [...frag.childNodes] };
                for (const callback of this.onappend) callback(this.wrapper, el.dom, el.bindings, value);
            }
            if (this.onupdate !== undefined) {
                for (const callback of this.onupdate) callback(el.bindings, value);
            }
            this._items.set(value, el);
        }
        
        for (const [value, item] of this.items) {
            if (this._items.has(value)) continue;
            if (this.onremove.size === 0) {
                for (const node of item.dom) {
                    node.parentNode?.removeChild(node);
                }
            } else {
                for (const callback of this.onremove) callback(this.wrapper, item.dom, item.bindings, value);
            }
        }
        
        const temp = this.items;
        this.items = this._items;
        this._items = temp;
        this._items.clear();
    }
}
// NOTE(randomuserhi): Bindings on wrapper or item are ignored.
const SetFactory = function<V, Wrapper extends RHU_COMPONENT, Item extends RHU_COMPONENT>(wrapper: Wrapper, item: Item, append?: SetValue<RHU_SET<V, Wrapper, Item>["onappend"]>, update?: SetValue<RHU_SET<V, Wrapper, Item>["onupdate"]>, remove?: SetValue<RHU_SET<V, Wrapper, Item>["onremove"]>) {
    return new RHU_MACRO(RHU_HTML.is(wrapper) ? wrapper : wrapper.html, RHU_SET<V, Wrapper, Item>, [wrapper, item, append, update, remove]);
};
Macro.set = SetFactory;
export class RHU_LIST<V, Wrapper extends RHU_COMPONENT = any, Item extends RHU_COMPONENT = any> extends MacroElement {
    constructor(dom: Node[], bindings: ElementInstance<Wrapper>, children: RHU_CHILDREN, wrapperFactory: RHU_COMPONENT, itemFactory: RHU_COMPONENT, append?: SetValue<RHU_LIST<V, Wrapper, Item>["onappend"]>, update?: SetValue<RHU_LIST<V, Wrapper, Item>["onupdate"]>, remove?: SetValue<RHU_LIST<V, Wrapper, Item>["onremove"]>) {
        super(dom, bindings); 

        if (RHU_HTML.is(wrapperFactory)) {
            this.wrapper = bindings;
        } else if (RHU_MACRO.is(wrapperFactory)) {
            this.wrapper = new wrapperFactory.type(dom, bindings, NoChildren, ...wrapperFactory.args);
            // trigger callbacks - NOTE(randomuserhi): Since we dodge calling .dom() on the wrapper, we have to do this
            for (const callback of wrapperFactory.callbacks) {
                callback(this.wrapper, NoChildren, this.wrapper.dom);
            }
        } else {
            throw new SyntaxError("Unsupported wrapper factory type.");
        }
        this.itemFactory = itemFactory;

        if (append !== undefined) this.onappend.add(append);
        if (update !== undefined) this.onupdate.add(update);
        if (remove !== undefined) this.onremove.add(remove);
    }

    private itemFactory: RHU_COMPONENT;
    public wrapper: ElementInstance<Wrapper>;
    public onappend = new Set<(wrapper: ElementInstance<Wrapper>, dom: Node[], item: ElementInstance<Item>, value: V, index: number) => void>();
    public onupdate = new Set<(item: ElementInstance<Item>, value: V, index: number) => void>();
    public onremove = new Set<(wrapper: ElementInstance<Wrapper>, dom: Node[], item: ElementInstance<Item>, value: V, index: number) => void>();

    private _items: { bindings: ElementInstance<Item>, value: V, dom: Node[] }[] = [];
    private items: { bindings: ElementInstance<Item>, value: V, dom: Node[] }[] = [];

    public *entries(): IterableIterator<[index: number, value: V, item: ElementInstance<Item>]> {
        for (const [key, item] of this.items.entries()) {
            yield [key, item.value, item.bindings];
        }
    }

    public *values(): IterableIterator<[value: V, item: ElementInstance<Item>]> {
        for (const item of this.items.values()) {
            yield [item.value, item.bindings];
        }
    }

    public clear() {
        this.assign(empty);
    }

    get length() {
        return this.items.length;
    }

    public get(index: number) {
        return this.items[index].value; 
    }

    public getElement(index: number) {
        return this.items[index].bindings;
    }

    public remove(index: number) {
        const item = this.items[index];
        if (item === undefined) return;
        if (this.onremove.size === 0) {
            for (const node of item.dom) {
                node.parentNode?.removeChild(node);
            }
        } else {
            for (const callback of this.onremove) callback(this.wrapper, item.dom, item.bindings, item.value, index);
        }
        this.items.splice(index, 1);
    }

    public push(value: V) {
        this.insert(value, this.items.length);
    }

    public insert(value: V, index: number) {
        let el = this.items[index];
        if (el === undefined) {
            const [bindings, frag] = this.itemFactory.dom();
            el = { bindings, value, dom: [...frag.childNodes] };
            for (const callback of this.onappend) callback(this.wrapper, el.dom, el.bindings, value, index);
        }
        if (this.onupdate !== undefined) {
            for (const callback of this.onupdate) callback(el.bindings, value, index);
        }

        this.items[index] = el;
    }

    public assign(entries: Iterable<V>) {
        const iter = entries[Symbol.iterator]();
        let current = iter.next();
        let i = 0;
        for (; current.done === false; ++i, current = iter.next()) {
            const value = current.value; 
            let el = this.items[i];
            if (el === undefined) {
                const [bindings, frag] = this.itemFactory.dom();
                el = { bindings, value, dom: [...frag.childNodes] };
                for (const callback of this.onappend) callback(this.wrapper, el.dom, el.bindings, value, i);
            }
            if (this.onupdate !== undefined) {
                for (const callback of this.onupdate) callback(el.bindings, value, i);
            }

            this._items[i] = el;
        }
        
        for (; i < this.items.length; ++i) {
            const item = this.items[i];
            if (item === undefined) continue;
            if (this.onremove.size === 0) {
                for (const node of item.dom) {
                    node.parentNode?.removeChild(node);
                }
            } else {
                for (const callback of this.onremove) callback(this.wrapper, item.dom, item.bindings, item.value, i);
            }
        }

        const temp = this.items;
        this.items = this._items;
        this._items = temp;
        this._items.length = 0;
    }
}
// NOTE(randomuserhi): Bindings on wrapper or item are ignored.
const ListFactory = function<V, Wrapper extends RHU_COMPONENT, Item extends RHU_COMPONENT>(wrapper: Wrapper, item: Item, append?: SetValue<RHU_LIST<V, Wrapper, Item>["onappend"]>, update?: SetValue<RHU_LIST<V, Wrapper, Item>["onupdate"]>, remove?: SetValue<RHU_LIST<V, Wrapper, Item>["onremove"]>) {
    return new RHU_MACRO(RHU_HTML.is(wrapper) ? wrapper : wrapper.html, RHU_LIST<V, Wrapper, Item>, [wrapper, item, append, update, remove]);
};
Macro.list = ListFactory;

declare global {
    interface GlobalEventHandlersEventMap {
        "mount": CustomEvent;
        "dismount": CustomEvent;
    }
}

// Custom event and observer to add some nice events
const isElement:(object: any) => object is Element = Object.prototype.isPrototypeOf.bind(Element.prototype);
const recursiveDispatch = function(node: Node, event: keyof GlobalEventHandlersEventMap): void {
    if (isElement(node)) node.dispatchEvent(new CustomEvent(event));
    for (const child of node.childNodes)
        recursiveDispatch(child, event);
};
const observer = new MutationObserver(function(mutationList) {
    for (const mutation of mutationList) {
        switch (mutation.type) {
        case "childList": {
            for (const node of mutation.addedNodes)
                recursiveDispatch(node, "mount");
            for (const node of mutation.removedNodes)
                recursiveDispatch(node, "dismount");
        } break;
        }
    }
});
// Allows you to assign macro observation to other docs to trigger macro updates
Macro.observe = function(target: Node): void {
    observer.observe(target, {
        childList: true,
        subtree: true
    });
};

const onDocumentLoad = function() {
    Macro.observe(document);
};
if (document.readyState === "loading") 
    document.addEventListener("DOMContentLoaded", onDocumentLoad);
// Document may have loaded already if the script is declared as defer, in this case just call onload
else 
    onDocumentLoad();