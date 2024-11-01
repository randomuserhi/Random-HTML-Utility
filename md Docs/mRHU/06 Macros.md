%% NOTE(randomuserhi): unlike HTML, Macro elements are always boxed and cannot be unboxed. Calling (`.box()` and `.unbox()` does nothing). %%

```typescript
import { html, Macro, MacroElement } from "rhu/macro.js";

// Definition of a Macro called "List"
const List = Macro(class List extends MacroElement {
    constructor(dom: Node[], bindings: any, children: RHU_CHILDREN, title: string) {
        super(dom, bindings);
        
        this.title(title);
        this.slot.append(...children);

        this.slot.addEventListener("click", () => console.log("list clicked!"));
    }
}, () => html`
    <h>${html.signal("title")}</h>
    <ul m-id="slot">
    </ul>
    `);

// We can now use "List" in our In-Code HTMl for extended functionality
const [bindings, fragment] = html`
    ${List.open("Names").bind("list")}
        <li>Adam</li>
        <li>Bob</li>
        <li>Chris</li>
    ${List.close}
    `.dom();

console.log(bindings.list); // class List { .title, .slot }
console.log(bindings.list.title()); // "Names"
console.log(bindings.list.slot); // <ul>...</ul>
```

```html
<!-- fragment -->
<h>Names</h>
<ul>
    <li>Adam</li>
    <li>Bob</li>
    <li>Chris</li>
</ul>
```

%% Little to no difference with Functional Macros (Except copy semantics [[11 Samples#Simple Counter (Functional Macro)]]) %%

```typescript
const List = html`<ul m-id="ul"></ul>`.then(
    (self, children, dom) => {
        self.dom = dom; // Need to store DOM if moving elements
        
        self.ul.append(...children);

        // can assign methods
        self.append = (node: RHU_ELEMENT | Node) => {
            if (RHU_ELEMENT.is(node)) {
                const [_, fragment] = node.dom();
                self.ul.append(fragment);
            } else {
                self.ul.append(node);
            }
        };
    }).box();

const el = List.dom()[0];

// Use of .dom property thta we created to move element
// instead of the returned DocumentFragment
document.body.append(...el.dom);
document.getElementById("mount").append(...el.dom);

// Custom methods
el.append(document.createElement("li"));
el.append(html`<li>item</li>`);
```

```typescript
import { RHU_ELEMENT } from "rhu/macro.js";
import type { RHU_CHILDREN } from "rhu/macro.js";

const List = Macro(class List extends MacroElement {
    public ul: HTMLUListElement;

    constructor(dom: Node[], bindings: any, children: RHU_CHILDREN) {
        super(dom, bindings);
        
        this.ul.append(...children);
    }

    public append(node: RHU_ELEMENT | Node) {
        if (RHU_ELEMENT.is(node)) {
            const [_, fragment] = node.dom();
            this.ul.append(fragment);
        } else {
            this.ul.append(node);
        }
    }
}, () => html`
    <ul m-id="ul"></ul>
    `);

const el = Macro.create(List());

// Automatically stores an array of child elements
document.body.append(...el.dom);
document.getElementById("mount").append(...el.dom);

// Custom methods
el.append(document.createElement("li"));
el.append(html`<li>item</li>`);
```

%%TODO(randomuserhi): Typescript bindings using `const a: Macro<typeof SomeMacro>`%%

%%TODO(randomuserhi): Describe how to do custom arguments, and how u can access them in the html definition (thats why its a function)%%
