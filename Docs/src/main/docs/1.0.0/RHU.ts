RHU.require(new Error(), { 
    docs: "docs", rhuDocuscript: "docuscript",
}, function({
    docs, rhuDocuscript,
}) {
    const version = "1.0.0";
    const path = "Random HTML Utility";
    
    const page = docuscript<RHUDocuscript.Language, RHUDocuscript.FuncMap>(({
        h, p, div, br, code
    }) => {
        div(
            "Random HTML Utility (RHU) is a pure JS library, with TypeScript support, for developing webpages.",
            br(),
            "RHU was not made as a competitive replacement to well-known frameworks such as React or Svelt. It instead was made for the learning experience and to experiment with for personal use."
        );
        h(1, "About");
        code("test");
    }, rhuDocuscript);
    docs.get(version)!.setCache(path, page);
    return page;
});