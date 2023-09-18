export const isFunction = (object: any): object is (...args: any[]) => any =>
    typeof object === 'function';