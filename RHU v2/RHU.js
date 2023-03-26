/**
 * RHU - Random HTML Utility
 * @randomuserhi.github.io
 */

"use strict";

{

    // Core sub-library for functionality pre-RHU
    let core = {
        exists: function(obj)
        {
            return obj !== null && obj !== undefined;    
        },
        parseOptions: function(template, opt)
        {
            if (!this.exists(opt)) return template;
            if (!this.exists(template)) return template;
            
            let result = template;
            Object.assign(result, opt);
            return result;
        },
        dependencies: function(_opt = {})
        {
            let opt = { 
                module: "Module",
                hard: [], 
                soft: []
            };
            this.parseOptions(opt, _opt);

            function check(items)
            {
                let has = [];
                let missing = [];
                for (let path of items)
                {
                    let traversal = path.split(".");
                    let obj = window;
                    for (; traversal.length !== 0; obj = obj[traversal.shift()]) {}
                    if (obj !== null && obj !== undefined)
                        has.push(path)
                    else
                        missing.push(path)
                }
                return {
                    has: has,
                    missing: missing
                };
            }

            let hard = check(opt.hard);
            if (hard.missing.length !== 0)
            {
                for (let dependency of hard.missing)
                {
                    console.error(`Missing dependency '${dependency}'.`);
                }
                throw new Error(`${opt.module} had missing dependencies.`);
            }

            let soft = check(opt.soft);

            return {
                info: {
                    has: [...hard.has, ...soft.has],
                    missing: soft.missing
                },
                has: function(dependency)
                {
                    return this.info.has.includes(dependency);
                }
            }
        }
    }

    // Check for dependencies
    core.dependencies({
        module: "RHU",
        hard: [
            "document",
            "document.createElement"
        ]
    });

    {
        // Initialize RHU
        if (window.RHU)
        {

        }
        else
        {
            window.RHU = {};
        }

        // Meta
        RHU.version = "1.0.0";

        // Dynamic script loader
        (function(RHU)
        {
        
            RHU.loader = {
                JS: {
                    
                }
            };
        
        })(RHU);

        // Core
        (function(RHU)
        {

            RHU.exists = function(obj)
            {
                return obj !== null && obj !== undefined;
            };
        
        })(RHU);
    }

}