// TODO(randomuserhi): Documentation

(function() {
    type context = Docuscript.docuscript.Context;
    type node<T extends keyof Docuscript.docuscript.NodeMap | undefined = undefined> = Docuscript.docuscript.Node<T>;
    let defaultParser: Docuscript.docuscript.Parser = {
        text: {
            create: function(text) {
                return {
                    __type__: "text",
                    text: text,
                };
            },
            parse: function(node) {
                return document.createTextNode(node.text);
            }
        },
        br: {
            create: function() {
                return {
                    __type__: "br",
                };
            },
            parse: function() {
                return document.createElement("br");
            }
        },
        p: {
            create: function(this: context, ...children) {
                let node: node<"p"> = {
                    __type__: "p",
                };

                for (let child of children) {
                    let childNode: node;
                    if (typeof child === "string") {
                        childNode = this.nodes.text(child);
                    } else {
                        childNode = child;
                    }
                    
                    this.remount(childNode, node);
                }

                return node;
            },
            parse: function() {
                return document.createElement("p");
            }
        },
        h: {
            create: function(this: context, heading, ...children) {
                let node: node<"h"> = {
                    __type__: "h",
                    heading: heading,
                };
                
                for (let child of children) {
                    let childNode: node;
                    if (typeof child === "string") {
                        childNode = this.nodes.text(child);
                    } else {
                        childNode = child;
                    }
                    
                    this.remount(childNode, node);
                }

                return node;
            },
            parse: function(node) {
                return document.createElement(`h${node.heading}`);
            }
        },
        block: {
            create: function(this: context, ...children) {
                let node: node<"block"> = {
                    __type__: "block",
                };
                
                for (let child of children) {
                    let childNode: node;
                    if (typeof child === "string") {
                        childNode = this.nodes.p(child);
                    } else {
                        childNode = child;
                    }
                    
                    this.remount(childNode, node);
                }

                return node;
            },
            parse: function() {
                return document.createElement("div");
            }
        },
    };

    let docuscript = window.docuscript = function<T extends string, FuncMap extends Docuscript.NodeFuncMap<T>>(generator: (nodes: Docuscript.ParserNodes<T, FuncMap>) => void, parser: Docuscript.Parser<T, FuncMap> = defaultParser as any): Docuscript.Page<T, FuncMap> {
        return {
            parser,
            generator
        };
    } as Docuscript;

    docuscript.parse = function<T extends string, FuncMap extends Docuscript.NodeFuncMap<T>>(page: Docuscript.Page<T, FuncMap>) {
        let content: Docuscript.Node<any>[] = [];
        
        const nodes: any = {};
        const context: any = {};
        for (const [node, func] of Object.entries(page.parser as Docuscript.Parser<string, Docuscript.NodeFuncMap<string>>)) {
            nodes[node as keyof typeof nodes] = (...args: any[]) => 
                func.create.call(docuscriptContext, ...args);

            context[node as keyof typeof context] = (...args: any[]) => { 
                const node = func.create.call(docuscriptContext, ...args); 
                content.push(node); // auto-mount node
                return node;
            }
        }
        const docuscriptContext: Docuscript.Context<T, Docuscript.NodeFuncMap<T>> = {
            nodes,
            remount: (child, parent) => {
                if (child.__parent__ && child.__parent__.__children__) {
                    child.__parent__.__children__ = child.__parent__.__children__.filter(n => n !== child);
                } else {
                    content = content.filter(n => n !== child);
                }
                child.__parent__ = parent;
                if (parent.__children__) {
                    parent.__children__.push(child);
                } else {
                    parent.__children__ = [child];
                }
            } 
        }
        page.generator(context);

        return content;
    }

    docuscript.render = function<T extends string, FuncMap extends Docuscript.NodeFuncMap<T>>(page: Docuscript.Page<T, FuncMap>, patch?: {
        pre?: (node: Docuscript.Node<T>) => void;
        post?: (node: Docuscript.Node<T>, dom: Node) => void;
    }) {
        const fragment = new DocumentFragment();
        const parser = page.parser as Docuscript.Parser<string, FuncMap>;

        let content = docuscript.parse(page);

        let stack: Node[] = [];
        let walk = (node: Docuscript.Node<T>) => {
            if (RHU.exists(patch) && RHU.exists(patch.pre)) {
                patch.pre(node);
            }
            let dom = parser[node.__type__].parse(node as any);
            if (RHU.exists(patch) && RHU.exists(patch.post)) {
                patch.post(node, dom);
            }

            let parent = stack.length === 0 ? undefined : stack[stack.length - 1];

            stack.push(dom);

            if (node.__children__) {
                for (let child of node.__children__) {
                    walk(child);
                }
            }

            if (parent) {
                parent.appendChild(dom);
            } else {
                fragment.append(dom);
            }

            stack.pop();
        };
        for (let node of content) {
            if (!node.__children__ || node.__children__.length === 0) {
                if (RHU.exists(patch) && RHU.exists(patch.pre)) {
                    patch.pre(node);
                }
                const dom = parser[node.__type__].parse(node as any);
                fragment.append(dom);
                if (RHU.exists(patch) && RHU.exists(patch.post)) {
                    patch.post(node, dom);
                }
                continue;
            }
            walk(node);
        }

        return fragment;
    };

    docuscript.defaultParser = defaultParser;
})();