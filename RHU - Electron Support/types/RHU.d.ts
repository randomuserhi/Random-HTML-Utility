// TODO(randomuserhi): documentation

declare global
{
    namespace RHU
    {
        interface Core
        {
            version: string
        }
    }

    interface Window
    {
        RHU: RHU.Core
    }
}

export {}