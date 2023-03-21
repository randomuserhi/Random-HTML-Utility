/**
 * RHU - Random HTML Utility
 * @randomuserhi.github.io
 */

"use strict";

/**
 * @namespace _RHU (Symbol.for("RHU")), RHU
 * 
 * NOTE(randomuserhi): _RHU (Symbol.for("RHU")) is the internal library hidden from user, whereas RHU is the public interface.
 * TODO(randomuserhi): document this
 */
(function (_RHU, RHU) 
{

    let EventTarget = function()
    {
        // create a node for handling events with EventTarget
        let node = document.createTextNode(null);
        let addEventListener = node.addEventListener.bind(node);
        this.addEventListener = function (type, listener, options) {
            addEventListener(type, (e) => { listener(e.detail); }, options);
        };
        this.removeEventListener = node.removeEventListener.bind(node);
        this.dispatchEvent = node.dispatchEvent.bind(node);
    }

    _RHU.definePublicProperties(_RHU, {
        EventTarget: {
            enumerable: false,
            value: EventTarget
        }
    });

    _RHU.definePublicAccessors(RHU, {
       EventTarget: {
            get() { return _RHU.EventTarget; }
        } 
    });

})((window[Symbol.for("RHU")] || (window[Symbol.for("RHU")] = {})),
   (window["RHU"] || (window["RHU"] = {})));