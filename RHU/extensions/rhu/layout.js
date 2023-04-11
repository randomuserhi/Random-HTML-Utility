(function() {
    "use strict";

    let RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module({ module: "x-rhu/layout", trace: new Error(), hard: ["RHU.Macro", "RHU.WeakCollection"] }, function()
    {
        if (RHU.exists(RHU.Layout))
            console.warn("Overwriting RHU.Layout...");

        // Loop that sets bind position of elements
        let bindLoop = function()
        {
            for (let bind of binds)
            {
                let layout = bind.layout;
                if (!RHU.exists(layout.current)) continue;

                let target = bind.target;
                let anchor = layout.current[bind.anchor];

                if (!RHU.exists(anchor))
                {
                    if (bind.options.floating)
                        bind._wrapper.style.display = "none";
                    else
                        target.remove();    
                }                
                else
                {
                    if (bind.options.floating)
                    {
                        let wrapper = bind._wrapper;
                        if (!RHU.exists(wrapper))
                        {
                            wrapper = bind._wrapper = document.createElement("div");
                            wrapper.style.position = "fixed";
                            wrapper.style.display = "block";
                            
                            wrapper.append(target);
                        }

                        // TODO(randomuserhi): Account for padding, border etc...
                        //                     - maybe set padding and margin of wrapper to be identical
                        //                       to anchor?
                        //                     - yeah probably should duplicate styles (or atleast specific stlyes) 
                        //                       cause I need to account for overflow etc and other styles...
                        //                     Not sure if getBoundingClientRect is better or getComputedStyle
                        let rect = anchor.getBoundingClientRect();
                        let width = rect.right - rect.left;
                        let height = rect.bottom - rect.top;
                        wrapper.style.top = `${rect.top}px`;
                        wrapper.style.left = `${rect.left}px`;
                        wrapper.style.width = `${width}px`;
                        wrapper.style.height = `${height}px`;
                    
                        target = wrapper;
                    }
                    
                    if (!anchor.contains(target))
                    {
                        anchor.replaceChildren(target);
                    }
                }
            }

            requestAnimationFrame(bindLoop);
        };

        let binds = window.binds = new RHU.WeakCollection();
        let Bind = function(layout, target, anchor, opt = undefined)
        {
            this.layout = layout;
            this.target = target;
            this.anchor = anchor;

            this.options = {
                floating: false
            };
            RHU.parseOptions(this.options, opt);
            this._wrapper = null;

            binds.add(this);
        };
        Bind.prototype.unbind = function()
        {
            // NOTE(randomuserhi): Set wrapper to null to allow for it to get garbage collected
            if (RHU.exists(this._wrapper))
                this._wrapper = null;
            this.target.remove();

            binds.remove(this);
        };

        let Layout = RHU.Layout = function(schema)
        {
            this.bindMap = new Map();
            this.current = null;
        };
        Layout.prototype.setLayout = function(macro)
        {
            // TODO(randomuserhi): Improve this API => should be able to place these macro definitions elsewhere
            this.replaceChildren();
            this.append(macro);
            this.current = macro;
        };
        // NOTE(randomuserhi): anchor is a rhu-id string
        Layout.prototype.bind = function(target, anchor, opt)
        {
            if (this.bindMap.has(anchor))
                this.clear(anchor)    
            this.bindMap.set(anchor, new Bind(this, target, anchor, opt));   
        };
        Layout.prototype.clear = function(anchor)
        {
            if (this.bindMap.has(anchor))
            {
                this.bindMap.get(anchor).unbind();
                this.bindMap.delete(anchor);
            }
        };

        bindLoop();
    });
})();