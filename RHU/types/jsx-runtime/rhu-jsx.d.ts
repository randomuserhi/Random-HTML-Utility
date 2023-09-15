declare namespace RHU {
    type Node = globalThis.Node | string;

    interface NodeProps {
        children: Node[];
    }
}