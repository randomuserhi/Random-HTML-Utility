import { Signal, signal } from "./signal.js";

// TODO(randomuserhi): Re-write and cleanup code
// TODO(randomuserhi): Documentation

abstract class NODE {

    static is: (object: any) => object is NODE = Object.prototype.isPrototypeOf.bind(NODE.prototype);
}

class CLOSURE extends NODE {
    static instance = new CLOSURE();
    static is: (object: any) => object is CLOSURE = Object.prototype.isPrototypeOf.bind(CLOSURE.prototype);
}

const symbols: {
    readonly factory: unique symbol;
} = {
    factory: Symbol("factory"),
} as any;

class ELEMENT extends NODE {
    private _bind?: PropertyKey;
    public bind(key?: PropertyKey) {
        this._bind = key;
        return this;
    }

    static is: (object: any) => object is ELEMENT = Object.prototype.isPrototypeOf.bind(ELEMENT.prototype);
}

class SIGNAL extends ELEMENT {

    constructor(binding: string) {
        super();
        this.bind(binding);
    }

    private _value?: string;
    public value(value?: string) {
        this._value = value;
        return this;
    }

    static is: (object: any) => object is SIGNAL = Object.prototype.isPrototypeOf.bind(SIGNAL.prototype);
}

export class MacroElement {
    public readonly dom: Node[];

    constructor(dom: Node[], bindings?: any, target?: any) {
        this.dom = dom;

        if (bindings !== undefined && bindings !== null) {
            if (target !== undefined && target !== null) {
                Object.assign(target, bindings);
            } else {
                Object.assign(this, bindings);
            }
        }
    }

    static is: (object: any) => object is MacroElement = Object.prototype.isPrototypeOf.bind(MacroElement.prototype);
}
type MacroClass = new (dom: Node[], bindings: any, children: Node[], ...args: any[]) => any;
type MacroParameters<T extends MacroClass> = T extends new (dom: Node[], bindings: any, children: Node[], ...args: infer P) => any ? P : never;

class _MACRO<T extends MacroClass = MacroClass> extends ELEMENT {
    public type: T;
    public html: HTML;
    public args: MacroParameters<T>;
    public callbacks = new Set<(macro: InstanceType<T>) => void>();
    
    constructor(html: HTML, type: T, args: MacroParameters<T>) {
        super();
        this.html = html;
        this.type = type;
        this.args = args;
    }

    public then(callback: (macro: InstanceType<T>) => void) {
        this.callbacks.add(callback);
        return this;
    }

    static is: (object: any) => object is _MACRO = Object.prototype.isPrototypeOf.bind(_MACRO.prototype);
}
export type MACRO<F extends FACTORY<any>> = _MACRO<F extends FACTORY<infer T> ? T: any>;

class MACRO_OPEN<T extends MacroClass = MacroClass> extends _MACRO<T> {

    static is: (object: any) => object is MACRO_OPEN = Object.prototype.isPrototypeOf.bind(MACRO_OPEN.prototype);
}

export function html<T extends {} = any>(first: HTML["first"], ...interpolations: HTML["interpolations"]): HTML<T> {
    return new HTML<T>(first, interpolations);
}
// TODO(randomuserhi): Nested parsing error handling -> display stack trace of parser to make debugging easier
export class HTML<T extends Record<PropertyKey, any> | void = any> {
    public static empty = html``;
    
    private first: TemplateStringsArray;
    private interpolations: (string | NODE | (string | NODE)[])[];
    
    constructor(first: HTML["first"], interpolations: HTML["interpolations"]) {
        this.first = first;
        this.interpolations = interpolations;
    }

    private _bind?: PropertyKey;
    public bind(key?: PropertyKey) {
        this._bind = key;
        return this;
    }

    public callbacks = new Set<(bindings: T) => void>();
    public then(callback: (bindings: T) => void) {
        this.callbacks.add(callback);
        return this;
    }

    private stitch(interp: string | NODE | (string | NODE)[], html: HTML[], macros: _MACRO[], signals: SIGNAL[]): string | undefined {
        let result: string | undefined = undefined;
        if (isFactory(interp)) {
            throw new SyntaxError("Macro Factory cannot be used to construct a HTML fragment. Did you mean to call the factory?");
        }
        if (HTML.is(interp)) {
            result = `<rhu-html rhu-internal="${html.length}"></rhu-html>`;
            html.push(interp);
        } else if (NODE.is(interp)) {
            if (CLOSURE.is(interp)) {
                result = `</rhu-macro>`;
            } else if (MACRO_OPEN.is(interp)) {
                result = `<rhu-macro rhu-internal="${macros.length}">`;
                macros.push(interp);
            }  else if (_MACRO.is(interp)) {
                result = `<rhu-macro rhu-internal="${macros.length}"></rhu-macro>`;
                macros.push(interp);
            } else if (SIGNAL.is(interp)) {
                result = `<rhu-signal rhu-internal="${signals.length}"></rhu-signal>`;
                signals.push(interp);
            }
        }
        return result;
    }

    // NOTE(randomuserhi): On error, returns blank bindings and fragment => but proceeds
    public dom<B extends Record<PropertyKey, any> | void = void>(shouldThrow = false): [bindings: B extends void ? T : B, fragment: DocumentFragment] {
        try {
            // stitch together source
            let source = this.first[0];
            const html: HTML[] = [];
            const macros: _MACRO[] = [];
            const signals: SIGNAL[] = [];
            for (let i = 1; i < this.first.length; ++i) {
                const interp = this.interpolations[i - 1];
                const result = this.stitch(interp, html, macros, signals);
                if (result !== undefined) {
                    source += result;
                } else if (Array.isArray(interp)) {
                    const array = interp as (string | NODE)[];
                    for (const interp of array) {
                        const result = this.stitch(interp, html, macros, signals);
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
        
            // create bindings
            const bindings: any = {};
            for (const el of fragment.querySelectorAll("*[m-id]")) {
                const key = el.getAttribute("m-id")!;
                el.removeAttribute("m-id");
                if (key in bindings) throw new SyntaxError(`The binding '${key}' already exists.`);
                bindings[key] = el; 
            }

            // Remove nonsense text nodes
            document.createNodeIterator(fragment, NodeFilter.SHOW_TEXT, {
                acceptNode(node) {
                    const value = node.nodeValue;
                    if (value === null || value === undefined) node.parentNode?.removeChild(node);
                    else if (value.trim() === "") node.parentNode?.removeChild(node);
                    return NodeFilter.FILTER_REJECT;
                }
            }).nextNode();

            // handle signals
            for (let i = 0; i < signals.length; ++i) {
            // find slot on fragment
                const slot = fragment.querySelector(`rhu-signal[rhu-internal="${i}"]`);
                if (slot === undefined || slot === null) throw new Error(`Unable to find slot for signal '${i}'.`);

                const sig = signals[i];

                let instance: Signal<string> | undefined = undefined;
                const sig_value: SIGNAL["_value"] = (sig as any)._value;

                // create binding, or share signal if binding already exists
                const sig_bind: ELEMENT["_bind"] = (sig as any)._bind;
                if (sig_bind !== undefined && sig_bind !== null) {
                    if (!(sig_bind in bindings)) {
                        bindings[sig_bind] = signal(sig_value !== undefined && sig_value !== null ? sig_value : "");
                    }
                    instance = bindings[sig_bind]; 
                }

                // create text node and signal event
                const node = document.createTextNode(sig_value === undefined ? "" : sig_value);
                instance?.on((value) => node.nodeValue = value);

                // replace slot
                slot.replaceWith(node);
            }

            // handle html
            for (let i = 0; i < html.length; ++i) {
            // find slot on fragment
                const slot = fragment.querySelector(`rhu-html[rhu-internal="${i}"]`);
                if (slot === undefined || slot === null) throw new Error(`Unable to find slot for HTML '${i}'.`);

                const HTML = html[i];

                // get fragment
                const [instance, frag] = HTML.dom();
            
                // create binding
                const html_bind: HTML["_bind"] = (HTML as any)._bind;
                if (html_bind !== undefined && html_bind !== null) {
                    if (html_bind in bindings) throw new SyntaxError(`The binding '${html_bind.toString()}' already exists.`);
                    bindings[html_bind] = instance; 
                }

                // replace slot
                slot.replaceWith(frag);
            }

            // find slots
            const slots = new Array(macros.length);
            for (let i = 0; i < macros.length; ++i) {
            // find slot on fragment
                const slot = fragment.querySelector(`rhu-macro[rhu-internal="${i}"]`);
                if (slot === undefined || slot === null) throw new Error(`Unable to find slot for macro '${i}'.`);
                slots[i] = slot;
            }

            // handle nested macros (continue on error)
            for (let i = 0; i < macros.length; ++i) {
                // get slot
                const slot = slots[i];
                try {
                    // get children
                    const children = [...slot.childNodes];
                    // remove children
                    slot.replaceChildren();

                    // parse macro
                    const macro = macros[i];
                    const [b, frag] = macro.html.dom(true);
                    const dom = [...frag.childNodes];
                    frag.replaceChildren();

                    // create instance
                    const instance = new macro.type(dom, b, children, ...macro.args);

                    // trigger callbacks
                    for (const callback of macro.callbacks) {
                        callback(instance);
                    }

                    // create binding
                    const macro_bind: ELEMENT["_bind"] = (macro as any)._bind;
                    if (macro_bind !== undefined && macro_bind !== null) {
                        if (macro_bind in bindings) throw new SyntaxError(`The binding '${macro_bind.toString()}' already exists.`);
                        bindings[macro_bind] = instance; 
                    }

                    // attach macro back to fragment
                    slot.replaceWith(...dom);
                } catch(e) {
                    if (shouldThrow) throw e;

                    console.error(e);
                    // clear slot
                    slot.replaceWith();
                }
            }

            // trigger callbacks
            for (const callback of this.callbacks) {
                callback(bindings);
            }

            return [bindings as B extends void ? T : B, fragment];
        } catch (e) {
            if (shouldThrow) throw e;

            console.error(e);
            return [{} as B extends void ? T : B, new DocumentFragment()];
        }
    }

    static is: (object: any) => object is HTML = Object.prototype.isPrototypeOf.bind(HTML.prototype);
}
type HTMLBindings<T extends HTML<any>> = T extends HTML<infer Bindings> ? Bindings : any; 

interface FACTORY<T extends MacroClass> {
    (...args: MacroParameters<T>): _MACRO<T>;
    readonly open: (...args: MacroParameters<T>) => MACRO_OPEN<T>;
    readonly close: CLOSURE;
    readonly [symbols.factory]: boolean;
}
function isFactory(object: any): object is FACTORY<typeof MacroElement> {
    if (object === null || object === undefined) return false;
    return object[symbols.factory] === true;
} 
export type Macro<F extends FACTORY<any>> = F extends FACTORY<infer T> ? InstanceType<T> : any;

interface MacroNamespace {
    <T extends MacroClass>(type: T, html: HTML): FACTORY<T>;
    signal(binding: string, value?: string): SIGNAL;
    create<T extends _MACRO>(macro: T): T extends _MACRO<infer R> ? InstanceType<R> : never;
    observe(node: Node): void;
    map: typeof MapFactory;
    list: typeof ListFactory;
}

export const Macro = (<T extends MacroClass>(type: T, html: HTML): FACTORY<T> => {
    const factory = function(...args: MacroParameters<T>) {
        return new _MACRO<T>(html, type, args);
    } as FACTORY<T>;
    (factory as any).open = function(...args: MacroParameters<T>) {
        return new MACRO_OPEN<T>(html, type, args);
    };
    (factory as any).close = CLOSURE.instance;
    (factory as any)[symbols.factory] = true;
    return factory; 
}) as MacroNamespace;
Macro.signal = (binding: string, value?: string) => new SIGNAL(binding).value(value);
Macro.create = <M extends _MACRO>(macro: M): M extends _MACRO<infer T> ? InstanceType<T> : never => {
    // parse macro
    const [b, frag] = macro.html.dom();
    const dom = [...frag.childNodes];
    frag.replaceChildren();

    // create instance
    const instance = new macro.type(dom, b, [], ...macro.args);
    // trigger callbacks
    for (const callback of macro.callbacks) {
        callback(instance);
    }
    return instance;
};
// Helper macros for lists and maps
type HTMLMACRO = HTML<any> | _MACRO<any>;
type HTMLMACROInstance<T extends HTMLMACRO> = T extends HTML<any> ? HTMLBindings<T> : T extends _MACRO<any> ? InstanceType<T["type"]> : any;
class _MacroMap<K, V, Wrapper extends HTMLMACRO, Item extends HTMLMACRO> extends MacroElement {
    constructor(dom: Node[], bindings: HTMLMACROInstance<Wrapper>, children: Node[], wrapperFactory: HTMLMACRO, itemFactory: HTMLMACRO, append: (wrapper: HTMLMACROInstance<Wrapper>, dom: Node[], item: HTMLMACROInstance<Item>) => void, update: (item: HTMLMACROInstance<Item>, key: K, value: V) => void, remove?: (wrapper: HTMLMACROInstance<Wrapper>, dom: Node[], item: HTMLMACROInstance<Item>) => void) {
        super(dom, bindings); 

        if (HTML.is(wrapperFactory)) {
            this.wrapper = bindings;
        } else if (_MACRO.is(wrapperFactory)) {
            this.wrapper = new wrapperFactory.type(dom, bindings, [], ...wrapperFactory.args);
            // trigger callbacks
            for (const callback of wrapperFactory.callbacks) {
                callback(this.wrapper);
            }
        } else {
            throw new SyntaxError("Unsupported wrapper factory type.");
        }
        this.itemFactory = itemFactory;
        this.onappend = append;
        this.onupdate = update;
        this.onremove = remove;
    }

    private itemFactory: HTMLMACRO;
    public wrapper: HTMLMACROInstance<Wrapper>;
    private onappend: (wrapper: HTMLMACROInstance<Wrapper>, dom: Node[], item: HTMLMACROInstance<Item>) => void;
    private onupdate: (item: HTMLMACROInstance<Item>, key: K, value: V) => void;
    private onremove?: (wrapper: HTMLMACROInstance<Wrapper>, dom: Node[], item: HTMLMACROInstance<Item>) => void;

    private _items = new Map<K, { bindings: HTMLMACROInstance<Item>, value: V, dom: Node[] }>(); 
    private items = new Map<K, { bindings: HTMLMACROInstance<Item>, value: V, dom: Node[] }>();

    public *entries(): IterableIterator<[key: K, value: V, item: HTMLMACROInstance<Item>]> {
        for (const [key, item] of this.items.entries()) {
            yield [key, item.value, item.bindings];
        }
    }

    get size() {
        return this.items.size;
    }

    public get(key: K) {
        return this.items.get(key)?.bindings;
    }

    public set(key: K, value: V) {
        let item = this.items.get(key);
        if (item === undefined) {
            let bindings: any;
            if (HTML.is(this.itemFactory)) {
                let frag: DocumentFragment;
                [bindings, frag] = this.itemFactory.dom();
                item = { bindings, value, dom: [...frag.childNodes] };
            } else if (_MACRO.is(this.itemFactory)) {
                bindings = Macro.create(this.itemFactory);
                item = { bindings, value, dom: bindings.dom };
            } else {
                throw new SyntaxError("Unsupported item factory type.");
            }
            this.onappend(this.wrapper, item.dom, item.bindings);
        }
        this.onupdate(item.bindings, key, value);
        this.items.set(key, item);
    }

    public remove(key: K) {
        if (!this.items.has(key)) return;
        const item = this.items.get(key)!;
        if (this.onremove === undefined) {
            for (const node of item.dom) {
                node.parentNode?.removeChild(node);
            }
        } else {
            this.onremove(this.wrapper, item.dom, item.bindings);
        }
    }

    public assign(entries: Iterable<[key: K, value: V]>) {
        for (const [key, value] of entries) {
            let el = this.items.get(key);
            if (el === undefined) {
                let bindings: any;
                if (HTML.is(this.itemFactory)) {
                    let frag: DocumentFragment;
                    [bindings, frag] = this.itemFactory.dom();
                    el = { bindings, value, dom: [...frag.childNodes] };
                } else if (_MACRO.is(this.itemFactory)) {
                    bindings = Macro.create(this.itemFactory);
                    el = { bindings, value, dom: bindings.dom };
                } else {
                    throw new SyntaxError("Unsupported item factory type.");
                }
                this.onappend(this.wrapper, el.dom, el.bindings);
            }
            this.onupdate(el.bindings, key, value);
            this._items.set(key, el);
        }
        
        for (const [key, item] of this.items) {
            if (this._items.has(key)) continue;
            if (this.onremove === undefined) {
                for (const node of item.dom) {
                    node.parentNode?.removeChild(node);
                }
            } else {
                this.onremove(this.wrapper, item.dom, item.bindings);
            }
        }
        
        const temp = this.items;
        this.items = this._items;
        this._items = temp;
        this._items.clear();
    }
}
export type MacroMap<K, V, Wrapper extends HTMLMACRO = any, Item extends HTMLMACRO = any> = _MacroMap<K, V, Wrapper, Item>; 
// NOTE(randomuserhi): Bindings on wrapper or item are ignored.
const MapFactory = function<K, V, Wrapper extends HTMLMACRO, Item extends HTMLMACRO>(wrapper: Wrapper, item: Item, append: (wrapper: HTMLMACROInstance<Wrapper>, dom: Node[], item: HTMLMACROInstance<Item>) => void, update: (item: HTMLMACROInstance<Item>, key: K, value: V) => void, remove?: (wrapper: HTMLMACROInstance<Wrapper>, dom: Node[], item: HTMLMACROInstance<Item>) => void) {
    return new _MACRO(HTML.is(wrapper) ? wrapper : wrapper.html, _MacroMap<K, V, Wrapper, Item>, [wrapper, item, append, update, remove]);
};
Macro.map = MapFactory;
class _MacroList<V, Wrapper extends HTMLMACRO, Item extends HTMLMACRO> extends MacroElement {
    constructor(dom: Node[], bindings: HTMLMACROInstance<Wrapper>, children: Node[], wrapperFactory: HTMLMACRO, itemFactory: HTMLMACRO, append: (wrapper: HTMLMACROInstance<Wrapper>, dom: Node[], item: HTMLMACROInstance<Item>) => void, update: (item: HTMLMACROInstance<Item>, value: V, index: number) => void, remove?: (wrapper: HTMLMACROInstance<Wrapper>, dom: Node[], item: HTMLMACROInstance<Item>) => void) {
        super(dom, bindings); 

        if (HTML.is(wrapperFactory)) {
            this.wrapper = bindings;
        } else if (_MACRO.is(wrapperFactory)) {
            this.wrapper = new wrapperFactory.type(dom, bindings, [], ...wrapperFactory.args);
            // trigger callbacks
            for (const callback of wrapperFactory.callbacks) {
                callback(this.wrapper);
            }
        } else {
            throw new SyntaxError("Unsupported wrapper factory type.");
        }
        this.itemFactory = itemFactory;
        this.onappend = append;
        this.onupdate = update;
        this.onremove = remove;
    }

    private itemFactory: HTMLMACRO;
    public wrapper: HTMLMACROInstance<Wrapper>;
    private onappend: (wrapper: HTMLMACROInstance<Wrapper>, dom: Node[], item: HTMLMACROInstance<Item>) => void;
    private onupdate: (item: HTMLMACROInstance<Item>, value: V, index: number) => void;
    private onremove?: (wrapper: HTMLMACROInstance<Wrapper>, dom: Node[], item: HTMLMACROInstance<Item>) => void;

    private _items: { bindings: HTMLMACROInstance<Item>, value: V, dom: Node[] }[] = [];
    private items: { bindings: HTMLMACROInstance<Item>, value: V, dom: Node[] }[] = [];

    public *entries(): IterableIterator<[index: number, value: V, item: HTMLMACROInstance<Item>]> {
        for (const [key, item] of this.items.entries()) {
            yield [key, item.value, item.bindings];
        }
    }

    get length() {
        return this.items.length;
    }

    public get(index: number) {
        return this.items[index].bindings; 
    }

    public remove(index: number) {
        const item = this.items[index];
        if (item === undefined) return;
        if (this.onremove === undefined) {
            for (const node of item.dom) {
                node.parentNode?.removeChild(node);
            }
        } else {
            this.onremove(this.wrapper, item.dom, item.bindings);
        }
        this.items.splice(index, 1);
    }

    public push(value: V) {
        this.insert(value, this.items.length);
    }

    public insert(value: V, index: number) {
        let el = this.items[index];
        if (el === undefined) {
            let bindings: any;
            if (HTML.is(this.itemFactory)) {
                let frag: DocumentFragment;
                [bindings, frag] = this.itemFactory.dom();
                el = { bindings, value, dom: [...frag.childNodes] };
            } else if (_MACRO.is(this.itemFactory)) {
                bindings = Macro.create(this.itemFactory);
                el = { bindings, value, dom: bindings.dom };
            } else {
                throw new SyntaxError("Unsupported item factory type.");
            }
            this.onappend(this.wrapper, el.dom, el.bindings);
        }
        this.onupdate(el.bindings, value, index);

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
                let bindings: any;
                if (HTML.is(this.itemFactory)) {
                    let frag: DocumentFragment;
                    [bindings, frag] = this.itemFactory.dom();
                    el = { bindings, value, dom: [...frag.childNodes] };
                } else if (_MACRO.is(this.itemFactory)) {
                    bindings = Macro.create(this.itemFactory);
                    el = { bindings, value, dom: bindings.dom };
                } else {
                    throw new SyntaxError("Unsupported item factory type.");
                }
                this.onappend(this.wrapper, el.dom, el.bindings);
            }
            this.onupdate(el.bindings, value, i);

            this._items[i] = el;
        }
        
        for (; i < this.items.length; ++i) {
            const item = this.items[i];
            if (item === undefined) continue;
            if (this.onremove === undefined) {
                for (const node of item.dom) {
                    node.parentNode?.removeChild(node);
                }
            } else {
                this.onremove(this.wrapper, item.dom, item.bindings);
            }
        }

        const temp = this.items;
        this.items = this._items;
        this._items = temp;
        this._items.length = 0;
    }
}
export type MacroList<V, Wrapper extends HTMLMACRO = any, Item extends HTMLMACRO = any> = _MacroList<V, Wrapper, Item>; 
// NOTE(randomuserhi): Bindings on wrapper or item are ignored.
const ListFactory = function<V, Wrapper extends HTMLMACRO, Item extends HTMLMACRO>(wrapper: Wrapper, item: Item, append: (wrapper: HTMLMACROInstance<Wrapper>, dom: Node[], item: HTMLMACROInstance<Item>) => void, update: (item: HTMLMACROInstance<Item>, value: V, index: number) => void, remove?: (wrapper: HTMLMACROInstance<Wrapper>, dom: Node[], item: HTMLMACROInstance<Item>) => void) {
    return new _MACRO(HTML.is(wrapper) ? wrapper : wrapper.html, _MacroList<V, Wrapper, Item>, [wrapper, item, append, update, remove]);
};
Macro.list = ListFactory;

declare global {
    interface GlobalEventHandlersEventMap {
        "mount": CustomEvent;
    }
}

// Custom event and observer to add some nice events
const isElement:(object: any) => object is Element = Object.prototype.isPrototypeOf.bind(Element.prototype);
const recursiveDispatch = function(node: Node): void {
    if (isElement(node)) node.dispatchEvent(new CustomEvent("mount"));
    for (const child of node.childNodes)
        recursiveDispatch(child);
};
const observer = new MutationObserver(function(mutationList) {
    for (const mutation of mutationList) {
        switch (mutation.type) {
        case "childList": {
            for (const node of mutation.addedNodes)
                recursiveDispatch(node);
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