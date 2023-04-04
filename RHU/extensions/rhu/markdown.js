(function() {
    "use strict";

    //TODO(randomuserhi): Write a compiler and split up this code cause its hard to manage otherwise
    //TODO(randomuserhi): Write API to work both in a synchronous setting and a
    //                    asynchronous setting with WebWorkers

    let RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module({ module: "x-rhu/markdown", trace: new Error(), hard: [], soft: ["Worker"] }, function()
    {
        if (RHU.exists(RHU.Markdown))
            console.warn("Overwriting RHU.Markdown...");

        let Markdown = RHU.Markdown = {};

        /**
         * Regex utility
         */

        let re = Markdown.re = {};
        let aux = Markdown.re.aux = {};

        // Auxilary regex strings
        

        // Regex
        re.blank = /\n|\r|^$/;
        re.newLine = /\r\n|\n|\r/;
        re.tab = /\t/g;
        
        /**
         * Utility
         */

        let last = function(arr)
        {
            return arr[arr.length - 1];
        };
        let first = function(arr)
        {
            return arr[0];
        };

        let SourcePos = function(i = 0, ln = 0, idx = 0, col = 0)
        {
            this.i = i; // character position in text
            this.ln = ln; // line position in text
            this.idx = idx; // character position in line
            this.col = col; // column position (takes into account size of tab)
        };
        SourcePos.copy = function(pos)
        {
            return new SourcePos(pos.i, pos.ln, pos.idx, pos.col);
        };
        SourcePos.prototype.copy = function(pos)
        {
            Object.assign(this, pos);
        };
        let SourceRef = function(start, end = undefined)
        {
            this.start = start;
            this.end = end;
        };

        let defaultReaderOpt = {
            tabSize: 4
        };
        let Reader = function(text, options = defaultReaderOpt)
        {
            this.options = {
                tabSize: 4
            };
            RHU.parseOptions(this.options, options);
            this.text = text;
            // Standardise new line all to \n
            this.text.replace(re.newLine, "\n");
            this.lines = text.split("\n");

            this.head = this.start;
        };
        Reader.colLength = function(line)
        {
            return line.length + line.match(re.tab).length * (this.options.tabSize - 1);
        };
        Reader.prototype[Symbol.iterator] = function* ()
        {
            for (let pos = this.start; 
                 pos.ln < this.lines.length; 
                 pos.i += this.lines[pos.ln++].length + 1)
            {
                this.head.copy(pos);
                yield this.lines[pos.ln];
            }
        };
        RHU.definePublicAccessors(Reader.prototype, {
            start: {
                get: function() 
                { 
                    return new SourcePos();
                }
            },
            end: {
                get: function() 
                { 
                    let lastLine = last(lines);
                    return new SourcePos(text.length, this.lines.length - 1, lastLine.length, Reader.colLength(lastLine));
                }
            },
            first: {
                get: function()
                {
                    return this.start();
                }
            },
            last: {
                get: function()
                {
                    let lastLine = last(lines);
                    return new SourcePos(text.length - 1, this.lines.length - 1, lastLine.length - 1, Reader.colLength(lastLine.slice(0, lastLine.length - 1)));
                }
            },
            line: {
                get: function()
                {
                    return this.lines[this.head.ln];
                }
            }
        });
        Reader.prototype.peek = function()
        {
            let c = this.text[this.head.i];
            if (!RHU.exists(c)) return null;
            return c;
        };
        Reader.prototype.read = function()
        {
            let c = this.text[this.head.i];
            if (!RHU.exists(c)) return null;
            ++this.head.i;
            if (re.newLine.test(c))
            {
                ++this.head.ln;
                this.head.col = 0;
                this.head.idx = 0;
            }
            else if (re.tab.test(c))
            {
                ++this.head.idx;
                this.head.col += this.options.tabSize - (this.head.col % this.options.tabSize);
            }
            else
            {
                ++this.head.idx;
                ++this.head.col;
            }
            return c; 
        };
        Reader.prototype.readToEndLine = function()
        {
            let idx = this.head.idx;
            let line = this.lines[this.head.ln];
            this.head.i += line.length - idx + 1; // Add 1 to account for new line character 
            ++this.head.ln;
            this.head.col = 0;
            this.head.idx = 0;
            return line.slice(idx);
        };
        Reader.prototype.nextNonSpace = function()
        {
            let c;
            while(RHU.exists(c = this.peek())) {
                if (c !== " ") break; // TODO(randomuserhi): Consider converting to regex for non whitespace
                else this.read();
            };
        };

        let documentBlock = Symbol("Document Block");
        let paragraphBlock = Markdown.paragraphBlock = Symbol("Paragraph Block");
        let Node = function(type, sourceRef = undefined)
        {
            this.type = type;
            this.sourceRef = sourceRef;
            this.children = [];

            this.content = "";
        };
        Node.prototype.first = function()
        {
            return first(this.children);
        };
        Node.prototype.last = function()
        {
            return last(this.children);
        };
        Node.prototype.push = function(...args)
        {
            return this.children.push(...args);
        };
        Node.prototype.addLine = function(line)
        {
            // TODO(randomuserhi): Add line to this.content and handle tabs / indents approapriately
            this.content += line; // Test line => to be removed.
            console.warn("Not Implemented.");
        };

        let Document = function()
        {
            Node.call(this, documentBlock);
            this.sourceRef = new SourceRef(new SourcePos());
        };
        Document.prototype.close = function()
        {
            let i = undefined, ln = undefined, idx = undefined, col = undefined;
            this.sourceRef.end = new SourcePos(i, ln, idx, col);
        };
        Document.prototype.continue = function()
        {
            return Block.MATCH;
        };
        Document.prototype.acceptsLines = false;
        Document.prototype.acceptsBlocks = true;
        Document.prototype.allowLazyContinuation = false;
        Document.prototype.allowInlineParsing = false;
        RHU.inherit(Document, Node);

        /**
         * Schema
         *
         * - Should be able to make custom markdown style schemas 
         *   - Specialized for markdown, so rules for actual code languages should not apply
         * - Provide a default schema that contains rulesets for standard markdown like:
         *   - links
         *   - italics and bolc
         *   - headings
         *   etc...
         * 
         * - Blank schema literally shouldnt do anything
         */

        let Schema = Markdown.Schema = function()
        {
            // block and inline rules that describe this markdown scheme
            this.blocks = Map();
            this.inlines = Map();
        };

        Schema.Block = function()
        {

        };

        Schema.Inline = function()
        {

        };

        /**
         * Inline Parser => Takes inline rules from schema and parses with them
         */

        let InlineParser = Markdown.InlineParser = function(schema)
        {
            //throw new Error("Not Implemented.");
        };
        InlineParser.prototype.parse = function(text, meta)
        {
            if (!RHU.exists(meta)) meta = {};
            this.doc = RHU.exists(meta.doc) ? meta.doc : new Document();
            this.reader = RHU.exists(meta.reader) ? meta.reader : new Reader(text);
            this.stack = [this.doc]; // Block stack => top of the stack is the block you are currently inside

            //throw new Error("Not Implemented.");

            return this.doc;
        };

        // TODO(randomuserhi): Testing => to be removed
        {
            let schema = {

            };
            let parser = new InlineParser(schema);
            console.log(parser.parse("***bold** italics* ```code```"));
        }

        /**
         * Block Parser => Takes block rules from schema and parses with them
         */

        let Block = function(type, sourceRef = undefined) 
        {
            Node.call(this, type, sourceRef);
        };
        Block.prototype.bind = function(parser)
        {
            let definitions = parser.schema.definitions;

            this.continue = definitions[this.type].continue.bind(this);
            
            if (RHU.exists(definitions[this.type].init))
                this.init = definitions[this.type].init.bind(this);
            if (RHU.exists(definitions[this.type].close))
                this.finalize = definitions[this.type].close.bind(this);

            let properties = ["acceptsLines", "acceptsBlocks", "allowLazyContinuation", "allowInlineParsing"];
            for (let prop of properties)
            {
                if (RHU.exists(definitions[this.type][prop])) 
                    this[prop] = definitions[this.type][prop];
            }
            return this;
        };
        Block.prototype.close = function()
        {
            if (RHU.exists(this.sourceRef))
            {
                let i = undefined, ln = undefined, idx = undefined, col = undefined;
                this.sourceRef.end = new SourcePos(i, ln, idx, col);
            }

            if (RHU.exists(this.finalize)) this.finalize();
        };
        Block.prototype.addLine = function(line)
        {
            if (this.acceptsLines) 
                Node.prototype.addLine.call(this, line);
        };
        Block.prototype.init = function(meta) 
        { 
            Object.assign(this, meta);
        };
        Block.prototype.acceptsLines = true;
        Block.prototype.acceptsBlocks = true;
        Block.prototype.allowLazyContinuation = true;
        Block.prototype.allowInlineParsing = true;
        RHU.inherit(Block, Node);

        /**
         * NOTE(randomuserhi): There are 2 types of blocks:
         *                     - Regular blocks
         *                     - Fenced blocks
         *                     Regular blocks are defined by each line of its content containing some symbol
         *                     - E.g comment blocks are lines beginning with '>' character
         *                     Fenced blocks are defined by being enclosed between "fences". 
         *                     - E.g code blocks are defined by content in between '```'
         *                     These 2 blocks are managed using the same state system
         *                     - START => the block begins
         *                             => signalled by opening fence for fenced blocks or first match for regular blocks
         *                     - END => the block ends
         *                           => only used by fence blocks since they have a clear defined end
         *                     - MATCH => the content matches the requirements to be within the block
         *                             => for fenced blocks, as long as it is open all inner content matches
         *                             => the first match for a regular block counts as its block start
         *                     - NO_MATCH => the content does not match the requirements ot be within the block
         *                                => only used by regular blocks since they have a requirement that needs matching
         *                                   unlike fenced blocks which just needs to be within its fences.
         */
        Block.START = 0;
        Block.END = 3;
        Block.MATCH = 1;
        Block.NO_MATCH = 2;

        Markdown.Block = {};
        RHU.definePublicAccessors(Markdown.Block, {
            START: {
                get: function() { return Block.START; }
            },
            END: {
                get: function() { return Block.END; }
            },
            MATCH: {
                get: function() { return Block.MATCH; }
            },
            NO_MATCH: {
                get: function() { return Block.NO_MATCH; }
            }
        });

        let BlockParser = Markdown.BlockParser = function(schema)
        {
            this.schema = schema;

            // Add default paragraph block to schema
            // TODO(randomuserhi): Add ability to override `close` method for handling things like reference definitions
            let paragraph = {
                continue: function(reader) 
                {
                    if (re.blank.test(reader.peek()))
                        return Block.NO_MATCH;
                    return Block.MATCH;
                },
                acceptsBlocks: true,
                acceptsLines: true,
                allowLazyContinuation: true,
                allowInlineParsing: true
            };
            this.schema.definitions[paragraphBlock] = RHU.parseOptions(paragraph, schema.definitions[paragraphBlock]);
            this.schema.types = this.schema.types.filter((t) => {
                if (t === paragraphBlock)
                    console.warn("Paragraph block cannot be part of the Types list for schema.");
                return t !== paragraphBlock
            });

            this.Block = (type, sourceRef = undefined) => {
                return new Block(type, sourceRef).bind(this);
            };
        };
        BlockParser.prototype.addBlock = function(block)
        {
            // TODO(randomuserhi): Set sourceRef of block based on this.reader
            // TODO(randomuserhi): Account for canContain => function that returns true if the current block (last(stack))
            //                                               accepts the block being added.
            //                                               If not, close the block and attempt to add again on parent
            last(this.stack).push(block)
            this.stack.push(block);
        };
        BlockParser.prototype.parseLine = function(line)
        {
            // replace NUL characters for security
            if (line.indexOf("\u0000") !== -1) {
                line = line.replace(/\0/g, "\uFFFD");
            }

            this.reader.nextNonSpace();

            // Check which blocks in stack are still matched
            let slice = 0; //slice contains the index of the block that failed to match
            for (; slice < this.stack.length; ++slice)
            {
                let block = this.stack[slice];

                let noMatch = false;
                switch(block.continue(this.reader))
                {
                case Block.MATCH: // we've matched, keep going
                    break;
                case Block.NO_MATCH: // we've failed to match a block
                    noMatch = true;
                    break;
                case Block.END: // we've hit end of line for fenced code close and can return
                    return;
                default:
                    throw new Error("block.continue() returned illegal value.");
                }
                if(noMatch) break;
            }
            // Create a copy of the stack incase this line is part of a lazy continuation
            let stack = [...this.stack];
            this.stack.splice(slice);

            while(last(this.stack).acceptsBlocks)
            {
                // TODO(randomuserhi): Implement this?? => Need a way of recognising special characters from schema
                // this is a little performance optimization:
                /*if (
                    !this.indented &&
                    !reMaybeSpecial.test(ln.slice(this.nextNonspace))
                ) {
                    this.advanceNextNonspace();
                    break;
                }*/

                // Iterate over each blocks start condition
                let blockAdded = false;
                for (let type of this.schema.types)
                {
                    if (this.schema.definitions[type].start.call(this, type))
                    {
                        blockAdded = true;
                        break;
                    }
                }

                // No blocks were added, proceed
                if (!blockAdded)
                    break;
            }

            // What remains at the offset is a text line.  Add the text to the
            // appropriate container.

            // First check for a lazy paragraph continuation:
            // `last(this.stack) !== last(stack)` => checks if we have exited the block, as if we are still inside the same block
            //                                       as before then how can we have a lazy continuation? (We are simply continuing
            //                                       the block as normal if we were still inside the same block)
            // `!re.blank.test(this.reader.peek())` => checks if the text isn't blank
            // `last(stack).allowLazyContinuation()` => check if the block allows lazy continuation
            if (last(this.stack) !== last(stack) && !re.blank.test(this.reader.peek()) && last(stack).allowLazyContinuation) 
            {
                // Reset stack as the line was part of a lazy continuation
                this.stack = stack;

                // lazy paragraph continuation
                last(this.stack).addLine(this.reader.readToEndLine());
            }
            else // Not lazy continuation
            {
                // Close unmatched blocks from stack
                for (let i = slice; i < stack.length; ++i)
                    stack[i].close();
                
                if (last(this.stack).acceptsLines) 
                {
                    last(this.stack).addLine(this.reader.readToEndLine());
                    /* TODO(randomuserhi): Move this into HTML block Block.END condition
                    // if HtmlBlock, check for end condition
                    if (
                        t === "html_block" &&
                        container._htmlBlockType >= 1 &&
                        container._htmlBlockType <= 5 &&
                        reHtmlBlockClose[container._htmlBlockType].test(
                            this.currentLine.slice(this.offset)
                        )
                    ) {
                        this.lastLineLength = ln.length;
                        this.finalize(container, this.lineNumber);
                    }*/
                } 
                else
                {
                    let line = this.reader.readToEndLine();
                    if (!re.blank.test(line)) // Check that the line to add isn't blank
                    {
                        // create paragraph container for line
                        this.addBlock(this.Block(paragraphBlock));
                        last(this.stack).addLine(line);
                    }
                }
            }
        };
        BlockParser.prototype.parse = function(text, meta = undefined)
        {
            if (!RHU.exists(meta)) meta = {};
            this.doc = RHU.exists(meta.doc) ? meta.doc : new Document();
            this.reader = RHU.exists(meta.reader) ? meta.reader : new Reader(text);
            this.stack = [this.doc]; // Block stack => top of the stack is the block you are currently inside

            // parse logic
            for (let line of this.reader)
                this.parseLine(line);

            // close any hanging blocks
            while (this.stack.length !== 0)
                this.stack.pop().close();
        
            return this.doc;
        };

        {
            let schema = {
                types: ["header"], // Important cause it also declares precedence
                definitions: {
                    "header": {
                        start: function(type)
                        {
                            if (this.reader.peek() === "#")
                            {
                                this.reader.read(); // consume letter
                                this.reader.nextNonSpace();
                                let block = this.Block(type);
                                this.addBlock(block);
                                return true;
                            }
                            return false;
                        },
                        continue: function(reader)
                        {
                            /*if (reader.peek() === "#")
                            {
                                reader.read(); // consume to get block to continue, otherwise block start will occure again
                                return Block.MATCH;
                            }
                            return Block.NO_MATCH;*/
                            return Block.NO_MATCH;
                        },
                        acceptsBlocks: false,
                        acceptsLines: true,
                        allowLazyContinuation: false
                    }
                }
            };
            let test = new BlockParser(schema);
            console.log(test.parse("# well\n***this** is* a test:\n\nnice!\n\n\ncrazy"));
        }

        /**
         * Markdown Parser => Takes a schema and constructs the inline and block parsers
         *                 => Creates a AST for provided plaintext based on schema
         */

        let Parser = Markdown.Parser = function(schema)
        {
            if (RHU.exists(schema))
            {
                this.blockParser = new BlockParser(schema);
                this.inlineParser = new inlineParser(schema); 
            }
        };
        Parser.prototype.parse = function(text)
        {
            if (!RHU.exists(this.blockParser) || !RHU.exists(this.inlineParser))
                throw new Error("Parser does not have a block or inline parser.");

            // Setup document node
            // - Assign end point for sourceRef
            let doc = new Document();
            let reader = new Reader(text);
            let meta = {
                doc: doc,
                reader: reader
            };
            doc.sourceRef.end = reader.end;

            this.blockParser.parse(text, meta);
            this.inlineParser.parse(text, meta);
            
            return doc;
        };
    });
})();