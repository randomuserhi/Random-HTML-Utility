import * as RHU from "./rhu.js";
import { signal } from "./signal.js";
import { WeakCollection } from "./weak.js";

export type Templates = keyof TemplateMap;
export interface TemplateMap {

}
interface Template<T extends Templates> {
    (first: TemplateStringsArray, ...interpolations: (string | { [Symbol.toPrimitive]: (...args: any[]) => string })[]): string;
    open: {
        (first: TemplateStringsArray, ...interpolations: (string | { [Symbol.toPrimitive]: (...args: any[]) => string })[]): string;
        toString: () => string;
        [Symbol.toPrimitive]: () => string;
    }
    close: { [Symbol.toPrimitive]: () => string; toString: () => string };
    type: T;
    toString: () => T;
    [Symbol.toPrimitive]: () => string;
}
interface Macro<T extends Element | undefined = Element, P = any> {
    new (element: T | undefined, bindings: P, children: Node[]): object;
}

export class MacroWrapper<T extends Element | undefined = undefined> {
    element: T;
    readonly weak: WeakRef<this>["deref"];

    constructor(element: T, bindings: any, target?: any) {
        const weak = new WeakRef(this);
        this.weak = weak.deref.bind(weak);

        this.element = element;
        if (RHU.exists(target)) {
            Object.assign(target, bindings);
        } else {
            Object.assign(this, bindings);
        }
    }
}

interface Options {
    element?: string,
    content?: PropertyKey
}

interface MacroTemplate {
    constructor: Macro,
    type?: string,
    source?: string,
    options: Options
}

interface MacroObject {
    <T extends Templates>(constructor: Function, type: T, source: string, options: Options): Template<T>;
    parseDomString(str: string): DocumentFragment;
    anon<T extends {} = {}>(source: string): [T, DocumentFragment];
    parse(element: Element, type?: string & {} | Templates | undefined | null, force?: boolean): void;
    observe(target: Node): void;
    signal(name: string, initial?: string): string;
}

declare global {
    interface Node {
        macro: object;
    }

    interface Document {
        createMacro<T extends string & keyof TemplateMap>(type: T | Template<T>): TemplateMap[T];
    }

    interface Element {
        rhuMacro: string;
    }
}

interface SymbolCollection { 
    readonly macro: unique symbol;
    readonly constructed: unique symbol;
    readonly prototype: unique symbol;
}
interface _Node extends Node {
    [symbols.macro]?: object;
}
interface _Element extends Element {
    [symbols.macro]?: object;
    [symbols.prototype]?: any;
    [symbols.constructed]?: string;
}
const symbols: SymbolCollection = {
    macro: Symbol("macro"),
    constructed: Symbol("macro constructed"),
    prototype: Symbol("macro prototype")
} as SymbolCollection;


RHU.defineProperty(Node.prototype, symbols.macro, {
    get: function(this: _Node): object { return this; }
});
RHU.definePublicAccessor(Node.prototype, "macro", {
    get: function(this: _Node): object | undefined { return this[symbols.macro]; }
});

// NOTE(randomuserhi): Store a reference to base functions that will be overridden
const isElement:(object: any) => boolean = Object.prototype.isPrototypeOf.bind(Element.prototype);
const Element_setAttribute:(element: Element, qualifiedName: string, value: string) => void = Function.call.bind(Element.prototype.setAttribute);
const Element_getAttribute:(element: Element, qualifiedName: string) => string = Function.call.bind(Element.prototype.getAttribute);
const Element_hasAttribute:(element: Element, qualifiedName: string) => boolean = Function.call.bind(Element.prototype.hasAttribute);
const Element_removeAttribute:(element: Element, qualifiedName: string) => void = Function.call.bind(Element.prototype.removeAttribute);
const Element_append:(element: Element, ...nodes: (string | Node)[]) => void = Function.call.bind(Element.prototype.append);

const Descriptor_childNodes = Object.getOwnPropertyDescriptor(Node.prototype, "childNodes");
if (!RHU.exists(Descriptor_childNodes)) throw new ReferenceError("Node.prototype.childNodes is null or undefined.");
const Node_childNodes:(node: Node) => NodeListOf<ChildNode> = Function.call.bind(Descriptor_childNodes.get);

const Descriptor_parentNode = Object.getOwnPropertyDescriptor(Node.prototype, "parentNode");
if (!RHU.exists(Descriptor_parentNode)) throw new ReferenceError("Node.prototype.parentNode is null or undefined.");
const Node_parentNode:(node: Node) => ParentNode = Function.call.bind(Descriptor_parentNode.get);

Document.prototype.createMacro = function<T extends string & keyof TemplateMap>(type: T | Template<T>): TemplateMap[T] {
    const t = type.toString();
    let definition = templates.get(t);
    if (!RHU.exists(definition)) definition = defaultTemplate;
    const options = definition.options;

    //TODO(randomuserhi): for performance, if it is floating, dont parse a doc, just make a <div> with createElement

    const doc = RHU.exists(options.element) ? Macro.parseDomString(options.element) : document.createElement("div");
    const el: _Element = doc.children[0];
    if (!RHU.exists(el)) throw SyntaxError(`No valid container element to convert into macro was found for '${t}'.`);
    el.remove(); //un bind element from temporary doc
    Element_setAttribute(el, "rhu-macro", t);
    Macro.parse(el, t);
    return el[symbols.macro] as TemplateMap[T];
};

Element.prototype.setAttribute = function(qualifiedName: string, value: string): void {
    // Remove macro functionality if element is no longer considered a macro
    if (qualifiedName === "rhu-macro") Macro.parse(this, value);
    return Element_setAttribute(this, qualifiedName, value);
};

Element.prototype.removeAttribute = function(qualifiedName): void {
    // Remove macro functionality if element is no longer considered a macro
    if (qualifiedName === "rhu-macro") Macro.parse(this);
    return Element_removeAttribute(this, qualifiedName);
};

RHU.definePublicAccessor(Element.prototype, "rhuMacro", {
    get: function(this: Element) { return Element_getAttribute(this, "rhu-macro"); },
    set: function(this: Element, value) { 
        Element_setAttribute(this, "rhu-macro", value);
        Macro.parse(this, value);
    }
});

const closure = {
    toString() {
        return "</rhu-macro>";
    },
    [Symbol.toPrimitive]() {
        return "</rhu-macro>";
    }
};
const Template = function<T extends Templates>(type: T): Template<T> {
    const template = function(first: TemplateStringsArray, ...interpolations: (string)[]): string {
        let generatedCode: string = `<rhu-macro rhu-type="${type}" ${first[0]}`;
        for (let i = 0; i < interpolations.length; ++i) {
            const interpolation = interpolations[i];
            generatedCode += interpolation;
            generatedCode += first[i + 1];
        }
        generatedCode += `></rhu-macro>`;
        return generatedCode;
    } as Template<T>;

    template.open = function(first: TemplateStringsArray, ...interpolations: (string)[]): string {
        let generatedCode: string = `<rhu-macro rhu-type="${type}" ${first[0]}`;
        for (let i = 0; i < interpolations.length; ++i) {
            const interpolation = interpolations[i];
            generatedCode += interpolation;
            generatedCode += first[i + 1];
        }
        generatedCode += `>`;
        return generatedCode;
    } as Template<T>["open"];
    template.open.toString = () => `<rhu-macro rhu-type="${type}">`;
    template.open[Symbol.toPrimitive] = () => `<rhu-macro rhu-type="${type}">`;

    template.close = closure;

    template.type = type;
    template.toString = () => type,
    template[Symbol.toPrimitive] = () => `<rhu-macro rhu-type="${type}"></rhu-macro>`;

    return template;
};

export const Macro: MacroObject
= function<T extends Templates>(constructor: Macro, type: T, source: string = "", options: Options): Template<T> {
    if (type == "") throw new SyntaxError("'type' cannot be blank.");
    if (typeof type !== "string") throw new TypeError("'type' must be a string.");
    if (typeof source !== "string") throw new TypeError("'source' must be a string.");
    if (!RHU.isConstructor(constructor)) throw new TypeError("'object' must be a constructor.");

    // Add constructor to template map
    if (templates.has(type))
        console.warn(`Macro template '${type}' already exists. Definition will be overwritten.`);

    const opt = {
        element: "<div></div>",
        floating: false,
        strict: false,
        encapsulate: undefined,
        content: undefined
    };
    RHU.parseOptions(opt, options);
    
    // Ensure that options does not utilize <rhu-macro>
    const doc = Macro.parseDomString(opt.element);
    const macro = doc.children[0];                
    if (!RHU.exists(macro)) // If macro element cannot expand, just throw an error
        throw new SyntaxError(`No valid container element to convert into macro was found for '${type}'.`);
    if (macro.tagName === "RHU-MACRO")
        throw new Error(`Container element cannot be the tag RHU-MACRO.`);

    templates.set(type, {
        constructor: constructor,
        type: type,
        source: source,
        options: opt
    });

    // parse macros currently of said type
    const update = watching.get(type);
    if (RHU.exists(update))
        for (const el of update)
            Macro.parse(el, type, true);

    return Template(type);
} as MacroObject;
const templates = new Map<string | undefined | null, MacroTemplate>();
const defaultTemplate: MacroTemplate = {
    constructor: class {},
    type: undefined,
    source: undefined,
    options: {
        element: "<div></div>",
        content: undefined
    },
};

const xPathEvaluator = new XPathEvaluator();
Macro.parseDomString = function(str: string): DocumentFragment {
    /* NOTE(randomuserhi): template is used to handle parsing of fragments like <td> which don't work on document */
    const template: HTMLTemplateElement = document.createElement("template");
    template.innerHTML = str;
    return template.content;
};

const childMap = new Map<Node, Node[]>();
const _anon = function<T extends {} = any>(source: string, parseStack: string[], donor?: Element, root: boolean = false): [T, DocumentFragment] {
    let doc;
    if (RHU.exists(donor)) {
        donor.innerHTML = source;
        doc = new DocumentFragment();
        doc.append(donor);
    } else {
        doc = Macro.parseDomString(source);
    }

    const properties: any = {};
    const checkProperty = (identifier: PropertyKey): boolean => {
        if (Object.hasOwnProperty.call(properties, identifier)) 
            throw new SyntaxError(`Identifier '${identifier.toString()}' already exists.`);
        return true;
    };

    // Expand <rhu-macro> tags into their original macros
    const nested: _Element[] = [...doc.querySelectorAll("rhu-macro")];
    for (const el of nested) {
        if (el === donor) continue;

        const typename: string = "rhu-type";
        const type = Element_getAttribute(el, typename);
        Element.prototype.removeAttribute.call(el, typename);
        const definition = templates.get(type);
        if (!RHU.exists(definition)) 
            throw new TypeError(`Could not expand <rhu-macro> of type '${type}'. Macro definition does not exist.`);
        const options = definition.options;

        const children = [...el.childNodes];

        // If the macro is floating, check for id, and create its property and parse it
        // we have to parse it manually here as floating macros don't have containers to 
        // convert to for the parser later to use.
        if (!RHU.exists(options.element)) {
            if (Element_hasAttribute(el, "rhu-id")) {
                const identifier = Element_getAttribute(el, "rhu-id");
                Element.prototype.removeAttribute.call(el, "rhu-id");
                checkProperty(identifier);
                // if its a signal element, convert to signal property
                if (el.tagName === "RHU-SIGNAL") {
                    const textNode = document.createTextNode(RHU.exists(el.textContent) ? el.textContent : "");
                    el.replaceWith(textNode);
                    const prop = signal(textNode.nodeValue);
                    prop.on((value) => textNode.nodeValue = `${value}`);
                    RHU.definePublicAccessor(properties, identifier, {
                        get: function() { return prop; }
                    });
                } else {
                    RHU.definePublicAccessor(properties, identifier, {
                        get: function() { return el[symbols.macro]; }
                    });
                }
            }
            try {
                _parse(el, type, children, parseStack);
            } catch (e) {
                errorHandle("parser", type, e, root);
            }
        } else {
            // If the macro is not floating, parse it and create the container the macro needs to be inside
            const doc = Macro.parseDomString(options.element);
            const macro = doc.children[0];
            if (!RHU.exists(macro)) throw new SyntaxError(`No valid container element to convert into macro was found for '${type}'.`);
            else {
                for (let i = 0; i < el.attributes.length; ++i)
                    macro.setAttribute(el.attributes[i].name, el.attributes[i].value);
                el.replaceWith(macro);
                Element_setAttribute(macro, "rhu-macro", type);
                childMap.set(macro, children);
            }
        }
    }

    // Create properties
    const referencedElements = doc.querySelectorAll("*[rhu-id]") as NodeListOf<_Element>;
    for (const el of referencedElements) {
        if (el === donor) continue;

        const identifier = Element_getAttribute(el, "rhu-id");
        Element.prototype.removeAttribute.call(el, "rhu-id");
        checkProperty(identifier);
        // if its a signal element, convert to signal property
        if (el.tagName === "RHU-SIGNAL") {
            const textNode = document.createTextNode(RHU.exists(el.textContent) ? el.textContent : "");
            el.replaceWith(textNode);
            const prop = signal(textNode.nodeValue);
            prop.on((value) => textNode.nodeValue = `${value}`);
            RHU.definePublicAccessor(properties, identifier, {
                get: function() { return prop; }
            });
        } else {
            RHU.definePublicAccessor(properties, identifier, {
                get: function() { return el[symbols.macro]; }
            });
        }
    }

    // Parse nested rhu-macros (can't parse floating macros as they don't have containers)
    for (const el of doc.querySelectorAll("*[rhu-macro]")) {
        if (el === donor) continue;

        const type = Element_getAttribute(el, "rhu-macro");
        let children: Node[] | undefined = childMap.get(el);
        if (children === undefined) children = [];
        try {
            _parse(el, type, children, parseStack);
        } catch (e) {
            errorHandle("parser", type, e, root);
        }
        childMap.delete(el);
    }

    // Place elements into a temporary container
    const tempContainer = document.createElement("div");
    Element_append(tempContainer, ...doc.childNodes);

    // Remove comment nodes:
    const xPath = "//comment()";
    const query = xPathEvaluator.evaluate(xPath, tempContainer, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0, length = query.snapshotLength; i < length; ++i) {
        const self: Node = query.snapshotItem(i)!;
        if (RHU.exists(self.parentNode))
            self.parentNode.removeChild(self);
    }

    // Re-add child nodes to fragment
    doc.append(...tempContainer.childNodes);

    return [properties, doc];
};
Macro.anon = function<T extends {} = {}>(source: string): [T, DocumentFragment] {
    return _anon(source, [], undefined, true);
};
Macro.signal = function(name, initial = "") {
    return `<rhu-signal rhu-id="${name}">${initial}</rhu-signal>`;
};

const errorHandle = function(type: "parser" | "constructor", macro: string & {} | Templates, e: any, root: boolean) {
    switch(type) {
    case "parser": {
        if (typeof e === "string") {
            throw e;
        }
        // falls through
    }
    default: {
        const message = typeof e === "string" ? e : `\n\n${e.stack}`;
        throw `\n[__${type}__] ${root ? "Macro.Parse(" : "_parse("}${macro})${message}`;
    }
    }
};
const watching: Map<string, WeakCollection<Element>> 
= new Map<string, WeakCollection<Element>>(); // Stores active macros that are being watched
const _parse = function(element: _Element, type: string & {} | Templates | undefined | null, children: Node[], parseStack: string[], root: boolean = false, force: boolean = false): void {
    // Normalize type undefined / null to blank type
    if (!RHU.exists(type)) type = "";

    // Check if element is <rhu-macro>, 
    // if it is then expand it to parse the element it represents
    // NOTE(randomuserhi): tagName is a string thats all upper case.
    if (element.tagName === "RHU-MACRO") {
        const definition = templates.get(type);

        // If the definition does not exist, simply do not expand this <rhu-macro>
        if (!RHU.exists(definition)) return;

        // get children of macro
        children.push(...element.childNodes);

        const options = definition.options;

        const doc = RHU.exists(options.element) ? Macro.parseDomString(options.element) : document.createElement("div");
        const macro = doc.children[0];

        // If macro element cannot expand, just throw an error
        if (!RHU.exists(macro))
            throw new SyntaxError(`No valid container element to convert into macro was found for '${type}'.`);

        Element_setAttribute(macro, "rhu-macro", type);
        for (let i = 0; i < element.attributes.length; ++i)
            macro.setAttribute(element.attributes[i].name, element.attributes[i].value);
        element.replaceWith(macro);
        
        // Stop watching this <rhu-macro>
        watching.get(type)!.delete(element);

        // Update element to continue parse on expanded <rhu-macro>
        element = macro;
    }

    // return if element doesn't exist
    if (!RHU.exists(element)) return;

    // return if type has not changed unless we are force parsing it
    if (force === false && element[symbols.constructed] === type) return;

    // Check parse stack to see if we are in a recursive loop
    if (parseStack.includes(type))
        throw new Error("Recursive definition of macros are not allowed.");

    parseStack.push(type);

    // Get old type of element
    const oldType: string | undefined = element[symbols.constructed];

    // Replace element with a slot
    const slot = document.createElement("div");
    Element.prototype.replaceWith.call(element, slot);

    // Purge old dom
    Element.prototype.replaceChildren.call(element);

    // Get constructor for type and type definition
    let definition = templates.get(type);
    if (!RHU.exists(definition)) definition = defaultTemplate;
    const constructor = definition.constructor;
    const options = definition.options;

    // Get elements from parser 
    const [properties, fragment] = _anon(RHU.exists(definition.source) ? definition.source : "", parseStack, element);
    
    // Place elements back where the slot was
    Element.prototype.replaceWith.call(slot, fragment);
    
    const checkProperty = (identifier: PropertyKey): boolean => {
        if (Object.hasOwnProperty.call(properties, identifier)) 
            throw new SyntaxError(`Identifier '${identifier.toString()}' already exists.`);
        return true;
    };

    // Set content variable if set:
    if (RHU.exists(options.content)) {            
        if (typeof options.content !== "string") throw new TypeError("Option 'content' must be a string.");
        checkProperty(options.content);
        properties[options.content] = [...Node_childNodes(element)];
    }

    if (!RHU.exists(options.element)) {
        // If we are floating, replace children
        // If no parent, unbind children
        if (RHU.exists(Node_parentNode(element))) Element.prototype.replaceWith.call(element, ...Node_childNodes(element));
        else Element.prototype.replaceWith.call(element);
    }

    let obj: any | undefined = undefined;
    try {
        obj = new constructor(RHU.exists(options.element) ? element : undefined, properties, children);
    } catch (e) {
        errorHandle("constructor", type, e, root);
    }
    if (RHU.exists(obj)) {
        RHU.defineProperties(element, {
            [symbols.macro]: {
                configurable: true,
                get: function() { return obj; }
            }
        });
    } else {
        RHU.defineProperties(element, {
            [symbols.macro]: {
                configurable: true,
                get: function() { return element; }
            }
        });
    }

    // Update live map
    // Handle old type
    if (RHU.exists(oldType)) {
        let old = templates.get(oldType);
        if (!RHU.exists(old)) old = defaultTemplate;
        // check if old type was not floating
        // - floating macros are 1 time use (get consumed) and thus aren't watched
        if (RHU.exists(old.options.element) && watching.has(oldType))
            watching.get(oldType)!.delete(element);
    }
    // Handle new type
    // check if new type is floating
    // - floating macros are 1 time use (get consumed) and thus aren't watched
    if (RHU.exists(options.element)) {
        if (RHU.exists(type)) {
            if (!watching.has(type))
                watching.set(type, new WeakCollection<Element>());    
            const typeCollection = watching.get(type);
            typeCollection!.add(element);
        }
    }

    // Set constructed type for element
    element[symbols.constructed] = type;

    parseStack.pop();
};
Macro.parse = function(element: _Element, type: string & {} | Templates | undefined | null, force: boolean = false): void {
    _parse(element, type, [], [], true, force);
};

const load: () => void = function(): void {
    // Expand <rhu-macro> tags into their original macros if the original macro exists
    // TODO(randomuserhi): consider using a custom element to convert <rhu-macro>, also allows for document.createElement();
    // NOTE(randomuserhi): this expansion is the same as done in Macro.parse, consider
    //                     converting into a function
    const expand: Element[] = [...document.getElementsByTagName("rhu-macro")];
    for (const el of expand) { 
        const typename = "rhu-type";
        const type = Element_getAttribute(el, typename);
        Element.prototype.removeAttribute.call(el, typename);
        const definition = templates.get(type);

        // If the definition does not exist, simply do not expand this <rhu-macro>
        if (!RHU.exists(definition)) { 
            // Add <rhu-macro> to watchlist to expand in the future
            if (RHU.exists(type)) {
                if (!watching.has(type))
                    watching.set(type, new WeakCollection<Element>());    
                const typeCollection = watching.get(type);
                typeCollection!.add(el);
            }
            continue;
        }

        const options = definition.options;

        const doc = RHU.exists(options.element) ? Macro.parseDomString(options.element) : document.createElement("div");
        const macro = doc.children[0];
        if (!RHU.exists(macro)) console.error(`No valid container element to convert into macro was found for '${type}'.`);
        else {
            for (let i = 0; i < el.attributes.length; ++i)
                macro.setAttribute(el.attributes[i].name, el.attributes[i].value);
            el.replaceWith(macro);
            Element_setAttribute(macro, "rhu-macro", type);
        }
    }

    // Parse macros on document
    const macros = document.querySelectorAll("[rhu-macro]");
    for (const el of macros) {
        Macro.parse(el, Element_getAttribute(el, "rhu-macro"));
        recursiveDispatch(el);
    }

    // Initialize observer
    Macro.observe(document);
};

const recursiveDispatch = function(node: Node): void {
    if (isElement(node) && Element_hasAttribute(node as Element, "rhu-macro")) 
        (node as Element).dispatchEvent(RHU.CreateEvent("mount", {}));
    for (const child of node.childNodes)
        recursiveDispatch(child);
};
const recursiveParse = function(node: Node): void {
    if (isElement(node) && Element_hasAttribute(node as Element, "rhu-macro")) {
        Macro.parse(node as Element, Element_getAttribute(node as Element, "rhu-macro"));
        recursiveDispatch(node);
        return;
    }
    for (const child of node.childNodes)
        recursiveParse(child);
};

// Setup mutation observer to detect macros being created
const observer = new MutationObserver(function(mutationList) {
    /**
     * NOTE(randomuserhi): Since mutation observers are asynchronous, the current attribute value
     *                     as read from .getAttribute may not be correct. To remedy this, a dictionary
     *                     storing the atribute changes is used to keep track of changes at the moment
     *                     a mutation occurs.
     *                     ref: https://stackoverflow.com/questions/60593551/get-the-new-attribute-value-for-the-current-mutationrecord-when-using-mutationob
     */
    const attributes = new Map();
    for (const mutation of mutationList) {
        switch (mutation.type) {
        case "attributes":
            {
                if (mutation.attributeName === "rhu-macro") {
                    if (!attributes.has(mutation.target)) attributes.set(mutation.target, mutation.oldValue);
                    else if (attributes.get(mutation.target) !== mutation.oldValue) {
                        attributes.set(mutation.target, mutation.oldValue);

                        /**
                         * NOTE(randomuserhi): A performance gain could be done by only parsing the last tracked attribute change
                         *                     since other changes are redundant as they are replaced by the latest.
                         *                     This is purely done for the sake of being consistent with what the user may expect.
                        */
                        if (isElement(mutation.target))
                            Macro.parse(mutation.target as Element, mutation.oldValue);
                    }
                }
            }
            break;
        case "childList":
            {
                for (const node of mutation.addedNodes)
                    recursiveParse(node);
            }
            break;
        }
    }

    for (const el of attributes.keys()) {
        const attr = Element_getAttribute(el, "rhu-macro");
        if (attributes.get(el) !== attr)
            Macro.parse(el, attr);
    }
});
// Allows you to assign macro observation to other docs to trigger macro updates
Macro.observe = function(target: Node): void {
    observer.observe(target, {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: [ "rhu-macro" ],
        childList: true,
        subtree: true
    });
};

const onDocumentLoad = function() {
    // NOTE(randomuserhi): We must call load event first so user-defined types are set first before we load
    //                     custom element otherwise custom element will parse with undefined macros (since
    //                     they just have not been loaded yet).
    
    window.dispatchEvent(new Event("load-rhu-macro"));
    
    load();
};
if (document.readyState === "loading") 
    document.addEventListener("DOMContentLoaded", onDocumentLoad);
// Document may have loaded already if the script is declared as defer, in this case just call onload
else 
    onDocumentLoad();