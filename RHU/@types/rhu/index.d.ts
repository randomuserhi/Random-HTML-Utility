export = rhu;
export as namespace rhu;

declare namespace rhu {
    export const log: () => void;
    
    export interface SetState<T> {
        (setter: (old: T) => T): void;
        (value: T): void;
    }

    export function vof<T>(state: T): T;
    export function expr<T>(expr: () => T): T;
    export function useState<T>(init: T): [T, SetState<T>];
}

/* rhu-jsx.d.ts */
declare namespace rhu {
    export type Node = globalThis.Node | string;

    export interface NodeProps {
        children: Node[];
    }
}