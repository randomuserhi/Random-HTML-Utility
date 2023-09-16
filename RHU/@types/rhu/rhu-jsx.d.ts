declare namespace rhu {
    type Node = globalThis.Node | string;

    interface NodeProps {
        children: Node[];
    }
}