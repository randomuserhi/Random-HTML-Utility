/**
 * RHU - Random HTML Utility
 * @randomuserhi.github.io
 */

"use strict";

/**
 * @namespace _RHU (Symbol.for("RHU")), RHU
 * NOTE(randomuserhi): _RHU (Symbol.for("RHU")) is the internal library hidden from user, whereas RHU is the public interface.
 */
(function (_RHU, RHU) 
{

	_RHU.definePublicAccessors(_RHU,{
		/**
		 * @get darkmode{Boolean}	True if device preferences is dark theme, otherwise false
		 */
		darkmode: {
			enumerable: false,
			get()
			{
				return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
			}
		}
	});

	/**
	 * NOTE(randomuserhi): Define public interface
	 */
	_RHU.definePublicAccessors(RHU, {
		darkmode: { 
            get() { return _RHU.darkmode; }
        }
	});

	/**
	 * @namespace _RHU._Theme (Symbol.for("RHU")), RHU.Theme
	 */
	(function (_Theme, Theme) 
	{

		/**
	     * Define local symbols used for Themes, these are completely
	     * hidden from view as they are defined in local scope
	     */
		let _symbols = {};
		_RHU.defineProperties(_symbols, {
	        _name: {
	            value: Symbol("Theme name")
	        },
	        _current: {
	            value: Symbol("Theme current")
	        },
	        _style: {
	            value: Symbol("Theme style")
	        },
	        _themes: {
	            value: Symbol("Theme themes")
	        },
	        _mediaQueries: {
	            value: Symbol("Theme mediaQueries")
	        }
	    });

		/**
		 * @class{Theme.Group} 	Describes a theme group
		 * @param name{string} 	Name of theme group
		 *
		 * TODO(randomuserhi): Refactor => Create each theme in a seperate style block such that recompiling doesn't have to regen all style sheets when only 1 theme changes.
		 *           					   Only difficulty is ensuring style order such that the overrides work properly.
		 *           					   This is important since _RHU.clone() operation is expensive due to javascript prototype optimisation.
		 */
		let Group = function(name)
		{
			/**
			 * @property{symbol} _name{string} 							Name of theme group
			 * @property{symbol} _current{string} 						Name of current active theme in group
			 * @property{symbol} _style{HTMLElement} 					Style block that contains the css for this theme group
			 * @property{symbol} _themes{Map[string -> Object]} 		Determines what rule set to apply based on active theme
			 * @property{symbol} _mediaQueries{Map[string -> Object]} 	Maps a media query to a ruleset
			 * @property{public} ruleSet{Object} 						Default ruleset that applies when theme is not chosen
			 */

			if(new.target === undefined) throw new TypeError("Constructor Group requires 'new'.");
			if (name == "") throw new TypeError("'name' cannot be blank.");

			this[_symbols._name] = name;
			this[_symbols._current] = "";
			this[_symbols._style] = null;
			this[_symbols._themes] = new Map();
			this[_symbols._mediaQueries] = new Map();
			this.ruleSet = new RuleSet();
		};
		_RHU.definePublicAccessors(Group.prototype, {
			/**
			 * @get themes{string} Get the themes this theme group has
			 */
			themes: {
				get() { return this[_symbols._themes]; }
			},

			/**
			 * @get mediaQueries{string} Get the mediaQueries this theme group has
			 */
			mediaQueries: {
				get() { return this[_symbols._mediaQueries]; }
			},

			/**
			 * @get active{string} Get the name of currently active theme
			 * @set active{string} Set the name of currently active theme
			 */
			active: {
				get() { return this[_symbols._current]; },
				set(theme)
				{
					if (typeof theme != "string") throw new TypeError("'active' must be of type string.");

					let _curr = `${this[_symbols._name]}-${this[_symbols._current]}`;
				    let _new = `${this[_symbols._name]}-${this[_symbols._current] = theme}`;
				    let elems = document.getElementsByClassName(this[_symbols._name]);
				    for (let i = 0; i < elems.length; ++i)
				    {
				        elems[i].classList.remove(_curr);
				        if (theme != "") elems[i].classList.add(_new);
				    }
				}
			},

			/**
			 * @get style{HTMLElement} style element that this theme uses. Will return null if style has not been compiled yet.   
			 */
			style: {
				get() { return this[_symbols._style]; }
			},

			/**
			 * @get name{string} Get name of theme.   
			 */
			name: {
				get() { return this[_symbols._name]; }
			}
		});

		/**  
		 * @func 									Generates CSS of this theme group
		 * @param all{Boolean:optional(true)} 		If true, will generate code for all themes, otherwise will just generate code for default theme
		 * @param minified{Boolean:optional(true)} 	If true, will generate minified css code, otherwise will pretty-print it
		 * @return{String} 							CSS code
		 *
		 * BUG:: When minified is false, there should be indentation in the CSS. Currently there are no indentations.
		 */
		Group.prototype.compile = function(all = true, minified = true) 
		{
			/**
			 * NOTE(randomuserhi): clone is used to convert ruleset into a ruleset object to get access
			 *                     to compile function.
			 */

			let code = "";

			let name = `${this.name}`;

			// Compile default ruleset if it is provided
			if (this.ruleSet)
			{
				code += minified ? `.${name}{` 
							     : `.${name}\n{\n`;
				code += _RHU.clone(this.ruleSet, RuleSet.prototype).compile(minified);
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
				code += _RHU.clone(ruleSet, RuleSet.prototype).compile(minified);
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
					code += _RHU.clone(ruleSet, RuleSet.prototype).compile(minified);
					code += minified ? `}` 
									 : `\n}\n`;
				}
			}

			return code;
		}
		/**  
		 * @func Attaches the theme group to document
		 */
		Group.prototype.attach = function() 
		{
			let style = this[_symbols._style];
			if (style) style.parentNode.removeChild(style);
			style = this[_symbols._style] = document.createElement("style");
			style.innerHTML = this.compile();
			document.head.appendChild(style);
		}
		/**  
		 * @func Removes theme group from document
		 */
		Group.prototype.detach = function() 
		{
			let style = this[_symbols._style];
			if (style) 
			{
				style.parentNode.removeChild(style);
				this[_symbols._style] = null;
			}
		}

		/**
		 * @class{Theme.RuleSet} Describes the CSS rules for a theme
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
		let RuleSet = function() 
		{
			if(new.target === undefined) throw new TypeError("Constructor RuleSet requires 'new'.");
		}
		/**  
		 * @func 									Generates CSS of this ruleset
		 * @param minified{Boolean:optional(true)} 	If true, will generate minified css code, otherwise will pretty-print it
		 * @return{String} 							CSS code
		 */
		RuleSet.prototype.compile = function(minified = true)
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

		/** ------------------------------------------------------------------------------------------------------
	     * NOTE(randomuserhi): Create interface for Theme
	     */

		_RHU.definePublicProperties(_Theme, {
	        Group: { 
	            enumerable: false,
	            value: Group
	        },

	        RuleSet: {
	            enumerable: false,
	            value: RuleSet
	        }
	    });

	    _RHU.definePublicAccessors(Theme, {
	        Group: { 
	            get() { return _Theme.Group; }
	        },

	        RuleSet: {
	            get() { return _Theme.RuleSet; }
	        }
	    });


	})((_RHU.Theme || (_RHU.Theme = {})),
	(RHU.Theme || (RHU.Theme = {})));

})((window[Symbol.for("RHU")] || (window[Symbol.for("RHU")] = {})), // Internal library that can only be accessed via Symbol.for("RHU")
   (window["RHU"] || (window["RHU"] = {}))); // Public interfact for library