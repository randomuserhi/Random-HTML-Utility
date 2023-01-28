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
	 * @property{private static} _darkmode{boolean} Set to true if default preferences is dark mode 
	 */
	RHU._darkmode = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
	/**
	 * @get{public} darkmode{boolean} Set to true if default preferences is dark mode 
	 */
	Object.defineProperty(RHU, "darkmode", {
		get()
		{
			return RHU._darkmode;
		}
	});

	/**
	 * @namespace RHU.Theme
	 */
	RHU.Theme;
	(function (Theme) 
	{

		/**
		 * @class{RHU.Theme.Group} Describes a theme group
		 * @param name{string} Name of theme group
		 *
		 * REFACTOR: Create each theme in a seperate style block such that recompiling doesn't have to regen all style sheets when only 1 theme changes.
		 *           Only difficulty is ensuring style order such that the overrides work properly.
		 *           This is important since RHU.js.clone() operation is expensive due to javascript prototype optimisation.
		 */
		Theme.Group = function(name) 
		{
			/**
			 * @property{private} _name{string} Name of theme group
			 * @property{private} _current{string} Name of current active theme in group
			 * @property{private} _style{HTMLElement} Style block that contains the css for this theme group
			 * @property{private} _themes{Map[string -> Object]} Determines what rule set to apply based on active theme
			 * @property{private} _mediaQueries{Map[string -> Object]} Maps a media query to a ruleset
			 * @property{public} ruleSet{Object} Default ruleset that applies when theme is not chosen
			 */

			if(new.target === undefined) throw new TypeError("Constructor Group requires 'new'.");
			if (name == "") throw new TypeError("'name' cannot be blank.");

			this._name = name;
			this._current = "";
			this._style = null;
			this._themes = new Map();
			this._mediaQueries = new Map();
			this.ruleSet = new RHU.Theme.Group.RuleSet();
		}
		/**
		 * @get{public} themes{string} Get the themes this theme group has
		 */
		Object.defineProperty(RHU.Theme.Group.prototype, "themes", {
			get() 
			{
				return this._themes;
			}
		});
		/**
		 * @get{public} mediaQueries{string} Get the mediaQueries this theme group has
		 */
		Object.defineProperty(RHU.Theme.Group.prototype, "mediaQueries", {
			get() 
			{
				return this._mediaQueries;
			}
		});
		/**
		 * @get{public} active{string} Get the name of currently active theme
		 * @set{public} active{string} Set the name of currently active theme
		 */
		Object.defineProperty(RHU.Theme.Group.prototype, "active", {
			get() 
			{
				return this._current;
			},
			set(theme)
			{
				if (typeof theme != "string") throw new TypeError("'active' must be of type string.");

				let _curr = `${this._name}-${this._current}`;
			    let _new = `${this._name}-${this._current = theme}`;
			    let elems = document.getElementsByClassName(this._name);
			    for (let i = 0; i < elems.length; ++i)
			    {
			        elems[i].classList.remove(_curr);
			        if (theme != "") elems[i].classList.add(_new);
			    }
			}
		});
		/**
		 * @get{public} style{HTMLElement} style element that this theme uses. Will return null if style has not been compiled yet.   
		 */
		Object.defineProperty(RHU.Theme.Group.prototype, "style", {
			get() 
			{
				return this._style;
			}
		})
		/**
		 * @get{public} name{string} Get name of theme.   
		 */
		Object.defineProperty(RHU.Theme.Group.prototype, "name", {
			get() 
			{
				return this._name;
			}
		})
		/**  
		 * @func{public} Generates CSS of this theme group
		 * @param all{boolean:optional(true)} If true, will generate code for all themes, otherwise will just generate code for default theme
		 * @param minified{boolean:optional(true)} If true, will generate minified css code, otherwise will pretty-print it
		 * @return{string} CSS code
		 *
		 * BUG:: When minified is false, there should be indentation in the CSS. Currently there are no indentations.
		 */
		Theme.Group.prototype.compile = function(all = true, minified = true) 
		{
			let code = "";

			let name = `${this._name}`;

			// Compile default ruleset if it is provided
			if (this.ruleSet)
			{
				code += minified ? `.${name}{` 
							     : `.${name}\n{\n`;
				code += RHU.js.clone(this.ruleSet, Theme.Group.RuleSet.prototype).compile(minified);
				code += minified ? `}` 
								 : `\n}\n`;
			}

			// Compile media queries
			for (let [query, ruleSet] of this.mediaQueries)
			{
				if (!ruleSet) continue;
				code += minified ? `@media(${query}){` 
								 : `@media (${query})\n{\n`;
				code += minified ? `.${name}{` 
						     	 : `.${name}\n{\n`;
				code += RHU.js.clone(ruleSet, Theme.Group.RuleSet.prototype).compile(minified);
				code += minified ? `}}` 
								 : `\n}\n}\n`;
			}

			// Compile different themes if necessary:
			if (all)
			{
				// Generate the theme variables
				for (let [theme, ruleSet] of this.themes)
				{
					if (!ruleSet) continue;
					code += minified ? `.${name}-${theme}{` 
							         : `.${name}-${theme}\n{\n`;
					code += RHU.js.clone(ruleSet, Theme.Group.RuleSet.prototype).compile(minified);
					code += minified ? `}` 
									 : `\n}\n`;
				}
			}

			return code;
		}
		/**  
		 * @func{public} Attaches the theme group to document
		 */
		Theme.Group.prototype.attach = function() 
		{
			if (this._style) this._style.parentNode.removeChild(this._style);
			this._style = document.createElement("style");
			this._style.innerHTML = this.compile();
			document.head.appendChild(this._style);
		}
		/**  
		 * @func{public} Removes theme group from document
		 */
		Theme.Group.prototype.detach = function() 
		{
			if (this._style) 
			{
				this._style.parentNode.removeChild(this._style);
				this._style = null;
			}
		}

		/**
		 * @class{RHU.Theme.Group.RuleSet} Describes the CSS rules for a theme
		 * 
		 * Object parameters represent the CSS variable and the value represents the css value:
		 * 
		 * {
		 *     "bg-color": "#ffffff",
		 *     "font": "\"Open Sans\"",
		 * }
		 * 
		 * represets:
		 * 
		 * {
	     *     --bg-color: #ffffff;
	     *     --font: "Open Sans";
		 * }
		 */
		Theme.Group.RuleSet = function() 
		{
			if(new.target === undefined) throw new TypeError("Constructor RuleSet requires 'new'.");
		}
		/**  
		 * @func{public} Generates CSS of this ruleset
		 * @param minified{boolean:optional(true)} If true, will generate minified css code, otherwise will pretty-print it
		 * @return{string} CSS code
		 */
		Theme.Group.RuleSet.prototype.compile = function(minified = true)
		{
			let code = "";

			for (let key of Object.keys(this)) 
			{
				if (typeof key != "string" || typeof this[key] != "string") throw new TypeError("Ruleset cannot contain non-string entries.");

				code += minified ? `--${key}:${this[key]};` 
								 : `--${key} : ${this[key]};\n`;
			}

			return code;
		}

		/**
		 * @property{public static} current{string} Name of the current active theme 
		 */
		Theme.current = "default";

		/**  
		 * @func{public static} Sets the current theme of the page
		 * @param theme{string} Name of theme to switch to
		 */
		Theme.setTheme = function (theme)
		{
		    let _curr = "duqa-theme-" + Theme.currentTheme;
		    let _new = "duqa-theme-" + (Theme.currentTheme = theme);
		    let elems = document.getElementsByClassName("duqa-theme");
		    for (let i = 0; i < elems.length; ++i)
		    {
		        elems[i].classList.remove(_curr);
		        elems[i].classList.add(_new);
		    }
		};
		
	})(RHU.Theme || (RHU.Theme = {}));

})(RHU || (RHU = {}));