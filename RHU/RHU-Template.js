/**
 * @namespace RHU
 */
(function (_RHU, RHU) 
{

	// Parse templates and macros after window load to handle first pass issues where DOM hasn't been fully parsed.
    // Disable parsing templates until after window load event
    // https://github.com/WICG/webcomponents/issues/809#issuecomment-737669670
    let _DELAYED_PARSE = true;
    let _DELAYED_ELEMENTS = [];
    let _DelayedElement = function(element, type) 
    {
        this.element = element;
        this.type = type;
    }
    _DelayedElement.prototype.apply = function()
    {
        if (!this.element._constructed)
        {
            this.element.type = this.type;
            this.element.attributeChangedCallback("rhu-type", "", this.type);
        }
    }
    window.addEventListener("load", () => {
        _DELAYED_PARSE = false;
        for (let el of _DELAYED_ELEMENTS) el.apply()
    });
	
})(window["RHU"] || (window["RHU"] = window[Symbol.for("RHU")] = {}));