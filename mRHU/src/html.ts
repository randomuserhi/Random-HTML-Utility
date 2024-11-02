import { isSignal, SignalEvent } from "./signal.js";

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

type RHU_CHILDREN = NodeListOf<ChildNode>;

export const DOM = Symbol("html.dom"); 

class RHU_DOM {
    public readonly elements: Node[];
    public readonly [Symbol.iterator]: () => IterableIterator<Node>;
    public readonly [DOM]: HTML;

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

type HTML<T extends Record<PropertyKey, any> = Record<PropertyKey, any>> = T & { [DOM]: RHU_DOM; [Symbol.iterator]: () => IterableIterator<Node> }; 
export type html<T extends (...args: any[]) => HTML<any>> = ReturnType<T> extends HTML<infer Binds> ? Binds : any;
export const isHTML = <T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(object: any): object is HTML<T> => {
    return RHU_DOM.is(object[DOM]);
};

type First = TemplateStringsArray;
type Single = Node | string | HTML | RHU_NODE | RHU_CLOSURE | SignalEvent<any>;
type Interp = Single | (Single[]);

interface RHU_HTML {
    <T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(first: First, ...interpolations: Interp[]): HTML<T>;
    observe(node: Node): void;
    close(): RHU_CLOSURE;
    readonly closure: RHU_CLOSURE;
    open<T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(html: HTML<T>): RHU_NODE<T>;
    bind<T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(html: HTML<T>, name: PropertyKey): RHU_NODE<T>;
    box<T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(html: HTML<T>): HTML<T>;
    children<T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(html: HTML<T>, cb: (children: RHU_CHILDREN) => void): HTML<T>;
    readonly dom: typeof DOM;
}

function stitch(interp: Interp, slots: (Node | HTML | RHU_NODE | SignalEvent<any>)[]): string | undefined {
    if (interp === undefined) return undefined;
    
    const index = slots.length;
    if (isNode(interp)) {
        slots.push(interp);
        return `<rhu-slot rhu-internal="${index}"></rhu-slot>`;
    } else if (isHTML(interp) || isSignal(interp)) {
        slots.push(interp);
        return `<rhu-slot rhu-internal="${index}"></rhu-slot>`;
    } else if (RHU_NODE.is(interp)) {
        slots.push(interp);
        return `<rhu-slot rhu-internal="${index}">`;
    } else if (RHU_CLOSURE.is(interp)) {
        return `</rhu-slot>`;
    } else {
        return undefined;
    }
}

export const html: RHU_HTML = (<T extends Record<PropertyKey, any> = Record<PropertyKey, any>>(first: First, ...interpolations: Interp[]) => {
    // stitch together source
    let source = first[0];
    const slots: (Node | HTML | RHU_NODE | SignalEvent<any>)[] = [];
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
    const instance: Record<PropertyKey, any> & { [DOM]: RHU_DOM } = Object.create(RHU_HTML_PROTOTYPE);
    instance[DOM] = implementation;
    (implementation as any)[DOM] = instance;
    for (const el of fragment.querySelectorAll("*[m-id]")) {
        const key = el.getAttribute("m-id")!;
        el.removeAttribute("m-id");
        if (key in instance) throw new Error(`The binding '${key}' already exists.`);
        instance[key] = el; 
        (implementation as any).binds.push(key);
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
            if (isSignal(slot)) {
                const node = document.createTextNode(`${slot()}`);
                const ref = new WeakRef(node);
                slot.on((value) => {
                    const node = ref.deref();
                    if (node === undefined) return;
                    node.nodeValue = slot.string(value);
                }, { condition: () => ref.deref() !== undefined });
                slotElement.replaceWith(node);
            } else if (isNode(slot)) {
                slotElement.replaceWith(slot);
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

                // Manage binds
                if ((node[DOM] as any).boxed || (descriptor as any)?.name !== undefined) {
                    const slotName: RHU_NODE["name"] = (descriptor as any)?.name;
                    if (slotName !== undefined) {
                        if (slotName in instance) throw new Error(`The binding '${slotName.toString()}' already exists.`);
                        instance[slotName] = node; 
                    }
                } else {
                    for (const key of ((slotImplementation as any).binds as RHU_DOM["binds"])) {
                        if (key in instance) throw new Error(`The binding '${key.toString()}' already exists.`);
                        instance[key] = node[key]; 
                    }
                }

                if ((slotImplementation as any).onChildren !== undefined) (slotImplementation as any).onChildren(slotElement.childNodes);
                slotElement.replaceWith(...slotImplementation.elements);
            }
        } catch (e) {
            slotElement.replaceWith();
            console.error(e);
            continue;
        }
    }

    (implementation as any).elements = [...fragment.childNodes];
    (implementation as any)[Symbol.iterator] = Array.prototype[Symbol.iterator].bind((implementation as any).elements);

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
html.box = (el) => {
    el[DOM].box();
    return el;
};
html.children = (el, cb: (children: RHU_CHILDREN) => void) => {
    el[DOM].children(cb);
    return el;
};
(html as any).dom = DOM;

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