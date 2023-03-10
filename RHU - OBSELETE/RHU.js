/**
 * RHU - Random HTML Utility
 * @randomuserhi.github.io
 */

"use strict";

/**
 * @namespace RHU
 */
var RHU;
(function (RHU) 
{
	/**  
	 * @func{public static} Gets a specific DOM element from web page by its ID
	 * @param id{string} ID of element
	 * @param clearID{boolean:optional(true)} If false, will not remove the ID attribute from html element, otherwise will clear ID attribute
	 * @return{RHU.Component} RHU.Component for the grabbed HTMLElement
	 */
	RHU.getElementById = function(id, clearID = true)
	{
		let el = document.getElementById(id);
		if (clearID) el.removeAttribute("id");
		
		return el;
	};

	/**
	 * Implementation utilizing custom elements.
	 *
	 * TODO(randomuserhi):
	 * - Support for shadowed slotted and non-shadow slotted via rhu-append="slotname"
	 * 		- Shadowed slots is already implemented by HTML Spec so <div slot="slotname"> will work,
	 *        but non-shadowed will not work.
	 * - Support for inputing a inline string for shadowed styles to make it easier to disable and enable shadow:
	 *      - Currently you supply <style> block in html source which means when switching between shadow option you need to remove
	 *        <style> block from source
	 * - Support for pseudo-element shinanigens for shadowed components
	 * 		- Fairly sure pseudo-element works but I haven't tested it yet...
	 */
    (() => {

        /**
         * @func{public static} Append RHU default styles to an element
         * @param element{HTMLElement} element to append style to
         */
        RHU.InsertDefaultStyles = function(element)
        {
            let style = document.createElement("style");
            style.innerHTML = `rhu-slot,rhu-shadow,rhu-macro { display: contents; }`;
            element.prepend(style);
        };
        RHU.InsertDefaultStyles(document.head);

        // Parse templates and macros after window load to handle first pass issues where DOM hasn't been fully parsed.
        // Disable parsing templates until after window load event
        // https://github.com/WICG/webcomponents/issues/809#issuecomment-737669670
        RHU._DELAYED_PARSE = true;
        RHU._DELAYED_ELEMENTS = [];
        // TODO(randomuserhi): document this => stores elements that have yet to be parsed due to being set prior to window load
        // TODO(randomuserhi): rename to something like _delayedParse
        RHU._delayedEl = function(element, type) 
        {
            this.element = element;
            this.type = type;
        }
        RHU._delayedEl.prototype.apply = function()
        {
            if (!this.element._constructed)
            {
                this.element.type = this.type;
                this.element.attributeChangedCallback("rhu-type", "", this.type);
            }
        }
        window.addEventListener("load", () => {
            RHU._DELAYED_PARSE = false;
            for (let el of RHU._DELAYED_ELEMENTS) el.apply();
            for (let args of RHU.CustomElement._DELAYED_CUSTOM_ELEMENTS)
            {
                RHU.CustomElement(...args);
            }
        });

        /**
         * @property{private static} _domParser{DOMParser} Stores an instance of a DOMParser for parsing 
         */
        RHU._domParser = new DOMParser();

        /**
         * @class{RHU._Slot} Describes a custom HTML element
         * NOTE(randomuserhi): This definition might be a bit redundant... consider removing
         */
        RHU._Slot = function()
        {
            let construct = Reflect.construct(HTMLElement, [], RHU._Slot);

            (function() {

            }).call(construct);

            return construct;
        };
        /**
         * Inherit from HTMLElement
         */
        RHU._Slot.prototype = Object.create(HTMLElement.prototype);
        // As per creating custom elements, define them 
        customElements.define("rhu-slot", RHU._Slot);

        /**
         * @class{RHU._Shadow} Describes a custom HTML element
         * NOTE(randomuserhi): This definition might be a bit redundant... consider removing
         */
        RHU._Shadow = function()
        {
            let construct = Reflect.construct(HTMLElement, [], RHU._Shadow);

            (function() {

            }).call(construct);

            return construct;
        };
        /**
         * Inherit from HTMLElement
         */
        RHU._Shadow.prototype = Object.create(HTMLElement.prototype);
        // As per creating custom elements, define them 
        customElements.define("rhu-shadow", RHU._Shadow);

        /**
         * TODO(randomuserhi): document this function override, its used to determine what objects to grab
         */
        Object.defineProperty(Node.prototype, "_rhuInstance", {
            get() 
            {
                return this;
            }
        });

        /**
         * TODO(randomuserhi): document this function override, its used to determine what objects to grab
         */
        Object.defineProperty(Node.prototype, "content", {
            get() 
            {
                return [this];
            }
        });

        /**
         * @class{RHU._Macro} Describes a custom HTML element
         */
        RHU._Macro = function()
        {
            let construct = Reflect.construct(HTMLElement, [], RHU._Macro);

            (function() {
                
                /**
                 * TODO(randomuserhi): document parameters, _constructed, _macro
                 */

                this._constructed = false;
                this._macro = null;

                // setup mutation observer to watch for attribute changes: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
                // TODO(randomuserhi): allow to detect other changes
                const callback = (mutationList, observer) => 
                {
                    if (!this._constructed) return;

                    for (const mutation of mutationList) 
                    {
                        if (mutation.type == "attributes")
                        {
                            if (!RHU._Macro.observedAttributes.includes(mutation.attributeName))
                            this._macro?.onAttributeChange?.call(this._macro, 
                                mutation.attributeName, mutation.oldValue, this.getAttribute(mutation.attributeName)
                            );
                        }
                    }
                };
                this.observer = new MutationObserver(callback);
                this.observer.observe(this, {
                    attributes: true,
                    attributeOldValue: true,
                    childList: false,
                    subtree: false
                });

            }).call(construct);

            return construct;
        };
        /**
         * Inherit from HTMLElement
         */
        RHU._Macro.prototype = Object.create(HTMLElement.prototype);
        /**  
         * TODO(randomuserhi): document this
         */
        Object.defineProperty(RHU._Macro.prototype, "_rhuInstance", {
            get() 
            {
                return this._macro;
            }
        });
        /**  
         * TODO(randomuserhi): document this
         */
        Object.defineProperty(RHU._Macro.prototype, "constructed", {
            get() 
            {
                return this._constructed;
            }
        });
        /**  
         * @func{public} Consume macro if it was generated prior to document body.
         */
        RHU._Macro.prototype.consume = function()
        {
            if (this._macro)
            {
                HTMLElement.prototype.replaceWith.call(this, ...this._macro._content);
            }
        };
        /**  
         * @func{public override} callback that is triggered when element is connected to something
         *                        https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks
         */
        RHU._Macro.prototype.connectedCallback = function()
        {
            this.consume();
        };
        /**  
         * @func{public override} callback that is triggered when rhu-template type changes
         *                        https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks
         */
        RHU._Macro.prototype.attributeChangedCallback = function(name, oldValue, newValue)
        {
            // Check for first time parse (document hasn't fully loaded yet):
            // NOTE(randomuserhi): check for isConnected as macros inside of others may be parsed, its just root macros
            //                     that need to be delayed until post windows load event
            if (RHU._DELAYED_PARSE && !this.isConnected)
            {
                RHU._DELAYED_ELEMENTS.push(new RHU._delayedEl(this, newValue));
                return;
            }

            // Trigger parse on type change if we have not been parsed yet
            if (oldValue != newValue) RHU.Macro._parse(newValue, this);
        };
        /**
         * @get{public} type{string} get typename of rhu-macro
         */   
        Object.defineProperty(RHU._Macro.prototype, "type", {
            get() 
            {
                return this.getAttribute("rhu-type");
            },
            set(type)
            {
                this.setAttribute("rhu-type", type);
            }
        });
        /**
         * @get{public} macro{RHU.Macro} get macro object this macro describes
         */   
        Object.defineProperty(RHU._Macro.prototype, "macro", {
            get() 
            {
                if (this._macro) return this._macro;
                throw new Error("Macro has not been set a type or has not been created yet.");
            }
        });
        /**
         * @get{public static} observedAttributes{Array[string]} As per HTML Spec provide which attributes that are being watched
         */ 
        Object.defineProperty(RHU._Macro, "observedAttributes", {
            get() 
            {
                return ["rhu-type"];
            }
        });
        /**
         * @get{public} childNodes{-} Macro elements dont have childNodes
         */   
        Object.defineProperty(RHU._Macro.prototype, "childNodes", {
            get() 
            {
                throw new Error("'Macro' does not have children.");
            }
        });
        /**
         * @get{public} children{-} Macro elements dont have children
         */   
        Object.defineProperty(RHU._Macro.prototype, "children", {
            get() 
            {
                throw new Error("'Macro' does not have children.");
            }
        });
        /**  
         * @func{public override} Override append to use slot
         * @param ...items{Object} items being appended
         */
        RHU._Macro.prototype.append = function(...items) 
        {
            throw new Error("'Macro' cannot append items.");
        };
        /**  
         * @func{public override} Override prepend to use slot
         * @param ...items{Object} items being prepended
         */
        RHU._Macro.prototype.prepend = function(...items) 
        {
            throw new Error("'Macro' cannot prepend items.");
        };
        /**  
         * @func{public override} Override appendChild to use slot
         * @param item{Object} item being appended
         */
        RHU._Macro.prototype.appendChild = function(item)
        {
            throw new Error("'Macro' cannot append child.");
        };
        /**  
         * @func{public override} Override replaceChildren to use slot
         * @param ...items{Object} items to replace children with
         */
        RHU._Macro.prototype.replaceChildren = function(...items) 
        {
            throw new Error("'Macro' cannot replace children.");
        };
        // As per creating custom elements, define them 
        customElements.define("rhu-macro", RHU._Macro);

        /**  
         * @func{public} Create a macro of type
         * @param type{string} type of macro being created
         */
        HTMLDocument.prototype.createMacro = function(type, parent = null)
        {
            let element = this.createElement("rhu-macro");
            if (parent) parent.appendChild(element);
            element.type = type;
            return element.macro;
        };

        /**
         * @class{RHU.Macro} Describes a RHU macro
         * @param type{string} type name of macro
         * @param object{Object} object type of macro
         * @param source{string} HTML of macro
         * @param options{Object} TODO(randomuserhi): document this object
         */
        RHU.Macro = function(type, object, source, options = {})
        {
            /**
             * @property{private} _type{string} name of component
             * @property{private} _source{string} HTML source of component
             * @property{private} _options{Object} TODO(randomuserhi): document this object
             */

            if (new.target === undefined) throw new TypeError("Constructor Macro requires 'new'.");
            if (type == "") throw new SyntaxError("'type' cannot be blank.");
            if (typeof type != "string") throw new TypeError("'type' must be a string");
            if (typeof source != "string") throw new TypeError("'source' must be a string");

            this._type = type;
            this._source = source;
            this._options = options;

            // Add constructor to template map
            if (RHU.Macro._templates.has(type)) console.warn(`Macro template '${type}' already exists. Definition will be overwritten.`);
            RHU.Macro._templates.set(type, object);
        };
        /**
         * NOTE(randomuserhi): Not sure how much sense it makes to register items into macro content
         *                     This is nice for when you have dynamic macro content thats in macro root, so
         *                     the only way to append the entire macro is to use .content, but should you
         *                     really be appending to macro root? you can't even reference it unless
         *                     you go roundabout via macro header (.header) or through .parentNode.
         *                     
         *                     For now, commented out cause this doesn't make much sense.
         */
        /*RHU.Macro.prototype.registerContent = function(item) 
        {
            this._content.push(item);
        }
        RHU.Macro.prototype.unregisterContent = function(item) 
        {
            this._content = this._content.filter(el => el !== item);
        }*/
        /**
         * @get{public} header{HTMLElement} element of macro.
         */
        Object.defineProperty(RHU.Macro.prototype, "header", {
            enumerable: true,
            configurable: true,
            get() 
            {
                return this._header;
            }
        });
        /**
         * @get{public} content{Array[HTMLElement]} returns the elements that made up this macro
         * NOTE(randomuserhi): returns a copy simply to prevent altering of content array via reference.
         *                     I am aware doing a copy is not performant
         */   
        Object.defineProperty(RHU.Macro.prototype, "content", {
            enumerable: true,
            configurable: true,
            get() 
            {
                return [...this._content];
            }
        });
        
        /**  
         * @func{public static} Parse an element and generate its macro
         * @param type{string} type of macro being created
         * @param element{HTMLElement} macro element
         */
        RHU.Macro._parse = function(type, element)
        {
            // Purge old dom
            HTMLElement.prototype.replaceChildren.call(element);
            if (element._macro)
                for (let content of element._macro._content)
                    if (content.parentNode) content.parentNode.remove(content);

            // Get constructor and create template, but do not call constructor yet
            // such that elements and properties can be populated
            let constructor = RHU.Macro._templates.get(type);
            if (!constructor) constructor = RHU.Macro._default;
            let construct = Object.create(constructor.prototype);

            // Get elements from parser 
            let doc = RHU._domParser.parseFromString(construct._source ? construct._source : "", "text/html");

            // Create properties
            let referencedElements = doc.querySelectorAll("*[rhu-id]");
            let properties = {};
            for (let el of referencedElements)
            {
                let identifier = el.getAttribute("rhu-id");
                el.removeAttribute("rhu-id");
                if (properties.hasOwnProperty(identifier)) throw new SyntaxError(`Identifier '${identifier}' already exists.`);
                Object.defineProperty(properties, identifier, {
                    configurable: true,
                    enumerable: true,
                    get() 
                    {
                        return el._rhuInstance;
                    }
                })
            }

            // Attach to body to expand nested elements (Kinda hacky solution)
            let shadow = document.createElement("rhu-shadow");
            shadow.append(...doc.head.childNodes);
            shadow.append(...doc.body.childNodes);
            document.body.appendChild(shadow);

            // Move items back to doc to perform queries
            doc.body.appendChild(shadow);

            // Get main node (First node, prioritizing first element), if no nodes are present then dont assign a main node.
            // NOTE(randomuserhi): Since we are refering to nodes, text nodes may technically be used as the main
            //                     node.
            let result = construct;
            if (shadow.childNodes.length > 0) 
            {
                result = shadow.children.length > 0 ? shadow.children[0] : shadow.childNodes[0];
                // Assign getters and setters from original prototype:
                Object.defineProperties(result, Object.getOwnPropertyDescriptors(RHU.Macro.prototype));
                // Assign getters and setters from constructor (may contain user-defined gets and sets):
                Object.defineProperties(result, Object.getOwnPropertyDescriptors(constructor.prototype));
                Object.assign(result, constructor.prototype);
            }
            // Assign properties to result object
            for (let identifier in properties)
            {
                if (construct._options && construct._options.strict)
                {
                    if (construct._options.strict == "all")
                    {
                        if (identifier in result) throw new SyntaxError(`Identifier '${identifier}' cannot override internal property.`);
                    }
                    else if (construct._options.strict == "partial")
                    {
                        if (result.hasOwnProperty(identifier)) throw new SyntaxError(`Identifier '${identifier}' cannot override macro property.`);
                    }
                }
                Object.defineProperty(result, identifier, {
                    configurable: true,
                    enumerable: true,
                    get() 
                    {
                        return properties[identifier];
                    }
                });
            }

            /**
             * initialize object
             *
             * @property{private} _element{HTMLElement} Element containing component
             * @property{private} _content{Array[HTMLElement]} elements that make up the macro
             */
            result._content = [];
            result._header = element;

            // Remove from doc to prevent HTML issues
            result._content.push(...shadow.childNodes);
            HTMLElement.prototype.append.call(element, ...shadow.childNodes);

            // Set new macro
            element._macro = result;

            // Call constructor
            console.log(`innerHTML: ${result.innerHTML}`);
            constructor.call(result);

            // replace macro header if possible
            element.replaceWith(...result._content);

            // Set macro as constructed
            element._constructed = true;
            result._constructed = true;
        };
        /**
         * @property{private static} _templates{Map[string -> RHU.Macro]} Maps a type name to a RHU.Macro 
         */
        RHU.Macro._templates = new Map();

        /**
         * TODO(randomuserhi): document this, its simply a default template used to handle undefined type
         */
        RHU.Macro._default = function() {};
        RHU.Macro._default.prototype = Object.create(RHU.Macro.prototype);

        /**
         * @class{RHU._Template} Describes a custom HTML element
         */
        RHU._Template = function()
        {
            let construct = Reflect.construct(HTMLElement, [], RHU._Template);

            (function() {
                
                /**
                 * TODO(randomuserhi): document parameters, _redefine, _slot, observer
                 */
                Object.assign(this, RHU._Component.properties);

                this._constructed = false;
                this._redefine = true;
                this._slot = null;

                // setup mutation observer to watch for attribute changes: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
                // TODO(randomuserhi): allow to detect other changes
                const callback = (mutationList, observer) => 
                {
                    if (!this._constructed) return;

                    for (const mutation of mutationList) 
                    {
                        if (mutation.type == "attributes")
                        {
                            if (!RHU._Template.observedAttributes.includes(mutation.attributeName))
                            this.onAttributeChange?.call(this._template, 
                                mutation.attributeName, mutation.oldValue, this.getAttribute(mutation.attributeName)
                            );
                        }
                    }
                };
                this.observer = new MutationObserver(callback);
                this.observer.observe(this, {
                    attributes: true,
                    attributeOldValue: true,
                    childList: false,
                    subtree: false
                });

            }).call(construct);

            return construct;
        };
        /**
         * NOTE(randomuserhi): Default properties, also used to denote what properties to preserve between
         *                     element parses when type is changed (since we do not call constructor again,
         *                     so we need to keep these properties which are set on first constructor call)
         */
        RHU._Template.properties = {
            _redefine: false,
            _slot: null,
            _constructed: false,
            observer: null
        }
        /**
         * Inherit from HTMLElement
         */
        RHU._Template.prototype = Object.create(HTMLElement.prototype);
        /**  
         * TODO(randomuserhi): document this
         */
        Object.defineProperty(RHU._Template.prototype, "constructed", {
            get() 
            {
                return this._constructed;
            }
        });
        /**  
         * @func{public override} callback that is triggered when rhu-template type changes
         *                        https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks
         */
        RHU._Template.prototype.attributeChangedCallback = function(name, oldValue, newValue)
        {
            // Check for first time parse (document hasn't fully loaded yet):
            // NOTE(randomuserhi): check for isConnected as templates inside of others may be parsed, its just root templates
            //                     that need to be delayed until post windows load event
            if (RHU._DELAYED_PARSE && !this.isConnected)
            {
                RHU._DELAYED_ELEMENTS.push(new RHU._delayedEl(this, newValue));
                return;
            }

            // Trigger parse on type change
            if (oldValue != newValue) RHU.Template._parse(newValue, this);
        };
        /**
         * @get{public} slot{RHU._Slot} get slot element of rhu-template
         */   
        Object.defineProperty(RHU._Template.prototype, "slot", {
            enumerable: true,
            get() 
            {
                return this._slot;
            }
        });
        /**
         * @get{public} type{string} get typename of rhu-template
         * @set{public} type{string} set typename of rhu-template
         */   
        Object.defineProperty(RHU._Template.prototype, "type", {
            enumerable: true,
            get() 
            {
                return this.getAttribute("rhu-type");
            },
            set(type)
            {
                this.setAttribute("rhu-type", type);
            }
        });
        /**
         * @get{public static} observedAttributes{Array[string]} As per HTML Spec provide which attributes that are being watched
         */ 
        Object.defineProperty(RHU._Template, "observedAttributes", {
            enumerable: true,
            get() 
            {
                return ["rhu-type"];
            }
        });
        /**  
         * @func{public override} Override append to use slot
         * @param ...items{Object} items being appended
         */
        RHU._Template.prototype.append = function(...items) {
            if (this._slot) this._slot.append(...items);
            else HTMLElement.prototype.append.call(this, ...items);
        };
        /**  
         * @func{public override} Override prepend to use slot
         * @param ...items{Object} items being prepended
         */
        RHU._Template.prototype.prepend = function(...items) {
            if (this._slot) this._slot.prepend(...items);
            else HTMLElement.prototype.prepend.call(this, ...items);
        };
        /**  
         * @func{public override} Override appendChild to use slot
         * @param item{Object} item being appended
         */
        RHU._Template.prototype.appendChild = function(item) {
            if (this._slot) this._slot.appendChild(item);
            else HTMLElement.prototype.appendChild.call(this, item);
        };
        /**  
         * @func{public override} Override replaceChildren to use slot
         * @param ...items{Object} items to replace children with
         */
        RHU._Template.prototype.replaceChildren = function(...items) {
            if (this._slot) this._slot.replaceChildren(...items);
            else HTMLElement.prototype.replaceChildren.call(this, ...items);
        };
        // As per creating custom elements, define them 
        customElements.define("rhu-template", RHU._Template);

        /**  
         * @func{public} Create a template of type
         * @param type{string} type of template being created
         */
        HTMLDocument.prototype.createTemplate = function(type)
        {
            let element = this.createElement("rhu-template");
            element.type = type;
            return element;
        };

        /**
         * @class{RHU.Template} Describes a RHU component
         * @param type{string} type name of component
         * @param object{Object} object type of component
         * @param source{string} HTML of component
         * @param options{Object} TODO(randomuserhi): document this object
         */
        RHU.Template = function(type, object, source, options = { defaultSlot: false })
        {
            /**
             * @property{private} _type{string} name of component
             * @property{private} _source{string} HTML source of component
             * @property{private} _options{Object} TODO(randomuserhi): document this object
             */

            if (new.target === undefined) throw new TypeError("Constructor Template requires 'new'.");
            if (type == "") throw new SyntaxError("'type' cannot be blank.");
            if (typeof type != "string") throw new TypeError("'type' must be a string");
            if (typeof source != "string") throw new TypeError("'source' must be a string");

            this._type = type;
            this._source = source;
            this._options = options;

            // Add constructor to template map
            if (RHU.Template._templates.has(type)) console.warn(`Template template '${type}' already exists. Definition will be overwritten.`);
            RHU.Template._templates.set(type, object);
        };
        /**  
         * @func{public static} Parse an element and generate its template
         * @param type{string} type of template being created
         * @param element{HTMLElement} template element
         */
        RHU.Template._parse = function(type, element)
        {
            // Set element to not be constructed
            element._constructed = false;

            // Get children
            let frag = new DocumentFragment();
            if (element._slot) frag.append(...element._slot.childNodes);
            else frag.append(...element.childNodes);

            // Purge old dom
            HTMLElement.prototype.replaceChildren.call(element);

            // Get constructor and create template, but do not call constructor yet
            // such that elements and properties can be populated
            let constructor = RHU.Template._templates.get(type);
            if (!constructor) constructor = RHU.Template._default;
            // reset prototype and extend
            // NOTE(randomuserhi): redefine is a slow operation, ideally components do not change type frequently causing
            //                     too many redefine calls.
            if (element._redefine) RHU.js.redefine(element, RHU._Template.prototype, RHU._Template.properties);
            element._redefine = true;
            // Assign getters and setters from original prototype:
            Object.defineProperties(element, Object.getOwnPropertyDescriptors(RHU.Template.prototype));
            // Assign getters and setters from constructor (may contain user-defined gets and sets):
            Object.defineProperties(element, Object.getOwnPropertyDescriptors(constructor.prototype));
            Object.assign(element, constructor.prototype);

            // Get elements from parser 
            let doc = RHU._domParser.parseFromString(element._source ? element._source : "", "text/html");

            // Create properties
            // NOTE(randomuserhi): In the event proper macros are added, this property search should happen
            //                     after append to document such that all children are generated so that it can
            //                     locate un-consumed rhu-id's that were dynamically generated.
            let referencedElements = doc.querySelectorAll("*[rhu-id]");
            let properties = {}
            for (let el of referencedElements)
            {
                let identifier = el.getAttribute("rhu-id");
                el.removeAttribute("rhu-id");
                if (element._options && element._options.strict)
                {
                    if (construct._options.strict == "all")
                    {
                        if (identifier in element) throw new SyntaxError(`Identifier '${identifier}' cannot override internal property.`);
                    }
                    else if (construct._options.strict == "partial")
                    {
                        if (element.hasOwnProperty(identifier)) throw new SyntaxError(`Identifier '${identifier}' cannot override macro property.`);
                    }
                }
                else if (properties.hasOwnProperty(identifier)) throw new SyntaxError(`Identifier'${identifier}' already exists.`);
                properties[identifier] = null;
                Object.defineProperty(element, identifier, {
                    configurable: true,
                    enumerable: true,
                    get() 
                    {
                        return el._rhuInstance;
                    }
                })
            }
 
            // Find append targets
            // NOTE(randomuserhi): A new array is created cause the collection is a reference, so when we append
            //                     new dom the later check to possibleTargets.length == 0 won't be correct.
            //                     It may be better to just have a boolean check here instead and store the primitive
            //                     since creating a new array is expensive.
            // NOTE(randomuserhi): This must be performed before generating nested dom by attaching to body
            //                     such that it doesnt pull nested rhu-slot's from other templates as possible
            //                     targets.
            let possibleTargets = [...doc.getElementsByTagName("rhu-slot")];
            // Obtain slot, if there isn't a provided slot then create a new one
            element._slot = possibleTargets[0];
            if (!element._slot) element._slot = document.createElement("rhu-slot");

            // Append new dom
            // NOTE(randomuserhi): head and body both need to be appended to adjust for <style> and <script> tags that are inserted at head
            HTMLElement.prototype.append.call(element, ...doc.head.childNodes);
            HTMLElement.prototype.append.call(element, ...doc.body.childNodes);

            // Attach to body to expand nested elements (Kinda hacky solution)
            let originalParent = element.parentNode;
            if (document.body) document.body.appendChild(element);
            // Detach from body to prevent HTML errors
            if (originalParent) originalParent.appendChild(element);
            else document.body.removeChild(element);

            // Call constructor
            constructor.call(element);

            // If no append targets were found, append one
            // NOTE(randomuserhi): called after constructor, to assure append target is at the end
            if (possibleTargets.length == 0 && element._options && element._options.defaultSlot)
            {
                HTMLElement.prototype.appendChild.call(element, element._slot);
            }

            // Append children
            element._slot.append(...frag.childNodes);

            // Set element as constructed
            element._constructed = true;
        };
        /**
         * @property{private static} _templates{Map[string -> RHU.Template]} Maps a type name to a RHU.Template 
         */
        RHU.Template._templates = new Map();

        /**
         * TODO(randomuserhi): document this, its simply a default template used to handle undefined type
         */
        RHU.Template._default = function() {};
        RHU.Template._default.prototype = Object.create(RHU.Template.prototype);
        RHU.Template._default.prototype._options = { defaultSlot: false };

		/**
		 * @property{public static} COMPONENT_SHADOW_MODE{string} determines the shadow mode for RHU.Component's 
		 */
		RHU.COMPONENT_SHADOW_MODE = "closed";

		/**
		 * @class{RHU._Component} Describes a custom HTML element
		 */
		RHU._Component = function()
		{
			let construct = Reflect.construct(HTMLElement, [], RHU._Component);

			(function() {
				
                /**
                 * TODO(randomuserhi): document parameters, _component, _shadowRoot
                 */
                Object.assign(this, RHU._Component.properties);

				this._redefine = false;
                this._constructed = false;
				this._shadow = this.attachShadow({ mode: RHU.COMPONENT_SHADOW_MODE });

				// setup mutation observer to watch for attribute changes: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
				// TODO(randomuserhi): allow to detect other changes
				const callback = (mutationList, observer) => 
				{
                    if (!this._constructed) return;

					for (const mutation of mutationList) 
					{
						if (mutation.type == "attributes")
						{
							if (!RHU._Component.observedAttributes.includes(mutation.attributeName))
					  		this.onAttributeChange?.call(this._component, 
					  			mutation.attributeName, mutation.oldValue, this.getAttribute(mutation.attributeName)
					  		);
						}
					}
				};
				this.observer = new MutationObserver(callback);
				this.observer.observe(this, {
					attributes: true,
					childList: false,
					subtree: false
				});

			}).call(construct);

			return construct;
		};
        /**
         * NOTE(randomuserhi): Default properties, also used to denote what properties to preserve between
         *                     element parses when type is changed (since we do not call constructor again,
         *                     so we need to keep these properties which are set on first constructor call)
         */
        RHU._Component.properties = {
            _redefine: false,
            _constructed: false,
            _shadow: null,
            observer: null
        }
		/**
		 * Inherit from HTMLElement
		 */
		RHU._Component.prototype = Object.create(HTMLElement.prototype);
		/**  
		 * @func{public override} callback that is triggered when rhu-component type changes
		 *                        https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks
		 */
		RHU._Component.prototype.attributeChangedCallback = function(name, oldValue, newValue)
		{
            // Check for first time parse (document hasn't fully loaded yet):
            // NOTE(randomuserhi): check for isConnected as components inside of others may be parsed, its just root components
            //                     that need to be delayed until post windows load event
            if (RHU._DELAYED_PARSE && !this.isConnected)
            {
                RHU._DELAYED_ELEMENTS.push(new RHU._delayedEl(this, newValue));
                return;
            }

			// Trigger parse on type change
			if (oldValue != newValue) RHU.Component._parse(newValue, this);
		};
        /**  
         * TODO(randomuserhi): document this
         */
        Object.defineProperty(RHU._Component.prototype, "constructed", {
            get() 
            {
                return this._constructed;
            }
        });
		/**
		 * @get{public} type{string} get typename of rhu-component
		 * @set{public} type{string} set typename of rhu-component
		 */   
		Object.defineProperty(RHU._Component.prototype, "type", {
			get() 
			{
				return this.getAttribute("rhu-type");
			},
			set(type)
			{
				this.setAttribute("rhu-type", type);
			}
		});
		/**
		 * @get{public static} observedAttributes{Array[string]} As per HTML Spec provide which attributes that are being watched
		 */ 
		Object.defineProperty(RHU._Component, "observedAttributes", {
			get() 
			{
				return ["rhu-type"];
			}
		});
		// As per creating custom elements, define them 
    	customElements.define("rhu-component", RHU._Component);

		/**  
		 * @func{public} Create a component of type
		 * @param type{string} type of component being created
		 */
		HTMLDocument.prototype.createComponent = function(type)
		{
			let element = this.createElement("rhu-component");
			element.type = type;
			return element;
		};

		/**
		 * @class{RHU.Component} Describes a RHU component
		 * @param type{string} type name of component
		 * @param object{Object} object type of component
		 * @param source{string} HTML of component
		 * @param options{Object} TODO(randomuserhi): document this object
		 * 
		 * NOTE(randomuserhi): Not sure if storing a document and cloning is faster than what I currently do which is just running 
		 *       	           _domParser.parseFromString() on creation every time and moving the elements.
		 */
		RHU.Component = function(type, object, source, options = { defaultSlot: false })
		{
			/**
			 * @property{private} _type{string} name of component
			 * @property{private} _source{string} HTML source of component
			 * @property{private} _options{Object} TODO(randomuserhi): document this object
			 */

			if (new.target === undefined) throw new TypeError("Constructor Component requires 'new'.");
			if (type == "") throw new SyntaxError("'type' cannot be blank.");
			if (typeof type != "string") throw new TypeError("'type' must be a string");
			if (typeof source != "string") throw new TypeError("'source' must be a string");

			this._type = type;
			this._source = source;
			this._options = options;

			// Add constructor to template map
			if (RHU.Component._templates.has(type)) console.warn(`Component template '${type}' already exists. Definition will be overwritten.`);
			RHU.Component._templates.set(type, object);
		};
        /**
         * @get{public} root{HTMLElement} root of component.
         */
        Object.defineProperty(RHU.Component.prototype, "shadow", {
            enumerable: true,
            get() 
            {
                return this._shadow;
            }
        });
		/**  
		 * @func{public static} Parse an element and generate its component
		 * @param type{string} type of component being created
		 * @param element{HTMLElement} component element
		 */
		RHU.Component._parse = function(type, element)
		{
            // Set element to not be constructed
            element._constructed = false;

			// If component exists, clear shadow root
			if (element._shadow) element._shadow.replaceChildren();

            // Get constructor and create template, but do not call constructor yet
            // such that elements and properties can be populated
            let constructor = RHU.Component._templates.get(type);
            if (!constructor) constructor = RHU.Component._default;
            // reset prototype and extend
            // NOTE(randomuserhi): redefine is a slow operation, ideally components do not change type frequently causing
            //                     too many redefine calls.
            if (element._redefine) RHU.js.redefine(element, RHU._Component.prototype, RHU._Component.properties);
            element._redefine = true;
            // Assign getters and setters from original prototype:
            Object.defineProperties(element, Object.getOwnPropertyDescriptors(RHU.Component.prototype));
            // Assign getters and setters from constructor (may contain user-defined gets and sets):
            Object.defineProperties(element, Object.getOwnPropertyDescriptors(constructor.prototype));
            Object.assign(element, constructor.prototype);

			// Get elements from parser 
			let doc = RHU._domParser.parseFromString(element._source ? element._source : "", "text/html");

			// Create properties
            // NOTE(randomuserhi): In the event proper macros are added, this property search should happen
            //                     after append to document such that all children are generated so that it can
            //                     locate un-consumed rhu-id's that were dynamically generated.
			let referencedElements = doc.querySelectorAll("*[rhu-id]");
            let properties = {};
			for (let el of referencedElements)
			{
				let identifier = el.getAttribute("rhu-id");
				el.removeAttribute("rhu-id");
				if (element._options && element._options.strict)
                {
                    if (construct._options.strict == "all")
                    {
                        if (identifier in element) throw new SyntaxError(`Identifier '${identifier}' cannot override internal property.`);
                    }
                    else if (construct._options.strict == "partial")
                    {
                        if (element.hasOwnProperty(identifier)) throw new SyntaxError(`Identifier '${identifier}' cannot override macro property.`);
                    }
                }
                else if (properties.hasOwnProperty(identifier)) throw new SyntaxError(`Identifier'${identifier}' already exists.`);
				Object.defineProperty(element, identifier, {
					configurable: true,
					enumerable: true,
					get() 
					{
						return el._rhuInstance;
					}
				})
			}

            // Find append targets
            // NOTE(randomuserhi): A new array is created cause the collection is a reference, so when we append
            //                     new dom the later check to possibleTargets.length == 0 won't be correct.
            //                     It may be better to just have a boolean check here instead and store the primitive
            //                     since creating a new array is expensive.
            let possibleTargets = [...doc.getElementsByTagName("slot")];

			// Append new dom
			// NOTE(randomuserhi): head and body both need to be appended to adjust for <style> and <script> tags that are inserted at head
			element._shadow.append(...doc.head.childNodes);
			element._shadow.append(...doc.body.childNodes);

            // Attach to body to expand nested elements (Kinda hacky solution)
            let originalParent = element.parentNode;
            if (document.body) document.body.appendChild(element);
            // Detach from body to prevent HTML errors
            if (originalParent) originalParent.appendChild(element);
            else document.body.removeChild(element);

            // Call constructor
            constructor.call(element);

            // If no append targets were found, append one
            // NOTE(randomuserhi): called after constructor, to assure append target is at the end
            if (possibleTargets.length == 0 && element._options && element._options.defaultSlot)
                element._shadow.appendChild(document.createElement("slot"));

            // Add default styles
            RHU.InsertDefaultStyles(element._shadow);

            // Set element as constructed
            element._constructed = true;
		};
		/**
		 * @property{private static} _templates{Map[string -> RHU.Component]} Maps a type name to a RHU.Component 
		 */
		RHU.Component._templates = new Map();

		/**
		 * TODO(randomuserhi): document this, its simply a default component used to handle undefined type
		 */
		RHU.Component._default = function() {};
		RHU.Component._default.prototype = Object.create(RHU.Component.prototype);
        RHU.Component._default.prototype._options = { defaultSlot: false };

        /**
         * @func{public static} Creates a new custom element
         * @param type{string} type name of component
         * @param object{Object} object type of component
         * @param source{string} HTML of component
         * @param options{Object} TODO(randomuserhi): document this object
         * 
         * NOTE(randomuserhi): Not sure if storing a document and cloning is faster than what I currently do which is just running 
         *                     _domParser.parseFromString() on creation every time and moving the elements.
         */
        RHU.CustomElement = function(type, object, source, options = { mode: "closed", defaultSlot: false })
        {
            if (RHU._DELAYED_PARSE) 
            {
                RHU.CustomElement._DELAYED_CUSTOM_ELEMENTS.push(arguments);
                return;
            }

            if (type == "") throw new SyntaxError("'type' cannot be blank.");
            if (typeof type != "string") throw new TypeError("'type' must be a string");
            if (typeof source != "string") throw new TypeError("'source' must be a string");

            // Declare new element
            /**
             * TODO(randomuserhi): document class
             */
            let custom = function()
            {
                let construct = Reflect.construct(HTMLElement, [], custom);

                (function() {

                    /**
                     * TODO(randomuserhi): document parameters, _shadowRoot, _shadow
                     */
                    this._shadowRoot = this.attachShadow({ mode: (options && options.mode) ? options.mode : "closed" });
                    this._shadow = this._shadowRoot;
                    
                    // Generate shadow Dom

                    // Get elements from parser 
                    let doc = RHU._domParser.parseFromString(source, "text/html");

                    // Create properties
                    let referencedElements = doc.querySelectorAll("*[rhu-id]");
                    for (let el of referencedElements)
                    {
                        let identifier = el.getAttribute("rhu-id");
                        el.removeAttribute("rhu-id");
                        if (options && options.strict)
                        {
                            if (construct._options.strict == "all")
                            {
                                if (identifier in this) throw new SyntaxError(`Identifier '${identifier}' cannot override internal property.`);
                            }
                            else if (construct._options.strict == "partial")
                            {
                                if (this.hasOwnProperty(identifier)) throw new SyntaxError(`Identifier '${identifier}' cannot override macro property.`);
                            }
                        }
                        else if (properties.hasOwnProperty(identifier)) throw new SyntaxError(`Identifier'${identifier}' already exists.`);
                        Object.defineProperty(this, identifier, {
                            configurable: true,
                            enumerable: true,
                            get() 
                            {
                                return el._rhuInstance;
                            }
                        })
                    }

                    // Find append targets
                    // NOTE(randomuserhi): A new array is created cause the collection is a reference, so when we append
                    //                     new dom the later check to possibleTargets.length == 0 won't be correct.
                    //                     It may be better to just have a boolean check here instead and store the primitive
                    //                     since creating a new array is expensive.
                    let possibleTargets = [...doc.getElementsByTagName("slot")];

                    // Append new dom
                    // NOTE(randomuserhi): head and body both need to be appended to adjust for <style> and <script> tags that are inserted at head
                    this._shadowRoot.append(...doc.head.childNodes);
                    this._shadowRoot.append(...doc.body.childNodes);

                    // Attach to body to expand nested elements (Kinda hacky solution)
                    let originalParent = this.parentNode;
                    if (document.body) document.body.appendChild(this);
                    // Detach from body to prevent HTML errors
                    if (originalParent) originalParent.appendChild(this);
                    else document.body.removeChild(this);

                    // Call constructor
                    object.call(this);

                    // If no append targets were found, append one
                    // NOTE(randomuserhi): called after constructor, to assure append target is at the end
                    if (possibleTargets.length == 0 && options && options.defaultSlot) 
                    {
                        this._shadow = document.createElement("rhu-shadow");
                        this._shadow.append(...this._shadowRoot.childNodes);
                        this._shadowRoot.append(this._shadow);
                        this._shadowRoot.appendChild(document.createElement("slot"));
                    }

                    // Add default styles
                    RHU.InsertDefaultStyles(this._shadowRoot);

                }).call(construct);

                return construct;
            }
            /**
             * Inherit from HTMLElement
             */
            custom.prototype = Object.create(HTMLElement.prototype);
            /**
             * @get{public} root{HTMLElement} root of component.
             */
            Object.defineProperty(custom.prototype, "shadow", {
                get() 
                {
                    return this._shadow;
                }
            });
            // Extend prototype by object
            Object.assign(custom.prototype, object.prototype);
            custom.constructor = custom;

            // As per creating custom elements, define them 
            customElements.define(`rhu-${type}`, custom);
        };
        RHU.CustomElement._DELAYED_CUSTOM_ELEMENTS = [];

	})();

	/**
	 * DEPRECATED(randomuserhi): The following section is deprecated.
	 *
	 * TODO(randomuserhi):
	 * - Support for shadowed slotted and non-shadow slotted via rhu-append="slotname"
	 * 		- Shadowed slots is already implemented by HTML Spec so <div slot="slotname"> will work,
	 *        but non-shadowed will not work.
	 * - Support for inputing a inline string for shadowed styles
	 *      - Not sure how this would work for non-shadowed components 
	 */ 
	(() => {
		/**
		* Parse main document on load for components
		*/
		(() => {
			window.addEventListener("load", () => {
				RHU.Component.parse(document);
			});
		})();

		/**
		 * @class{RHU.Component} Describes a RHU component
		 * @param type{string} type name of component
		 * @param object{Object} object type of component
		 * @param source{string} HTML of component
		 * @param options{Object} TODO(randomuserhi): document this object
		 * 
		 * NOTE(randomuserhi): Not sure if I should have create 1 document as a static variable for performance, or create a seperate
		 *       instance to support parallel processing. Maybe its fine to use a static document if I append to the using 
		 *       a container so elements dont get mixed.
		 * NOTE(randomuserhi): Not sure if storing a document and cloning is faster than what I currently do which is just running 
		 *       _domParser.parseFromString() on creation every time and moving the elements.
		 * NOTE(randomuserhi): I currently use doc.querySelector() to select referenced elements, however it might be worth looking at dataset:
		 *       https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset
		 * NOTE(randomuserhi): Drawback of attach function not allowing you to attach child components seperately => technically no one would
		 *       want to do this, but it is a consideration.
		 * NOTE(randomuserhi): Limitation with fully deleting / altering dom element from component dynamically since `_dom` parameter always keeps track of it
		 * NOTE(randomuserhi): Limitation with recursively defined components which self-reference. Maybe I should consider allowing it when a recursion depth
		 *       is provided.
		 */
		RHU.Component = function(type, object, source, options = {})
		{
			/**
			 * @property{private} _type{string} name of component
			 * @property{private} _source{string} HTML source of component
			 * @property{private} _component{HTMLElement} Element containing component
			 * @property{private} _shadowRoot{ShadowRoot} Shadow containing components if shadow option is used
			 * @property{private} _dom{Array[HTMLElement]} List of elements component consists of
			 * @property{private} _target{HTMLElement} Element that elements will append to
			 * @property{private} _options{Object} TODO(randomuserhi): document this object
			 */

			if(new.target === undefined) throw new TypeError("Constructor Component requires 'new'.");

			this._type = type;
			this._source = source;
			this._component = null;
			this._shadowRoot = null;
			this._dom = null;
			this._target = null;
			this._options = options;

			// Add constructor to template map
			RHU.Component._templates.set(type, object);
		};
		/**  
		 * @func{public} Parses a document for <rhu-components> and constructs them
		 * @param doc{HTMLDocument} document to parse
		 * @param owner{Object} owner object to push references onto
		 */
		RHU.Component.parse = function(doc, owner = null)
		{
			// Get <rhu-component> tags and create their components
			let childComponents = [...doc.getElementsByTagName("rhu-component")];
			for (let component of childComponents)
			{
				// If we already hold a refernce to this component then it has already been parsed so we skip it
				if (RHU.Component._map.has(component)) continue;

				// Get children of component
				let children = [...component.children];

				// Get constructor and create component
				let type = component.getAttribute("rhu-type");
				let constructor = RHU.Component._templates.get(type);
				if (!constructor) continue; //throw new TypeError(`RHU.Component of type '${type}' does not exist.`);
				let rhuComponent = new constructor();
				rhuComponent._push();

				// If component is owned by another component, grab references
				if (owner)
				{
					// Check if it is a referenced component, create property if it is
					let identifier = component.getAttribute("rhu");
					component.removeAttribute("rhu");
					if (identifier)
					{
						if (owner.hasOwnProperty(identifier)) throw new SyntaxError(`Identifier '${identifier}' already exists.`);
						owner[identifier] = rhuComponent;
					}
				}

				// Set component
				component.replaceWith(rhuComponent._component);

				// Append children
				for (let child of children)
				{
					rhuComponent.appendChild(child);
				}
			}
		}
		/**  
		 * @func{public} Generate the HTML elements for the component
		 */
		RHU.Component.prototype.create = function()
		{
			// Don't regenerate elements if they are created already
			if (this._component) return;

			// Create component tag
			this._component = document.createElement("rhu-component");
			this._component.setAttribute("rhu-type", this._type);
			if (this._options.shadow) this._shadowRoot = this._component.attachShadow({ mode: this._options.shadow });

			// Get elements from parser 
			let doc = RHU.Component._domParser.parseFromString(this._source, "text/html");

			// Parse custom components existing in doc
			RHU.Component.parse(doc, this);

			// Create properties
			let referencedComponents = doc.querySelectorAll("*[rhu]");
			for (let component of referencedComponents)
			{
				let identifier = component.getAttribute("rhu");
				component.removeAttribute("rhu");
				if (this.hasOwnProperty(identifier)) throw new SyntaxError(`Identifier '${identifier}' already exists.`);
				this[identifier] = component;
			}

			// Find append target
			let possibleTargets = doc.querySelectorAll("*[rhu-append]");
			this._target = possibleTargets[0];
			// Remove tag
			for (let el of possibleTargets)
			{
				el.removeAttribute("rhu-append");
			}
			if (this._options.shadow) 
			{
				if (!this._target) doc.body.appendChild(document.createElement("slot"));
				else this._target.appendChild(document.createElement("slot"));

				this._target = this._component;
			}
			else if (!this._target) this._target = this._component;

			// store elements
			this._dom = [...doc.body.children];

			// Add reference to weak map for queries.
			RHU.Component._map.set(this._component, this);
		};
		/**
		 * @func{private} Push generated elements to main container to render to DOM.
		 */
		RHU.Component.prototype._push = function()
		{
			this.create();
			if (this._options.shadow) this._shadowRoot.append(...this._dom);
			else this._component.append(...this._dom);
		}
		/**
		 * @get{public} id{string} get the id of component.
		 * @set{public} id{string} set the id of this component.
		 */
		Object.defineProperty(RHU.Component.prototype, "id", {
			get() 
			{
				return this._component.id;
			},
			set(id)
			{
				this._component.id = id;
			}
		})
		/**
		 * @get{public} classList{DOMTokenList} get the classList of component.
		 * @set{public} classList{DOMTokenList} set the classList of this component.
		 */
		Object.defineProperty(RHU.Component.prototype, "classList", {
			get() 
			{
				return this._component.classList;
			},
			set(value)
			{
				this._component.classList = value;
			}
		})
		/**  
		 * @func{public} get the value of an attribute from the component
		 * @param attribute{string} name of attribute
		 * @return{Object} value of attribute
		 */
		RHU.Component.prototype.getAttribute = function(attribute)
		{
			return this._component.getAttribute(attribute);
		};
		/**  
		 * @func{public} set attribute of the component
		 * @param attribute{string} name of attribute
		 * @param value{Object} value of attribute
		 */
		RHU.Component.prototype.setAttribute = function(attribute,value)
		{
			this._component.setAttribute(attribute, value);
		};
		/**  
		 * @func{public} check if the component has a given attribute
		 * @param attribute{string} name of attribute
		 * @return{Boolean} True if the component has the attribute, otherwise false
		 */
		RHU.Component.prototype.hasAttribute = function(attribute)
		{
			return this._component.hasAttribute(attribute);
		};
		/**  
		 * @func{public} Attach component to another element
		 * @param parent{HTMLElement} Component to attach to element
		 */
		RHU.Component.prototype.attach = function(parent)
		{
			this._push();
			parent.appendChild(this._component);
		};
		/**  
		 * @func{public} Detach component from another element
		 * @param parent{HTMLElement} Element to remove component from
		 */
		RHU.Component.prototype.detach = function(parent)
		{
			parent.removeChild(this._component);	
		};
		/**  
		 * @func{public} Append element to component
		 * @param child{HTMLElement} element to attach to component
		 */
		RHU.Component.prototype.appendChild = function(child)
		{
			this._target.appendChild(child);
		};
		/**  
		 * @func{public} Detach component from another element
		 * @param child{HTMLElement} Element to remove component from
		 */
		RHU.Component.prototype.removeChild = function(child)
		{
			this._target.removeChild(child);	
		};
		/**  
		 * @func{public} Append element to component
		 * @param component{HTMLElement} element to attach to component
		 */
		RHU.Component.prototype.appendComponent = function(component)
		{
			component.attach(this._target);
		};
		/**  
		 * @func{public} Detach component from another element
		 * @param component{HTMLElement} Element to remove component from
		 */
		RHU.Component.prototype.removeComponent = function(component)
		{
			component.detach(this._target);
		};
		/**
		 * @property{private static} _map{WeakMap[HTMLElement -> RHU.Component]} Weak map to maintain component object with element 
		 * 
		 * Use of WeakMap allows proper memory management of components when they are removed from dom and unreferenced,
		 * such that _map does not clog up infinitely.
		 */
		RHU.Component._map = new WeakMap();
		/**  
		 * @func{public static} Gets the RHU.Component from the provided <rhu-component> element
		 * @param element{HTMLElement} element to get component from 
		 * @return{RHU.Component}
		 */
		RHU.Component.getComponentFromElement = function(element)
		{
			let component = RHU.Component._map.get(element);
			if (component) return component;
			else return null;
		};
		/**
		 * @property{private static} _templates{Map[string -> RHU.Component]} Maps a type name to a RHU.Component 
		 */
		RHU.Component._templates = new Map();
		/**
		 * @property{private static} _domParser{DOMParser} Stores an instance of a DOMParser for parsing 
		 */
		RHU.Component._domParser = new DOMParser();
		/**  
		 * @func{public} Append a component to element
		 * @param component{RHU.Component} Component to attach to element
		 */
		Node.prototype.appendComponent = function(component)
		{
			component.attach(this);
		}
		/**  
		 * @func{public} Removes a component to element
		 * @param component{RHU.Component} Component to remove from element
		 */
		Node.prototype.removeComponent = function(component)
		{
			component.detach(this);
		}
		/**
		 * @func{public} Gets a component by id
		 * @return{RHU.Component}
		 */
		HTMLDocument.prototype.getComponentById = function(id)
		{
			let component = RHU.Component._map.get(this.getElementById(id));
			if (component) return component;
			else return null;
		}
	});

})(RHU || (RHU = {}));