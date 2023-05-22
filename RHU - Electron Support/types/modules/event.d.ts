declare global
{
    interface RHU
    {

        eventTarget?(target: any): void,

        CustomEvent?(type: string, detail: any): CustomEvent
    }
}

export {}