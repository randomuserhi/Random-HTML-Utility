/**
 * @namespace RHU
 */
(function (_RHU, RHU) 
{

	// Parse templates and macros after window load to handle first pass issues where DOM hasn't been fully parsed.
    // Disable parsing templates until after window load event
    // https://github.com/WICG/webcomponents/issues/809#issuecomment-737669670
    let _DELAYED_PARSE = true;
    let _DELAYED_CUSTOM_ELEMENTS = [];
    window.addEventListener("load", () => {
        _DELAYED_PARSE = false;
        for (let args of _DELAYED_CUSTOM_ELEMENTS)
            RHU.CustomElement(...args);
    });

})(window["RHU"] || (window["RHU"] = window[Symbol.for("RHU")] = {}));