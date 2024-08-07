import { Signal, signal } from "./signal.js";

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
    public dom: Node[];

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

class MACRO<T extends MacroClass = MacroClass> extends ELEMENT {
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

    static is: (object: any) => object is MACRO = Object.prototype.isPrototypeOf.bind(MACRO.prototype);
}

class MACRO_OPEN<T extends MacroClass = MacroClass> extends MACRO<T> {

    static is: (object: any) => object is MACRO_OPEN = Object.prototype.isPrototypeOf.bind(MACRO_OPEN.prototype);
}

export function html<T extends {} = any>(first: HTML["first"], ...interpolations: HTML["interpolations"]): HTML<T> {
    return new HTML<T>(first, interpolations);
}
export class HTML<T extends {} = any> {
    public static empty = html``;
    
    private first: TemplateStringsArray;
    private interpolations: (string | NODE)[];
    
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

    public dom<B extends Record<PropertyKey, any> | void = void>(): [bindings: B extends void ? T : B, fragment: DocumentFragment] {
        // stitch together source
        let source = this.first[0];
        const html: HTML[] = [];
        const macros: MACRO[] = [];
        const signals: SIGNAL[] = [];
        for (let i = 1; i < this.first.length; ++i) {
            const interp = this.interpolations[i - 1];
            if (isFactory(interp)) {
                throw new SyntaxError("Macro Factory cannot be used to construct a HTML fragment. Did you mean to call the factory?");
            }
            if (HTML.is(interp)) {
                source += `<rhu-html rhu-internal="${html.length}"></rhu-macro>`;
                html.push(interp);
            } if (NODE.is(interp)) {
                if (CLOSURE.is(interp)) {
                    source += `</rhu-macro>`;
                } else if (MACRO_OPEN.is(interp)) {
                    source += `<rhu-macro rhu-internal="${macros.length}">`;
                    macros.push(interp);
                }  else if (MACRO.is(interp)) {
                    source += `<rhu-macro rhu-internal="${macros.length}"></rhu-macro>`;
                    macros.push(interp);
                } else if (SIGNAL.is(interp)) {
                    source += `<rhu-signal rhu-internal="${signals.length}"></rhu-signal>`;
                    signals.push(interp);
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
            if (slot === undefined || slot === null) throw new Error("Unable to find slot for signal.");

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
            if (slot === undefined || slot === null) throw new Error("Unable to find slot for HTML.");

            const HTML = html[i];

            // get fragment
            const [instance, frag] = HTML.dom();

            // trigger callbacks
            for (const callback of HTML.callbacks) {
                callback(instance);
            }
            
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
            if (slot === undefined || slot === null) throw new Error("Unable to find slot for macro.");
            slots[i] = slot;
        }

        // handle nested macros
        for (let i = 0; i < macros.length; ++i) {
            // get slot
            const slot = slots[i];

            // get children
            const children = [...slot.childNodes];
            // remove children
            slot.replaceChildren();

            // parse macro
            const macro = macros[i];
            const [b, frag] = macro.html.dom();
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
        }

        return [bindings as B extends void ? T : B, fragment];
    }

    static is: (object: any) => object is HTML = Object.prototype.isPrototypeOf.bind(HTML.prototype);
}

interface FACTORY<T extends MacroClass> {
    (...args: MacroParameters<T>): MACRO<T>;
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
    create<T extends MACRO>(macro: T): T extends MACRO<infer R> ? InstanceType<R> : never;
    observe(node: Node): void;
}

export const Macro = (<T extends MacroClass>(type: T, html: HTML): FACTORY<T> => {
    const factory = function(...args: MacroParameters<T>) {
        return new MACRO<T>(html, type, args);
    } as FACTORY<T>;
    (factory as any).open = function(...args: MacroParameters<T>) {
        return new MACRO_OPEN<T>(html, type, args);
    };
    (factory as any).close = CLOSURE.instance;
    (factory as any)[symbols.factory] = true;
    return factory; 
}) as MacroNamespace;
Macro.signal = (binding: string, value?: string) => new SIGNAL(binding).value(value);
Macro.create = <M extends MACRO>(macro: M): M extends MACRO<infer T> ? InstanceType<T> : never => {
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