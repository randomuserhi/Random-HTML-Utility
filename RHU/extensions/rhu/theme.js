(function() {
    "use strict";

    let RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("");
    RHU.module({ module: "x-rhu/theme", trace: new Error(), hard: [] }, function() {
        if (RHU.exists(RHU.Theme))
            console.warn("Overwriting RHU.Theme...");

        let Theme = RHU.Theme = {};

        Theme.Group = function(name)
        {
            /**
             * @property{private} _name{string}                         Name of theme group
             * @property{private} _current{string}                      Name of current active theme in group
             * @property{private} _style{HTMLElement}                   Style block that contains the css for this theme group
             * @property{private} _themes{Map[string -> Object]}        Determines what rule set to apply based on active theme
             * @property{private} _mediaQueries{Map[string -> Object]}  Maps a media query to a ruleset
             * @property{public} ruleSet{Object}                        Default ruleset that applies when theme is not chosen
             */

            if(new.target === undefined) throw new TypeError("Constructor Group requires 'new'.");
            if (name == "") throw new TypeError("'name' cannot be blank.");

            this._name = name;
            this._current = "";
            this._style = null;
            this._themes = new Map();
            this._mediaQueries = new Map();
            this.ruleSet = new Theme.RuleSet();
        };
        RHU.definePublicAccessors(Theme.Group.prototype, {
            /**
             * @get themes{string} Get the themes this theme group has
             */
            themes: {
                get() { return this._themes; }
            },

            /**
             * @get mediaQueries{string} Get the mediaQueries this theme group has
             */
            mediaQueries: {
                get() { return this._mediaQueries; }
            },

            /**
             * @get active{string} Get the name of currently active theme
             * @set active{string} Set the name of currently active theme
             */
            active: {
                get() { return this._current; },
                set(theme)
                {
                    if (typeof theme !== "string") throw new TypeError("'active' must be of type string.");

                    let _curr = `${this._name}-${this._current}`;
                    let _new = `${this._name}-${this._current = theme}`;
                    let elems = document.getElementsByClassName(this._name);
                    for (let i = 0; i < elems.length; ++i)
                    {
                        elems[i].classList.remove(_curr);
                        if (theme !== "") elems[i].classList.add(_new);
                    }
                }
            },

            /**
             * @get style{HTMLElement} style element that this theme uses. Will return null if style has not been compiled yet.   
             */
            style: {
                get() { return this._style; }
            },

            /**
             * @get name{string} Get name of theme.   
             */
            name: {
                get() { return this._name; }
            }
        });
        /**  
         * @func                                    Generates CSS of this theme group
         * @param all{Boolean:optional(true)}       If true, will generate code for all themes, otherwise will just generate code for default theme
         * @param minified{Boolean:optional(true)}  If true, will generate minified css code, otherwise will pretty-print it
         * @return{String}                          CSS code
         *
         * BUG:: When minified is false, there should be indentation in the CSS. Currently there are no indentations.
         */
        Theme.Group.prototype.compile = function(all = true, minified = true) 
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
                code += RHU.clone(this.ruleSet, Theme.RuleSet.prototype).compile(minified);
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
                code += RHU.clone(ruleSet, Theme.RuleSet.prototype).compile(minified);
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
                    code += RHU.clone(ruleSet, Theme.RuleSet.prototype).compile(minified);
                    code += minified ? `}` 
                                     : `\n}\n`;
                }
            }

            return code;
        }
        /**  
         * @func Attaches the theme group to document
         */
        Theme.Group.prototype.attach = function() 
        {
            let style = this._style;
            if (style) style.parentNode.removeChild(style);
            style = this._style = document.createElement("style");
            style.innerHTML = this.compile();
            document.head.appendChild(style);
        }
        /**  
         * @func Removes theme group from document
         */
        Theme.Group.prototype.detach = function() 
        {
            let style = this._style;
            if (style) 
            {
                style.parentNode.removeChild(style);
                this._style = null;
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
        Theme.RuleSet = function() 
        {
            if(new.target === undefined) throw new TypeError("Constructor RuleSet requires 'new'.");
        }
        /**  
         * @func                                    Generates CSS of this ruleset
         * @param minified{Boolean:optional(true)}  If true, will generate minified css code, otherwise will pretty-print it
         * @return{String}                          CSS code
         */
        Theme.RuleSet.prototype.compile = function(minified = true)
        {
            let code = "";

            for (let key of Object.keys(this)) 
            {
                if (typeof key != "string" || typeof this[key] != "string") throw new TypeError("Ruleset cannot contain non-string entries.");

                code += minified ? `--js-${key}:${this[key]};` 
                                 : `--js-${key} : ${this[key]};\n`;
            }

            return code;
        }
    });
})();