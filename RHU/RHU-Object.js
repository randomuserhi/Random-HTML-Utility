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
	 * @namespace RHU.Theme
	 */
	RHU.js;
	(function (js) 
	{

		/**  
		 * @func{public static} Returns a clone of a javascript object
		 * @param object{Object} ID of element
		 * @param prototype{Object:optional(null)} If provided, will clone object into another object of provided prototype
		 * @return{Object} cloned object
		 */
		js.clone = function(object, prototype = null)
		{
			if (prototype) return Object.assign(Object.create(prototype), object);
			else return Object.assign(Object.create(Object.getPrototypeOf(object)), object);
		}

		/**
		 * TODO(randomuserhi): document this
		 */
		js.delete = function(object, preserve = null)
		{
			for (let key in object) 
			{
				if (object.hasOwnProperty(key) && (!preserve || !preserve.hasOwnProperty(key)))
			    {
			        delete object[key];
			    }
			}
			for (let symbol in Object.getOwnPropertySymbols(b))
			{
				delete object[symbol];
			}
		}

		/**
		 * @func{public static} TODO(randomuserhi): need to document
		 * TODO(randomuserhi): document params
		 * NOTE(randomuserhi): redfine is a very slow operation due to Object.setPrototypeOf, try
		 *                     not to use this function too much.
		 */
		js.redefine = function (object, prototype, preserve = null) 
		{
			js.delete(object, preserve);
			Object.setPrototypeOf(object, prototype)
			return object;
		}

	})(RHU.js || (RHU.js = {}));

})(RHU || (RHU = {}));