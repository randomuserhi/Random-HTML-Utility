!function(){"use strict";let e={exists:function(e){return null!=e},parseOptions:function(e,t){if(!this.exists(t))return e;if(!this.exists(e))return e;let o=e;return Object.assign(o,t),o},dependencies:function(t={}){let o={hard:[],soft:[],trace:void 0};this.parseOptions(o,t);let n=t=>{let o=[],n=[],i={};for(let r of t){if(e.exists(i[r]))continue;i[r]=!0;let t=r.split("."),s=window;for(;0!==t.length&&this.exists(s);s=s[t.shift()]);this.exists(s)?o.push(r):n.push(r)}return{has:o,missing:n}};return{hard:n(o.hard),soft:n(o.soft),trace:o.trace}},path:{join:function(...e){return(e=e.map(((t,o)=>(o&&(t=t.replace(new RegExp("^/"),"")),o!==e.length-1&&(t=t.replace(new RegExp("/$"),"")),t)))).join("/")},isAbsolute:function(e){return/^([a-z]+:)?[\\/]/i.test(e)}}};{let t=e.dependencies({hard:["document.createElement","document.head","document.createTextNode","window.Function","Map","Set","Reflect"]});if(0!==t.hard.missing.length){let o="RHU was unable to import due to missing dependencies.";e.exists(t.trace)&&(o+=`\n${t.trace.stack.split("\n").splice(1).join("\n")}\n`);for(let e of t.hard.missing)o+=`\n\tMissing '${e}'`;console.error(o)}}{window.RHU&&console.warn("Overwriting global RHU..."),window.RHU={};let o=window.RHU;o.version="1.0.0";{let o,n=document.getElementsByTagName("script");for(let e of n){var t=String(e.type).replace(/ /g,"");t.match(/^text\/x-rhu-config(;.*)?$/)&&!t.match(/;executed=true/)&&(e.type+=";executed=true",o=Function(`"use strict"; let RHU = { config: {} }; ${e.innerHTML}; return RHU;`)())}let i={config:{}};e.parseOptions(i,o),e.config={root:void 0,extensions:[],modules:[],includes:{}},e.parseOptions(e.config,i.config)}!function(t){let o={location:e.config.root,script:"",params:{}};if(e.exists(document.currentScript)){if(!e.exists(o.location)){let e=document.currentScript;o.location=e.src.match(/(.*)[/\\]/)[1]||"",o.script=e.innerHTML;let t=new URL(e.src).searchParams;for(let e of t.keys())o.params[e]=t.get(e)}}else console.warn("Unable to find script element.");t.loader={timeout:15e3,head:document.head,root:Object.assign({path:function(t){return e.path.join(this.location,t)}},o),JS:function(t,o,n){let i={extension:void 0,module:void 0};if(e.parseOptions(i,o),e.exists(i.module)&&e.exists(i.extension))return void console.error("Cannot load item that is both an x-module and a module.");let r=document.createElement("script");r.type="text/javascript",r.src=t;let s=!1;r.onload=function(){s=!0,e.exists(n)&&n(!0)};let a=function(){s||(e.exists(i.module)?console.error(`Unable to find module '${i.module}'.`):e.exists(i.extension)?console.error(`Unable to find x-module '${i.extension}'.`):console.error(`Unable to load script: [RHU]/${t}`),s=!0,e.exists(n)&&n(!1))};r.onerror=a,setTimeout(a,this.timeout),this.head.append(r)}}}(e);{let e=document.createTextNode(null),t=e.addEventListener.bind(e);o.addEventListener=function(e,o,n){t(e,(e=>{o(e.detail)}),n)},o.removeEventListener=e.removeEventListener.bind(e),o.dispatchEvent=e.dispatchEvent.bind(e)}o.isMobile=function(){return o.exists(navigator.userAgentData)&&o.exists(navigator.userAgentData.mobile)?navigator.userAgentData.mobile:(e=navigator.userAgent||navigator.vendor||window.opera,/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(e)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw-(n|u)|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(-|_)|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-(m|p|t)|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c(-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac( |-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c(-|0|1)|47|mc|nd|ri)|sgh-|shar|sie(-|m)|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl|tdg-|tel(i|m)|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(e.substr(0,4)));var e},o.exists=function(e){return null!=e},o.properties=function(e,t={},n=undefined){if(!o.exists(e))throw TypeError("Cannot get properties of 'null' or 'undefined'.");let i={enumerable:void 0,configurable:void 0,symbols:void 0,hasOwn:void 0,writable:void 0,get:void 0,set:void 0};o.parseOptions(i,t);let r=new Set,s=function(e,t){for(let s of e){let e=t[s],l=!0;i.enumerable&&e.enumerable!==i.enumerable&&(l=!1),i.configurable&&e.configurable!==i.configurable&&(l=!1),i.writable&&e.writable!==i.writable&&(l=!1),!1===i.get&&e.get?l=!1:!0!==i.get||e.get||(l=!1),!1===i.set&&e.set?l=!1:!0!==i.set||e.set||(l=!1),l&&(r.has(s)||(o.exists(n)&&n(a,s),r.add(s)))}},a=e;do{let e=Object.getOwnPropertyDescriptors(a);if(!o.exists(i.symbols)||!1===i.symbols){s(Object.getOwnPropertyNames(a),e)}if(!o.exists(i.symbols)||!0===i.symbols){s(Object.getOwnPropertySymbols(a),e)}}while((a=Object.getPrototypeOf(a))&&!i.hasOwn);return r},o.defineProperty=function(e,t,n,i={}){let r={replace:!1,warn:!1,err:!1};for(let e in r)o.exists(i[e])&&(r[e]=i[e]);return r.replace||!o.properties(e,{hasOwn:!0}).has(t)?(delete e[t],Object.defineProperty(e,t,n),!0):(r.warn&&console.warn(`Failed to define property '${t}', it already exists. Try 'replace: true'`),r.err&&console.error(`Failed to define property '${t}', it already exists. Try 'replace: true'`),!1)},o.definePublicProperty=function(e,t,n,i={}){return o.defineProperty(e,t,Object.assign({writable:!0,enumerable:!0},n),i)},o.definePublicAccessor=function(e,t,n,i={}){return o.defineProperty(e,t,Object.assign({configurable:!0,enumerable:!0},n),i)},o.defineProperties=function(e,t,n={}){for(let i of o.properties(t,{hasOwn:!0}).keys())Object.hasOwnProperty.call(t,i)&&o.defineProperty(e,i,t[i],n)},o.definePublicProperties=function(e,t,n={}){let i=function(){this.configurable=!0,this.writable=!0,this.enumerable=!0};for(let r of o.properties(t,{hasOwn:!0}).keys())if(Object.hasOwnProperty.call(t,r)){let s=Object.assign(new i,t[r]);o.defineProperty(e,r,s,n)}},o.definePublicAccessors=function(e,t,n={}){let i=function(){this.configurable=!0,this.enumerable=!0};for(let r of o.properties(t,{hasOwn:!0}).keys())if(Object.hasOwnProperty.call(t,r)){let s=Object.assign(new i,t[r]);o.defineProperty(e,r,s,n)}},o.assign=function(e,t,n={replace:!0}){return e===t||o.defineProperties(e,Object.getOwnPropertyDescriptors(t),n),e},o.delete=function(e,t=undefined){e!==t&&o.properties(e,{hasOwn:!0},((e,n)=>{o.exists(t)&&o.properties(t,{hasOwn:!0}).has(n)||delete e[n]}))},o.clone=function(e,t=undefined){return o.exists(t)?o.assign(Object.create(t),e):o.assign(Object.create(Object.getPrototypeOf(e)),e)},o.redefine=function(e,t,n=undefined){return o.deleteProperties(e,n),Object.setPrototypeOf(e,t),e},o.isConstructor=function(e){try{Reflect.construct(String,[],e)}catch(e){return!1}return!0},o.inherit=function(e,t){if(!o.isConstructor(e)||!o.isConstructor(t))throw new TypeError("'child' and 'base' must be object constructors.");Object.setPrototypeOf(e.prototype,t.prototype),Object.setPrototypeOf(e,t)},o.reflectConstruct=function(e,t,n=undefined){if(!o.isConstructor(e))throw new TypeError("'constructor' and 'base' must be object constructors.");let i=n;if(!o.exists(i)){let e=/((\/\/.*$)|(\/\*.*\*\/))/gm,o=t.toString().replace(e,"");if(0===o.indexOf("function")){let e=o.substring("function".length).trimStart();e.substring(e.indexOf("("),e.indexOf(")")).split(",").map((e=>e.trim())).filter((e=>""!==e))}}let r=new Function(i,`return definition.__reflect__.call(this, new.target, [${i.join(",")}]);`);return r.__constructor__=t,r.__reflect__=function(t,n=[]){if(o.exists(t)){let t=Reflect.construct(e,n,r);return r.__constructor__.call(t,...n),t}r.__constructor__.call(this,...n)},r},o.parseOptions=function(e,t,n=!0){if(!o.exists(t))return e;if(!o.exists(e))return e;let i=e;return n||(i=o.clone(e)),Object.assign(i,t),i},o.clearAttributes=function(e){for(;e.attributes.length>0;)e.removeAttribute(e.attributes[0].name)},o.getElementById=function(e,t=!0){let o=document.getElementById(e);return t&&o.removeAttribute("id"),o};{e.readyState="loading",o.definePublicAccessor(o,"readyState",{get:function(){return e.readyState}}),e.imports=[],o.definePublicAccessor(o,"imports",{get:function(){let t=[...e.imports];return t.toString=function(){let o="Imports in order of execution:";for(let n of t)o+=`\n${e.exists(n.module)?n.module:"Unknown"}${e.exists(n.trace)?"\n"+n.trace:""}`;return o},t}});let t=e.config,n=e.loader,i=new Set,r=new Set,s=new Map,a=[],l=function(t,o,n=!0,i=!1){let r=e.dependencies(t.dependencies);if(0===r.hard.missing.length&&n&&0===r.soft.missing.length)return e.imports.push({module:t.dependencies.module,trace:e.exists(r.trace)?r.trace.stack.split("\n")[1]:void 0}),o(r),!0;if(i){let o="could not loaded as not all hard dependencies were found.";e.exists(r.trace)&&(o+=`\n${r.trace.stack.split("\n").splice(1).join("\n")}\n`);for(let e of r.hard.missing)o+=`\n\tMissing '${e}'`;e.exists(t.dependencies.module)?console.warn(`Module, '${t.dependencies.module}', ${o}`):console.warn(`Unknown module ${o}`)}return!1},c=function(t,o){if(t){let e=a;a=[];for(let t of e)l(t,t.callback)||a.push(t)}let n={extension:void 0,module:void 0};e.parseOptions(n,o),e.exists(n.extension)&&e.exists(n.module)?console.error("Cannot handle loading of item that is both an x-module and a module."):(e.exists(n.extension)?i.delete(n.extension):e.exists(n.module)&&r.delete(n.module),0===i.size&&0===r.size&&d())},d=function(){e.readyState="complete";{let e=a.length;do{e=a.length;let t=a;a=[];for(let e of t)l(e,e.callback)||a.push(e)}while(e!==a.length)}{let e=a.length;do{e=a.length;let t=a;a=[];for(let e of t)l(e,e.callback,!1)||a.push(e)}while(e!==a.length)}for(let e of a)l(e,e.callback,!1,!0);e.exists(e.loader.root.params.load)&&(e.exists(window[e.loader.root.params.load])?window[e.loader.root.params.load]():console.error(`Callback for 'load' event called '${e.loader.root.params.load}' does not exist.`)),o.dispatchEvent(new CustomEvent("load"))};o.module=function(t,o){let n={dependencies:t,callback:o};"complete"!==e.readyState?a.push(n):l(n,n.callback,!0,!0)};for(let e of t.extensions)"string"==typeof e&&e&&i.add(e);for(let e of t.modules)"string"==typeof e&&e&&r.add(e);for(let o in t.includes){if("string"!=typeof o||""===o)continue;let i=e.path.isAbsolute(o);for(let r of t.includes[o])"string"==typeof r&&""!==r&&(i?s.set(e.path.join(o,`${r}.js`),r):s.set(n.root.path(e.path.join(o,`${r}.js`)),r))}if(0===i.size&&0===r.size&&0===s.size)d();else{for(let t of i.keys())n.JS(n.root.path(e.path.join("extensions",`${t}.js`)),{extension:t},(e=>{c(e,{extension:t})}));for(let t of r.keys())n.JS(n.root.path(e.path.join("modules",`${t}.js`)),{module:t},(e=>{c(e,{module:t})}));for(let e of s.keys()){let t=s.get(e);r.add(t),n.JS(e,{module:t},(e=>{c(e,{module:t})}))}}}e.exists(e.loader.root.params.ready)&&(e.exists(window[e.loader.root.params.ready])?window[e.loader.root.params.ready]():console.error(`Callback for 'ready' event called '${e.loader.root.params.ready}' does not exist.`))}}();
