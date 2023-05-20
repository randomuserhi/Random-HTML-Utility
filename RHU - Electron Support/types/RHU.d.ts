// TODO(randomuserhi): documentation

declare global
{
    namespace RHU
    {
        interface Core
        {
            test: string
        }
    }

    interface Window
    {
        RHU: RHU.Core
    }
}

export {}