import { isSignal, Signal, SignalEvent } from "./signal.js";

// Helper functions
const isMap: <K = any, V = any>(object: any) => object is Map<K, V> = Object.prototype.isPrototypeOf.bind(Map.prototype);
const isArray: <T = any>(object: any) => object is Array<T> = Object.prototype.isPrototypeOf.bind(Array.prototype);
const isNode: (object: any) => object is Node = Object.prototype.isPrototypeOf.bind(Node.prototype);

// Maps used to determine what elements belong to what fragments and keep track of
// base comment nodes used to positionaly disern fragments (HTML).
const fragNodeMap = new WeakMap<Node | HTML, FRAG>();
const baseNodes = new WeakMap<Comment, HTML>();

(window as any).debug = {
    fragNodeMap,
    baseNodes
};

class FRAG<T extends Record<PropertyKey, any> = Record<PropertyKey, any>> {
    public owner: HTML<T> | undefined;

    constructor(owner: HTML<T> | undefined = undefined) {
        this.owner = owner;
    }
}

// Fragment collection manager (manages what elements make up a fragment)
interface RHU_COLLECTION_NODE {
    node: HTML | Node;
    next?: RHU_COLLECTION_NODE;
    prev?: RHU_COLLECTION_NODE;
}

class RHU_COLLECTION<T extends Record<PropertyKey, any> = Record<PropertyKey, any>> {
    private set = new Map<HTML | Node, RHU_COLLECTION_NODE>();
    
    constructor(owner: HTML<T>, ...nodes: (HTML | Node)[]) {
        this.owner = owner;

        // NOTE(randomuserhi): A comment is used to control garbage collection when referencing RHU_HTML elements
        //                     If some code needs to run without holding a strong reference to the elements / html object,
        //                     it will pass all references through this comment.
        //
        //                     This way, if the comment html object is GC'd but the comment remains on DOM, everything still
        //                     works and vice versa (since the comment holds a reference to the html object).
        //                     
        //                     But if both the comment and the html object is GC'd then the reference can be cleared and detected
        //                     through the WeakRef to this comment node.
        //
        //                     The comment node also serves as a positional point so the code knows where to append / replace
        //                     nodes to.
        this.last = document.createComment(" << rhu-node >> ");
        baseNodes.set(this.last as Comment, owner);

        this._first = this._last = { node: this.last };

        this.append(...nodes);
    }

    static unbind(node: HTML | Node) {
        // Unbind node if it is bounded
        const frag = fragNodeMap.get(node);
        if (frag?.owner !== undefined) {
            frag.owner[DOM].remove(node);
        }
    }

    public remove(...nodes: (HTML | Node)[]) {
        for (const node of nodes) {
            if (node === this.owner) continue;

            // skip if it is a base node
            if (baseNodes.has(node as any)) continue;

            // remove from collection
            const frag = fragNodeMap.get(node);
            if (frag?.owner === this.owner) {
                frag.owner = undefined;
                fragNodeMap.delete(node);
            }
            
            const el = this.set.get(node);
            if (el === undefined) continue;

            if (el.prev !== undefined) el.prev.next = el.next;
            else this._first = el.next!;
            if (el.next !== undefined) el.next.prev = el.prev;

            this.set.delete(node);

            // remove from dom
            const parentNode = this.last.parentNode;
            if (parentNode !== null) {
                if (isHTML(node)) {
                    for (const n of node) {
                        if (n.parentNode === parentNode) parentNode.removeChild(n);
                    }
                } else {
                    if (node.parentNode === parentNode) {
                        parentNode.removeChild(node);
                    }
                }
            }

            --this._length;
        }
    }

    public append(...nodes: (HTML | Node)[]) {
        for (const node of nodes) {
            if (node === this.owner) continue;

            // skip if it is a base node
            if (baseNodes.has(node as any)) continue;
            
            // keep track of element in fragNodeMap
            if (!fragNodeMap.has(node)) {
                fragNodeMap.set(node, new FRAG());
            }
            const frag = fragNodeMap.get(node)!;

            // remove from collection
            if (frag.owner !== undefined) {
                frag.owner[DOM].elements.remove(node);
            }

            // add to collection
            frag.owner = this.owner;
            const linkage: RHU_COLLECTION_NODE = { 
                node,
                prev: this._last.prev,
                next: this._last
            };
            this._last.prev = linkage;
            if (linkage.prev !== undefined) linkage.prev.next = linkage;
            else this._first = linkage;
            this.set.set(node, linkage);

            // append to dom
            if (this.last.parentNode !== null) {
                if (isHTML(node)) {
                    for (const n of node) {
                        this.last.parentNode.insertBefore(n, this.last);
                    }
                } else {
                    this.last.parentNode.insertBefore(node, this.last);
                }
            }

            ++this._length;
        }
    }

    public insertBefore(node: (HTML | Node), child?: (HTML | Node)) {
        if (node === this.owner) return;

        // skip if it is a base node
        if (baseNodes.has(node as any)) return;
        
        // keep track of element in fragNodeMap
        if (!fragNodeMap.has(node)) {
            fragNodeMap.set(node, new FRAG());
        }
        const frag = fragNodeMap.get(node)!;

        // remove from old collection
        if (frag.owner !== undefined) {
            frag.owner[DOM].elements.remove(node);
        }

        // find target
        let target = child === undefined ? undefined : this.set.get(child);
        if (target === undefined) {
            target = this._last;
        }

        // add to collection
        frag.owner = this.owner;
        const linkage: RHU_COLLECTION_NODE = { 
            node,
            prev: target.prev,
            next: target
        };
        target.prev = linkage;
        if (linkage.prev !== undefined) linkage.prev.next = linkage;
        else this._first = linkage;
        this.set.set(node, linkage);

        // append to dom
        if (this.last.parentNode !== null) {
            let appendNode = isHTML(target.node) ? target.node[DOM].first : target.node;
            if (appendNode.parentNode !== this.last.parentNode) {
                appendNode = this.last;
            }

            if (isHTML(node)) {
                for (const n of node) {
                    this.last.parentNode.insertBefore(n, appendNode);
                }
            } else {
                this.last.parentNode.insertBefore(node, appendNode);
            }
        }

        ++this._length;
    }

    private readonly owner: HTML<T>;

    private _first: RHU_COLLECTION_NODE;
    private _last: RHU_COLLECTION_NODE;
    private _length: number = 0;
    
    get first() { return this._first.node; }
    public readonly last: Node;
    get length() { return this._length; }

    public *[Symbol.iterator]() {
        let current: RHU_COLLECTION_NODE | undefined = this._first;
        while (current !== undefined) {
            yield current.node;
            current = current.next;
        }
    }
}

class RHU_CLOSURE {
    static instance = new RHU_CLOSURE();
    static is: (object: any) => object is RHU_CLOSURE = Object.prototype.isPrototypeOf.bind(RHU_CLOSURE.prototype);
}

class RHU_MARKER {
    private name?: PropertyKey;
    public bind(name?: PropertyKey) {
        this.name = name;
        return this;
    }

    static is: (object: any) => object is RHU_MARKER = Object.prototype.isPrototypeOf.bind(RHU_MARKER.prototype);
}

class RHU_NODE<T extends Record<PropertyKey, any> = Record<PropertyKey, any>> {
    public readonly node: HTML<T>;

    private name?: PropertyKey;
    private isOpen: boolean = false;

    public bind(name?: PropertyKey) {
        this.name = name;
        return this;
    }

    public open() {
        this.isOpen = true;
        return this;
    }

    private boxed?: boolean;
    public box(boxed: boolean = true) {
        this.boxed = boxed;
        return this;
    }

    constructor(node: HTML<T>) {
        this.node = node;
    }

    static is: (object: any) => object is RHU_NODE = Object.prototype.isPrototypeOf.bind(RHU_NODE.prototype);
}

const RHU_HTML_PROTOTYPE = {};
Object.defineProperty(RHU_HTML_PROTOTYPE, Symbol.iterator, {
    get() {
        return this[DOM][Symbol.iterator];
    }
});
Object.defineProperty(RHU_HTML_PROTOTYPE, Symbol.toStringTag, {
    get() {
        return "RHU_HTML";
    }
});

type RHU_CHILDREN = NodeListOf<ChildNode>;

export const DOM = Symbol("html.dom");

class RHU_DOM<T extends Record<PropertyKey, any> = Record<PropertyKey, any>> {
    // NOTE(randomuserhi): List of nodes that belong to this fragment
    //                     If you stick to the `html` based methods you do not
    //                     have to worry about managing ownership.
    //
    //                     If you move nodes around yourself, you need to manually
    //                     manage ownership and unregister / remove nodes from this
    //                     collection.
    public readonly elements: RHU_COLLECTION;

    // Aliases to collection methods
    public readonly first: Node;
    public readonly last: Node;
    public readonly parent: Node | null;
    public readonly remove: RHU_COLLECTION["remove"];
    public readonly append: RHU_COLLECTION["append"];
    public readonly insertBefore: RHU_COLLECTION["insertBefore"];

    public readonly [Symbol.iterator]: () => IterableIterator<Node>;
    public readonly [DOM]: HTML<T>;

    public readonly ref: { deref(): HTML<T> | undefined, hasref(): boolean };

    private binds: PropertyKey[] = [];
    public close: RHU_CLOSURE = RHU_CLOSURE.instance;

    private onChildren?: (children: RHU_CHILDREN) => void; 
    public children(cb?: (children: RHU_CHILDREN) => void) {
        this.onChildren = cb;
        return this;
    }

    private boxed: boolean = false;
    public box(boxed: boolean = true) {
        this.boxed = boxed;
        return this;
    }

    static is: (object: any) => object is RHU_DOM = Object.prototype.isPrototypeOf.bind(RHU_DOM.prototype);
}

type FACTORY<T extends Record<PropertyKey, any> = Record<PropertyKey, any>> = (...args: any[]) => HTML<T>;
type HTML<T extends Record<PropertyKey, any> = Record<PropertyKey, any>> = T & { readonly [DOM]: RHU_DOM<T>; [Symbol.iterator]: () => IterableIterator<Node> }; 
export type html<T extends FACTORY | Record<PropertyKey, any>> = T extends FACTORY ? ReturnType<T> extends HTML ? ReturnType<T> : never : HTML<T>;
export const isHTML = <T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(object: any): object is HTML<T> => {
    if (object === undefined) return false;
    return RHU_DOM.is(object[DOM]);
};

type First = TemplateStringsArray;
type Single = Node | string | HTML | RHU_NODE | RHU_CLOSURE | RHU_MARKER | SignalEvent<any>;
type Slot = Node | HTML | RHU_NODE | SignalEvent<any> | RHU_MARKER
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
    
    map<T, H extends Record<PropertyKey, any> = Record<PropertyKey, any>, K = T extends any[] ? number : T extends Map<infer K, any> ? K : any, V = T extends (infer V)[] ? V : T extends Map<any, infer V> ? V : any>(signal: Signal<T>, factory: (kv: [k: K, v: V], el?: HTML<H>) => HTML<H> | undefined): HTML<{ readonly signal: Signal<T> }>;
    map<T, H extends Record<PropertyKey, any> = Record<PropertyKey, any>, K = any, V = any>(signal: Signal<T>, factory: (kv: [k: K, v: V], el?: HTML<H>) => HTML<H> | undefined, iterator: (value: T) => IterableIterator<[key: K, value: V]>): HTML<{ readonly signal: Signal<T> }>;
    
    // Creates a weakref to the given object where its lifetime is tied to the provided target.
    // - Whilst the target is still retained, the object is also retained.
    // - If the target is GC'd, the object may be GC'd as long as no other references to it exist.
    ref<T extends object, R extends object>(target: T, obj: R): { deref(): R | undefined, hasref(): boolean };

    // Creates a weakref to the given object
    ref<T extends object>(obj: T): { deref(): T | undefined, hasref(): boolean };

    append(target: Node | HTML, ...nodes: (Node | HTML)[]): void;
    insertBefore(target: Node | HTML, node: (Node | HTML), ref: (Node | HTML)): void;
    remove(target: Node | HTML, ...nodes: (Node | HTML)[]): void;
    replaceWith(target: Node | HTML, ...nodes: (Node | HTML)[]): void;
}

function stitch(interp: Interp, slots: Slot[]): string | undefined {
    if (interp === undefined) return undefined;
    
    const index = slots.length;
    if (isNode(interp) || isHTML(interp) || isSignal(interp) || RHU_MARKER.is(interp)) {
        slots.push(interp);
        return `<rhu-slot rhu-internal="${index}"></rhu-slot>`;
    } else if (RHU_NODE.is(interp)) {
        slots.push(interp);
        return `<rhu-slot rhu-internal="${index}">${(interp as any).isOpen ? `` : `</rhu-slot>`}`;
    } else if (RHU_CLOSURE.is(interp)) {
        return `</rhu-slot>`;
    } else {
        return undefined;
    }
}

const defineProperties = Object.defineProperties;

function html_addBind(instance: Record<PropertyKey, any> & { [DOM]: RHU_DOM }, key: PropertyKey, value: any) {
    if (key in instance) throw new Error(`The binding '${key.toString()}' already exists.`);
    instance[key] = value; 
    (instance[DOM] as any).binds.push(key);
}
function html_makeRef(ref: WeakRef<Comment>["deref"]) {
    return {
        deref() {
            const marker = ref();
            if (marker === undefined) return undefined;
            return baseNodes.get(marker as any);
        },
        hasref() {
            return ref() !== undefined;
        }
    };
}
function html_replaceWith(target: Node | HTML, ...nodes: (Node | HTML)[]) {
    const _isHTML = isHTML(target);

    const parent = _isHTML ? target[DOM].parent : target.parentNode;
    if (parent === null) return;

    const ref = _isHTML ? target[DOM].first : target;
    for (const node of nodes) {
        RHU_COLLECTION.unbind(node);

        if (isHTML(node)) {
            for (const n of node) {
                parent.insertBefore(n, ref);
            }
        } else {
            parent.insertBefore(node, ref);
        }
    }
    
    html.remove(parent, target);
}
export const html: RHU_HTML = (<T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(first: First | HTML, ...interpolations: Interp[]) => {
    // edit dom properties func
    
    if (isHTML(first)) {
        return first[DOM];
    }

    // html parsing func

    // stitch together source
    let source = first[0];
    const slots: Slot[] = [];
    for (let i = 1; i < first.length; ++i) {
        const interp = interpolations[i - 1];
        const result = stitch(interp, slots);
        if (result !== undefined) {
            source += result;
        } else if (Array.isArray(interp)) {
            const array = interp as Single[];
            for (const interp of array) {
                const result = stitch(interp, slots);
                if (result !== undefined) {
                    source += result;
                } else {
                    source += interp;
                }
            }
        } else {
            source += interp;
        }

        source += first[i];
    }

    // parse source
    const template = document.createElement("template");
    template.innerHTML = source;
    const fragment = template.content;

    // Remove nonsense text nodes
    document.createNodeIterator(fragment, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT, {
        acceptNode(node) {
            const value = node.nodeValue;
            if (node.nodeType === Node.COMMENT_NODE && (node as any)[DOM] === undefined) node.parentNode?.removeChild(node);
            else if (value === null || value === undefined) node.parentNode?.removeChild(node);
            else if (value.trim() === "") node.parentNode?.removeChild(node);
            return NodeFilter.FILTER_REJECT;
        }
    }).nextNode();

    // create bindings
    const implementation = new RHU_DOM();
    const instance: Record<PropertyKey, any> & { [DOM]: RHU_DOM<T> } = Object.create(RHU_HTML_PROTOTYPE);
    instance[DOM] = implementation;
    (implementation as any)[DOM] = instance;
    for (const el of fragment.querySelectorAll("*[m-id]")) {
        const key = el.getAttribute("m-id")!;
        el.removeAttribute("m-id");
        html_addBind(instance, key, el);
    }

    // create element list
    let elements: (HTML | Node)[] = [];
    for (const node of fragment.childNodes) {
        let attr: string | null;
        if (isElement(node) && (attr = node.getAttribute("rhu-internal"))) {
            const i = parseInt(attr);
            if (isNaN(i)) {
                throw new Error("Could not obtain slot id.");
            }

            node.setAttribute("rhu-elements", elements.length.toString());
            elements.push(undefined!);
        } else {
            elements.push(node);
        }
    }
    
    // parse slots
    let error = false;
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

            let hole: undefined | number | string | null = slotElement.getAttribute("rhu-elements");
            if (hole === null) {
                hole = undefined;
            } else {
                hole = parseInt(hole);
                if (isNaN(hole)) {
                    hole = undefined;
                }
            }

            const slot = slots[i];
            if (isSignal(slot)) {
                const node = document.createTextNode(`${slot()}`);
                const ref = new WeakRef(node);
                slot.on((value) => {
                    const node = ref.deref();
                    if (node === undefined) return;
                    node.nodeValue = slot.string(value);
                }, { condition: () => ref.deref() !== undefined });

                html_replaceWith(slotElement, node);
                if (hole !== undefined) elements[hole] = node;
            } else if (isNode(slot)) {
                html_replaceWith(slotElement, slot);
                if (hole !== undefined) elements[hole] = slot;
            } else if (RHU_MARKER.is(slot)) {
                const node = document.createComment(" << rhu-marker >> ");
                (node as any)[DOM] = "marker";

                const key: RHU_MARKER["name"] = (slot as any).name;
                if (key !== undefined) {
                    html_addBind(instance, key, node);
                }

                html_replaceWith(slotElement, node);
                if (hole !== undefined) elements[hole] = node;
            } else {
                let descriptor: RHU_NODE | undefined = undefined;
                let node: HTML;
                if (RHU_NODE.is(slot)) {
                    descriptor = slot;
                    node = slot.node;
                } else {
                    node = slot;
                }

                const slotImplementation = node[DOM];

                // Obtain overridable settings
                let boxed: boolean | undefined = (descriptor as any)?.boxed;
                if (boxed === undefined) boxed = (slotImplementation as any).boxed;

                // Manage binds
                if (boxed || (descriptor as any)?.name !== undefined) {
                    const slotName: RHU_NODE["name"] = (descriptor as any)?.name;
                    if (slotName !== undefined) {
                        html_addBind(instance, slotName, node);
                    }
                } else {
                    for (const key of ((slotImplementation as any).binds as RHU_DOM["binds"])) {
                        html_addBind(instance, key, node[key]);
                    }
                }

                if ((slotImplementation as any).onChildren !== undefined) (slotImplementation as any).onChildren(slotElement.childNodes);
                
                html_replaceWith(slotElement, node);
                if (hole !== undefined) elements[hole] = node;
            }
        } catch (e) {
            if (slotElement.parentNode === fragment) error = true;
            slotElement.replaceWith();
            console.error(e);
            continue;
        }
    }

    if (error) {
        elements = elements.filter(v => v !== undefined);
    }

    // Create frag collection to manage the fragment
    const collection = new RHU_COLLECTION<T>(instance as HTML<T>, ...elements);
    fragment.append(collection.last); // Append the fragment marker
    
    // NOTE(randomuserhi): We have to call a separate function to prevent context hoisting from 
    //                     preventing garbage collection of the marker node.
    //
    //                     By declaring an inline function, it will include the context of the above scope,
    //                     this is what allows us to reference `marker` despite it being outside of the
    //                     inline functions scope. However, this means that the inline function holds a reference
    //                     to the context, thus preventing GC of variables inside of said context (such as `marker`).
    //
    //                     Since we want to be able to hold a reference to the `ref` inlien function but not the context
    //                     it resides in, we call a separate function. The separate function has its own context (hence
    //                     we can no longer access `marker` as per its scope) and thus circumvents this issue.
    const markerRef = new WeakRef(collection.last);
    const ref = html_makeRef(markerRef.deref.bind(markerRef));

    const iter = function* () {
        for (const node of collection) {
            if (isHTML(node)) {
                yield* node;
            } else {
                yield node;
            }
        }
    };
    
    // Setup alias methods
    const replaceWith = html_replaceWith.bind(undefined, instance);
    const remove = RHU_COLLECTION.prototype.remove.bind(collection);
    const append = RHU_COLLECTION.prototype.append.bind(collection);
    const insertBefore = RHU_COLLECTION.prototype.insertBefore.bind(collection);

    // Setup getters
    defineProperties(implementation, {
        elements: {
            get() {
                return collection;
            },
            configurable: false
        },
        ref: {
            get() {
                return ref;
            },
            configurable: false
        },
        first: {
            get() {
                const node = collection.first;
                if (isHTML(node)) {
                    return node.first();
                } else {
                    return node;
                }
            },
            configurable: false
        },
        last: {
            // NOTE(randomuserhi): The last node should always be the marker comment
            get() {
                return collection.last;
            },
            configurable: false
        },
        parent: {
            get() {
                return collection.last.parentNode;
            },
            configurable: false
        },
        replaceWith: {
            get() {
                return replaceWith;
            }
        },
        remove: {
            get() {
                return remove;
            },
        },
        append: {
            get() {
                return append;
            },
        },
        insertBefore: {
            get() {
                return insertBefore;
            },
        },
        [Symbol.iterator]: {
            get() {
                return iter;
            },
            configurable: false
        }
    });

    return instance as HTML<T>;
}) as RHU_HTML;
html.close = () => RHU_CLOSURE.instance;
(html as any).closure = RHU_CLOSURE.instance;
html.open = (el) => {
    if (RHU_NODE.is(el)) {
        el.open();
        return el;
    }
    return new RHU_NODE(el).open();
};
html.bind = (el, name: PropertyKey) => {
    if (RHU_NODE.is(el)) {
        el.bind(name);
        return el;
    }
    return new RHU_NODE(el).bind(name);
};
html.box = (el, boxed?: boolean) => {
    if (RHU_NODE.is(el)) {
        el.box(boxed);
        return el;
    }
    return new RHU_NODE(el).box(boxed);
};
html.ref = ((target: any, obj: any) => {
    if (obj ===  undefined) {
        if (isHTML(target)) {
            return target[DOM].ref;
        }
        const deref = WeakRef.prototype.deref.bind(new WeakRef(target));
        return {
            deref,
            hasref: () => deref() !== undefined
        };
    } else {
        const wr = isHTML(target) ? target[DOM].ref : new WeakRef(target);
        const wmap = new WeakMap();
        wmap.set(target, obj);
        return {
            deref() {
                return wmap.get(wr.deref()!);
            },
            hasref() {
                return wr.deref() !== undefined;
            }
        };
    }
}) as any;
html.replaceWith = html_replaceWith;
html.remove = (target, ...nodes) => {
    if (isHTML(target)) {
        target[DOM].remove(...nodes);
    } else {
        for (const node of nodes) {
            if (isHTML(node)) {
                RHU_COLLECTION.unbind(node);

                for (const n of node) {
                    if (n.parentNode === target) target.removeChild(n);
                }
            } else {
                if (node.parentNode === target) {
                    RHU_COLLECTION.unbind(node);

                    target.removeChild(node);
                }
            }
        }
    }
};
html.append = (target, ...nodes) => {
    if (isHTML(target)) {
        target[DOM].append(...nodes);
    } else {
        for (const node of nodes) {
            RHU_COLLECTION.unbind(node);

            if (isHTML(node)) {
                for (const n of node) {
                    target.appendChild(n);
                }
            } else {
                target.appendChild(node);
            }
        }
    }
};
html.insertBefore = (target, node, ref) => {
    if (isHTML(target)) {
        target[DOM].insertBefore(node, ref);
    } else {
        RHU_COLLECTION.unbind(node);

        const nref = isHTML(ref) ? ref[DOM].first : ref;
        if (isHTML(node)) {
            for (const n of node) {
                target.insertBefore(n, nref);
            }
        } else {
            target.insertBefore(node, nref);
        }
    }
};
html.map = ((signal: Signal<any>, factory: (kv: [k: any, v: any], el?: HTML) => HTML | undefined, iterator: (value: any) => IterableIterator<[key: any, value: any]>) => {
    const dom = html<{ 
        signal: Signal<any>; 
        
        existingEls: Map<any, [el: HTML | undefined, pos: number]>;
        _existingEls: Map<any, [el: HTML | undefined, pos: number]>;
    }>``;
    
    dom.signal = signal;

    // Keep track of existing DOM elements and their positions (as to not duplicate nodes or unnecessarily move them)
    //
    // NOTE(randomuserhi): These variables have to be members of dom as they hold strong references to the parent
    //                     `dom` element. If they were not members, then due to scope referencing, the signal will hold 
    //                     a strong reference to these variables. And as these variables hold strong references to
    //                     `dom`, `dom` can no longer be garbage collected until the signal is also garbage collected.
    //
    //                     These maps hold a strong reference to `dom` as they store its child elements.
    //                     The child elements prevent its parent (`dom`) from being GC'd.
    //
    //                     For more information about scopes and how they affect GC: 
    //                     - https://jakearchibald.com/2024/garbage-collection-and-closures/#the-problem-case
    dom.existingEls = new Map();
    dom._existingEls = new Map();

    // NOTE(randomuserhi): As the stack is empty by the end of `update`, it does not need to be a member as it holds no strong
    //                     references to anything else (its empty array). Thus we can ignore the above.
    const stack: HTML[] = [];

    const ref = dom[DOM].ref;

    const update = (value: any) => {
        const dom = ref.deref();
        if (dom === undefined) return;
        
        const internal = dom[DOM];

        // Obtain iterable
        let kvIter: Iterable<[key: any, value: any]> | undefined = undefined;
        if (iterator !== undefined) {
            kvIter = iterator(value);
        } else if (isMap(value) || isArray(value)) {
            kvIter = value.entries();
        }

        if (kvIter != undefined) {
            // Store the old position of the previous existing element
            let prev: number | undefined = undefined;

            for (const kv of kvIter) {
                const key = kv[0];

                if (dom._existingEls.has(key)) {
                    console.warn("'html.map' does not support non-unique keys.");
                    continue;
                }

                const pos = dom._existingEls.size; // Position of current element

                // Get previous state if the element existed previously
                const old = dom.existingEls.get(key);
                const oldEl = old === undefined ? undefined : old[0];

                // Generate new state
                const el = factory(kv, oldEl);

                // If the element previously existed, and its old position is less than
                // the last seen existing element, then it must be out of order since
                // it now needs to exist after the last seen existing element.
                //
                // NOTE(randomuserhi): The below code is simply the inverse of the above statement
                //                     for if the element is in order.
                const inOrder = old === undefined || prev === undefined || old[1] > prev;
                const outOfOrder = !inOrder;

                if (old !== undefined && inOrder) {
                    // If the element last existed and is in order, append
                    // elements from the stack and update `prev`.
                    prev = old[1];
                    
                    if (oldEl !== undefined) {
                        for (const el of stack) {
                            internal.insertBefore(el, oldEl);
                        }
                        stack.length = 0;
                    }
                } else if (el !== oldEl || outOfOrder) {
                    // If the element is out of order / is different to the existing 
                    // one, remove it and append to stack
                    if (oldEl !== undefined) {
                        internal.remove(oldEl);
                    }

                    if (el !== undefined) {
                        stack.push(el);
                    }
                }

                // Update element map
                if (old === undefined) {
                    dom._existingEls.set(key, [el, pos]);
                } else {
                    old[0] = el;
                    old[1] = pos;
                    dom._existingEls.set(key, old);
                }
            }

            // Append remaining elements in stack to the end of the map
            if (stack.length > 0) {
                internal.append(...stack);
            }
            stack.length = 0;
        }

        // Remove elements that no longer exist
        for (const [key, [el]] of dom.existingEls) {
            if (dom._existingEls.has(key)) continue;
            if (el === undefined) continue;

            internal.remove(el);
        }
        dom.existingEls.clear();

        const temp = dom._existingEls; 
        dom._existingEls = dom.existingEls;
        dom.existingEls = temp;
    };

    // Update map on signal change
    signal.on(update, { condition: ref.hasref });

    return dom;
}) as any;
html.marker = (name) => {
    return new RHU_MARKER().bind(name);
};

// Custom event and observer to add some nice events
declare global {
    interface GlobalEventHandlersEventMap {
        "mount": CustomEvent;
        "dismount": CustomEvent;
    }
}

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
html.observe = function(target: Node): void {
    observer.observe(target, {
        childList: true,
        subtree: true
    });
};

const onDocumentLoad = function() {
    html.observe(document);
};
if (document.readyState === "loading") { 
    document.addEventListener("DOMContentLoaded", onDocumentLoad);
} else { 
    // Document may have loaded already if the script is declared as defer, in this case just call onload
    onDocumentLoad();
}