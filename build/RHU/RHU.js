(function(){"use strict";let core={exists:function(e){return null!=e},parseOptions:function(e,t){if(!this.exists(t))return e;if(!this.exists(e))return e;let o=e;return Object.assign(o,t),o},dependencies:function(e={}){let t={hard:[],soft:[],trace:void 0};this.parseOptions(t,e);let o=e=>{let t=[],o=[],n={};for(let r of e){if(core.exists(n[r]))continue;n[r]=!0;let e=r.split("."),i=window;for(;0!==e.length&&this.exists(i);i=i[e.shift()]);this.exists(i)?t.push(r):o.push(r)}return{has:t,missing:o}};return{hard:o(t.hard),soft:o(t.soft),trace:t.trace}},path:{join:function(...e){return(e=e.map(((t,o)=>(o&&(t=t.replace(new RegExp("^/"),"")),o!==e.length-1&&(t=t.replace(new RegExp("/$"),"")),t)))).join("/")},isAbsolute:function(e){return/^([a-z]+:)?[\\/]/i.test(e)}}};{let e=core.dependencies({hard:["document.createElement","document.head","document.createTextNode","window.Function","Map","Set","Reflect"]});if(0!==e.hard.missing.length){let t="RHU was unable to import due to missing dependencies.";core.exists(e.trace)&&(t+=`\n${e.trace.stack.split("\n").splice(1).join("\n")}\n`);for(let o of e.hard.missing)t+=`\n\tMissing '${o}'`;console.error(t)}}{window.RHU&&console.warn("Overwriting global RHU..."),window.RHU={};let RHU=window.RHU;RHU.version="1.0.0";{let e,t=document.getElementsByTagName("script");for(let o of t){var type=String(o.type).replace(/ /g,"");type.match(/^text\/x-rhu-config(;.*)?$/)&&!type.match(/;executed=true/)&&(o.type+=";executed=true",e=Function(`"use strict"; let RHU = { config: {} }; ${o.innerHTML}; return RHU;`)())}let o={config:{}};core.parseOptions(o,e),core.config={root:void 0,extensions:[],modules:[],includes:{}},core.parseOptions(core.config,o.config)}!function(e){let t={location:core.config.root,script:"",params:{}};if(core.exists(document.currentScript)){if(!core.exists(t.location)){let e=document.currentScript;t.location=e.src.match(/(.*)[/\\]/)[1]||"",t.script=e.innerHTML;let o=new URL(e.src).searchParams;for(let e of o.keys())t.params[e]=o.get(e)}}else console.warn("Unable to find script element.");e.loader={timeout:15e3,head:document.head,root:Object.assign({path:function(e){return core.path.join(this.location,e)}},t),JS:function(e,t,o){let n={extension:void 0,module:void 0};if(core.parseOptions(n,t),core.exists(n.module)&&core.exists(n.extension))return void console.error("Cannot load item that is both an x-module and a module.");let r=document.createElement("script");r.type="text/javascript",r.src=e;let i=!1;r.onload=function(){i=!0,core.exists(o)&&o(!0)};let s=function(){i||(core.exists(n.module)?console.error(`Unable to find module '${n.module}'.`):core.exists(n.extension)?console.error(`Unable to find x-module '${n.extension}'.`):console.error(`Unable to load script: [RHU]/${e}`),i=!0,core.exists(o)&&o(!1))};r.onerror=s,setTimeout(s,this.timeout),this.head.append(r)}}}(core);{let e=document.createTextNode(null),t=e.addEventListener.bind(e);RHU.addEventListener=function(e,o,n){t(e,(e=>{o(e.detail)}),n)},RHU.removeEventListener=e.removeEventListener.bind(e),RHU.dispatchEvent=e.dispatchEvent.bind(e)}RHU.isMobile=function(){return RHU.exists(navigator.userAgentData)&&RHU.exists(navigator.userAgentData.mobile)?navigator.userAgentData.mobile:(e=navigator.userAgent||navigator.vendor||window.opera,/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(e)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw-(n|u)|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(-|_)|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-(m|p|t)|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c(-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac( |-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c(-|0|1)|47|mc|nd|ri)|sgh-|shar|sie(-|m)|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl|tdg-|tel(i|m)|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(e.substr(0,4)));var e},RHU.exists=function(e){return null!=e},RHU.properties=function(e,t={},o=undefined){if(!RHU.exists(e))throw TypeError("Cannot get properties of 'null' or 'undefined'.");let n={enumerable:void 0,configurable:void 0,symbols:void 0,hasOwn:void 0,writable:void 0,get:void 0,set:void 0};RHU.parseOptions(n,t);let r=new Set,i=function(e,t){for(let i of e){let e=t[i],a=!0;n.enumerable&&e.enumerable!==n.enumerable&&(a=!1),n.configurable&&e.configurable!==n.configurable&&(a=!1),n.writable&&e.writable!==n.writable&&(a=!1),!1===n.get&&e.get?a=!1:!0!==n.get||e.get||(a=!1),!1===n.set&&e.set?a=!1:!0!==n.set||e.set||(a=!1),a&&(r.has(i)||(RHU.exists(o)&&o(s,i),r.add(i)))}},s=e;do{let e=Object.getOwnPropertyDescriptors(s);if(!RHU.exists(n.symbols)||!1===n.symbols){i(Object.getOwnPropertyNames(s),e)}if(!RHU.exists(n.symbols)||!0===n.symbols){i(Object.getOwnPropertySymbols(s),e)}}while((s=Object.getPrototypeOf(s))&&!n.hasOwn);return r},RHU.defineProperty=function(e,t,o,n={}){let r={replace:!1,warn:!1,err:!1};for(let e in r)RHU.exists(n[e])&&(r[e]=n[e]);return r.replace||!RHU.properties(e,{hasOwn:!0}).has(t)?(delete e[t],Object.defineProperty(e,t,o),!0):(r.warn&&console.warn(`Failed to define property '${t}', it already exists. Try 'replace: true'`),r.err&&console.error(`Failed to define property '${t}', it already exists. Try 'replace: true'`),!1)},RHU.definePublicProperty=function(e,t,o,n={}){return RHU.defineProperty(e,t,Object.assign({writable:!0,enumerable:!0},o),n)},RHU.definePublicAccessor=function(e,t,o,n={}){return RHU.defineProperty(e,t,Object.assign({configurable:!0,enumerable:!0},o),n)},RHU.defineProperties=function(e,t,o={}){for(let n of RHU.properties(t,{hasOwn:!0}).keys())Object.hasOwnProperty.call(t,n)&&RHU.defineProperty(e,n,t[n],o)},RHU.definePublicProperties=function(e,t,o={}){let n=function(){this.configurable=!0,this.writable=!0,this.enumerable=!0};for(let r of RHU.properties(t,{hasOwn:!0}).keys())if(Object.hasOwnProperty.call(t,r)){let i=Object.assign(new n,t[r]);RHU.defineProperty(e,r,i,o)}},RHU.definePublicAccessors=function(e,t,o={}){let n=function(){this.configurable=!0,this.enumerable=!0};for(let r of RHU.properties(t,{hasOwn:!0}).keys())if(Object.hasOwnProperty.call(t,r)){let i=Object.assign(new n,t[r]);RHU.defineProperty(e,r,i,o)}},RHU.assign=function(e,t,o={replace:!0}){return e===t||RHU.defineProperties(e,Object.getOwnPropertyDescriptors(t),o),e},RHU.delete=function(e,t=undefined){e!==t&&RHU.properties(e,{hasOwn:!0},((e,o)=>{RHU.exists(t)&&RHU.properties(t,{hasOwn:!0}).has(o)||delete e[o]}))},RHU.clone=function(e,t=undefined){return RHU.exists(t)?RHU.assign(Object.create(t),e):RHU.assign(Object.create(Object.getPrototypeOf(e)),e)},RHU.redefine=function(e,t,o=undefined){return RHU.deleteProperties(e,o),Object.setPrototypeOf(e,t),e},RHU.isConstructor=function(e){try{Reflect.construct(String,[],e)}catch(e){return!1}return!0},RHU.inherit=function(e,t){if(!RHU.isConstructor(e)||!RHU.isConstructor(t))throw new TypeError("'child' and 'base' must be object constructors.");Object.setPrototypeOf(e.prototype,t.prototype),Object.setPrototypeOf(e,t)},RHU.reflectConstruct=function(base,constructor,opt){if(!RHU.isConstructor(base))throw new TypeError("'constructor' and 'base' must be object constructors.");let options={name:void 0,argnames:void 0};RHU.parseOptions(options,opt);let name=options.name,argnames=options.argnames,args=argnames,definition;if(!RHU.exists(args)){args=["...args"];let e=/((\/\/.*$)|(\/\*.*\*\/))/gm,t=constructor.toString().replace(e,"");if(0===t.indexOf("function")){let e=t.substring("function".length).trimStart();args=e.substring(e.indexOf("(")+1,e.indexOf(")")).split(",").map((e=>e.trim())).filter((e=>""!==e))}}let argstr=args.join(",");return RHU.exists(name)||(name=constructor.name),name.replace(/[ .\t\r\n]/g,"_"),""===name&&(name="__ReflectConstruct__"),eval(`{ let ${name} = function(${argstr}) { return definition.__reflect__.call(this, new.target, [${argstr}]); }; definition = ${name}; }`),RHU.exists(definition)||(console.warn("eval() call failed to create reflect constructor. Using fallback..."),definition=function(...e){return definition.__reflect__.call(this,new.target,e)}),definition.__constructor__=constructor,definition.__reflect__=function(e,t=[]){if(RHU.exists(e)){let e=Reflect.construct(base,t,definition);return definition.__constructor__.call(e,...t),e}definition.__constructor__.call(this,...t)},definition},RHU.parseOptions=function(e,t,o=!0){if(!RHU.exists(t))return e;if(!RHU.exists(e))return e;let n=e;return o||(n=RHU.clone(e)),Object.assign(n,t),n},RHU.clearAttributes=function(e){for(;e.attributes.length>0;)e.removeAttribute(e.attributes[0].name)},RHU.getElementById=function(e,t=!0){let o=document.getElementById(e);return t&&o.removeAttribute("id"),o};{core.readyState="loading",RHU.definePublicAccessor(RHU,"readyState",{get:function(){return core.readyState}}),core.imports=[],RHU.definePublicAccessor(RHU,"imports",{get:function(){let e=[...core.imports];return e.toString=function(){let t="Imports in order of execution:";for(let o of e)t+=`\n${core.exists(o.module)?o.module:"Unknown"}${core.exists(o.trace)?"\n"+o.trace:""}`;return t},e}});let e=core.config,t=core.loader,o=new Set,n=new Set,r=new Map,i=[],s=function(e,t,o=!0,n=!1){let r=core.dependencies(e.dependencies);if(0===r.hard.missing.length&&o&&0===r.soft.missing.length)return core.imports.push({module:e.dependencies.module,trace:core.exists(r.trace)?r.trace.stack.split("\n")[1]:void 0}),t(r),!0;if(n){let t="could not loaded as not all hard dependencies were found.";core.exists(r.trace)&&(t+=`\n${r.trace.stack.split("\n").splice(1).join("\n")}\n`);for(let e of r.hard.missing)t+=`\n\tMissing '${e}'`;core.exists(e.dependencies.module)?console.warn(`Module, '${e.dependencies.module}', ${t}`):console.warn(`Unknown module ${t}`)}return!1},a=function(e,t){if(e){let e=i;i=[];for(let t of e)s(t,t.callback)||i.push(t)}let r={extension:void 0,module:void 0};core.parseOptions(r,t),core.exists(r.extension)&&core.exists(r.module)?console.error("Cannot handle loading of item that is both an x-module and a module."):(core.exists(r.extension)?o.delete(r.extension):core.exists(r.module)&&n.delete(r.module),0===o.size&&0===n.size&&c())},c=function(){core.readyState="complete";{let e=i.length;do{e=i.length;let t=i;i=[];for(let e of t)s(e,e.callback)||i.push(e)}while(e!==i.length)}{let e=i.length;do{e=i.length;let t=i;i=[];for(let e of t)s(e,e.callback,!1)||i.push(e)}while(e!==i.length)}for(let e of i)s(e,e.callback,!1,!0);core.exists(core.loader.root.params.load)&&(core.exists(window[core.loader.root.params.load])?window[core.loader.root.params.load]():console.error(`Callback for 'load' event called '${core.loader.root.params.load}' does not exist.`)),RHU.dispatchEvent(new CustomEvent("load"))};RHU.module=function(e,t){let o={dependencies:e,callback:t};"complete"!==core.readyState?i.push(o):s(o,o.callback,!0,!0)};for(let t of e.extensions)"string"==typeof t&&t&&o.add(t);for(let t of e.modules)"string"==typeof t&&t&&n.add(t);for(let o in e.includes){if("string"!=typeof o||""===o)continue;let n=core.path.isAbsolute(o);for(let i of e.includes[o])"string"==typeof i&&""!==i&&(n?r.set(core.path.join(o,`${i}.js`),i):r.set(t.root.path(core.path.join(o,`${i}.js`)),i))}if(0===o.size&&0===n.size&&0===r.size)c();else{for(let e of o.keys())t.JS(t.root.path(core.path.join("extensions",`${e}.js`)),{extension:e},(t=>{a(t,{extension:e})}));for(let e of n.keys())t.JS(t.root.path(core.path.join("modules",`${e}.js`)),{module:e},(t=>{a(t,{module:e})}));for(let e of r.keys()){let o=r.get(e);n.add(o),t.JS(e,{module:o},(e=>{a(e,{module:o})}))}}}core.exists(core.loader.root.params.ready)&&(core.exists(window[core.loader.root.params.ready])?window[core.loader.root.params.ready]():console.error(`Callback for 'ready' event called '${core.loader.root.params.ready}' does not exist.`))}})();
