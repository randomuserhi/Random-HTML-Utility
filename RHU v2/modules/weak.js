(function() {
    "use strict";

    let RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("");
    RHU.module({ module: "weak", hard: ["WeakRef", "WeakSet", "FinalizationRegistry"] }, function() {
        RHU.WeakCollection = function()
        {
            this._weakSet = new WeakSet();
            this._collection = [];
            // TODO(randomuserhi): Consider moving FinalizationRegistry to a soft dependency since this just assists
            //                     cleaning up huge amounts of divs being created, since otherwise cleanup of the
            //                     collection only occures on deletion / iteration of the collection which can
            //                     cause huge memory consumption as the collection of WeakRef grows.
            //                     - The version that runs without FinalizationRegistry, if it is moved, to a soft
            //                       dependency, would simply run a setTimeout loop which will filter the collection every
            //                       30 seconds or something (or do analysis on how frequent its used to determine how often)
            //                       cleanup is required.
            this._registry = new FinalizationRegistry(() => {
                this._collection = this._collection.filter((i) => {
                    return RHU.exists(i.deref()); 
                });
            });

            this.has = this._weakSet.has;
        };
        RHU.WeakCollection.prototype.add = function(...items)
        {
            for (let item of items)
            {
                if (!this._weakSet.has(item))
                {
                    this._collection.push(new WeakRef(item));
                    this._weakSet.add(item);
                    this._registry.register(item);
                }
            }
        };
        RHU.WeakCollection.prototype.delete = function(...items)
        {
            for (let item of items)
            {
                if (this._weakSet.has(item))
                    this._weakSet.delete(item);
            }  
            this._collection = this._collection.filter((i) => {
                i = i.deref();
                return RHU.exists(i) && !items.includes(i); 
            });
        };
        RHU.WeakCollection.prototype[Symbol.iterator] = function* ()
        {
            let collection = this._collection;
            this._collection = []; 
            for (let item of collection)
            {
                item = item.deref();
                if (RHU.exists(item))
                {
                    this._collection.push(new WeakRef(item));
                    yield item;
                }
            }
        };
    });
})();