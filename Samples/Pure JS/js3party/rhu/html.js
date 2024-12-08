import { isSignal } from "./signal.js";
const isMap = Object.prototype.isPrototypeOf.bind(Map.prototype);
const isArray = Object.prototype.isPrototypeOf.bind(Array.prototype);
const isNode = Object.prototype.isPrototypeOf.bind(Node.prototype);
class RHU_CLOSURE {
}
RHU_CLOSURE.instance = new RHU_CLOSURE();
RHU_CLOSURE.is = Object.prototype.isPrototypeOf.bind(RHU_CLOSURE.prototype);
class RHU_NODE {
    bind(name) {
        this.name = name;
        return this;
    }
    open() {
        this.isOpen = true;
        return this;
    }
    box(boxed = true) {
        this.boxed = boxed;
        return this;
    }
    constructor(node) {
        this.isOpen = false;
        this.node = node;
    }
}
RHU_NODE.is = Object.prototype.isPrototypeOf.bind(RHU_NODE.prototype);
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
export const DOM = Symbol("html.dom");
class RHU_DOM {
    constructor() {
        this.binds = [];
        this.close = RHU_CLOSURE.instance;
        this.boxed = false;
    }
    children(cb) {
        this.onChildren = cb;
        return this;
    }
    box(boxed = true) {
        this.boxed = boxed;
        return this;
    }
}
Symbol.iterator;
RHU_DOM.is = Object.prototype.isPrototypeOf.bind(RHU_DOM.prototype);
export const isHTML = (object) => {
    if (object === undefined)
        return false;
    return RHU_DOM.is(object[DOM]);
};
function stitch(interp, slots) {
    if (interp === undefined)
        return undefined;
    const index = slots.length;
    if (isNode(interp) || isHTML(interp) || isSignal(interp)) {
        slots.push(interp);
        return `<rhu-slot rhu-internal="${index}"></rhu-slot>`;
    }
    else if (RHU_NODE.is(interp)) {
        slots.push(interp);
        return `<rhu-slot rhu-internal="${index}">${interp.isOpen ? `` : `</rhu-slot>`}`;
    }
    else if (RHU_CLOSURE.is(interp)) {
        return `</rhu-slot>`;
    }
    else {
        return undefined;
    }
}
function html_addBind(instance, key, value) {
    if (key in instance)
        throw new Error(`The binding '${key.toString()}' already exists.`);
    instance[key] = value;
    instance[DOM].binds.push(key);
}
export const html = ((first, ...interpolations) => {
    if (isHTML(first)) {
        return first[DOM];
    }
    let source = first[0];
    const slots = [];
    for (let i = 1; i < first.length; ++i) {
        const interp = interpolations[i - 1];
        const result = stitch(interp, slots);
        if (result !== undefined) {
            source += result;
        }
        else if (Array.isArray(interp)) {
            const array = interp;
            for (const interp of array) {
                const result = stitch(interp, slots);
                if (result !== undefined) {
                    source += result;
                }
                else {
                    source += interp;
                }
            }
        }
        else {
            source += interp;
        }
        source += first[i];
    }
    const template = document.createElement("template");
    template.innerHTML = source;
    const fragment = template.content;
    document.createNodeIterator(fragment, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const value = node.nodeValue;
            if (value === null || value === undefined)
                node.parentNode?.removeChild(node);
            else if (value.trim() === "")
                node.parentNode?.removeChild(node);
            return NodeFilter.FILTER_REJECT;
        }
    }).nextNode();
    const implementation = new RHU_DOM();
    const instance = Object.create(RHU_HTML_PROTOTYPE);
    instance[DOM] = implementation;
    implementation[DOM] = instance;
    for (const el of fragment.querySelectorAll("*[m-id]")) {
        const key = el.getAttribute("m-id");
        el.removeAttribute("m-id");
        html_addBind(instance, key, el);
    }
    let metadata = [];
    for (const node of fragment.childNodes) {
        let attr;
        if (isElement(node) && (attr = node.getAttribute("rhu-internal"))) {
            const i = parseInt(attr);
            if (isNaN(i)) {
                throw new Error("Could not obtain slot id.");
            }
            node.setAttribute("rhu-metadata", metadata.length.toString());
            metadata.push(undefined);
        }
        else {
            metadata.push(node);
        }
    }
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
            let hole = slotElement.getAttribute("rhu-metadata");
            if (hole === null) {
                hole = undefined;
            }
            else {
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
                    if (node === undefined)
                        return;
                    node.nodeValue = slot.string(value);
                }, { condition: () => ref.deref() !== undefined });
                slotElement.replaceWith(node);
                if (hole !== undefined)
                    metadata[hole] = node;
            }
            else if (isNode(slot)) {
                slotElement.replaceWith(slot);
                if (hole !== undefined)
                    metadata[hole] = slot;
            }
            else {
                let descriptor = undefined;
                let node;
                if (RHU_NODE.is(slot)) {
                    descriptor = slot;
                    node = slot.node;
                }
                else {
                    node = slot;
                }
                const slotImplementation = node[DOM];
                let boxed = descriptor?.boxed;
                if (boxed === undefined)
                    boxed = slotImplementation.boxed;
                if (boxed || descriptor?.name !== undefined) {
                    const slotName = descriptor?.name;
                    if (slotName !== undefined) {
                        html_addBind(instance, slotName, node);
                    }
                }
                else {
                    for (const key of slotImplementation.binds) {
                        html_addBind(instance, key, node[key]);
                    }
                }
                if (slotImplementation.onChildren !== undefined)
                    slotImplementation.onChildren(slotElement.childNodes);
                slotElement.replaceWith(...slotImplementation);
                if (hole !== undefined)
                    metadata[hole] = node;
            }
        }
        catch (e) {
            if (slotElement.parentNode === fragment)
                error = true;
            slotElement.replaceWith();
            console.error(e);
            continue;
        }
    }
    if (error) {
        metadata = metadata.filter(v => v !== undefined);
    }
    if (metadata.length === 0) {
        const marker = document.createComment(" << rhu-node >> ");
        fragment.append(marker);
        metadata.push(marker);
    }
    implementation.metadata = metadata;
    implementation.first = () => {
        const node = implementation.metadata[0];
        if (isHTML(node)) {
            return node.first();
        }
        else {
            return node;
        }
    };
    implementation.last = () => {
        const node = implementation.metadata[implementation.metadata.length - 1];
        if (isHTML(node)) {
            return node.first();
        }
        else {
            return node;
        }
    };
    implementation[Symbol.iterator] = function* () {
        for (const node of implementation.metadata) {
            if (isHTML(node)) {
                yield* node;
            }
            else {
                yield node;
            }
        }
    };
    return instance;
});
html.close = () => RHU_CLOSURE.instance;
html.closure = RHU_CLOSURE.instance;
html.open = (el) => {
    if (RHU_NODE.is(el)) {
        el.open();
        return el;
    }
    return new RHU_NODE(el).open();
};
html.bind = (el, name) => {
    if (RHU_NODE.is(el)) {
        el.bind(name);
        return el;
    }
    return new RHU_NODE(el).bind(name);
};
html.box = (el, boxed) => {
    if (RHU_NODE.is(el)) {
        el.box(boxed);
        return el;
    }
    return new RHU_NODE(el).box(boxed);
};
html.map = ((signal, factory, transform) => {
    const dom = html ``;
    dom.signal = signal;
    const internal = dom[DOM];
    const marker = internal.last();
    let elements = new Map();
    let _elements = new Map();
    const stack = [];
    const update = (value) => {
        const parent = marker.parentNode;
        let kvIter = undefined;
        if (transform !== undefined) {
            kvIter = transform(value);
        }
        else if (isMap(value) || isArray(value)) {
            kvIter = value.entries();
        }
        internal.metadata.length = 0;
        if (kvIter != undefined) {
            let prev = undefined;
            for (const kv of kvIter) {
                const key = kv[0];
                if (_elements.has(key)) {
                    console.warn("'html.map' does not support non-unique keys.");
                    continue;
                }
                const pos = _elements.size;
                const old = elements.get(key);
                const oldEl = old === undefined ? undefined : old[0];
                const el = factory(kv, oldEl);
                const inOrder = old === undefined || prev === undefined || old[1] > prev;
                const outOfOrder = !inOrder;
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
                if (old === undefined) {
                    _elements.set(key, [el, pos]);
                }
                else {
                    old[0] = el;
                    old[1] = pos;
                    _elements.set(key, old);
                }
                if (el !== undefined)
                    internal.metadata.push(el);
            }
            if (stack.length > 0 && parent !== null) {
                for (const el of stack) {
                    for (const node of el) {
                        parent.insertBefore(node, marker);
                    }
                }
            }
            stack.length = 0;
        }
        for (const [key, [el]] of elements) {
            if (_elements.has(key))
                continue;
            if (el === undefined)
                continue;
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
        internal.metadata.push(marker);
    };
    signal.on(update);
    return dom;
});
const isElement = Object.prototype.isPrototypeOf.bind(Element.prototype);
const recursiveDispatch = function (node, event) {
    if (isElement(node))
        node.dispatchEvent(new CustomEvent(event));
    for (const child of node.childNodes)
        recursiveDispatch(child, event);
};
const observer = new MutationObserver(function (mutationList) {
    for (const mutation of mutationList) {
        switch (mutation.type) {
            case "childList":
                {
                    for (const node of mutation.addedNodes)
                        recursiveDispatch(node, "mount");
                    for (const node of mutation.removedNodes)
                        recursiveDispatch(node, "dismount");
                }
                break;
        }
    }
});
html.observe = function (target) {
    observer.observe(target, {
        childList: true,
        subtree: true
    });
};
const onDocumentLoad = function () {
    html.observe(document);
};
if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", onDocumentLoad);
else
    onDocumentLoad();
