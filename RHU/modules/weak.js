(function() {
    "use strict";

    let RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("");
    RHU.module({ module: "weak", trace: new Error(), hard: ["Map", "WeakRef", "WeakSet", "FinalizationRegistry"] }, function() {
        
        let Map_set = Map.prototype.set;
        let Map_keys = Map.prototype.keys;
        let Map_get = Map.prototype.get;

        RHU.WeakRefMap = RHU.reflectConstruct(Map, "WeakRefMap", function()
            {
                // TODO(randomuserhi): Consider moving FinalizationRegistry to a soft dependency since this just assists
                //                     cleaning up huge amounts of divs being created, since otherwise cleanup of the
                //                     collection only occures on deletion / iteration of the collection which can
                //                     cause huge memory consumption as the collection of WeakRef grows.
                //                     - The version that runs without FinalizationRegistry, if it is moved, to a soft
                //                       dependency, would simply run a setTimeout loop which will filter the collection every
                //                       30 seconds or something (or do analysis on how frequent its used to determine how often)
                //                       cleanup is required.
                this._registry = new FinalizationRegistry((key) => {
                    this.delete(key);
                });
            });
        RHU.WeakRefMap.prototype.set = function(key, value)
        {
            this._registry.register(value, key);
            return Map_set.call(this, key, new WeakRef(value));
        };
        RHU.WeakRefMap.prototype.get = function(key)
        {
            let raw = Map_get.call(this, key);
            if (!RHU.exists(raw)) return undefined;
            let value = raw.deref();
            if (!RHU.exists(value)) return undefined;
            return value;
        };
        RHU.WeakRefMap.prototype.values = function* ()
        {
            for (let key of Map_keys.call(this))
            {
                let value = Map_get.call(this, key).deref();
                if (RHU.exists(value)) yield value;
                else this.delete(key);
            }
        };
        RHU.WeakRefMap.prototype[Symbol.iterator] = function* ()
        {
            for (let key of Map_keys.call(this))
            {
                let value = Map_get.call(this, key).deref();
                if (RHU.exists(value)) yield [ key, value ];
                else this.delete(key);
            }
        };
        RHU.inherit(RHU.WeakRefMap, Map);

        let WeakSet_add = WeakSet.prototype.add;
        let WeakSet_delete = WeakSet.prototype.delete;

        RHU.WeakCollection = RHU.reflectConstruct(WeakSet, "RHU.WeakCollection", function()
            {
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
            });
        RHU.WeakCollection.prototype.add = function(...items)
        {
            for (let item of items)
            {
                if (!this.has(item))
                {
                    this._collection.push(new WeakRef(item));
                    WeakSet_add.call(this, item);
                    this._registry.register(item);
                }
            }
        };
        RHU.WeakCollection.prototype.delete = function(...items)
        {
            for (let item of items)
                WeakSet_delete.call(this, item);
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
        RHU.inherit(RHU.WeakCollection, WeakSet);
    });
})();