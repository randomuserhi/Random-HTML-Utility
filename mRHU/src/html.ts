import { isSignal, Signal, SignalEvent } from "./signal.js";

const isMap: <K = any, V = any>(object: any) => object is Map<K, V> = Object.prototype.isPrototypeOf.bind(Map.prototype);
const isArray: <T = any>(object: any) => object is Array<T> = Object.prototype.isPrototypeOf.bind(Array.prototype);

const isNode: (object: any) => object is Node = Object.prototype.isPrototypeOf.bind(Node.prototype);

class RHU_CLOSURE {
    static instance = new RHU_CLOSURE();
    static is: (object: any) => object is RHU_CLOSURE = Object.prototype.isPrototypeOf.bind(RHU_CLOSURE.prototype);
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
    public readonly elements: (HTML | Node)[];
    public readonly [Symbol.iterator]: () => IterableIterator<Node>;
    public readonly [DOM]: HTML<T>;

    public readonly first: () => Node;
    public readonly last: () => Node;

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
type HTML<T extends Record<PropertyKey, any> = Record<PropertyKey, any>> = T & { [DOM]: RHU_DOM<T>; [Symbol.iterator]: () => IterableIterator<Node> }; 
export type html<T extends FACTORY | Record<PropertyKey, any>> = T extends FACTORY ? ReturnType<T> extends HTML ? ReturnType<T> : never : HTML<T>;
export const isHTML = <T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(object: any): object is HTML<T> => {
    if (object === undefined) return false;
    return RHU_DOM.is(object[DOM]);
};

type First = TemplateStringsArray;
type Single = Node | string | HTML | RHU_NODE | RHU_CLOSURE | SignalEvent<any>;
type Slot = Node | HTML | RHU_NODE | SignalEvent<any>
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
    map<T, H extends Record<PropertyKey, any> = Record<PropertyKey, any>, K = T extends any[] ? number : T extends Map<infer K, any> ? K : any, V = T extends (infer V)[] ? V : T extends Map<any, infer V> ? V : any>(signal: Signal<T>, factory: (kv: [k: K, v: V], el?: HTML<H>) => HTML<H> | undefined): HTML<{ readonly signal: Signal<T> }>;
    map<T, H extends Record<PropertyKey, any> = Record<PropertyKey, any>, K = any, V = any>(signal: Signal<T>, factory: (kv: [k: K, v: V], el?: HTML<H>) => HTML<H> | undefined, transform: (item: T) => Iterable<[key: K, value: V]>): HTML<{ readonly signal: Signal<T> }>;
}

function stitch(interp: Interp, slots: Slot[]): string | undefined {
    if (interp === undefined) return undefined;
    
    const index = slots.length;
    if (isNode(interp) || isHTML(interp) || isSignal(interp)) {
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

function html_addBind(instance: Record<PropertyKey, any> & { [DOM]: RHU_DOM }, key: PropertyKey, value: any) {
    if (key in instance) throw new Error(`The binding '${key.toString()}' already exists.`);
    instance[key] = value; 
    (instance[DOM] as any).binds.push(key);
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
    document.createNodeIterator(fragment, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const value = node.nodeValue;
            if (value === null || value === undefined) node.parentNode?.removeChild(node);
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

                slotElement.replaceWith(node);
                if (hole !== undefined) elements[hole] = node;
            } else if (isNode(slot)) {
                slotElement.replaceWith(slot);
                if (hole !== undefined) elements[hole] = slot;
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
                
                slotElement.replaceWith(...slotImplementation);
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

    if (elements.length === 0) {
        // NOTE(randomuserhi): Empty HTML fragments need to contain atleast 1 node for positional referencing.
        //                     Create a blank node in the event of no children found.
        const marker = document.createComment(" << rhu-node >> ");
        fragment.append(marker);
        elements.push(marker);
    }

    // Setup element list and accessors
    (implementation as any).elements = elements;
    (implementation as any).first = () => {
        const node: HTML | Node = implementation.elements[0];
        if (isHTML(node)) {
            return node.first();
        } else {
            return node;
        }
    };
    (implementation as any).last = () => {
        const node: HTML | Node = implementation.elements[implementation.elements.length - 1];
        if (isHTML(node)) {
            return node.first();
        } else {
            return node;
        }
    };
    (implementation as any)[Symbol.iterator] = function* () {
        for (const node of (implementation.elements as (HTML | Node)[])) {
            if (isHTML(node)) {
                yield* node;
            } else {
                yield node;
            }
        }
    };

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
html.map = ((signal: Signal<any>, factory: (kv: [k: any, v: any], el?: HTML) => HTML | undefined, transform: (item: any) => Iterable<[key: any, value: any]>) => {
    const dom = html<{ signal: Signal<any> }>``;
    dom.signal = signal;
    const internal = dom[DOM];

    // Grab marker used to indicate the foot of the map. This indicates the position of where nodes should be inserted to.
    const marker = internal.last();

    // Keep track of existing DOM elements and their positions (as to not duplicate nodes or unnecessarily move them)
    let elements = new Map<any, [el: HTML | undefined, pos: number]>();
    let _elements = new Map<any, [el: HTML | undefined, pos: number]>();
    
    // Stores elements that should exist prior a previously existing one 
    // (Used when updating the map).
    const stack: HTML[] = [];

    const update = (value: any) => {
        const parent = marker.parentNode;

        // Obtain iterable
        let kvIter: Iterable<[key: any, value: any]> | undefined = undefined;
        if (transform !== undefined) {
            kvIter = transform(value);
        } else if (isMap(value) || isArray(value)) {
            kvIter = value.entries();
        }

        internal.elements.length = 0;
        if (kvIter != undefined) {
            // Store the old position of the previous existing element
            let prev: number | undefined = undefined;

            for (const kv of kvIter) {
                const key = kv[0];

                if (_elements.has(key)) {
                    console.warn("'html.map' does not support non-unique keys.");
                    continue;
                }

                const pos = _elements.size; // Position of current element

                // Get previous state if the element existed previously
                const old = elements.get(key);
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

                // If the element last existed and is in order, append
                // elements from the stack and update `prev`.
                if (old !== undefined && inOrder) {
                    prev = old[1];
                    
                    if (oldEl !== undefined && parent !== null) {
                        for (const el of stack) {
                            for (const node of el) {
                                parent.insertBefore(node, oldEl[DOM].first());
                            }
                        }
                        stack.length = 0;
                    }
                }

                // If the element is out of order / is different to the existing 
                // one, remove it and append to stack
                if (el !== oldEl || outOfOrder) {
                    if (oldEl !== undefined) {
                        for (const node of oldEl) {
                            if (node.parentNode !== null) {
                                node.parentNode.removeChild(node);
                            }
                        }
                    }

                    if (el !== undefined) {
                        stack.push(el);
                    }
                }

                // Update element map
                if (old === undefined) {
                    _elements.set(key, [el, pos]);
                } else {
                    old[0] = el;
                    old[1] = pos;
                    _elements.set(key, old);
                }

                if (el !== undefined) internal.elements.push(el);
            }

            // Append remaining elements in stack to the end of the map
            if (stack.length > 0 && parent !== null) {
                for (const el of stack) {
                    for (const node of el) {
                        parent.insertBefore(node, marker);
                    }
                }
            }
            stack.length = 0;
        }

        // Remove elements that no longer exist
        for (const [key, [el]] of elements) {
            if (_elements.has(key)) continue;
            if (el === undefined) continue;

            for (const node of el) {
                if (node.parentNode !== null) {
                    node.parentNode.removeChild(node);
                }
            }
        }
        elements.clear();

        const temp = _elements; 
        _elements = elements;
        elements = temp;

        internal.elements.push(marker);
    };

    // Update map on signal change
    signal.on(update);

    return dom;
}) as any;

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
if (document.readyState === "loading") 
    document.addEventListener("DOMContentLoaded", onDocumentLoad);
// Document may have loaded already if the script is declared as defer, in this case just call onload
else 
    onDocumentLoad();