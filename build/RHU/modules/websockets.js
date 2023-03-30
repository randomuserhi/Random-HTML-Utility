!function(){"use strict";let e=window.RHU;if(null==e)throw new Error("No RHU found. Did you import RHU before running?");e.module({module:"rhu/websockets",trace:new Error,hard:["WebSocket","RHU.eventTarget"]},(function(){e.exists(e.WebSockets)&&console.warn("Overwriting RHU.WebSockets...");let t=e.WebSockets={};e.definePublicAccessors(t,{CONNECTING:{get:function(){return WebSocket.CONNECTING}},OPEN:{get:function(){return WebSocket.OPEN}},CLOSING:{get:function(){return WebSocket.CLOSING}},CLOSED:{get:function(){return WebSocket.CLOSED}}});let o=function(e,t=[]){return s.call(this,new.target,[e,t])},s=e.reflectConstruct(o,WebSocket,(function(e,t=[]){this.queue=[],this.addEventListener("open",(()=>{for(;this.queue.length;)WebSocket.prototype.send.call(this,this.queue.shift())}))}));o.prototype.send=function(t){this.readyState===e.WebSockets.OPEN?WebSocket.prototype.send.call(this,t):this.queue.push(t)},e.inherit(o,WebSocket),t.ws=o,t.wsClient=function(t,o){if(void 0===new.target)throw new TypeError("Constructor Component requires 'new'.");if(WebSocket!==t&&!Object.isPrototypeOf.call(WebSocket,t))throw new TypeError("WebSocket must be inherited from or of type 'WebSocket'.");let s=function(...s){this.args=s,e.eventTarget.call(this);let n={url:void 0,protocols:[]},r=o.call(this,...s);e.parseOptions(n,r),this.ws=new t(n.url,n.protocols),this.ws.addEventListener("close",(t=>{this.dispatchEvent(e.CustomEvent("close",t)),e.exists(this.onclose)&&this.onclose(t)})),this.ws.addEventListener("error",(t=>{this.dispatchEvent(e.CustomEvent("error",t)),e.exists(this.onerror)&&this.onerror(t)})),this.ws.addEventListener("message",(t=>{this.dispatchEvent(e.CustomEvent("message",t)),e.exists(this.onmessage)&&this.onmessage(t)})),this.ws.addEventListener("open",(t=>{this.dispatchEvent(e.CustomEvent("open",t)),e.exists(this.onopen)&&this.onopen(t)}))};return s.prototype.reconnect=function(...e){s.call(this,...0===e.length?this.args:e)},s.prototype.send=function(e){this.ws.send(e)},s.prototype.close=function(...e){this.ws.close(...e)},s}}))}();
