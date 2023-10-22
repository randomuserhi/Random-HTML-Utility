RHU.require(new Error(), { 
    docs: "docs", rhuDocuscript: "docuscript",
}, function({
    docs, rhuDocuscript,
}) {
    const version = "1.0.0";
    const path = "Deep";
    
    const page = docuscript<RHUDocuscript.Language, RHUDocuscript.FuncMap>(({
        h, p,
    }) => {
        h(1, "About");
        p(
            "Deep is a light-weight C++ Physics Engine. It is designed for performance."
        );
    }, rhuDocuscript);
    docs.get(version)!.setCache(path, page);
    return page;
});