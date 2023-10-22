RHU.require(new Error(), { 
    docs: "docs", rhuDocuscript: "docuscript",
}, function({
    docs, rhuDocuscript,
}) {
    const version = "1.0.0";
    const path = "Random HTML Utility";
    
    const page = docuscript<RHUDocuscript.Language, RHUDocuscript.FuncMap>(({
        h, p,
    }) => {
        h(1, "About");
        p(
            "Random HTML Utility is a pure JS library (with TypeScript) support for developing webpages."
        );
    }, rhuDocuscript);
    docs.get(version)!.setCache(path, page);
    return page;
});