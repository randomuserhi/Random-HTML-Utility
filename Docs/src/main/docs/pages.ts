declare namespace RHU {
    interface Modules {
        "docuscript/pages": {
            loadingPage: RHUDocuscript.Page;
            failedToLoadPage: RHUDocuscript.Page;
            pageNotFound: RHUDocuscript.Page;
            versionNotFound: RHUDocuscript.Page;
            directoryPage: (directory: Page) => RHUDocuscript.Page;
        };
    }
}

RHU.module(new Error(), "docuscript/pages", { 
    docs: "docs",
    rhuDocuscript: "docuscript",
}, function({
    docs,
    rhuDocuscript,
}) {
   
    const loadingPage = docuscript<RHUDocuscript.Language, RHUDocuscript.FuncMap>(({
        h
    }) => {
        h(1, "Page is loading.");
    }, rhuDocuscript);
    
    const failedToLoadPage = docuscript<RHUDocuscript.Language, RHUDocuscript.FuncMap>(({
        h
    }) => {
        h(1, "Page failed to load.");
    }, rhuDocuscript);
    
    const pageNotFound = docuscript<RHUDocuscript.Language, RHUDocuscript.FuncMap>(({
        h, p
    }) => {
        h(1, "Page not found.");
    }, rhuDocuscript);
    
    const versionNotFound = docuscript<RHUDocuscript.Language, RHUDocuscript.FuncMap>(({
        h, p
    }) => {
        h(1, "Version not found.");
    }, rhuDocuscript);
    
    const directoryPage = (directory: Page) => {
        return docuscript<RHUDocuscript.Language, RHUDocuscript.FuncMap>(({
            p
        }) => {
            for (const subDir of directory.sortedKeys()) {
                p(subDir);
            }
        }, rhuDocuscript);
    }

    return {
        loadingPage,
        failedToLoadPage,
        pageNotFound,
        versionNotFound,
        directoryPage,
    };
});