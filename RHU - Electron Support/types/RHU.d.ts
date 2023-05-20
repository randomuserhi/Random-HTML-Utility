declare global
{
    interface RHU
    {
        test: string
    }

    interface Window
    {
        RHU: RHU
    }
}

export {}