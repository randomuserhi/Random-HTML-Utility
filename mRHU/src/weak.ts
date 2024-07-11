import { exists, inherit, reflectConstruct, ReflectConstruct } from "./rhu.js";

export interface WeakRefMap<K, V> extends Map<K, V> {
    prototype: WeakRefMap<K, V>;
}
interface WeakRefMapConstructor extends ReflectConstruct<MapConstructor, WeakRefMapConstructor> {
    new(): WeakRefMap<any, any>;
    new <K, V>(entries?: readonly (readonly [K, V])[] | null): WeakRefMap<K, V>;
    readonly prototype: WeakRefMap<any, any>;
}

export interface WeakCollection<T extends object> extends WeakSet<T> {
    prototype: WeakCollection<T>;
    _collection: WeakRef<T>[];
    __collection: WeakRef<T>[];
    add(item: T): this;
    delete(item: T): boolean;
    add(...items: T[]): void;
    delete(...items: T[]): void;
    [Symbol.iterator](): IterableIterator<T>;
    size(): number;
}
interface WeakCollectionConstructor extends ReflectConstruct<WeakSetConstructor, WeakCollectionConstructor> {
    new <T extends object = object>(values?: readonly T[] | null): WeakCollection<T>;
    readonly prototype: WeakCollection<object>;
}

export interface WeakCollectionMap<K, V extends object> {
    prototype: WeakCollectionMap<K, V>;
    delete(key: K): boolean;
    clear(): void;
    set(key: K, value: V): WeakCollectionMap<K, V>;
    add(key: K, value: V): WeakCollectionMap<K, V>;
    get(key: K): WeakCollection<V> | undefined;
    has(key: K): boolean;
    values(): IterableIterator<WeakCollection<V>>;
    entries(): IterableIterator<[key: K, value: WeakCollection<V>]>;
    [Symbol.iterator](): IterableIterator<[key: K, value: WeakCollection<V>]>;
}
interface WeakCollectionMapConstructor extends ReflectConstruct<MapConstructor, WeakCollectionMapConstructor> {
    new(): WeakCollectionMap<any, any>;
    new <K, V extends object>(entries?: readonly (readonly [K, V])[] | null): WeakCollectionMap<K, V>;
    readonly prototype: WeakCollectionMap<any, any>;
}

const Map_set = Map.prototype.set;
const Map_keys = Map.prototype.keys;
const Map_get = Map.prototype.get;
const Map_has = Map.prototype.has;

const weakRefMapRegistry = new FinalizationRegistry<{ map: WeakRefMap<any, any>, key: any }>(({ map, key }) => {
    map.delete(key);
});
export const WeakRefMap = reflectConstruct(Map, "WeakRefMap", function<K, V>(this: WeakRefMap<K, V>) {
}) as WeakRefMapConstructor;
WeakRefMap.prototype.set = function(key, value) {
    weakRefMapRegistry.register(value, { map: this, key });
    return Map_set.call(this, key, new WeakRef(value));
};
WeakRefMap.prototype.get = function(key) {
    const raw = Map_get.call(this, key);
    if (!exists(raw)) return undefined;
    const value = raw.deref();
    if (!exists(value)) return undefined;
    return value;
};
WeakRefMap.prototype.values = function* () {
    for (const key of Map_keys.call(this)) {
        const value = Map_get.call(this, key).deref();
        if (exists(value)) yield value;
        else this.delete(key);
    }
};
WeakRefMap.prototype[Symbol.iterator] = function* () {
    for (const key of Map_keys.call(this)) {
        const value = Map_get.call(this, key).deref();
        if (exists(value)) yield [ key, value ];
        else this.delete(key);
    }
};
inherit(WeakRefMap, Map);

const WeakSet_add = WeakSet.prototype.add;
const WeakSet_delete = WeakSet.prototype.delete;

const weakCollectionRegistry = new FinalizationRegistry<WeakCollection<any>>((map) => {
    const collection = map._collection;
    map._collection = map.__collection;
    for (const ref of collection) {
        if (exists(ref.deref())) map._collection.push(ref);
    }
    map.__collection = collection; 
    map.__collection.length = 0;
});
export const WeakCollection = reflectConstruct(WeakSet, "WeakCollection", function<T extends object>(this: WeakCollection<T>) {
    this._collection = [];
    this.__collection = [];
}) as WeakCollectionConstructor;
WeakCollection.prototype.add = function(...items) {
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
};
WeakCollection.prototype.delete = function(...items) {
    if (items.length === 1) {
        this._collection = this._collection.filter((ref: WeakRef<object>) => {
            const item: object | undefined = ref.deref();
            return exists(item) && !items.includes(item); 
        });
        return WeakSet_delete.call(this, items[0]);
    }

    for (const item of items)
        WeakSet_delete.call(this, item);
    this._collection = this._collection.filter((ref) => {
        const item: object | undefined = ref.deref();
        return exists(item) && !items.includes(item); 
    });
};
WeakCollection.prototype[Symbol.iterator] = function* () {
    const collection = this._collection;
    this._collection = this.__collection;
    for (const ref of collection) {
        const item: object | undefined = ref.deref();
        if (exists(item)) {
            this._collection.push(ref);
            yield item;
        }
    }
    this.__collection = collection; 
    this.__collection.length = 0;
};
WeakCollection.prototype.size = function() {
    let count = 0;

    const collection = this._collection;
    this._collection = this.__collection;
    for (const ref of collection) {
        const item: object | undefined = ref.deref();
        if (exists(item)) {
            this._collection.push(ref);
            ++count;
        }
    }
    this.__collection = collection; 
    this.__collection.length = 0;

    return count;
};
inherit(WeakCollection, WeakSet);

// NOTE(randomuserhi): A specialised map which binds keys to multiple values. When all values of a key are garbage collected, the key is removed from the map.
//                     - set() calls on the same key will add multiple objects to the given key.
//                     otherwise the collection acts identical to Map<K, WeakCollection<V>>(), just with auto-clearing keys.
const weakCollectionMapRegistry = new FinalizationRegistry<{ map: WeakCollectionMap<any, any>, key: any, collection: WeakCollection<any> }>(({ map, key, collection }) => {
    if (collection.size() === 0) map.delete(key);
});
export const WeakCollectionMap = reflectConstruct(Map, "WeakCollectionMap", function<K, V extends object>(this: WeakCollectionMap<K, V>) {
}) as WeakCollectionMapConstructor;
WeakCollectionMap.prototype.set = function(key, value) {
    if (!Map_has.call(this, key)) {
        Map_set.call(this, key, new WeakCollection());
    }
    const collection: WeakCollection<any> = Map_get.call(this, key)!;
    collection.add(value);
    weakCollectionMapRegistry.register(value, { map: this, key, collection });
    return Map_set.call(this, key, collection);
};
WeakCollectionMap.prototype.add = WeakCollectionMap.prototype.set;
inherit(WeakCollectionMap, Map);