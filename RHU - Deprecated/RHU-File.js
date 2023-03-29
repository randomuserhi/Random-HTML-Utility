/**
 * RHU - Random HTML Utility
 * @randomuserhi.github.io
 */

"use strict";

if (window[Symbol.for("RHU")] === undefined ||
    window[Symbol.for("RHU")] === null)
    throw new Error("Missing RHU dependency.");

/**
 * @namespace _RHU (Symbol.for("RHU")), RHU
 * NOTE(randomuserhi): _RHU (Symbol.for("RHU")) is the internal library hidden from user, whereas RHU is the public interface.
 */
(function (_RHU, RHU) 
{
	/**
     * NOTE(randomuserhi): Grab references to functions, purely to shorten names for easier time.
     */

    let exists = _RHU.exists;

	/**
	 * @namespace _RHU._File (Symbol.for("RHU")), RHU.File
	 *
	 * TODO(randomuserhi): Handle File APIs not being supported by browser `if (exists(window.FileReader) && exists(window.Blob));`
	 *
	 * NOTE(randomuserhi): Implementation based on:
	 * 					   https://stackoverflow.com/questions/18299806/how-to-check-file-mime-type-with-javascript-before-upload/29672957#29672957
	 *
	 * TODO(randomuserhi): Possibly implement with Promise API (currently uses callbacks)
	 * TODO(randomuserhi): Documentation
	 */
	(function (_File, File) 
	{

		let Type = {};
		_RHU.defineProperties(Type, {
	        unknown: {
	        	enumerable: true,
	            value: Symbol("FileType unknown")
	        },
	        jpg: {
	        	enumerable: true,
	            value: Symbol("FileType jpg")
	        },
	        png: {
	        	enumerable: true,
	            value: Symbol("FileType png")
	        },
	        gif: {
	        	enumerable: true,
	            value: Symbol("FileType gif")
	        },
	        txt: {
	        	enumerable: true,
	            value: Symbol("FileType txt")
	        },
	        js: {
	        	enumerable: true,
	        	value: Symbol("FileType text/javascript")
	        },
	        mp4: {
	        	enumerable: true,
	        	value: Symbol("FileType video/mp4")
	        },
	        mkv: {
	        	enumerable: true,
	        	value: Symbol("FileType video/x-matroska")
	        }
		});

		let toType = function(blobType)
		{
			let type;
			switch (blobType) 
			{
				case "text/javascript":
					type = Type.js;
					break;
				case "video/mp4":
					type = Type.mp4;
					break;
				case "image/png":
					type = Type.png;
					break;
				case "video/x-matroska":
					type = Type.mkv;
					break;
			    default:
			    	console.warn(`Unknown blob type: ${blobType}`);
			        type = Type.unknown;
			        break;
			}
			return type;
		};

		let getType = function(blob, callback)
		{
			let fr = new FileReader();
			fr.onloadend = function(e) 
			{
				// only grab first 4 bytes
				let arr = (new Uint8Array(e.target.result)).subarray(0, 4);
				
				// convert bytes to hex string
				let header = "";
				for (let i = 0; i < arr.length; i++)
					header += arr[i].toString(16);
				
				// get file signature type based on hex string
				let type;
				switch (header) 
				{
				    case "89504e47":
				        type = Type.png;
				        break;

				    case "47494638":
				        type = Type.gif;
				        break;

				    case "ffd8ffe0":
				    case "ffd8ffe1":
				    case "ffd8ffe2":
				    case "ffd8ffe3":
				    case "ffd8ffe8":
				        type = Type.jpg;
				        break;

				    default:
				        type = Type.unknown;
				        break;
				}

				// return blob type and file signature type
				callback(toType(blob.type), type);
			};
			fr.readAsArrayBuffer(blob);
		};

		/** ------------------------------------------------------------------------------------------------------
	     * NOTE(randomuserhi): Create interface for Macro
	     */

	    _RHU.definePublicProperties(_File, {
	        Type: {
	            enumerable: false,
	            value: Type
	        },
	        getType: {
	        	enumerable: false,
	        	value: getType
	        }
	    });

	    _RHU.definePublicAccessors(File, {
	        Type: {
	            get() { return _File.Type; }
	        },
	        getType: {
	            get() { return _File.getType; }
	        }
	    });


	})((_RHU.File || (_RHU.File = {})),
	   (RHU.File || (RHU.File = {})));

})((window[Symbol.for("RHU")] || (window[Symbol.for("RHU")] = {})), // Internal library that can only be accessed via Symbol.for("RHU")
   (window["RHU"] || (window["RHU"] = {}))); // Public interfact for library