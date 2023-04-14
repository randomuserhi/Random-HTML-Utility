!function(){"use strict";let e=window.RHU;if(null==e)throw new Error("");e.module({module:"x-rhu/theme",trace:new Error,hard:[]},(function(){e.exists(e.Theme)&&console.warn("Overwriting RHU.Theme...");let t=e.Theme={};t.Group=function(e){if(void 0===new.target)throw new TypeError("Constructor Group requires 'new'.");if(""==e)throw new TypeError("'name' cannot be blank.");this._name=e,this._current="",this._style=null,this._themes=new Map,this._mediaQueries=new Map,this.ruleSet=new t.RuleSet},e.definePublicAccessors(t.Group.prototype,{themes:{get(){return this._themes}},mediaQueries:{get(){return this._mediaQueries}},active:{get(){return this._current},set(e){if("string"!=typeof e)throw new TypeError("'active' must be of type string.");let t=`${this._name}-${this._current}`,r=`${this._name}-${this._current=e}`,n=document.getElementsByClassName(this._name);for(let i=0;i<n.length;++i)n[i].classList.remove(t),""!==e&&n[i].classList.add(r)}},style:{get(){return this._style}},name:{get(){return this._name}}}),t.Group.prototype.compile=function(r=!0,n=!0){let i="",o=`${this.name}`;this.ruleSet&&(i+=n?`.${o}{`:`.${o}\n{\n`,i+=e.clone(this.ruleSet,t.RuleSet.prototype).compile(n),i+=n?"}":"\n}\n");for(let[r,s]of this.mediaQueries)s&&(i+=n?`@media(${r}){`:`@media (${r})\n{\n`,i+=n?`.${o}{`:`.${o}\n{\n`,i+=e.clone(s,t.RuleSet.prototype).compile(n),i+=n?"}}":"\n}\n}\n");if(r)for(let[r,s]of this.themes)s&&(i+=n?`.${o}-${r}{`:`.${o}-${r}\n{\n`,i+=e.clone(s,t.RuleSet.prototype).compile(n),i+=n?"}":"\n}\n");return i},t.Group.prototype.attach=function(){let e=this._style;e&&e.parentNode.removeChild(e),e=this._style=document.createElement("style"),e.innerHTML=this.compile(),document.head.appendChild(e)},t.Group.prototype.detach=function(){let e=this._style;e&&(e.parentNode.removeChild(e),this._style=null)},t.RuleSet=function(){if(void 0===new.target)throw new TypeError("Constructor RuleSet requires 'new'.")},t.RuleSet.prototype.compile=function(e=!0){let t="";for(let r of Object.keys(this)){if("string"!=typeof r||"string"!=typeof this[r])throw new TypeError("Ruleset cannot contain non-string entries.");t+=e?`--js-${r}:${this[r]};`:`--js-${r} : ${this[r]};\n`}return t}}))}();
