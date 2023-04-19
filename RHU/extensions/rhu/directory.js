(function() {
    "use strict";

    // TODO(randomuserhi): Probably need to add test cases for testing that the data sync all works as intended

    let RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module({ module: "rhu-x/directory", hard: ["RHU.WeakCollection", "RHU.eventTarget", "RHU.CustomEvent"], trace: new Error() }, function()
	{
		let Map_Set = Map.prototype.set;
	    let Map_Get = Map.prototype.get;
	    let Map_Delete = Map.prototype.delete;

	    let Set_Clear = Set.prototype.clear;
	    let Set_Add = Set.prototype.add;
	    let Set_Delete = Set.prototype.delete;

	    let symbols = {
	        directory: Symbol("DirectoryRecord directory"),
	        key: Symbol("DirectoryRecord key"),
	        update: Symbol("DirectoryRecord update"),
	        item: Symbol("Directory Item"),
	        subscribe: Symbol("Directory Subscribe"),
	        add: Symbol("SubDirectory Add"),
	        delete: Symbol("SubDirectory Delete"),
	        filter: Symbol("SubDirectory Filter")
	    };

	    // NOTE(randomuserhi): Updating properties of the item through .item won't propagate changes through
	    //                     the entire directory system. Use of .update(new_item) is preferred.
	    //                     We don't use a proxy to remedy this to allow comparison of items as 
	    //                     two proxy instances may not be the same.
	    //                     Proxies also cannot handle nested values changing.
	    let DirectoryRecord = RHU.DirectoryRecord = function(directory, id, item)
	    {
	        RHU.eventTarget(this);

	        this[symbols.directory] = directory;
	        this[symbols.key] = id;
	        this[symbols.update](item);
	    };
	    RHU.definePublicAccessors(DirectoryRecord.prototype, {
	        item: {
	            get: function() { return this[symbols.item]; }
	        },
	        directory: {
	            get: function() { return this[symbols.directory]; }
	        }
	    });
	    DirectoryRecord.prototype[symbols.update] = function(item)
	    {
	        this.lastUpdated = Date.now();
	        this[symbols.item] = item;
	        this.dispatchEvent(RHU.CustomEvent("update", this.item));
	    };
	    DirectoryRecord.prototype.update = function(item)
	    {
	        this.directory.set(this[symbols.key], item);
	    };
	    DirectoryRecord.prototype.delete = function()
	    {
	        this.dispatchEvent(RHU.CustomEvent("delete", this.item));  
	        this[symbols.item] = null;
	    };

	    let SubDirectory = RHU.SubDirectory = RHU.reflectConstruct(Set, "RHU.SubDirectory", function(directory, filter = undefined)
	    {
	        RHU.eventTarget(this);

	        directory[symbols.subscribe](this);
	        this.filter = filter;
	    });
	    RHU.definePublicAccessors(SubDirectory.prototype, {
	        filter: {
	            get: function() { return this[symbols.filter]; },
	            set: function(filter) {
	                this[symbols.filter] = filter;
	                this.fetch();
	            }
	        },
	        directory: {
	            get: function() { return globalSubscriptions.get(this); }
	        }
	    });
	    SubDirectory.prototype.add = function()
	    {
	        throw new Error("You cannot call add() on a subDirectory.");
	    };
	    SubDirectory.prototype.delete = function()
	    {
	        throw new Error("You cannot call delete() on a subDirectory.");
	    };
	    SubDirectory.prototype.clear = function()
	    {
	        throw new Error("You cannot call clear() on a subDirectory.")
	    };
	    SubDirectory.prototype.fetch = function()
	    {
	        if (!RHU.exists(this.directory)) throw new Error("Cannot fetch whilst unsubscribed to a directory.");

	        Set_Clear.call(this);
	        for (let pair of this.directory)
	        {
	            if (!RHU.exists(this.filter) || this.filter(pair[1].item))
	                Set_Add.call(this, pair[0]);
	        }
	    };
	    SubDirectory.prototype.get = function(id)
	    {
	        if (!RHU.exists(this.directory)) throw new Error("Cannot get whilst unsubscribed to a directory.");
	        
	        if (this.has(id))
	            return this.directory.get(id);
	        else
	            return undefined;
	    };
	    SubDirectory.prototype[symbols.add] = function(id, item)
	    {
	        let info = { 
	            directory: this, 
	            id: id, 
	            item: item
	        };

	        if (this.has(id))
	        {
	            // check if updated item is still part of filter
	            if (!RHU.exists(this.filter) || this.filter(item))
	                this.dispatchEvent(RHU.CustomEvent("update", info));
	            else // if not, remove from directory
	                this[symbols.delete](id, item);
	        }
	        else if (!RHU.exists(this.filter) || this.filter(item))
	        {
	            Set_Add.call(this, id);
	            this.dispatchEvent(RHU.CustomEvent("set", info));
	        }
	    };
	    SubDirectory.prototype[symbols.delete] = function(id, item)
	    {
	        if (!this.has(id)) return;

	        let info = { 
	            directory: this, 
	            id: id, 
	            item: item
	        };

	        Set_Delete.call(this, id);
	        this.dispatchEvent(RHU.CustomEvent("delete", info));
	    };
	    SubDirectory.prototype[Symbol.iterator] = function* ()
	    {
	        if (!RHU.exists(this.directory)) throw new Error("Cannot get key value pairs whilst unsubscribed to a directory.");
	        
	        for (let id of this.keys())
	        {
	            yield [id, this.get(id)];
	        }
	    };
	    SubDirectory.prototype.values = function* ()
	    {
	        if (!RHU.exists(this.directory)) throw new Error("Cannot get values whilst unsubscribed to a directory.");
	    
	        for (let id of this.keys())
	        {
	            yield this.get(id);
	        }  
	    };
	    SubDirectory.prototype.query = function* (filter)
	    {
	        for (let id of this.keys())
	        {
	            let item = this.get(id);
	            if (filter(item)) yield item;
	        } 
	    };
	    RHU.inherit(SubDirectory, Set);

	    let globalSubscriptions = new WeakMap();
	    let __Directory__ = RHU.__Directory__ = RHU.reflectConstruct(Map, "RHU.__Directory__", function(options)
	    {
	        RHU.eventTarget(this);

	        this.options = {
	            maxOutdatedAllowed: 1000 * 60 * 60 * 24 // duration of time data is allowed to be outdated for in ms
	        };
	        RHU.parseOptions(this.options, options);
	    
	        this.getRecord = Map_Get.bind(this);
	    
	        // TODO(randomuserhi): convert subscriptions collection into a symbol to hide it from users
	        this.subscriptions = new RHU.WeakCollection();
	    });
	    __Directory__.prototype[symbols.subscribe] = function(subDirectory)
	    {
	        // Check that the subDirectory is not already subscribed to another directory
	        // If it has, remove it from the subscription listing
	        if (globalSubscriptions.has(subDirectory))
	            globalSubscriptions.get(subDirectory).subscriptions.delete(subDirectory);
	        
	        this.subscriptions.add(subDirectory);
	        globalSubscriptions.set(subDirectory, this);
	    };
	    __Directory__.prototype.get = function(id) // Only gets from cache
	    {
	        if (this.has(id))
	            return Map_Get.call(this, id).item;
	        else
	            return undefined;
	    };
	    __Directory__.prototype.set = function(id, item)
	    {
	        if (!RHU.exists(id)) throw Error("id cannot be undefined or null.");
	        
	        let info = { 
	            directory: this, 
	            id: id, 
	            item: item
	        };

	        if (this.has(id))
	        {
	            Map_Get.call(this, id)[symbols.update](item);
	            this.dispatchEvent(RHU.CustomEvent("update", info));
	        }
	        else
	        {
	            Map_Set.call(this, id, new RHU.DirectoryRecord(this, id, item));
	            this.dispatchEvent(RHU.CustomEvent("set", info));
	        }

	        // Update subscribed subdirectories
	        for (let subDirectory of this.subscriptions)
	        {
	            subDirectory[symbols.add](id, item);
	        }
	    };
	    __Directory__.prototype.delete = function(id)
	    {
	        if (!this.has(id)) return false;

	        let item = this.get(id);
	        let info = { 
	            directory: this, 
	            id: id, 
	            item: item
	        };

	        Map_Delete.call(this, id);
	        this.dispatchEvent(RHU.CustomEvent("delete", info));
	        
	        // Update subscribed subdirectories
	        for (let subDirectory of this.subscriptions)
	        {
	            subDirectory[symbols.delete](id, item);
	        }

	        return true;
	    };
	    __Directory__.prototype.__fetch__ = async function()
	    {
	        throw new Error("Not Implemented.");
	    };
	    __Directory__.prototype.asyncGet = async function(id, forceUpdate = false) // Gets from server if not present in cache OR if cache needs updating
	    {
	        if (!forceUpdate && this.has(id))
	        {
	            let record = this.getRecord(id);
	            if (Date.now() < record.lastUpdated + this.options.maxOutdatedAllowed)
	                return record.item; // Data has not yet gone out of date
	        }
	        let fromServer = await this.__fetch__(id);
	        this.set(id, fromServer); // Cache requested item
	        return fromServer;
	    };
	    __Directory__.prototype.query = function* (filter)
	    {
	        for (let id of this.keys())
	        {
	            let item = this.get(id);
	            if (filter(item)) yield item;
	        } 
	    };
	    RHU.inherit(__Directory__, Map);	
	});
})();