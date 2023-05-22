declare global
{
    interface RHU
    {

        Rest?: RHU.Rest;
    }

    namespace RHU
    {
        interface Rest
        {
            fetch<T>(options: RHU.Rest.Options<T>): RHU.Rest.FetchFunction<T>;
            fetchJSON<T>(options: RHU.Rest.Options<T>): RHU.Rest.FetchFunction<T>;
        }

        namespace Rest
        {
            type FetchFunction<T> = ((...params: any[]) => Promise<T>) | ((payload: RHU.Rest.Payload) => Promise<T>)

            interface Options<T>
            {
                url: URL | string,
                fetch: RequestInit,
                callback: (result: Response) => Promise<T>,
                parser?(...params: any[]): RHU.Rest.Payload
            }

            interface Payload
            {
                urlParams: Record<string, string>,
                body: BodyInit | null
            }
        }
    }
}

export {}