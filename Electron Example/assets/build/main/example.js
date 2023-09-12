RHU.module(new Error(), "main", { Rest: "rhu/rest" }, function ({ Rest }) {
    let request = Rest.fetch({
        url: `https://9anime.to/ajax/server/HTufCcshkw==`,
        fetch: {
            method: "GET",
            headers: {
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "Referer": "https://9anime.to/watch/baka-and-test-summon-the-beasts.w14l/ep-1",
                "X-Requested-With": "XMLHttpRequest"
            },
        },
        parser: function () {
            return {
                urlParams: {
                    "vrf": "SlZGW2NKNWhnZGFNejhoRg=="
                }
            };
        },
        callback: async function (resp) {
            if (resp.status == 200) {
                let json = await resp.json();
                return json;
            }
            else {
                return null;
            }
        }
    });
    (async function () {
        console.log(await request());
    })();
});
