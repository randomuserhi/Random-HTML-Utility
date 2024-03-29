(function() {
    
    const RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module(new Error(), "rhu/file",
        {},
        function() {
            const File: RHU.File = {
                Type: {
                    unknown: "unknown",
                    png: "png",
                    gif: "gif",
                    jpg: "jpg",
                    txt: "txt",
                    js: "text/javascript",
                    mp4: "video/mp4",
                    mkv: "video/x-matroska",

                    toType: function(this: RHU.File.Type, blobType: string): string {
                        let type: string;
                        switch (blobType) {
                        case "text/javascript":
                            type = this.js;
                            break;
                        case "video/mp4":
                            type = this.mp4;
                            break;
                        case "image/png":
                            type = this.png;
                            break;
                        case "video/x-matroska":
                            type = this.mkv;
                            break;
                        default:
                            console.warn(`Unknown blob type: ${blobType}`);
                            type = this.unknown;
                            break;
                        }
                        return type;
                    }
                },
            } as RHU.File;

            // obtain an alias for Type since we access it frequently
            const Type: RHU.File.Type = File.Type;

            /**
             * NOTE(randomuserhi): Implementation based on:
             *                     https://stackoverflow.com/questions/18299806/how-to-check-file-mime-type-with-javascript-before-upload/29672957#29672957
             *
             * TODO(randomuserhi): Possibly implement with Promise API (currently uses callbacks)
             * TODO(randomuserhi): Documentation
             * TODO(randomuserhi): Consider FileReader.progress event => https://developer.mozilla.org/en-US/docs/Web/API/FileReader/progress_event
             */

            File.getType = function(blob: Blob): Promise<[string, string]> {
                return new Promise<[string, string]>((resolve, reject) => {
                    const fr = new FileReader();
                    fr.onloadend = function(e) {
                        // only grab first 4 bytes
                        const arr = (new Uint8Array(e.target!.result as ArrayBuffer)).subarray(0, 4);
                        
                        // convert bytes to hex string
                        let header = "";
                        for (let i = 0; i < arr.length; i++)
                            header += arr[i].toString(16);
                        
                        // get file signature type based on hex string
                        let type;
                        switch (header) {
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
                        resolve([Type.toType(blob.type), type]);
                    };
                    fr.onerror = function(e) {
                        reject(e);
                    };
                    fr.readAsArrayBuffer(blob);
                });
            };

            return File;
        }
    );

})();