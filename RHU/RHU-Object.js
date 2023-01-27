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
		 * @func{public static} TODO(randomuserhi): need to document
		 * 
		 * NOTE(randomuserhi): redfine is a very slow operation due to Object.setPrototypeOf, try
		 *                     not to use this function too much.
		 */
		js.redefine = function (object, prototype) 
		{
			for (let key in object) 
			{
			    if (object.hasOwnProperty(key)) 
			    {
			        delete object[key];
			    }
			}
			Object.setPrototypeOf(object, prototype)
			return object;
		}

	})(RHU.js || (RHU.js = {}));

})(RHU || (RHU = {}));