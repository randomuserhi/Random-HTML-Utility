!function(){"use strict";let e=window.RHU;if(null==e)throw new Error("No RHU found. Did you import RHU before running?");e.module({module:"rhu/macro",trace:new Error,hard:["Map","XPathEvaluator","RHU.WeakCollection"]},(function(){e.exists(e.Macro)&&console.warn("Overwriting RHU.Macro...");let t={macro:Symbol("macro"),constructed:Symbol("macro constructed"),prototype:Symbol("macro prototype")};e.defineProperty(Node.prototype,t.macro,{get:function(){return this}}),e.definePublicAccessor(Node.prototype,"macro",{get:function(){return this[t.macro]}});let r=Object.prototype.isPrototypeOf.bind(HTMLElement.prototype),o=Function.call.bind(Element.prototype.setAttribute),n=Function.call.bind(Element.prototype.getAttribute),i=Function.call.bind(Element.prototype.hasAttribute),c=Function.call.bind(Element.prototype.removeAttribute),l=Function.call.bind(Object.getOwnPropertyDescriptor(Node.prototype,"childNodes").get),a=Function.call.bind(Object.getOwnPropertyDescriptor(Node.prototype,"parentNode").get);HTMLDocument.prototype.createMacro=function(r){let n=u.get(r);e.exists(n)||(n=p);let i=n.options,c=s.parseDomString(i.element).children[0];if(!e.exists(c))throw SyntaxError(`No valid container element to convert into macro was found for '${r}'.`);return c.remove(),o(c,"rhu-macro",r),s.parse(c,r),c[t.macro]},HTMLDocument.prototype.Macro=function(t,r){let n=u.get(t);e.exists(n)||(n=p);let i=n.options,c=s.parseDomString(i.element).children[0];if(!e.exists(c))throw SyntaxError(`No valid container element to convert into macro was found for '${t}'.`);o(c,"rhu-macro",t);for(let e in r)c.setAttribute(e,r[e]);return c.remove(),c.outerHTML},Element.prototype.setAttribute=function(e,t){return"rhu-macro"===e&&s.parse(this,t),o(this,e,t)},Element.prototype.removeAttribute=function(e){return"rhu-macro"===e&&s.parse(this),c(this,e)},e.definePublicAccessor(Element.prototype,"rhuMacro",{get:function(){return n(this,"rhu-macro")},set:function(e){o(this,"rhu-macro",e),s.parse(this,e)}});let s=e.Macro=function(t,r,o="",n){if(void 0===new.target)throw new TypeError("Constructor Macro requires 'new'.");if(""==r)throw new SyntaxError("'type' cannot be blank.");if("string"!=typeof r)throw new TypeError("'type' must be a string.");if("string"!=typeof o)throw new TypeError("'source' must be a string.");if(!e.isConstructor(t))throw new TypeError("'object' must be a constructor.");u.has(r)&&console.warn(`Macro template '${r}' already exists. Definition will be overwritten.`);let i={element:"<div></div>",floating:!1,strict:!1,encapsulate:void 0,content:void 0};e.parseOptions(i,n),u.set(r,{constructor:t,type:r,source:o,options:i});let c=h.get(r);if(e.exists(c))for(let e of c)s.parse(e,r,!0)},u=new Map,p={constructor:function(){},options:{element:"<div></div>",floating:!1,strict:!1,encapsulate:void 0,content:void 0}},d=new XPathEvaluator;s.parseDomString=function(e){let t=document.createElement("template");return t.innerHTML=e,t.content};let m=function(t,r){let o=Object.getPrototypeOf(t);return o===Object.prototype?e.clone(t,r):e.clone(t,m(o,r))},f=[],h=new Map;s.watching=h,s.parse=function(r,c,y=!1){if(!Object.hasOwnProperty.call(r,t.constructed)&&0!==e.properties(r,{hasOwn:!0}).size)throw new TypeError("Element is not eligible to be used as a rhu-macro.");if(!e.exists(r))return;if(!1===y&&r[t.constructed]===c)return;if(f.includes(c))throw new Error("Recursive definition of macros are not allowed.");f.push(c);let b=r[t.constructed],g=r[t.prototype];e.delete(r),Element.prototype.replaceChildren.call(r);let w=u.get(c);e.exists(w)||(w=p);let E=w.constructor,v=w.options,x=Object.create(E.prototype),O=r;v.floating?O=Object.create(x):(e.exists(g)?r[t.prototype]=g:g=r[t.prototype]=Object.getPrototypeOf(r),x=Object.create(m(E.prototype,g)),Object.setPrototypeOf(O,x));let A=s.parseDomString(e.exists(w.source)?w.source:""),S={},P=e=>{if(Object.hasOwnProperty.call(S,e))throw new SyntaxError(`Identifier '${e}' already exists.`);if(!v.encapsulate&&v.strict&&e in O)throw new SyntaxError(`Identifier '${e}' already exists.`);return!0},M=[...A.querySelectorAll("rhu-macro")];for(let r of M){const c="rhu-type";let l=n(r,c);Element.prototype.removeAttribute.call(r,c);let a=u.get(l);e.exists(a)||(a=p);let d=a.options;if(d.floating){if(i(r,"rhu-id")){let o=n(r,"rhu-id");Element.prototype.removeAttribute.call(r,"rhu-id"),P(o),e.definePublicAccessor(S,o,{get:function(){return r[t.macro]}})}s.parse(r,l)}else{let t=s.parseDomString(d.element).children[0];if(e.exists(t)){o(t,"rhu-macro",l);for(let e=0;e<r.attributes.length;++e)t.setAttribute(r.attributes[e].name,r.attributes[e].value);r.replaceWith(t)}else console.error(`No valid container element to convert into macro was found for '${l}'.`)}}let N=A.querySelectorAll("*[rhu-id]");for(let r of N){let o=n(r,"rhu-id");Element.prototype.removeAttribute.call(r,"rhu-id"),P(o),e.definePublicAccessor(S,o,{get:function(){return r[t.macro]}})}M=A.querySelectorAll("*[rhu-macro]");for(let e of M)s.parse(e,n(e,"rhu-macro"));Element.prototype.append.call(r,...A.childNodes);let D=d.evaluate("//comment()",r,null,XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,null);for(let e=0,t=D.snapshotLength;e<t;++e)D.snapshotItem(e).replaceWith();if(e.exists(v.content)&&(P(v.content),S[v.content]=[...l(r)]),v.floating&&(e.exists(a(r))?Element.prototype.replaceWith.call(r,...l(r)):Element.prototype.replaceWith.call(r),e.defineProperties(r,{[t.macro]:{configurable:!0,get:function(){return O}}})),e.exists(v.encapsulate)?(P(v.encapsulate),e.definePublicAccessor(x,v.encapsulate,{get:function(){return S}})):e.assign(x,S),E.call(O),e.exists(b)){let t=u.get(b);e.exists(t)||(t=p),!t.options.floating&&h.has(b)&&h.get(b).delete(r)}if(!v.floating&&e.exists(c)){h.has(c)||h.set(c,new e.WeakCollection),h.get(c).add(r)}O[t.constructed]=c,r[t.constructed]=c,f.pop()};let y=function(e){if(r(e)&&i(e,"rhu-macro"))s.parse(e,n(e,"rhu-macro"));else for(let t of e.childNodes)y(t)},b=new MutationObserver((function(e){let t=new Map;for(const r of e)switch(r.type){case"attributes":"rhu-macro"===r.attributeName&&(t.has(r.target)?t.get(r.target)!==r.oldValue&&(t.set(r.target,r.oldValue),s.parse(r.target,r.oldValue)):t.set(r.target,r.oldValue));break;case"childList":for(let e of r.addedNodes)y(e)}for(let e of t.keys()){let r=n(e,"rhu-macro");t.get(e)!==r&&s.parse(e,r)}}));s.observe=function(e){b.observe(e,{attributes:!0,attributeOldValue:!0,attributeFilter:["rhu-macro"],childList:!0,subtree:!0})};let g=function(){window.dispatchEvent(new Event("load-rhu-macro")),function(){let t=[...document.getElementsByTagName("rhu-macro")];for(let r of t){const t="rhu-type";let i=n(r,t);Element.prototype.removeAttribute.call(r,t);let c=u.get(i);e.exists(c)||(c=p);let l=c.options,a=s.parseDomString(l.element),d=a.children[0];if(e.exists(d)||(d=a.children[0]),e.exists(d)){o(d,"rhu-macro",i);for(let e=0;e<r.attributes.length;++e)d.setAttribute(r.attributes[e].name,r.attributes[e].value);r.replaceWith(d)}else console.error(`No valid container element to convert into macro was found for '${i}'.`)}let r=document.querySelectorAll("[rhu-macro]");for(let e of r)s.parse(e,n(e,"rhu-macro"));s.observe(document)}()};"loading"===document.readyState?document.addEventListener("DOMContentLoaded",g):g()}))}();
