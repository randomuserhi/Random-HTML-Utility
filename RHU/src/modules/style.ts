(function() {
    
    let RHU: RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.import(RHU.module({ trace: new Error(),
        name: "rhu/style", hard: [],
        callback: function()
        {
            if (RHU.exists(RHU.Style))
                console.warn("Overwriting RHU.Style...");

            type CSSStyle<T extends {} = {}> = RHU.Style.CSSStyle<T>;
            type CSSMediaQuery<T extends {} = {}> = RHU.Style.CSSMediaQuery<T>;

            // TODO(randomuserhi): cleanup code => styleHandler and root handler are very similar in logic, just slightly different...

            interface propHandlerOptions
            {
                enter?: (prop: PropertyKey) => void;
                exit?: (prop: PropertyKey, value: any) => void;
            }

            // TODO(randomuserhi): Documentation => general idea is that it generates a style object tree calling enter and exit callbacks as it traverses the object
            //                                      exit is only called on complete style class nodes for processing
            // TODO(randomuserhi): Consider just dunking it into the main prop handler if this code doesn't get reused cause currently there is no point having it customizable
            let propStack: { prop: PropertyKey, value: any }[] = [];
            let propHandler = function(target: any, prop: PropertyKey, newValue: any, options?: propHandlerOptions): boolean
            {
                let opt: propHandlerOptions = {
                    enter: undefined,
                    exit: undefined,
                }
                RHU.parseOptions(opt, options);

                let ctx: { prop: PropertyKey, value: any } = {
                    prop: prop,
                    value: undefined,
                };
                propStack.push(ctx);

                if (typeof newValue === 'object' && newValue !== null)
                {
                    if (!RHU.exists(target[prop])) 
                    {
                        if ((typeof prop === 'string' || (prop as any) instanceof String) 
                            && /__[_$a-zA-Z0-9]*__/g.test(prop as string))
                        {
                            ctx.value = newValue;
                        }
                        else
                        {
                            ctx.value = new Proxy({}, styleHandler);

                            if (RHU.exists(opt.enter)) opt.enter(ctx.prop);

                            for (let [key, value] of Object.entries(newValue))
                            {
                                ctx.value[key] = value;
                            }

                            if (RHU.exists(opt.exit)) opt.exit(ctx.prop, ctx.value);
                        }
                    }
                    target[prop] = ctx.value;
                }
                else
                {
                    ctx.value = newValue;
                    target[prop] = ctx.value;
                }

                propStack.pop();

                return true;
            };
            let styleHandler: ProxyHandler<any> = {
                set: function(target, prop, newValue)
                {
                    return propHandler(target, prop, newValue, {
                        enter: (prop) => {
                            console.log(`enter ${String(prop)}`);
                        },
                        exit: (prop, value) => {
                            console.log(`exit ${String(prop)}`);
                            console.log(value);
                        }
                    });
                }
            };

            // Type aliases for private symbol properties
            let Style = RHU.Style = function<T extends RHU.Style.DeclarationSchema<RHU.Style.CSSAll>>(generator: (root: CSSStyle<T>) => void): ReadOnly<T>
            {
                let style = {};
                let proxy = new Proxy(style, styleHandler);
                generator(proxy as CSSStyle<T>);
                return style as ReadOnly<T>;
            } as Function as RHU.Style;

            Style.mediaQuery = function<T extends RHU.Style.DeclarationSchema<CSSStyle | CSSMediaQuery>>(generator: (root: CSSMediaQuery<T>) => void): CSSMediaQuery<T>
            {
                // TODO(randomuserhi):
                let style = {};
                let proxy = new Proxy(style, styleHandler);
                generator(proxy as CSSMediaQuery<T>);
                return style as CSSMediaQuery<T>;
            }

            // TODO(randomuserhi): Change type inference so that the returned type from RHU.Style and RHU.mediaQuery etc...
            //                     only accepts classes for use in html
            //                     Given the example below you should not be able to do:
            //                     `style.button[":hover"]` ...
            //                     You also should not be able to do
            //                     `style.button.__style__.display = "none"`
            //                     - honestly its fine to leave it as is, as long as the properties are left readonly and simply used for debugging 
            //                       to print the style object to console
            //                     
            //                     These actions are only prohibitted outside the generator function, thus to make it work I simply
            //                     need to implement a type that can convert an intermediate type:
            //                     `{ button: DeclCSSStyle<{}>, query: DeclMediaQuery<{}> }` to `{ button: CSSStyle, query: MediaQuery }` where 
            //                     CSSStyle / MediaQuery is the internally used type for the generator to have access to __style__ and __query__ 
            //                     properties and DeclCSSStyle / DeclMediaQuery is used externally for exposing specific classes
            //
            //                     This makes the behaviour defined in the sense that styles can't be altered post creation, and the exposed classes
            //                     are simply the string names to be used in html: <div style="`${style.button}`"></div>
            //
            //                     Since typescript can't enforce `{ ":root": {} }` or `{ ":hover" }` for style[":root"] and style[":hover"] access, these
            //                     only cause runtime errors when style[":root"] get is made returning null / undefined. (Or style creation error)

            // NOTE(randomuserhi): Implementation needs to keep track of nested calls to RHU.Style / RHU.MediaQuery since only the outermost one creates a
            //                     <style> element and populates it. Thus nested calls need to execute differently returning the approapriate structure
            //                     for the outermost to generate the <style> element
            //                   
            //                     Something simple like:
            //
            //                     let nested = false;
            //                     function createStyle()
            //                     {
            //                         if (!nested) { nested = true; // create <style> element, handle main generator idk `nested = false;` at the end }
            //                         else { // return defining type like `{ __style__ = { color = "white" } }` }
            //                     }

            // Test code:
            let style = RHU.Style!<{
                button: CSSStyle<{
                    text: CSSStyle;
                }>,
                query: CSSMediaQuery<{
                    mobile: CSSStyle;
                    nested: CSSMediaQuery;
                }>,
            }>((style) => {
                let common: RHU.Style.StyleDeclaration = {
                    color: "aliceblue"
                }
                style.button = {
                    __style__: {
                        display: "flex",
                        border: {
                            borderRadius: 1
                        }
                    },
                    text: {
                        __style__: {
                            display: "block"
                        }
                    },
                    ":hover": {
                        __style__: common
                    }
                }
                // NOTE(randomuserhi): <T> can't be inferred
                /*style.query = RHU.Style!.mediaQuery<{
                    mobile: CSSStyle
                }>(() => ({
                        __query__: "cringe",
                        mobile: {
                            __style__: {

                            }
                        },
                        [`${style.button}`]: {
                            
                        }
                    })
                );*/
                // Version without requirement to infer
                style.query = {
                    __type__: "MEDIA_QUERY",
                    __query__: "cringe",
                    mobile: {
                        __style__: common
                    },
                    nested: {
                        __type__: "MEDIA_QUERY",
                        __query__: "cringe",
                    }
                }

                return style;
            });
            console.log(style);
        }
    }));

})();