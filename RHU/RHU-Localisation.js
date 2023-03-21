/**
 * RHU - Random HTML Utility
 * @randomuserhi.github.io
 */

"use strict";

if (window[Symbol.for("RHU")] === undefined ||
    window[Symbol.for("RHU")] === null)
    throw new Error("Missing RHU dependency.");

if (window[Symbol.for("RHU")].Rest === undefined ||
    window[Symbol.for("RHU")].Rest === null)
    throw new Error("Missing RHU.Rest dependency.");

/**
 * @namespace _RHU (Symbol.for("RHU")), RHU
 * NOTE(randomuserhi): _RHU (Symbol.for("RHU")) is the internal library hidden from user, whereas RHU is the public interface.
 * TODO(randomuserhi): Add mutation observer cause doesnt work with new rhu-loc elements
 */
(function (_RHU, RHU) 
{

	let exists = _RHU.exists;

	/**
	 * @namespace _RHU._Localisation (Symbol.for("RHU")), RHU.Localisation
	 *
	 * TODO(randomuserhi): documentation
	 */
	(function (_Localisation, Localisation) 
	{

		/**
	     * Define local symbols used for localisation, these are completely
	     * hidden from view as they are defined in local scope
	     */
		let _symbols = {};
		_RHU.defineProperties(_symbols, {
	        _loaded: {
	        	value: Symbol("Localisation loaded languages")
	        }
	    });

		// TODO(randomuserhi): change link and format
		let _fetchLocalisation = _RHU.Rest.JSONfetch(
		{
			url: "http://localhost:8000/LocalisationGet",
			fetch: { method: "GET" },
			parser: function(language) {
			    return {
			    	urlParams: {
						"lang": language
				    }
			    }
			},
			callback: async function(resp)
			{
				if (resp.status == 200)
				{
					let json = await resp.json();
		            return json;
				}
				else 
				{
					return null;
				}
			}
		});

		let Localiser = function(languages)
		{
			this[_symbols._loaded] = {};
			this.current = "en"; // TODO(randomuserhi): make this better
		}
		Localiser.prototype.load = function(lang, translation)
		{
			this[_symbols._loaded][lang] = translation;
		}
		Localiser.prototype.set = function(language)
		{
			let cache = this[_symbols._loaded][language];
			if (exists(cache))
			{
				console.log(cache);
				let elements = document.querySelectorAll("[rhu-loc]");
				for (let el of elements)
				{
					let key = el.getAttribute("rhu-loc");
					if (exists(cache[key])) 
					{
						this.current = language;
						for (let prop in cache[key])
						{
							el[prop] = cache[key][prop];
						}
					}
				}
			}
			else
			{
				_fetchLocalisation(language).then((res) => {
					if (exists(res)) 
					{
						// TODO(randomuserhi): check for error response
						this[_symbols._loaded][language] = res.body.lang_set;
						this.set(language);
					}
				});
			}
		}

		/** ------------------------------------------------------------------------------------------------------
	     * NOTE(randomuserhi): Create interface for Rest API
	     */

		_RHU.definePublicProperties(_Localisation, {
	        Localiser: {
	            enumerable: false,
	            value: Localiser
	        }
	    });

	    _RHU.definePublicAccessors(Localisation, {
	        Localiser: {
	            get() { return _Localisation.Localiser; }
	        }
	    });

	})((_RHU.Localisation || (_RHU.Localisation = {})),
	   (RHU.Localisation || (RHU.Localisation = {})));

})((window[Symbol.for("RHU")] || (window[Symbol.for("RHU")] = {})), // Internal library that can only be accessed via Symbol.for("RHU")
   (window["RHU"] || (window["RHU"] = {}))); // Public interfact for library