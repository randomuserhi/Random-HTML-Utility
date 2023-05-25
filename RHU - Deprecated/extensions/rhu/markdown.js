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
            this.options = defaultReaderOpt;
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
        Reader.prototype.peek = function(length = 1)
        {
            let res = "";
            for (let i = 0; i < length; ++i)
            {
                let c = this.text[this.head.i];
                if (!RHU.exists(c)) break;
                res += c;
            }
            return res;
        };
        Reader.prototype.read = function(length = 1)
        {
            let res = "";
            for (let i = 0; i < length; ++i)
            {
                let c = this.text[this.head.i];
                if (!RHU.exists(c)) break;
                res += c;
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
            }
            return res; 
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
        // If re matches at current position in the subject, advance
        // position in subject and return the match; otherwise return null.
        Reader.prototype.match = function(re)
        {
            let match = re.exec(this.text.slice(this.head.i));
            if (match === null) return null;
            this.read(match.index + match[0].length);
            return match[0];
        };

        let __Node__ = function(name, sourceRef = undefined)
        {
            this.name = name;
            this.sourceRef = sourceRef;
            this.children = [];
        };
        RHU.definePublicAccessors(__Node__.prototype, {
            first: {
                get: function() { return first(this.children); }
            },
            last: {
                get: function() { return last(this.children); }
            }
        });
        __Node__.prototype.push = function(...args)
        {
            return this.children.push(...args);
        };
        __Node__.prototype.is = function(constructor)
        {
            // TODO(randomuserhi): Maybe test if object is a constructor RHU.isConstructor?
            return Object.prototype.isPrototypeOf.call(constructor.prototype, this);
        };
        __Node__.is = function(target, constructor)
        {
            if (target === constructor) return true;
            return Object.prototype.isPrototypeOf.call(constructor, target);
        };

        let documentBlock = Symbol("Document Block");
        let Document = function()
        {
            __Node__.call(this, documentBlock);
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
        Document.prototype.canContain = function(block)
        {
            return true;
        }
        Document.prototype.acceptsLines = false;
        Document.prototype.acceptsBlocks = true;
        Document.prototype.allowLazyContinuation = false;
        Document.prototype.allowInlineParsing = false;
        RHU.inherit(Document, __Node__);

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
         *
         * NOTE(randomuserhi): Inline refers to inside blocks. Inline blocks are refered to as
         *                     Nodes to differentiate them from blocks.
         */

        let Node = function(name = "Node", sourceRef = undefined)
        {
            __Node__.call(this, name, sourceRef);
        }
        RHU.inherit(Node, __Node__);
        RHU.definePublicAccessor(Markdown, "Node", {
            get: function() { return Node; }
        });

        let textNode = Symbol("Text Node");
        let TextNode = function()
        {
            Node.call(this, textNode);

            this.text = "";
        };
        TextNode.prototype.addText = function(text)
        {
            this.text += text;
        };
        RHU.inherit(TextNode, Node);

        let InlineParser = Markdown.InlineParser = function(schema, options = undefined)
        {
            this.schema = schema;

            this.options = {
            };
            Object.assign(this.options, defaultReaderOpt);
            RHU.parseOptions(this.options, options);

            // Set default text node
            this.TextNode = TextNode;
            if (RHU.exists(this.schema[textNode]))
                this.TextNode = this.schema[textNode];
        };
        InlineParser.prototype.addNode = function(node)
        {
            // TODO(randomuserhi): Set sourceRef of node based on this.reader
            last(this.stack).push(node)
            this.stack.push(node);
        };
        InlineParser.prototype.parse = function(text, doc = undefined)
        {
            this.doc = RHU.exists(doc) ? doc : new Document();
            this.reader = new Reader(text, this.options);
            this.stack = [this.doc]; // Node stack => top of the stack is the node you are currently inside

            // NOTE(randomuserhi): infinite loops can be caused if schema
            //                     fails to consume characters to get the reader to continue
            //                     We don't check or error out in case it is done with intention
            //                     by the schema designer. 
            let c;
            let run = ""; // stores a run of ongoing characters that are not matched
            while ((c = this.reader.peek()) !== "")
            {
                let noMatch = true;
                let node = last(this.stack); // Store the node/block we are in prior to adding new nodes from schema
                for (let match of this.schema.matches)
                {
                    // TODO(randomuserhi): Test of .call vs .bind in constructor then call here
                    if (match.call(this))
                    {
                        // Append the run of ongoing characters to last node/block we were in as a text node
                        //
                        // Has to be done to the last node we were in rather than current since the
                        // buffer of ongoing text is not within the new node schema may have created.
                        if (run !== "")
                        {
                            let text = new this.TextNode();
                            text.addText(run);
                            run = "";
                            node.push(text);
                        }
                        node = last(this.stack);
                        noMatch = false;
                    }
                }
                // If no matches were made by the schema, append character to buffer and continue. 
                if (noMatch)
                    run += this.reader.read();
            };
            // If we still have ongoing characters in the buffer, append them to the node we are in as a text node 
            if (run !== "")
            {
                let text = new this.TextNode();
                text.addText(run);
                run = null;
                last(this.stack).push(text);
            }

            return this.doc;
        };

        // TODO(randomuserhi): Testing => to be removed
        {
            let emphasisNode = function()
            {
                Node.call(this, "emphasisNode");
            };

            let schema = {
                matches: [
                    function asterisk()
                    {
                        if (this.reader.peek() === "*")
                        {
                            this.reader.read();
                            return true;
                        }
                        return false;
                    }
                ]
            };
            let parser = new InlineParser(schema);
            console.log(parser.parse("***bold** italics* ```code```"));
            // NOTE(randomuserhi):
            // ~~~
            // ...
            // ~~~
            // is a code block, but ~~text~~ is strikethrough
        }

        /**
         * Block Parser => Takes block rules from schema and parses with them
         */

        let Block = function(name = "Block", sourceRef = undefined) 
        {
            __Node__.call(this, name, sourceRef);

            this.raw = "";
            this.acceptsLines = true;
            this.acceptsBlocks = true;
            this.allowLazyContinuation = true;
            this.allowInlineParsing = true;
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
        Block.prototype.addText = function(text)
        {
            // TODO(randomuserhi): Account for indentation, new line etc...
            this.raw += text;
        };
        Block.prototype.canContain = function(block)
        {
            return true;
        };
        RHU.inherit(Block, __Node__);
        RHU.definePublicAccessor(Markdown, "Block", {
            get: function() { return Block; }
        });

        let ParagraphBlock = function()
        {
            Block.call(this, "paragraph");
        };
        ParagraphBlock.prototype.continue = function(reader) 
        {
            if (re.blank.test(reader.peek()))
                return Block.NO_MATCH;
            return Block.MATCH;
        };
        ParagraphBlock.prototype.canContain = function(block)
        {
            return false;
        }
        RHU.inherit(ParagraphBlock, Block);
        RHU.definePublicAccessor(Markdown, "ParagraphBlock", {
            get: function() { return ParagraphBlock; }
        });

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

        let BlockParser = Markdown.BlockParser = function(schema, options = undefined)
        {
            // Set default paragraph block
            this.ParagraphBlock = ParagraphBlock;
            if (RHU.exists(schema.paragraph))
                this.ParagraphBlock = schema.paragraph;

            let blocks = schema.blocks.filter((t) => {
                let isParagraphBlock = Block.is(t, this.ParagraphBlock);
                if (isParagraphBlock)
                    console.warn("Paragraph block cannot be part of the Types list for schema.");
                return !isParagraphBlock;
            });

            this.schema = [];
            for (let i = 0; i < blocks.length; ++i)
            {
                let block = blocks[i];

                if (!RHU.exists(block.precedence))
                    throw new Error(`Block '${block.name}' does not have an assigned precedence value.`);

                this.schema.push({
                    block: block,
                    order: i
                });
            }
            this.schema.sort((a, b) => {
                return a.block.precedence - b.block.precedence;
            });

            this.options = {
            };
            Object.assign(this.options, defaultReaderOpt);
            RHU.parseOptions(this.options, options);
        };
        BlockParser.prototype.addBlock = function(block)
        {
            // TODO(randomuserhi): Set sourceRef of block based on this.reader
            while (this.stack.length > 0)
            {
                let current = last(this.stack);
                if (current.canContain(block))
                {
                    current.push(block)
                    this.stack.push(block);
                    return;
                }
                else
                    this.stack.pop().close();
            }
            throw new Error("Unreachable");
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

            // NOTE(randomuserhi): infinite loops can be caused if schema
            //                     fails to consume characters to get the reader to continue
            //                     (since characters are not consumed, the same block can continously be started)
            //                     We don't check or error out in case it is done with intention
            //                     by the schema designer.
            let matched = false;
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
                let matches = [];
                for (let i = 0; i < this.schema.length; ++i)
                {
                    let block = this.schema[i].block;
                    let order = this.schema[i].order;
                    // TODO(randomuserhi): Test of .call vs .bind in constructor then call here
                    if (block.match.call(this))
                    {
                        matches.push(block);
                        
                        // If next block is not of same precedence, we can stop.
                        if (this.schema.length === 1 || 
                            (i + 1 < this.schema.length &&
                             block.precedence !== this.schema[i + 1].block.precedence))
                        {
                            break;
                        }
                    }
                }

                // No blocks were added, proceed
                if (matches.length === 0)
                    break;
                else
                {
                    matched = true;

                    // If only 1 match occured then start block
                    if (matches.length === 1)
                    {
                        matches[0].start.call(this);
                    }
                    else if (matches.length > 1) // Handle multiple matches
                    {
                        // Sort by tie break and order if tie break isn't available 
                        matches.sort((a, b) => {
                            let aq = RHU.exists(a.block.quality) ? a.block.quality() : -1;
                            let bq = RHU.exists(b.block.quality) ? b.block.quality() : -1;
                            // TODO(randomuserhi): check if this order is correct
                            if (aq === bq) return a.order - b.order;
                            else return bq - aq; // sort by largest quality score
                        });

                        // Choose best match
                        matches[0].start.call(this);
                    }
                }
            }

            // What remains at the offset is a text line.  Add the text to the
            // appropriate container.

            // First check for a lazy paragraph continuation:
            // `!matched` => check that we didn't match with a block. Blocks cannot lazily continue of another block
            // `last(this.stack) !== last(stack)` => checks if we have exited the block, as if we are still inside the same block
            //                                       as before then how can we have a lazy continuation? (We are simply continuing
            //                                       the block as normal if we were still inside the same block)
            // `!re.blank.test(this.reader.peek())` => checks if the text isn't blank
            // `last(stack).allowLazyContinuation()` => check if the block allows lazy continuation
            if (!matched && last(this.stack) !== last(stack) && !re.blank.test(this.reader.peek()) && last(stack).allowLazyContinuation) 
            {
                // Reset stack as the line was part of a lazy continuation
                this.stack = stack;

                // lazy paragraph continuation
                last(this.stack).addText(this.reader.readToEndLine());
            }
            else // Not lazy continuation
            {
                // Close unmatched blocks from stack
                for (let i = slice; i < stack.length; ++i)
                    stack[i].close();

                if (last(this.stack).acceptsLines) 
                {
                    last(this.stack).addText(this.reader.readToEndLine());
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
                        this.addBlock(new this.ParagraphBlock());
                        last(this.stack).addText(line);
                    }
                }
            }
        };
        BlockParser.prototype.parse = function(text, doc = undefined)
        {
            this.doc = RHU.exists(doc) ? doc : new Document();
            this.reader = new Reader(text, this.options);
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
            console.log("Testing block parser");
            // NOTE(randomuserhi): Information, such as for refMap, can be written to the doc node aka `this.doc`
            let HeaderBlock = function(sourceRef = undefined)
            {
                Markdown.Block.call(this, "header", sourceRef);

                this.acceptsBlocks = false;
                this.acceptsLines = true;
                this.allowLazyContinuation = false;
            };
            HeaderBlock.precedence = 1;
            HeaderBlock.quality = function() {};
            HeaderBlock.match = function() 
            {
                return this.reader.peek() === "#";
            };
            HeaderBlock.start = function()
            {
                this.reader.read(); // consume letter
                this.reader.nextNonSpace();
                let block = new HeaderBlock();
                this.addBlock(block);
            };
            HeaderBlock.prototype.continue = function(reader)
            {
                /*if (reader.peek() === "#")
                {
                    reader.read(); // consume to get block to continue, otherwise block start will occure again
                    return Block.MATCH;
                }
                return Block.NO_MATCH;*/
                return Block.NO_MATCH;
            };
            RHU.inherit(HeaderBlock, Markdown.Block);

            // TODO(randomuserhi): Make indent take into account number of spaces as well,
            //                     handle indents inside of indents etc...
            let IndentBlock = function(sourceRef = undefined)
            {
                Markdown.Block.call(this, "indent", sourceRef);

                this.acceptsBlocks = true;
                this.acceptsLines = false;
            };
            IndentBlock.precedence = 2;
            IndentBlock.quality = function() {};
            IndentBlock.match = function() 
            {
                return this.reader.peek() === "\t";
            };
            IndentBlock.start = function()
            {
                this.reader.read(); // consume letter
                this.reader.nextNonSpace();
                let block = new IndentBlock();
                this.addBlock(block);
            };
            IndentBlock.prototype.continue = function(reader)
            {
                if (reader.peek() === "\t")
                {
                    reader.read(); // consume letter
                    return Block.MATCH;
                }
                return Block.NO_MATCH;
            };
            RHU.inherit(IndentBlock, Markdown.Block);

            let CodeBlock = function(sourceRef = undefined)
            {
                Markdown.Block.call(this, "code", sourceRef);

                this.acceptsBlocks = false;
                this.acceptsLines = true;
                this.allowLazyContinuation = false;
                this.allowInlineParsing = false;
            };
            CodeBlock.precedence = 3;
            CodeBlock.quality = function() {};
            CodeBlock.match = function() 
            {
                return this.reader.peek() === "`";
            };
            CodeBlock.start = function()
            {
                this.reader.read(); // consume letter
                this.reader.nextNonSpace();
                let block = new CodeBlock();
                this.addBlock(block);
            };
            CodeBlock.prototype.continue = function(reader)
            {
                if (reader.peek() === "`")
                {
                    reader.read(); // consume letter
                    return Block.NO_MATCH;
                }
                return Block.MATCH;
            };
            RHU.inherit(CodeBlock, Markdown.Block);

            let schema = {
                blocks: [
                    HeaderBlock,
                    IndentBlock, 
                    CodeBlock
                ]
            };
            let test = new BlockParser(schema);
            let ast = test.parse("# well\n***this** is* a test:\n\n\tnice!\nindent!\n# cool\n`damnson\nwoah\ncrazy\n`\nreal stuff");
            console.log(ast);
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