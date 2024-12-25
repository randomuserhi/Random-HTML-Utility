const Map_set = Map.prototype.set;
const Map_keys = Map.prototype.keys;
const Map_get = Map.prototype.get;
const Map_has = Map.prototype.has;

const WeakSet_add = WeakSet.prototype.add;
const WeakSet_delete = WeakSet.prototype.delete;

const weakRefMapRegistry = new FinalizationRegistry<{ map: WeakRefMap<any, any>, key: any }>(({ map, key }) => {
    map.delete(key);
});

export class WeakRefMap<K, V extends object> extends Map<K, V> {
    public set(key: K, value: V) {
        weakRefMapRegistry.register(value, { map: this, key });
        return Map_set.call(this, key, new WeakRef<V>(value));
    }
    public get(key: K) {
        const raw: WeakRef<V> = Map_get.call(this, key);
        if (raw === undefined) return undefined;
        const value = raw.deref();
        if (value === undefined) return undefined;
        return value;
    }
    public* values() {
        for (const key of Map_keys.call(this)) {
            const value = Map_get.call(this, key).deref();
            if (value !== undefined) yield value;
            else this.delete(key);
        }
    }
    public* [Symbol.iterator](): IterableIterator<[key: K, value: V]> {
        for (const key of Map_keys.call(this)) {
            const value = Map_get.call(this, key).deref();
            if (value !== undefined) yield [ key, value ];
            else this.delete(key);
        }
    }
}

const weakCollectionRegistry = new FinalizationRegistry<WeakCollection<any>>((map) => {
    const collection: WeakCollection<any>["_collection"] = (map as any)._collection;
    (map as any)._collection = (map as any).__collection;
    for (const ref of collection) {
        if (ref.deref() !== undefined) (map as any)._collection.push(ref);
    }
    (map as any).__collection = collection; 
    (map as any).__collection.length = 0;
});

export class WeakCollection<T extends object> extends WeakSet<T> {
    private _collection: WeakRef<T>[] = [];
    private __collection: WeakRef<T>[] = [];
    
    public add(...items: T[]) {
        if (items.length === 1) {
            this._collection.push(new WeakRef(items[0]));
            weakCollectionRegistry.register(items[0], this);
            return WeakSet_add.call(this, items[0]);
        }
        
        for (const item of items) {
            if (!this.has(item)) {
                this._collection.push(new WeakRef(item));
                WeakSet_add.call(this, item);
                weakCollectionRegistry.register(item, this);
            }
        }
    }
    public delete(...items: T[]) {
        if (items.length === 1) {
            this._collection = this._collection.filter((ref: WeakRef<T>) => {
                const item: T | undefined = ref.deref();
                return item !== undefined && !items.includes(item); 
            });
            return WeakSet_delete.call(this, items[0]);
        }
    
        for (const item of items)
            WeakSet_delete.call(this, item);
        this._collection = this._collection.filter((ref) => {
            const item: T | undefined = ref.deref();
            return item !== undefined && !items.includes(item); 
        });
    }
    public* [Symbol.iterator]() {
        const collection = this._collection;
        this._collection = this.__collection;
        for (const ref of collection) {
            const item: T | undefined = ref.deref();
            if (item !== undefined) {
                this._collection.push(ref);
                yield item;
            }
        }
        this.__collection = collection; 
        this.__collection.length = 0;
    }
    public size() {
        let count = 0;
    
        const collection = this._collection;
        this._collection = this.__collection;
        for (const ref of collection) {
            const item: T | undefined = ref.deref();
            if (item !== undefined) {
                this._collection.push(ref);
                ++count;
            }
        }
        this.__collection = collection; 
        this.__collection.length = 0;
    
        return count;
    }
}

// NOTE(randomuserhi): A specialised map which binds keys to multiple values. When all values of a key are garbage collected, the key is removed from the map.
//                     - set() calls on the same key will add multiple objects to the given key.
//                     otherwise the collection acts identical to Map<K, WeakCollection<V>>(), just with auto-clearing keys.
const weakCollectionMapRegistry = new FinalizationRegistry<{ map: WeakCollectionMap<any, any>, key: any, collection: WeakCollection<any> }>(({ map, key, collection }) => {
    if (collection.size() === 0) map.delete(key);
});

export class WeakCollectionMap<K, V extends object> extends Map<K, V> {
    public set(key: K, value: V) {
        if (!Map_has.call(this, key)) {
            Map_set.call(this, key, new WeakCollection());
        }
        const collection: WeakCollection<any> = Map_get.call(this, key)!;
        collection.add(value);
        weakCollectionMapRegistry.register(value, { map: this, key, collection });
        return Map_set.call(this, key, collection);
    }
    public add = WeakCollectionMap.prototype.set;
}