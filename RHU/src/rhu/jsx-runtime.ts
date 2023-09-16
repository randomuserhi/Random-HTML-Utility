const isText = function(node: rhu.Node): node is string {
    return (node as globalThis.Node)?.nodeType === undefined;
}

const add = (parent: Element, child: rhu.Node) => {
    parent.appendChild(isText(child) ? document.createTextNode(child) : child);
};

const appendChild = (parent: Element, child: rhu.Node | rhu.Node[]) => {
    if (Array.isArray(child)) {
        child.forEach((nestedChild) => appendChild(parent, nestedChild));
    } else {
        add(parent, child);
    }
};

export const jsx = (tag: string | ((props: rhu.NodeProps, children: rhu.Node[]) => Element), props: rhu.NodeProps) => {
    const { children } = props;
    if (typeof tag === "function") return tag(props, children);
    const element = document.createElement(tag);
    Object.entries(props || {}).forEach(([name, value]) => {
        if (name.startsWith("on") && name.toLowerCase() in window) {
            element.addEventListener(name.toLowerCase().substr(2), value);
        } else {
            element.setAttribute(name, value);
        }
    });
    appendChild(element, children);
    return element;
};

export const jsxs = jsx;