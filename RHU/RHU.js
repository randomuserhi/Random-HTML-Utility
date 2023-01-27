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
		
		return new RHU.Component(el);
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
    	 * Trigger another parse on load to handle issues with DOM not being fully parsed:
    	 * https://github.com/WICG/webcomponents/issues/809#issuecomment-737669670
    	 */
		(() => {
			window.addEventListener("load", () => {
				// re-parse over custom elements to handle first pass issues where DOM hasn't been fully parsed.
				let elements = document.getElementsByTagName("rhu-component");
				for (let el of elements)
				{
					RHU.Component._parse(el.type, el);
				}
			});
		})();

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
				
				this._component = null;
				this._shadowRoot = this.attachShadow({ mode: RHU.COMPONENT_SHADOW_MODE });

				// setup mutation observer to watch for attribute changes: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
				// TODO(randomuserhi): allow to detect other changes
				const callback = (mutationList, observer) => 
				{
					for (const mutation of mutationList) 
					{
						if (mutation.type == "attributes") 
						{
					  		this._component?.attributeChangedCallback?.call(this._component, 
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
		 * Inherit from HTMLElement
		 */
		RHU._Component.prototype = Object.create(HTMLElement.prototype);
		/**  
		 * @func{public override} callback that is triggered when element is connected to something
		 *                        https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks
		 */
		RHU._Component.prototype.connectedCallback = function()
		{
			this._component?.connectedCallback?.call(this._component);
		};
		/**  
		 * @func{public override} callback that is triggered when rhu-component type changes
		 *                        https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks
		 */
		RHU._Component.prototype.attributeChangedCallback = function(name, oldValue, newValue)
		{
			// Trigger parse on type change
			RHU.Component._parse(newValue, this);
		};
		/**  
		 * @func{public override} Override appendChild to allow for custom append logic
		 * @param element{HTMLElement} element being appended
		 */
		RHU._Component.prototype.appendChild = function(element)
		{
			if (this._component) this._component.append(element);
			else HTMLElement.prototype.appendChild.call(this, element);
		};
		/**  
		 * @func{public override} Override append to allow for custom append logic
		 * @param ...items{Object} items being appended
		 */
		RHU._Component.prototype.append = function(...items)
		{
			if (this._component) this._component.append(...items);
			else HTMLElement.prototype.append.call(this, ...items);
		};
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
		 * @get{public} component{RHU.Component} get component object this component describes
		 */   
		Object.defineProperty(RHU._Component.prototype, "component", {
			get() 
			{
				if (this._component) return this._component;
				throw new Error("Component has not been set a type / created yet.");
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
		 * NOTE(randomuserhi): I currently use doc.querySelector() to select referenced elements, however it might be worth looking at dataset:
		 *                     https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset
		 * NOTE(randomuserhi): Limitation with recursively defined components which self-reference. Maybe I should consider allowing it when a recursion depth
		 *                     is provided.
		 */
		RHU.Component = function(type, object, source, options = {})
		{
			/**
			 * @property{private} _type{string} name of component
			 * @property{private} _source{string} HTML source of component
			 * @property{private} _element{HTMLElement} Element containing component
			 * @property{private} _shadowRoot{ShadowRoot} Shadow containing components if shadow option is used
			 * @property{private} _dom{Array[HTMLElement]} List of elements that make up the component that are living outside of shadowroot
			 *                                             TODO(randomuserhi): consider renaming to _lightDom or something...
			 * @property{private} _target{HTMLElement} Element that elements will append to
			 * @property{private} _options{Object} TODO(randomuserhi): document this object
			 */

			if (new.target === undefined) throw new TypeError("Constructor Component requires 'new'.");
			if (type == "") throw new SyntaxError("'type' cannot be blank.");
			if (typeof type != "string") throw new TypeError("'type' must be a string");
			if (typeof source != "string") throw new TypeError("'source' must be a string");

			this._type = type;
			this._source = source;
			this._element = null;
			this._shadowRoot = null;
			this._dom = null;
			this._target = null;
			this._options = options;

			// Add constructor to template map
			RHU.Component._templates.set(type, object);
		};
		/**
		 * @get{public} element{HTMLElement} element of component.
		 */
		Object.defineProperty(RHU.Component.prototype, "element", {
			get() 
			{
				return this._element;
			}
		})
		/**  
		 * @func{public static} Parse an element and generate its component
		 * @param type{string} type of component being created
		 * @param element{HTMLElement} component element
		 */
		RHU.Component._parse = function(type, element)
		{
			// If component exists, remove dom
			let old = element._component;
			if (old) 
			{
				// Clear shadowroot
				element._shadowRoot.replaceChildren();
				// Loop over elements and destroy
				for (let el of old._dom)
				{
					el.replaceWith(...el.children);
				}
			}
			// Move children to temporary space
			let temp = document.createElement("div");
			temp.append(...element.children);

			// Get constructor and create component, but do not call constructor yet
			// such that elements and properties can be populated
			let constructor = RHU.Component._templates.get(type);
			if (!constructor) constructor = RHU.Component._default;
			// redefine old object if its available to prevent destroying previous references to component,
			// otherwise create prototype.
			// NOTE(randomuserhi): redefine is a slow operation, ideally components do not change type frequently causing
			//                     too many redefine calls.
			let result = old ? RHU.js.redefine(element._component, constructor.prototype) 
							 : Object.create(constructor.prototype);
			result._element = element;

			// Get elements from parser 
			let doc = RHU.Component._domParser.parseFromString(result._source ? result._source : "", "text/html");

			// Create properties
			let referencedComponents = doc.querySelectorAll("*[rhu-id]");
			for (let component of referencedComponents)
			{
				let identifier = component.getAttribute("rhu-id");
				component.removeAttribute("rhu-id");
				if (result.hasOwnProperty(identifier)) throw new SyntaxError(`Identifier '${identifier}' already exists.`);
				Object.defineProperty(result, identifier, {
					configurable: true,
					enumerable: true,
					get() 
					{
						return component;
					}
				})
			}

			// Find append target
			let possibleTargets = doc.querySelectorAll("*[rhu-append]");
			result._target = possibleTargets[0];
			// Remove tag
			for (let el of possibleTargets)
			{
				el.removeAttribute("rhu-append");
			}
			if (result._options && result._options.shadow) 
			{
				if (!result._target) doc.body.appendChild(document.createElement("slot"));
				else result._target.appendChild(document.createElement("slot"));

				result._target = result._element;
			}
			else if (!result._target) result._target = result._element;

			// Append new dom
			// NOTE(randomuserhi): head and body both need to be appended to adjust for <style> and <script> tags that are inserted at head
			if (result._options && result._options.shadow) 
			{
				element._shadowRoot.append(...doc.head.children);
				element._shadowRoot.append(...doc.body.children);
			}
			else
			{
				element._shadowRoot.append(document.createElement("slot"));
				HTMLElement.prototype.append.call(result._element, ...doc.head.children);
				HTMLElement.prototype.append.call(result._element, ...doc.body.children);
			}

			// Get dom
			result._dom = [];
			if (!result._options || !result._options.shadow) result._dom.push(...result._element.querySelectorAll("*"))

			// Set new component
			element._component = result;

			// Call constructor
			constructor.call(result);

			// Append children
			element.append(...temp.children);
		};
		/**  
		 * @func{public} append items to component
		 * @param ...items{Object} items to append
		 */
		RHU.Component.prototype.append = function(...items)
		{
			for (let item of items) 
			{
				this.appendLogic(item)
			}
		};
		/**  
		 * @func{public virtual} Determines where items get appended to 
		 * @param item{Object} item to append
		 */
		RHU.Component.prototype.appendLogic = function(item)
		{
			if (this._target == this._element) HTMLElement.prototype.append.call(this._element, item);
			else this._target.append(item);
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
		 * TODO(randomuserhi): document this, its simply a default component used to handle undefined type
		 */
		RHU.Component._default = function() {};
		RHU.Component._default.prototype = Object.create(RHU.Component.prototype);

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