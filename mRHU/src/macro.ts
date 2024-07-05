import * as RHU from "./rhu.js";
import { signal } from "./signal.js";
import { WeakCollection, WeakRefMap } from "./weak.js";

export type Templates = keyof TemplateMap;
export interface TemplateMap {

}
interface Template<T extends Templates> {
    (first: TemplateStringsArray, ...interpolations: (string | { [Symbol.toPrimitive]: (...args: any[]) => string })[]): string;
    type: T;
    toString: () => T;
    [Symbol.toPrimitive]: () => string;
}
export interface Constructor<T extends Element = Element> {
    (this: T): void;
    prototype: T;
}

interface Options {
    element: string,
    floating?: boolean,
    strict?: boolean,
    encapsulate?: PropertyKey,
    content?: PropertyKey
}

interface MacroTemplate {
    constructor: Function,
    type?: string,
    source?: string,
    options: Options,
    protoCache: WeakRefMap<any, any> // TODO(randomuserhi): Update types
}

interface MacroObject {
    <T extends Templates>(constructor: Function, type: T, source: string, options: Options): Template<T>;
    parseDomString(str: string): DocumentFragment;
    anon<T extends {} = {}>(source: string): [T, DocumentFragment];
    parse(element: Element, type?: string & {} | Templates | undefined | null, force?: boolean): void;
    observe(target: Node): void;
    signal(name: string, initial?: string): string;
}

type Macro = HTMLElement | {};

declare global {
    interface Node {
        macro: Macro;
    }

    interface Document {
        createMacro<T extends string & keyof TemplateMap>(type: T | Template<T>): TemplateMap[T];
        Macro<T extends string & keyof TemplateMap>(type: T | Template<T>, attributes: Record<string, string>): string;
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
    [symbols.macro]?: Macro;
}
interface _Element extends Element {
    [symbols.macro]?: Macro;
    [symbols.prototype]?: any;
    [symbols.constructed]?: string;
}
const symbols: SymbolCollection = {
    macro: Symbol("macro"),
    constructed: Symbol("macro constructed"),
    prototype: Symbol("macro prototype")
} as SymbolCollection;


RHU.defineProperty(Node.prototype, symbols.macro, {
    get: function(this: _Node): Macro { return this; }
});
RHU.definePublicAccessor(Node.prototype, "macro", {
    get: function(this: _Node): Macro | undefined { return this[symbols.macro]; }
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

    const doc = Macro.parseDomString(options.element);
    const el: _Element = doc.children[0];
    if (!RHU.exists(el)) throw SyntaxError(`No valid container element to convert into macro was found for '${t}'.`);
    el.remove(); //un bind element from temporary doc
    Element_setAttribute(el, "rhu-macro", t);
    Macro.parse(el, t);
    return el[symbols.macro] as TemplateMap[T];
};

Document.prototype.Macro = function<T extends string & keyof TemplateMap>(type: T | Template<T>, attributes: Record<string, string>): string {
    const t = type.toString();
    let definition = templates.get(t);
    if (!RHU.exists(definition)) definition = defaultTemplate;
    const options = definition.options;

    const doc = Macro.parseDomString(options.element);
    const el = doc.children[0];
    if (!RHU.exists(el)) throw SyntaxError(`No valid container element to convert into macro was found for '${t}'.`);
    Element_setAttribute(el, "rhu-macro", t);
    for (const key in attributes) el.setAttribute(key, attributes[key]);
    el.remove(); //un bind element from temporary doc
    return el.outerHTML;
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

    template.type = type;
    template.toString = () => type,
    template[Symbol.toPrimitive] = () => `<rhu-macro rhu-type="${type}"></rhu-macro>`;

    return template;
};

export const Macro: MacroObject
= function<T extends Templates>(constructor: Function, type: T, source: string = "", options: Options): Template<T> {
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
        options: opt,
        protoCache: new WeakRefMap() // Used by the parser for performance
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
    constructor: function() {},
    type: undefined,
    source: undefined,
    options: {
        element: "<div></div>",
        floating: false,
        strict: false,
        encapsulate: undefined,
        content: undefined
    },
    protoCache: new WeakRefMap()
};

const xPathEvaluator = new XPathEvaluator();
Macro.parseDomString = function(str: string): DocumentFragment {
    /* NOTE(randomuserhi): template is used to handle parsing of fragments like <td> which don't work on document */
    const template: HTMLTemplateElement = document.createElement("template");
    template.innerHTML = str;
    return template.content;
};

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

        // If the macro is floating, check for id, and create its property and parse it
        // we have to parse it manually here as floating macros don't have containers to 
        // convert to for the parser later to use.
        if (options.floating) {
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
                _parse(el, type, parseStack);
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
        try {
            _parse(el, type, parseStack);
        } catch (e) {
            errorHandle("parser", type, e, root);
        }
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

const clonePrototypeChain = function(prototype: any, last: any): any {
    const next = Object.getPrototypeOf(prototype);
    if (next === Object.prototype) return RHU.clone(prototype, last);
    return RHU.clone(prototype, clonePrototypeChain(next, last));
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
const _parse = function(element: _Element, type: string & {} | Templates | undefined | null, parseStack: string[], root: boolean = false, force: boolean = false): void {
    /**
     * NOTE(randomuserhi): Since rhu-macro elements may override their builtins, Element.prototype etc... are used
     *                     to prevent undefined behaviour when certain builtins are overridden.
     */

    /**
     * NOTE(randomuserhi): In built elements may have properties that need to be protected
     *                     such that they are not cleared when rhu-macro changes, to do so you would
     *                     create a proxy as shown below:
     *                      
     *                     let proxy = RHU.clone(element);
     *                     Object.setPrototypeOf(element, proxy);
     *
     *                     The proxy should only be created once, to prevent huge prototype chains
     *                     when type changes frequently.
     *                     The reason why a poxy isn't used is because all built-ins (needs confirming)
     *                     seem to not have any properties, an error check is made to double check this.
     */

    // Normalize type undefined / null to blank type
    if (!RHU.exists(type)) type = "";

    // Check if element is <rhu-macro>, 
    // if it is then expand it to parse the element it represents
    // NOTE(randomuserhi): tagName is a string thats all upper case.
    if (element.tagName === "RHU-MACRO") {
        const definition = templates.get(type);

        // If the definition does not exist, simply do not expand this <rhu-macro>
        if (!RHU.exists(definition)) return;

        const options = definition.options;

        const doc = Macro.parseDomString(options.element);
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

    // Check if element is eligible for RHU-Macro (check hasOwn properties and that it has not been converted into a macro already)
    if (!Object.hasOwnProperty.call(element, symbols.constructed) && RHU.properties(element, { hasOwn: true }).size !== 0) 
        throw new TypeError(`Element is not eligible to be used as a rhu-macro.`);

    // return if element doesn't exist
    if (!RHU.exists(element)) return;

    // return if type has not changed unless we are force parsing it
    if (force === false && element[symbols.constructed] === type) return;

    // Check parse stack to see if we are in a recursive loop
    if (parseStack.includes(type))
        throw new Error("Recursive definition of macros are not allowed.");

    parseStack.push(type);

    // Create a slot element to work with
    let slot: HTMLDivElement;

    // get old type of element, prior to purging old properties
    const oldType: string | undefined = element[symbols.constructed];
    // get prototype of element, prior to purging old properties
    let proto: object = element[symbols.prototype];

    // Clear old element properties
    RHU.deleteProperties(element);

    // Purge old dom
    Element.prototype.replaceChildren.call(element);

    // Get constructor for type and type definition
    let definition = templates.get(type);
    if (!RHU.exists(definition)) definition = defaultTemplate;
    const constructor = definition.constructor;
    const options = definition.options;

    // NOTE(randomuserhi): Create an inbetween object that will hold properties etc...
    let proxy: any = Object.create(constructor.prototype);

    // Assign prototype methods
    // NOTE(randomuserhi): prototype methods are not stored in a proxy prototype
    //                     This may be confusing for those trying to access their methods via
    //                     Object.getPrototypeOf, but is done due to not utilizing a proxy
    //                     as described above.
    // Set target object
    let target: any = element;
    if (options.floating) target = Object.create(proxy);
    else { 
        // Handle inheritance
        if (!RHU.exists(proto))
            proto = element[symbols.prototype] = Object.getPrototypeOf(element);
        else 
            element[symbols.prototype] = proto;

        /**
         * Create a clone of the chain and inherit from it. A clone has to be created to avoid editting the original prototype.
         *
         * NOTE(randomuserhi): setPrototypeOf is not very performant due to how they are handled
         *                     internally: https://mathiasbynens.be/notes/prototypes
         *                     This means RHU-Macros are not very performant.
         *
         *                     A way to get around this would be to append the methods directly to the element
         *                     handling overrides by not overwriting properties that already exist:
         *                     
         *                     for (let proto = constructor.prototype; proto !== Object.prototype; proto = Object.getPrototypeOf(proto))
         *                          RHU.assign(target, proto, { replace: false });
         *
         *                     The downside to this approach over setPrototypeOf is the inability to call parent methods since obv they dont exist
         *                     in the prototype.
         */

        // load cached cloned prototypes for performance
        const protoCache = definition.protoCache;
        const cachedProto = protoCache.get(proto);
        if (RHU.exists(cachedProto)) {
            //console.log(`${definition === defaultDefinition ? "undefined" : type} cached: ${proto}`);
            proxy = Object.create(cachedProto);
        } else {
            //console.log(`${definition === defaultDefinition ? "undefined" : type} not cached: ${proto}`);
            const clonedProto = clonePrototypeChain(constructor.prototype, proto);
            protoCache.set(proto, clonedProto);
            proxy = Object.create(clonedProto);
        }
        Object.setPrototypeOf(target, proxy);

        // NOTE(randomuserhi): Alternate method that does not use setPrototypeOf in the event of performance
        //                     Won't work if ur code relies on calling parent, Object.getPrototypeOf(this).superMethod.
        //for (let proto = constructor.prototype; proto !== Object.prototype; proto = Object.getPrototypeOf(proto))
        //    RHU.assign(target, proto, { replace: false });
    }

    let donor: Element | undefined = undefined;
    if (!options.floating) {
        // If the macro is not floating, use element as donor for parsing
        slot = document.createElement("div");
        element.replaceWith(slot);
        donor = element;
    }

    // Get elements from parser 
    const [properties, fragment] = _anon(RHU.exists(definition.source) ? definition.source : "", parseStack, donor);
    const checkProperty = (identifier: PropertyKey): boolean => {
        if (Object.hasOwnProperty.call(properties, identifier)) 
            throw new SyntaxError(`Identifier '${identifier.toString()}' already exists.`);
        if (!options.encapsulate && options.strict && identifier in target) 
            throw new SyntaxError(`Identifier '${identifier.toString()}' already exists.`);
        return true;
    };

    // If element was floating, place children onto element
    // otherwise place element back onto document
    if (options.floating) {
        Element_append(element, fragment);
    } else {
        slot!.replaceWith(fragment);
    }

    // Set content variable if set:
    if (RHU.exists(options.content)) {            
        if (typeof options.content !== "string") throw new TypeError("Option 'content' must be a string.");
        checkProperty(options.content);
        properties[options.content] = [...Node_childNodes(element)];
    }

    if (options.floating) {
        // If we are floating, replace children
        // If no parent, unbind children
        if (RHU.exists(Node_parentNode(element))) Element.prototype.replaceWith.call(element, ...Node_childNodes(element));
        else Element.prototype.replaceWith.call(element);

        // If we are floating, set instance to be the new target object instead of the element container:
        // NOTE(randomuserhi): Needs to be configurable to ensure that the property can be deleted when element
        //                     is reused
        RHU.defineProperties(element, {
            [symbols.macro]: {
                configurable: true,
                get: function() { return target; }
            }
        });
    }
    
    // Add properties to target
    if (RHU.exists(options.encapsulate)) {            
        checkProperty(options.encapsulate);
        RHU.definePublicAccessor(proxy, options.encapsulate, {
            get: function() { return properties; }
        });
    } else RHU.assign(proxy, properties);

    try {
        constructor.call(target);
    } catch (e) {
        errorHandle("constructor", type, e, root);
    }

    // Update live map
    // Handle old type
    if (RHU.exists(oldType)) {
        let old = templates.get(oldType);
        if (!RHU.exists(old)) old = defaultTemplate;
        // check if old type was not floating
        // - floating macros are 1 time use (get consumed) and thus aren't watched
        if (!old.options.floating && watching.has(oldType))
            watching.get(oldType)!.delete(element);
    }
    // Handle new type
    // check if new type is floating
    // - floating macros are 1 time use (get consumed) and thus aren't watched
    if (!options.floating) {
        if (RHU.exists(type)) {
            if (!watching.has(type))
                watching.set(type, new WeakCollection<Element>());    
            const typeCollection = watching.get(type);
            typeCollection!.add(element);
        }
    }

    // Set constructed type for both target and element
    // NOTE(randomuserhi): You need to set it for both, since if the element is a proxy
    //                     for the floating macro it needs to be considered constructed
    target[symbols.constructed] = type;
    element[symbols.constructed] = type;

    parseStack.pop();
};
Macro.parse = function(element: _Element, type: string & {} | Templates | undefined | null, force: boolean = false): void {
    _parse(element, type, [], true, force);
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

        const doc = Macro.parseDomString(options.element);
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