(function() {
    "use strict";

    //TODO(randomuserhi): Write a compiler and split up this code cause its hard to manage otherwise

    let RHU = window.RHU;
    if (RHU === null || RHU === undefined) throw new Error("No RHU found. Did you import RHU before running?");
    RHU.module({ module: "x-rhu/markdown", trace: new Error(), hard: [] }, function()
    {
        if (RHU.exists(RHU.Markdown))
            console.warn("Overwriting RHU.Markdown...");

        let Markdown = RHU.Markdown = {};

        let SourcePos = function(ln, col)
        {
            this.ln = ln;
            this.col = col;
        };
        let SourceRef = function(start, end = undefined)
        {
            this.start = start;
            this.end = end;
        };

        let NodeType = {
            inline: {
                html: "inline_html"
            },
            block: {
                html: "block_html"
            }
        };
        let Node = function(type, sourceRef = undefined)
        {
            this.sourceRef = sourceRef;
            this.children = [];
        };

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

        Markdown.InlineParser = function()
        {

        };

        /**
         * Block Parser => Takes block rules from schema and parses with them
         */

        Markdown.BlockParser = function()
        {

        };

        /**
         * Markdown Parser => Takes a schema and constructs the inline and block parsers
         *                 => Creates a AST for provided plaintext based on schema
         */

        Markdown.Parser = function()
        {

        };
    });
})();