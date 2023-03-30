(function() {
    "use strict";

    let RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module({ module: "file", trace: new Error(), hard: ["FileReader", "Promise"] }, function()
    {
        if (RHU.exists(RHU.File))
            console.warn("Overwriting RHU.File...");

        let File = RHU.File = {};

        /**
         * NOTE(randomuserhi): Implementation based on:
         *                     https://stackoverflow.com/questions/18299806/how-to-check-file-mime-type-with-javascript-before-upload/29672957#29672957
         *
         * TODO(randomuserhi): Possibly implement with Promise API (currently uses callbacks)
         * TODO(randomuserhi): Documentation
         * TODO(randomuserhi): Consider FileReader.progress event => https://developer.mozilla.org/en-US/docs/Web/API/FileReader/progress_event
         */

        let Type = File.Type = {
            unknown: "unknown",
            png: "png",
            gif: "gif",
            jpg: "jpg",
            txt: "txt",
            js: "text/javascript",
            mp4: "video/mp4",
            mkv: "video/x-matroska"
        };
        Type.toType = function(blobType)
        {
            let type;
            switch (blobType) 
            {
            case "text/javascript":
                type = Type.js;
                break;
            case "video/mp4":
                type = Type.mp4;
                break;
            case "image/png":
                type = Type.png;
                break;
            case "video/x-matroska":
                type = Type.mkv;
                break;
            default:
                console.warn(`Unknown blob type: ${blobType}`);
                type = Type.unknown;
                break;
            }
            return type;
        };

        File.getType = function(blob)
        {
            return new Promise((resolve, reject) => {
                let fr = new FileReader();
                fr.onloadend = function(e) 
                {
                    // only grab first 4 bytes
                    let arr = (new Uint8Array(e.target.result)).subarray(0, 4);
                    
                    // convert bytes to hex string
                    let header = "";
                    for (let i = 0; i < arr.length; i++)
                        header += arr[i].toString(16);
                    
                    // get file signature type based on hex string
                    let type;
                    switch (header) 
                    {
                    case "89504e47":
                        type = Type.png;
                        break;

                    case "47494638":
                        type = Type.gif;
                        break;

                    case "ffd8ffe0":
                    case "ffd8ffe1":
                    case "ffd8ffe2":
                    case "ffd8ffe3":
                    case "ffd8ffe8":
                        type = Type.jpg;
                        break;

                    default:
                        type = Type.unknown;
                        break;
                    }

                    // return blob type and file signature type
                    resolve(Type.toType(blob.type), type);
                };
                fr.onerror = function(e)
                {
                    reject(e);
                };
                fr.readAsArrayBuffer(blob);
            });
        };
    });
})();