declare namespace RHU {
    interface Modules {
        "components/molecules/filterlist": "molecules/filterlist";
    }

    namespace Macro {
        interface TemplateMap {
            "molecules/filterlist": Molecules.Filterlist;
            "atoms/filteritem": Atoms.Filteritem;
        }
    }
}

declare namespace Atoms {
    interface Filteritem extends HTMLDivElement {
        set(page: Page): void;
    
        page?: Page;

        body: HTMLDivElement;
        label: HTMLDivElement;
        list: HTMLDivElement;
        dropdown: HTMLSpanElement;
    }
}

declare namespace Molecules {
    interface Filterlist extends HTMLDivElement {
        load(version: string): void;
        setPath(path?: string): void;
        setActive(path: string, seek?: boolean): void;
        
        activePath?: string;
        lastActive?: Atoms.Filteritem;
        root?: string;
        currentVersion: string;

        version: Atoms.Dropdown;
        search: HTMLInputElement;
        path: HTMLDivElement;
        list: HTMLDivElement;
    }
}

interface GlobalEventHandlersEventMap {
    "view": CustomEvent<{ target: unknown }>;
}

RHU.module(new Error(), "components/molecules/filterlist", { 
    Macro: "rhu/macro", style: "components/molecules/filterlist/style",
    dropdown: "components/atoms/dropdown",
    docs: "docs",
}, function({ 
    Macro, style,
    dropdown,
    docs,
}) {
    const filteritem = Macro((() => {
        const filteritem = function(this: Atoms.Filteritem) {
            this.label.addEventListener("click", (e) => {
                this.dispatchEvent(RHU.CustomEvent("view", { target: this.page }));
                e.preventDefault(); // stop redirect
            });
            this.dropdown.addEventListener("click", (e) => {
                this.classList.toggle(`${style.filteritem.expanded}`);
            });
        } as RHU.Macro.Constructor<Atoms.Filteritem>;

        filteritem.prototype.set = function(page) {
            this.label.innerHTML = page.name;
            const url = new URL(window.location.origin + window.location.pathname);
            url.searchParams.set("version", page.version);
            url.searchParams.set("page", page.fullPath());
            this.label.setAttribute("href", url.toString());

            this.page = page;

            const fragment = new DocumentFragment();
            for (const p of page.sortedKeys()) {
                const item = document.createMacro("atoms/filteritem");
                item.set(page.subDirectories.get(p)!);
                item.addEventListener("view", (e) => {
                    this.dispatchEvent(RHU.CustomEvent("view", e.detail));
                });
                page.get(p)!.dom = item;
                fragment.append(item);
            }
            if (fragment.childElementCount > 0) {
                this.dropdown.classList.toggle(`${style.filteritem.nochildren}`, false);
            } else {
                this.dropdown.classList.toggle(`${style.filteritem.nochildren}`, true);
            }
            this.list.replaceChildren(fragment);
        };

        return filteritem;
    })(), "atoms/filteritem", //html
        `
            <div rhu-id="body" class="${style.filteritem.content}">
                <span rhu-id="dropdown" class="${style.filteritem.nochildren} ${style.dropdown}"></span>
                <a class="${style.filteritem}" rhu-id="label"></a>
            </div>
            <ol rhu-id="list" class="${style.filteritem.children}">
            </ol>
        `, {
            element: //html
            `<li></li>`
        });

    const filterlist = Macro((() => {
        const filterlist = function(this: Molecules.Filterlist) {
            this.classList.add(`${style.wrapper}`);

            this.version.setOptions(docs.sort([...docs.versions.keys()], "desc").map(k => ({
                label: k,
                value: k,
            })));

            this.version.addEventListener("change", () => {
                this.load(this.version.value);
            });

            this.lastActive = undefined;
            this.root = undefined;
            this.setPath(this.root);

            this.load(this.version.value);
        } as RHU.Macro.Constructor<Molecules.Filterlist>;

        filterlist.prototype.load = function(versionStr) {
            this.currentVersion = versionStr;
            const version = docs.get(versionStr);
            if (!RHU.exists(version)) {
                this.list.replaceChildren();
                return;   
            }
            const fragment = new DocumentFragment();
            const root: Directory | undefined = this.root ? version.get(this.root) : version;
            if (!root) {
                // TODO(randomuserhi): Root not found error
                return;
            }
            for (const page of root.sortedKeys()) {
                const item = document.createMacro(filteritem);
                const view = root.subDirectories.get(page)!;
                item.addEventListener("view", (e) => {
                    //this.setPath(e.detail.page.fullPath()); // -> TODO(randomuserhi): Add a button (similar to dropdown button) on right side that sets path instead of every click.
                    this.dispatchEvent(RHU.CustomEvent("view", e.detail));
                });
                item.set(view);
                view.dom = item;
                fragment.append(item);
            }
            this.list.replaceChildren(fragment);

            if (this.activePath) {
                this.setActive(this.activePath);
            }
        };

        // TODO(randomuserhi): Path functionality is the exact same as the path displayed above page title, only difference is styles
        //                     - move into an Atom and use rhu-macro here instead
        filterlist.prototype.setPath = function(path) {
            const version = docs.get(this.currentVersion);

            if (!path || !version) {
                this.path.replaceChildren();
            } else {
                
                let frag = new DocumentFragment();
                if (path) {
                    const item = document.createElement("a");
                    item.innerHTML = "~";
                    item.addEventListener("click", (e) => {
                        this.setPath();
                        e.preventDefault();
                    });

                    const url = new URL(window.location.origin + window.location.pathname);
                    url.searchParams.set("version", this.currentVersion);
                    item.setAttribute("href", url.toString());

                    item.classList.toggle(`${style.path.item}`);
                    const wrapper = document.createElement("li");
                    wrapper.append(item);
                    frag.append(wrapper);
                }
                let builtPath: string[] = [];
                for (const directory of docs.split(path)) {
                    const item = document.createElement("a");
                    item.innerHTML = directory;
                    
                    builtPath.push(directory);
                    const p = [...builtPath].join("/");
                    item.addEventListener("click", (e) => {
                        this.setPath(builtPath.slice(0, builtPath.length - 1).join("/"));
                        e.preventDefault();
                    });
                    const page = version.get(p);
                    if (page) {
                        const url = new URL(window.location.origin + window.location.pathname);
                        url.searchParams.set("version", page.version);
                        url.searchParams.set("page", p);
                        item.setAttribute("href", url.toString());
                    }

                    item.classList.toggle(`${style.path.item}`);
                    const wrapper = document.createElement("li");
                    wrapper.append(item);
                    frag.append(wrapper);
                }
                this.path.replaceChildren(frag);
            }
            
            this.root = path;
            this.load(this.currentVersion);
        };

        filterlist.prototype.setActive = function(path, seek) {
            this.activePath = path;

            if (seek) {
                const parts = docs.split(path);
                if (parts.length > 1) {
                    this.setPath(parts.slice(0, parts.length - 1).join("/"));
                } else {
                    this.setPath();
                }
            }

            if (this.lastActive) {
                this.lastActive.body.classList.toggle(`${style.filteritem.active}`, false); // TODO(randomuserhi): Make into a filteritem function called "toggleActive" or something
            }

            const version = docs.get(this.currentVersion);
            if (version) {
                const directory = version.get(path);
                if (directory && directory.dom) {
                    directory.dom.body.classList.toggle(`${style.filteritem.active}`, true); // TODO(randomuserhi): Make into a filteritem function called "toggleActive" or something
                    this.lastActive = directory.dom;
                    let page = directory.parent as Page;
                    while (page) {
                        if (page && page.dom) {
                            page.dom.classList.toggle(`${style.filteritem.expanded}`, true); // TODO(randomuserhi): Make into a filteritem function called "toggleExpand" or something
                        }
                        page = page.parent as Page;
                    }
                }
            }
        };

        return filterlist;
    })(), "molecules/filterlist", //html
        `
        <div class="${style.content}">
            <div style="font-weight: 800; font-size: 1.125rem;">Version</div>
            <rhu-macro rhu-id="version" rhu-type="${dropdown}" style="
                width: 100%;
            "></rhu-macro>
            <!--<input rhu-id="search" type="text" style="
                width: 100%;
            "/>-->
            <ol rhu-id="path" class="${style.path}"></ol>
            <div style="
                width: 100%;
                height: 1px;
                background-color: #eee;
            "></div>
            <ol rhu-id="list"></ol>
        </div>
        `, {
            element: //html
            `<div></div>`
        });

    return filterlist;
});