define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.jsxs = exports.jsx = void 0;
    const isText = function (node) {
        return node?.nodeType === undefined;
    };
    const add = (parent, child) => {
        parent.appendChild(isText(child) ? document.createTextNode(child) : child);
    };
    const appendChild = (parent, child) => {
        if (Array.isArray(child)) {
            child.forEach((nestedChild) => appendChild(parent, nestedChild));
        }
        else {
            add(parent, child);
        }
    };
    const jsx = (tag, props) => {
        const { children } = props;
        if (typeof tag === "function")
            return tag(props, children);
        const element = document.createElement(tag);
        Object.entries(props || {}).forEach(([name, value]) => {
            if (name.startsWith("on") && name.toLowerCase() in window) {
                element.addEventListener(name.toLowerCase().substr(2), value);
            }
            else {
                element.setAttribute(name, value);
            }
        });
        appendChild(element, children);
        return element;
    };
    exports.jsx = jsx;
    exports.jsxs = exports.jsx;
});
