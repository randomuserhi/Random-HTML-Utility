/**
 * @namespace _RHU (Symbol.for("RHU")), RHU
 * NOTE(randomuserhi): _RHU (Symbol.for("RHU")) is the internal library hidden from user, whereas RHU is the public interface.
 */
(function (_RHU, RHU) 
{

	/**
     * NOTE(randomuserhi): Grab references to functions, purely to shorten names for easier time.
     */

    let exists = _RHU.exists;

	/**
	 * @namespace _RHU._MD (Symbol.for("RHU")), RHU.MD
	 *
	 * NOTE(randomuserhi): parses using commonmark v0.30:
	 *                     https://spec.commonmark.org/0.30
	 *
	 * Implementation adapted from https://github.com/commonmark/commonmark.js
	 *
	 * TODO(randomuserhi): Cleanup code!
	 */
	(function (_MD, MD) 
	{
		/** ------------------------------------------------------------------------------------------------------
		 * from-code-point.js
		 */

		function fromCodePoint(_) {
		    return _fromCodePoint(_);
		}

		if (String.fromCodePoint) {
		    _fromCodePoint = function(_) {
		        try {
		            return String.fromCodePoint(_);
		        } catch (e) {
		            if (e instanceof RangeError) {
		                return String.fromCharCode(0xfffd);
		            }
		            throw e;
		        }
		    };
		} else {
		    var stringFromCharCode = String.fromCharCode;
		    var floor = Math.floor;
		    _fromCodePoint = function() {
		        var MAX_SIZE = 0x4000;
		        var codeUnits = [];
		        var highSurrogate;
		        var lowSurrogate;
		        var index = -1;
		        var length = arguments.length;
		        if (!length) {
		            return "";
		        }
		        var result = "";
		        while (++index < length) {
		            var codePoint = Number(arguments[index]);
		            if (
		                !isFinite(codePoint) || // `NaN`, `+Infinity`, or `-Infinity`
		                codePoint < 0 || // not a valid Unicode code point
		                codePoint > 0x10ffff || // not a valid Unicode code point
		                floor(codePoint) !== codePoint // not an integer
		            ) {
		                return String.fromCharCode(0xfffd);
		            }
		            if (codePoint <= 0xffff) {
		                // BMP code point
		                codeUnits.push(codePoint);
		            } else {
		                // Astral code point; split in surrogate halves
		                // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
		                codePoint -= 0x10000;
		                highSurrogate = (codePoint >> 10) + 0xd800;
		                lowSurrogate = (codePoint % 0x400) + 0xdc00;
		                codeUnits.push(highSurrogate, lowSurrogate);
		            }
		            if (index + 1 === length || codeUnits.length > MAX_SIZE) {
		                result += stringFromCharCode.apply(null, codeUnits);
		                codeUnits.length = 0;
		            }
		        }
		        return result;
		    };
		}

		/** ------------------------------------------------------------------------------------------------------
		 * node.js
		 */

		function isContainer(node) 
		{
		    switch (node._type) {
		        case "document":
		        case "block_quote":
		        case "list":
		        case "item":
		        case "paragraph":
		        case "heading":
		        case "emph":
		        case "strong":
		        case "link":
		        case "embed":
		        case "custom_inline":
		        case "custom_block":
		            return true;
		        default:
		            return false;
		    }
		}

		var resumeAt = function(node, entering) 
		{
		    this.current = node;
		    this.entering = entering === true;
		};

		var next = function() 
		{
		    var cur = this.current;
		    var entering = this.entering;

		    if (cur === null) {
		        return null;
		    }

		    var container = isContainer(cur);

		    if (entering && container) {
		        if (cur._firstChild) {
		            this.current = cur._firstChild;
		            this.entering = true;
		        } else {
		            // stay on node but exit
		            this.entering = false;
		        }
		    } else if (cur === this.root) {
		        this.current = null;
		    } else if (cur._next === null) {
		        this.current = cur._parent;
		        this.entering = false;
		    } else {
		        this.current = cur._next;
		        this.entering = true;
		    }

		    return { entering: entering, node: cur };
		};

		var NodeWalker = function(root) 
		{
		    return {
		        current: root,
		        root: root,
		        entering: true,
		        next: next,
		        resumeAt: resumeAt
		    };
		};

		var Node = function(nodeType, sourcepos) 
		{
		    this._type = nodeType;
		    this._parent = null;
		    this._firstChild = null;
		    this._lastChild = null;
		    this._prev = null;
		    this._next = null;
		    this._sourcepos = sourcepos;
		    this._lastLineBlank = false;
		    this._lastLineChecked = false;
		    this._open = true;
		    this._string_content = null;
		    this._literal = null;
		    this._listData = {};
		    this._info = null;
		    this._destination = null;
		    this._title = null;
		    this._isFenced = false;
		    this._fenceChar = null;
		    this._fenceLength = 0;
		    this._fenceOffset = null;
		    this._level = null;
		    this._onEnter = null;
		    this._onExit = null;
		};

		RHU.definePublicAccessors(Node.prototype, {
			isContainer: {
				get() { return isContainer(this); }
			},
			type: {
				get() { return this._type; }
			},
			firstChild: {
				get() { return this._firstChild; }
			},
			lastChild: {
				get() { return this._lastChild; }
			},
			next: {
				get() { return this._next; }
			},
			prev: {
				get() { return this._prev; }
			},
			parent: {
				get() { return this._parent; }
			},
			sourcepos: {
				get() { return this._sourcepos; }
			},
			literal: {
				get() { return this._literal; },
				set(value) { this._literal = value; }
			},
			destination: {
				get() { return this._destination; },
				set(value) { this._destination = value; }
			},
			title: {
				get() { return this._title; },
				set(value) { this._title = value; }
			},
			info: {
				get() { return this._info; },
				set(value) { this._info = value; }
			},
			level: {
				get() { return this._level; },
				set(value) { this._level = value; }
			},
			listType: {
				get() { return this._listData.type; },
				set(value) { this._listData.type = value; }
			},
			listTight: {
				get() { return this._listData.tight; },
				set(value) { this._listData.tight = value; }
			},
			listStart: {
				get() { return this._listData.start; },
				set(value) { this._listData.start = value; }
			},
			listDelimiter: {
				get() { return this._listData.delimiter; },
				set(value) { this._listData.delimiter = value; }
			},
			onEnter: {
				get() { return this._onEnter; },
				set(value) { this._onEnter = value; }
			},
			onExit: {
				get() { return this._onExit; },
				set(value) { this._onExit = value; }
			},
		});

		Node.prototype.appendChild = function(child) {
		    child.unlink();
		    child._parent = this;
		    if (this._lastChild) {
		        this._lastChild._next = child;
		        child._prev = this._lastChild;
		        this._lastChild = child;
		    } else {
		        this._firstChild = child;
		        this._lastChild = child;
		    }
		};

		Node.prototype.prependChild = function(child) {
		    child.unlink();
		    child._parent = this;
		    if (this._firstChild) {
		        this._firstChild._prev = child;
		        child._next = this._firstChild;
		        this._firstChild = child;
		    } else {
		        this._firstChild = child;
		        this._lastChild = child;
		    }
		};

		Node.prototype.unlink = function() {
		    if (this._prev) {
		        this._prev._next = this._next;
		    } else if (this._parent) {
		        this._parent._firstChild = this._next;
		    }
		    if (this._next) {
		        this._next._prev = this._prev;
		    } else if (this._parent) {
		        this._parent._lastChild = this._prev;
		    }
		    this._parent = null;
		    this._next = null;
		    this._prev = null;
		};

		Node.prototype.insertAfter = function(sibling) {
		    sibling.unlink();
		    sibling._next = this._next;
		    if (sibling._next) {
		        sibling._next._prev = sibling;
		    }
		    sibling._prev = this;
		    this._next = sibling;
		    sibling._parent = this._parent;
		    if (!sibling._next) {
		        sibling._parent._lastChild = sibling;
		    }
		};

		Node.prototype.insertBefore = function(sibling) {
		    sibling.unlink();
		    sibling._prev = this._prev;
		    if (sibling._prev) {
		        sibling._prev._next = sibling;
		    }
		    sibling._next = this;
		    this._prev = sibling;
		    sibling._parent = this._parent;
		    if (!sibling._prev) {
		        sibling._parent._firstChild = sibling;
		    }
		};

		Node.prototype.walker = function() {
		    var walker = new NodeWalker(this);
		    return walker;
		};

		/** ------------------------------------------------------------------------------------------------------
		 * common.js
		 */

		var C_BACKSLASH = 92;

		var ENTITY = "&(?:#x[a-f0-9]{1,6}|#[0-9]{1,7}|[a-z][a-z0-9]{1,31});";

		var TAGNAME = "[A-Za-z][A-Za-z0-9-]*";
		var ATTRIBUTENAME = "[a-zA-Z_:][a-zA-Z0-9:._-]*";
		var UNQUOTEDVALUE = "[^\"'=<>`\\x00-\\x20]+";
		var SINGLEQUOTEDVALUE = "'[^']*'";
		var DOUBLEQUOTEDVALUE = '"[^"]*"';
		var ATTRIBUTEVALUE =
		    "(?:" +
		    UNQUOTEDVALUE +
		    "|" +
		    SINGLEQUOTEDVALUE +
		    "|" +
		    DOUBLEQUOTEDVALUE +
		    ")";
		var ATTRIBUTEVALUESPEC = "(?:" + "\\s*=" + "\\s*" + ATTRIBUTEVALUE + ")";
		var ATTRIBUTE = "(?:" + "\\s+" + ATTRIBUTENAME + ATTRIBUTEVALUESPEC + "?)";
		var OPENTAG = "<" + TAGNAME + ATTRIBUTE + "*" + "\\s*/?>";
		var CLOSETAG = "</" + TAGNAME + "\\s*[>]";
		var HTMLCOMMENT = "<!-->|<!--->|<!--(?:[^-]+|-[^-]|--[^>])*-->"
		var PROCESSINGINSTRUCTION = "[<][?][\\s\\S]*?[?][>]";
		var DECLARATION = "<![A-Z]+" + "[^>]*>";
		var CDATA = "<!\\[CDATA\\[[\\s\\S]*?\\]\\]>";
		var HTMLTAG =
		    "(?:" +
		    OPENTAG +
		    "|" +
		    CLOSETAG +
		    "|" +
		    HTMLCOMMENT +
		    "|" +
		    PROCESSINGINSTRUCTION +
		    "|" +
		    DECLARATION +
		    "|" +
		    CDATA +
		    ")";
		var reHtmlTag = new RegExp("^" + HTMLTAG);

		var reBackslashOrAmp = /[\\&]/;

		var ESCAPABLE = "[!\"#$%&'()*+,./:;<=>?@[\\\\\\]^_`{|}~-]";

		var reEntityOrEscapedChar = new RegExp("\\\\" + ESCAPABLE + "|" + ENTITY, "gi");

		var XMLSPECIAL = '[&<>"]';

		var reXmlSpecial = new RegExp(XMLSPECIAL, "g");

		var unescapeChar = function(s) {
		    if (s.charCodeAt(0) === C_BACKSLASH) {
		        return s.charAt(1);
		    } else {
		        return decodeHTML(s);
		    }
		};

		// Replace entities and backslash escapes with literal characters.
		var unescapeString = function(s) {
		    if (reBackslashOrAmp.test(s)) {
		        return s.replace(reEntityOrEscapedChar, unescapeChar);
		    } else {
		        return s;
		    }
		};

		var normalizeURI = function(uri) {
		    try {
		        return encode(uri);
		    } catch (err) {
		        return uri;
		    }
		};

		var replaceUnsafeChar = function(s) {
		    switch (s) {
		        case "&":
		            return "&amp;";
		        case "<":
		            return "&lt;";
		        case ">":
		            return "&gt;";
		        case '"':
		            return "&quot;";
		        default:
		            return s;
		    }
		};

		var escapeXml = function(s) {
		    if (reXmlSpecial.test(s)) {
		        return s.replace(reXmlSpecial, replaceUnsafeChar);
		    } else {
		        return s;
		    }
		};

		/** ------------------------------------------------------------------------------------------------------
		 * inlines.js
		 */

		//var normalizeURI = common.normalizeURI;
		//var unescapeString = common.unescapeString;

		// Constants for character codes:

		var C_NEWLINE = 10;
		var C_ASTERISK = 42;
		var C_UNDERSCORE = 95;
		var C_BACKTICK = 96;
		var C_OPEN_BRACKET = 91;
		var C_CLOSE_BRACKET = 93;
		var C_LESSTHAN = 60;
		var C_BANG = 33;
		var C_BACKSLASH = 92;
		var C_AMPERSAND = 38;
		var C_OPEN_PAREN = 40;
		var C_CLOSE_PAREN = 41;
		var C_COLON = 58;
		var C_SINGLEQUOTE = 39;
		var C_DOUBLEQUOTE = 34;

		// Some regexps used in inline parser:

		//var ESCAPABLE = common.ESCAPABLE;
		var ESCAPED_CHAR = "\\\\" + ESCAPABLE;

		//var ENTITY = common.ENTITY;
		//var reHtmlTag = common.reHtmlTag;

		var rePunctuation = new RegExp(
		    /^[!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u0AF0\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166D\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E42\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC9\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDF3C-\uDF3E]|\uD809[\uDC70-\uDC74]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]/
		);

		var reLinkTitle = new RegExp(
		    '^(?:"(' +
		        ESCAPED_CHAR +
		        '|\\\\[^\\\\]' +
		        '|[^\\\\"\\x00])*"' +
		        "|" +
		        "'(" +
		        ESCAPED_CHAR +
		        '|\\\\[^\\\\]' +
		        "|[^\\\\'\\x00])*'" +
		        "|" +
		        "\\((" +
		        ESCAPED_CHAR +
		        '|\\\\[^\\\\]' +
		        "|[^\\\\()\\x00])*\\))"
		);

		var reLinkDestinationBraces = /^(?:<(?:[^<>\n\\\x00]|\\.)*>)/;

		var reEscapable = new RegExp("^" + ESCAPABLE);

		var reEntityHere = new RegExp("^" + ENTITY, "i");

		var reTicks = /`+/;

		var reTicksHere = /^`+/;

		var reEllipses = /\.\.\./g;

		var reDash = /--+/g;

		var reEmailAutolink = /^<([a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)>/;

		var reAutolink = /^<[A-Za-z][A-Za-z0-9.+-]{1,31}:[^<>\x00-\x20]*>/i;

		var reSpnl = /^ *(?:\n *)?/;

		var reWhitespaceChar = /^[ \t\n\x0b\x0c\x0d]/;

		var reUnicodeWhitespaceChar = /^\s/;

		var reFinalSpace = / *$/;

		var reInitialSpace = /^ */;

		var reSpaceAtEndOfLine = /^ *(?:\n|$)/;

		var reLinkLabel = /^\[(?:[^\\\[\]]|\\.){0,1000}\]/s;

		// Matches a string of non-special characters.
		var reMain = /^[^\n`\[\]\\!<&*_'"]+/m;

		var text = function(s) {
		    var node = new Node("text");
		    node._literal = s;
		    return node;
		};

		// normalize a reference in reference link (remove []s, trim,
		// collapse internal space, unicode case fold.
		// See commonmark/commonmark.js#168.
		var normalizeReference = function(string) {
		    return string
		        .slice(1, string.length - 1)
		        .trim()
		        .replace(/[ \t\r\n]+/g, " ")
		        .toLowerCase()
		        .toUpperCase();
		};

		// INLINE PARSER

		// These are methods of an InlineParser object, defined below.
		// An InlineParser keeps track of a subject (a string to be
		// parsed) and a position in that subject.

		// If re matches at current position in the subject, advance
		// position in subject and return the match; otherwise return null.
		var match = function(re) {
		    var m = re.exec(this.subject.slice(this.pos));
		    if (m === null) {
		        return null;
		    } else {
		        this.pos += m.index + m[0].length;
		        return m[0];
		    }
		};

		// Returns the code for the character at the current subject position, or -1
		// there are no more characters.
		var parsePeek = function() {
		    if (this.pos < this.subject.length) {
		        return this.subject.charCodeAt(this.pos);
		    } else {
		        return -1;
		    }
		};

		// Parse zero or more space characters, including at most one newline
		var spnl = function() {
		    this.match(reSpnl);
		    return true;
		};

		// All of the parsers below try to match something at the current position
		// in the subject.  If they succeed in matching anything, they
		// return the inline matched, advancing the subject.

		// Attempt to parse backticks, adding either a backtick code span or a
		// literal sequence of backticks.
		var parseBackticks = function(block) {
		    var ticks = this.match(reTicksHere);
		    if (ticks === null) {
		        return false;
		    }
		    var afterOpenTicks = this.pos;
		    var matched;
		    var node;
		    var contents;
		    while ((matched = this.match(reTicks)) !== null) {
		        if (matched === ticks) {
		            node = new Node("code");
		            contents = this.subject
		                .slice(afterOpenTicks, this.pos - ticks.length)
		                .replace(/\n/gm, " ");
		            if (
		                contents.length > 0 &&
		                contents.match(/[^ ]/) !== null &&
		                contents[0] == " " &&
		                contents[contents.length - 1] == " "
		            ) {
		                node._literal = contents.slice(1, contents.length - 1);
		            } else {
		                node._literal = contents;
		            }
		            block.appendChild(node);
		            return true;
		        }
		    }
		    // If we got here, we didn't match a closing backtick sequence.
		    this.pos = afterOpenTicks;
		    block.appendChild(text(ticks));
		    return true;
		};

		// Parse a backslash-escaped special character, adding either the escaped
		// character, a hard line break (if the backslash is followed by a newline),
		// or a literal backslash to the block's children.  Assumes current character
		// is a backslash.
		var parseBackslash = function(block) {
		    var subj = this.subject;
		    var node;
		    this.pos += 1;
		    if (this.peek() === C_NEWLINE) {
		        this.pos += 1;
		        node = new Node("linebreak");
		        block.appendChild(node);
		    } else if (reEscapable.test(subj.charAt(this.pos))) {
		        block.appendChild(text(subj.charAt(this.pos)));
		        this.pos += 1;
		    } else {
		        block.appendChild(text("\\"));
		    }
		    return true;
		};

		// Attempt to parse an autolink (URL or email in pointy brackets).
		var parseAutolink = function(block) {
		    var m;
		    var dest;
		    var node;
		    if ((m = this.match(reEmailAutolink))) {
		        dest = m.slice(1, m.length - 1);
		        node = new Node("link");
		        node._destination = normalizeURI("mailto:" + dest);
		        node._title = "";
		        node.appendChild(text(dest));
		        block.appendChild(node);
		        return true;
		    } else if ((m = this.match(reAutolink))) {
		        dest = m.slice(1, m.length - 1);
		        node = new Node("link");
		        node._destination = normalizeURI(dest);
		        node._title = "";
		        node.appendChild(text(dest));
		        block.appendChild(node);
		        return true;
		    } else {
		        return false;
		    }
		};

		// Attempt to parse a raw HTML tag.
		var parseHtmlTag = function(block) {
		    var m = this.match(reHtmlTag);
		    if (m === null) {
		        return false;
		    } else {
		        var node = new Node("html_inline");
		        node._literal = m;
		        block.appendChild(node);
		        return true;
		    }
		};

		// Scan a sequence of characters with code cc, and return information about
		// the number of delimiters and whether they are positioned such that
		// they can open and/or close emphasis or strong emphasis.  A utility
		// function for strong/emph parsing.
		var scanDelims = function(cc) {
		    var numdelims = 0;
		    var char_before, char_after, cc_after;
		    var startpos = this.pos;
		    var left_flanking, right_flanking, can_open, can_close;
		    var after_is_whitespace,
		        after_is_punctuation,
		        before_is_whitespace,
		        before_is_punctuation;

		    if (cc === C_SINGLEQUOTE || cc === C_DOUBLEQUOTE) {
		        numdelims++;
		        this.pos++;
		    } else {
		        while (this.peek() === cc) {
		            numdelims++;
		            this.pos++;
		        }
		    }

		    if (numdelims === 0) {
		        return null;
		    }

		    char_before = startpos === 0 ? "\n" : this.subject.charAt(startpos - 1);

		    cc_after = this.peek();
		    if (cc_after === -1) {
		        char_after = "\n";
		    } else {
		        char_after = fromCodePoint(cc_after);
		    }

		    after_is_whitespace = reUnicodeWhitespaceChar.test(char_after);
		    after_is_punctuation = rePunctuation.test(char_after);
		    before_is_whitespace = reUnicodeWhitespaceChar.test(char_before);
		    before_is_punctuation = rePunctuation.test(char_before);

		    left_flanking =
		        !after_is_whitespace &&
		        (!after_is_punctuation ||
		            before_is_whitespace ||
		            before_is_punctuation);
		    right_flanking =
		        !before_is_whitespace &&
		        (!before_is_punctuation || after_is_whitespace || after_is_punctuation);
		    if (cc === C_UNDERSCORE) {
		        can_open = left_flanking && (!right_flanking || before_is_punctuation);
		        can_close = right_flanking && (!left_flanking || after_is_punctuation);
		    } else if (cc === C_SINGLEQUOTE || cc === C_DOUBLEQUOTE) {
		        can_open = left_flanking && !right_flanking;
		        can_close = right_flanking;
		    } else {
		        can_open = left_flanking;
		        can_close = right_flanking;
		    }
		    this.pos = startpos;
		    return { numdelims: numdelims, can_open: can_open, can_close: can_close };
		};

		// Handle a delimiter marker for emphasis or a quote.
		var handleDelim = function(cc, block) {
		    var res = this.scanDelims(cc);
		    if (!res) {
		        return false;
		    }
		    var numdelims = res.numdelims;
		    var startpos = this.pos;
		    var contents;

		    this.pos += numdelims;
		    if (cc === C_SINGLEQUOTE) {
		        contents = "\u2019";
		    } else if (cc === C_DOUBLEQUOTE) {
		        contents = "\u201C";
		    } else {
		        contents = this.subject.slice(startpos, this.pos);
		    }
		    var node = text(contents);
		    block.appendChild(node);

		    // Add entry to stack for this opener
		    if (
		        (res.can_open || res.can_close) &&
		        (this.options.smart || (cc !== C_SINGLEQUOTE && cc !== C_DOUBLEQUOTE))
		    ) {
		        this.delimiters = {
		            cc: cc,
		            numdelims: numdelims,
		            origdelims: numdelims,
		            node: node,
		            previous: this.delimiters,
		            next: null,
		            can_open: res.can_open,
		            can_close: res.can_close
		        };
		        if (this.delimiters.previous !== null) {
		            this.delimiters.previous.next = this.delimiters;
		        }
		    }

		    return true;
		};

		var removeDelimiter = function(delim) {
		    if (delim.previous !== null) {
		        delim.previous.next = delim.next;
		    }
		    if (delim.next === null) {
		        // top of stack
		        this.delimiters = delim.previous;
		    } else {
		        delim.next.previous = delim.previous;
		    }
		};

		var removeDelimitersBetween = function(bottom, top) {
		    if (bottom.next !== top) {
		        bottom.next = top;
		        top.previous = bottom;
		    }
		};

		var processEmphasis = function(stack_bottom) {
		    var opener, closer, old_closer;
		    var opener_inl, closer_inl;
		    var tempstack;
		    var use_delims;
		    var tmp, next;
		    var opener_found;
		    var openers_bottom = [];
		    var openers_bottom_index;
		    var odd_match = false;

		    for (var i = 0; i < 8; i++) {
		        openers_bottom[i] = stack_bottom;
		    }
		    // find first closer above stack_bottom:
		    closer = this.delimiters;
		    while (closer !== null && closer.previous !== stack_bottom) {
		        closer = closer.previous;
		    }
		    // move forward, looking for closers, and handling each
		    while (closer !== null) {
		        var closercc = closer.cc;
		        if (!closer.can_close) {
		            closer = closer.next;
		        } else {
		            // found emphasis closer. now look back for first matching opener:
		            opener = closer.previous;
		            opener_found = false;
		            switch (closercc) {
		               case C_SINGLEQUOTE:
		                 openers_bottom_index = 0;
		                 break;
		               case C_DOUBLEQUOTE:
		                 openers_bottom_index = 1;
		                 break;
		               case C_UNDERSCORE:
		                 openers_bottom_index = 2;
		                 break;
		               case C_ASTERISK:
		                 openers_bottom_index = 3 + (closer.can_open ? 3 : 0)
		                                          + (closer.origdelims % 3);
		                 break;
		            }
		            while (
		                opener !== null &&
		                opener !== stack_bottom &&
		                opener !== openers_bottom[openers_bottom_index]
		            ) {
		                odd_match =
		                    (closer.can_open || opener.can_close) &&
		                    closer.origdelims % 3 !== 0 &&
		                    (opener.origdelims + closer.origdelims) % 3 === 0;
		                if (opener.cc === closer.cc && opener.can_open && !odd_match) {
		                    opener_found = true;
		                    break;
		                }
		                opener = opener.previous;
		            }
		            old_closer = closer;

		            if (closercc === C_ASTERISK || closercc === C_UNDERSCORE) {
		                if (!opener_found) {
		                    closer = closer.next;
		                } else {
		                    // calculate actual number of delimiters used from closer
		                    use_delims =
		                        closer.numdelims >= 2 && opener.numdelims >= 2 ? 2 : 1;

		                    opener_inl = opener.node;
		                    closer_inl = closer.node;

		                    // remove used delimiters from stack elts and inlines
		                    opener.numdelims -= use_delims;
		                    closer.numdelims -= use_delims;
		                    opener_inl._literal = opener_inl._literal.slice(
		                        0,
		                        opener_inl._literal.length - use_delims
		                    );
		                    closer_inl._literal = closer_inl._literal.slice(
		                        0,
		                        closer_inl._literal.length - use_delims
		                    );

		                    // build contents for new emph element
		                    var emph = new Node(use_delims === 1 ? "emph" : "strong");

		                    tmp = opener_inl._next;
		                    while (tmp && tmp !== closer_inl) {
		                        next = tmp._next;
		                        tmp.unlink();
		                        emph.appendChild(tmp);
		                        tmp = next;
		                    }

		                    opener_inl.insertAfter(emph);

		                    // remove elts between opener and closer in delimiters stack
		                    removeDelimitersBetween(opener, closer);

		                    // if opener has 0 delims, remove it and the inline
		                    if (opener.numdelims === 0) {
		                        opener_inl.unlink();
		                        this.removeDelimiter(opener);
		                    }

		                    if (closer.numdelims === 0) {
		                        closer_inl.unlink();
		                        tempstack = closer.next;
		                        this.removeDelimiter(closer);
		                        closer = tempstack;
		                    }
		                }
		            } else if (closercc === C_SINGLEQUOTE) {
		                closer.node._literal = "\u2019";
		                if (opener_found) {
		                    opener.node._literal = "\u2018";
		                }
		                closer = closer.next;
		            } else if (closercc === C_DOUBLEQUOTE) {
		                closer.node._literal = "\u201D";
		                if (opener_found) {
		                    opener.node.literal = "\u201C";
		                }
		                closer = closer.next;
		            }
		            if (!opener_found) {
		                // Set lower bound for future searches for openers:
		                openers_bottom[openers_bottom_index] =
		                    old_closer.previous;
		                if (!old_closer.can_open) {
		                    // We can remove a closer that can't be an opener,
		                    // once we've seen there's no matching opener:
		                    this.removeDelimiter(old_closer);
		                }
		            }
		        }
		    }

		    // remove all delimiters
		    while (this.delimiters !== null && this.delimiters !== stack_bottom) {
		        this.removeDelimiter(this.delimiters);
		    }
		};

		// Attempt to parse link title (sans quotes), returning the string
		// or null if no match.
		var parseLinkTitle = function() {
		    var title = this.match(reLinkTitle);
		    if (title === null) {
		        return null;
		    } else {
		        // chop off quotes from title and unescape:
		        return unescapeString(title.slice(1, -1));
		    }
		};

		// Attempt to parse link destination, returning the string or
		// null if no match.
		var parseLinkDestination = function() {
		    var res = this.match(reLinkDestinationBraces);
		    if (res === null) {
		        if (this.peek() === C_LESSTHAN) {
		            return null;
		        }
		        // TODO handrolled parser; res should be null or the string
		        var savepos = this.pos;
		        var openparens = 0;
		        var c;
		        while ((c = this.peek()) !== -1) {
		            if (
		                c === C_BACKSLASH &&
		                reEscapable.test(this.subject.charAt(this.pos + 1))
		            ) {
		                this.pos += 1;
		                if (this.peek() !== -1) {
		                    this.pos += 1;
		                }
		            } else if (c === C_OPEN_PAREN) {
		                this.pos += 1;
		                openparens += 1;
		            } else if (c === C_CLOSE_PAREN) {
		                if (openparens < 1) {
		                    break;
		                } else {
		                    this.pos += 1;
		                    openparens -= 1;
		                }
		            } else if (reWhitespaceChar.exec(fromCodePoint(c)) !== null) {
		                break;
		            } else {
		                this.pos += 1;
		            }
		        }
		        if (this.pos === savepos && c !== C_CLOSE_PAREN) {
		            return null;
		        }
		        if (openparens !== 0) {
		            return null;
		        }
		        res = this.subject.slice(savepos, this.pos);
		        return normalizeURI(unescapeString(res));
		    } else {
		        // chop off surrounding <..>:
		        return normalizeURI(unescapeString(res.slice(1, -1)));
		    }
		};

		// Attempt to parse a link label, returning number of characters parsed.
		var parseLinkLabel = function() {
		    var m = this.match(reLinkLabel);
		    if (m === null || m.length > 1001) {
		        return 0;
		    } else {
		        return m.length;
		    }
		};

		// Add open bracket to delimiter stack and add a text node to block's children.
		var parseOpenBracket = function(block) {
		    var startpos = this.pos;
		    this.pos += 1;

		    var node = text("[");
		    block.appendChild(node);

		    // Add entry to stack for this opener
		    this.addBracket(node, startpos, false);
		    return true;
		};

		// IF next character is [, and ! delimiter to delimiter stack and
		// add a text node to block's children.  Otherwise just add a text node.
		var parseBang = function(block) {
		    var startpos = this.pos;
		    this.pos += 1;
		    if (this.peek() === C_OPEN_BRACKET) {
		        this.pos += 1;

		        var node = text("![");
		        block.appendChild(node);

		        // Add entry to stack for this opener
		        this.addBracket(node, startpos + 1, true);
		    } else {
		        block.appendChild(text("!"));
		    }
		    return true;
		};

		// Try to match close bracket against an opening in the delimiter
		// stack.  Add either a link or embed, or a plain [ character,
		// to block's children.  If there is a matching delimiter,
		// remove it from the delimiter stack.
		var parseCloseBracket = function(block) {
		    var startpos;
		    var is_embed;
		    var dest;
		    var title;
		    var matched = false;
		    var reflabel;
		    var opener;

		    this.pos += 1;
		    startpos = this.pos;

		    // get last [ or ![
		    opener = this.brackets;

		    if (opener === null) {
		        // no matched opener, just return a literal
		        block.appendChild(text("]"));
		        return true;
		    }

		    if (!opener.active) {
		        // no matched opener, just return a literal
		        block.appendChild(text("]"));
		        // take opener off brackets stack
		        this.removeBracket();
		        return true;
		    }

		    // If we got here, open is a potential opener
		    is_embed = opener.embed;

		    // Check to see if we have a link/embed

		    var savepos = this.pos;

		    // Inline link?
		    if (this.peek() === C_OPEN_PAREN) {
		        this.pos++;
		        if (
		            this.spnl() &&
		            (dest = this.parseLinkDestination()) !== null &&
		            this.spnl() &&
		            // make sure there's a space before the title:
		            ((reWhitespaceChar.test(this.subject.charAt(this.pos - 1)) &&
		                (title = this.parseLinkTitle())) ||
		                true) &&
		            this.spnl() &&
		            this.peek() === C_CLOSE_PAREN
		        ) {
		            this.pos += 1;
		            matched = true;
		        } else {
		            this.pos = savepos;
		        }
		    }

		    if (!matched) {
		        // Next, see if there's a link label
		        var beforelabel = this.pos;
		        var n = this.parseLinkLabel();
		        if (n > 2) {
		            reflabel = this.subject.slice(beforelabel, beforelabel + n);
		        } else if (!opener.bracketAfter) {
		            // Empty or missing second label means to use the first label as the reference.
		            // The reference must not contain a bracket. If we know there's a bracket, we don't even bother checking it.
		            reflabel = this.subject.slice(opener.index, startpos);
		        }
		        if (n === 0) {
		            // If shortcut reference link, rewind before spaces we skipped.
		            this.pos = savepos;
		        }

		        if (reflabel) {
		            // lookup rawlabel in refmap
		            var link = this.refmap[normalizeReference(reflabel)];
		            if (link) {
		                dest = link.destination;
		                title = link.title;
		                matched = true;
		            }
		        }
		    }

		    if (matched) {
		        var node = new Node(is_embed ? "embed" : "link");
		        node._destination = dest;
		        node._title = title || "";

		        var tmp, next;
		        tmp = opener.node._next;
		        while (tmp) {
		            next = tmp._next;
		            tmp.unlink();
		            node.appendChild(tmp);
		            tmp = next;
		        }
		        block.appendChild(node);
		        this.processEmphasis(opener.previousDelimiter);
		        this.removeBracket();
		        opener.node.unlink();

		        // We remove this bracket and processEmphasis will remove later delimiters.
		        // Now, for a link, we also deactivate earlier link openers.
		        // (no links in links)
		        if (!is_embed) {
		            opener = this.brackets;
		            while (opener !== null) {
		                if (!opener.embed) {
		                    opener.active = false; // deactivate this opener
		                }
		                opener = opener.previous;
		            }
		        }

		        return true;
		    } else {
		        // no match

		        this.removeBracket(); // remove this opener from stack
		        this.pos = startpos;
		        block.appendChild(text("]"));
		        return true;
		    }
		};

		var addBracket = function(node, index, embed) {
		    if (this.brackets !== null) {
		        this.brackets.bracketAfter = true;
		    }
		    this.brackets = {
		        node: node,
		        previous: this.brackets,
		        previousDelimiter: this.delimiters,
		        index: index,
		        embed: embed,
		        active: true
		    };
		};

		var removeBracket = function() {
		    this.brackets = this.brackets.previous;
		};

		// Attempt to parse an entity.
		var parseEntity = function(block) {
		    var m;
		    if ((m = this.match(reEntityHere))) {
		        block.appendChild(text(decodeHTML(m)));
		        return true;
		    } else {
		        return false;
		    }
		};

		// Parse a run of ordinary characters, or a single character with
		// a special meaning in markdown, as a plain string.
		var parseString = function(block) {
		    var m;
		    if ((m = this.match(reMain))) {
		        if (this.options.smart) {
		            block.appendChild(
		                text(
		                    m
		                        .replace(reEllipses, "\u2026")
		                        .replace(reDash, function(chars) {
		                            var enCount = 0;
		                            var emCount = 0;
		                            if (chars.length % 3 === 0) {
		                                // If divisible by 3, use all em dashes
		                                emCount = chars.length / 3;
		                            } else if (chars.length % 2 === 0) {
		                                // If divisible by 2, use all en dashes
		                                enCount = chars.length / 2;
		                            } else if (chars.length % 3 === 2) {
		                                // If 2 extra dashes, use en dash for last 2; em dashes for rest
		                                enCount = 1;
		                                emCount = (chars.length - 2) / 3;
		                            } else {
		                                // Use en dashes for last 4 hyphens; em dashes for rest
		                                enCount = 2;
		                                emCount = (chars.length - 4) / 3;
		                            }
		                            return (
		                                "\u2014".repeat(emCount) +
		                                "\u2013".repeat(enCount)
		                            );
		                        })
		                )
		            );
		        } else {
		            block.appendChild(text(m));
		        }
		        return true;
		    } else {
		        return false;
		    }
		};

		// Parse a newline.  If it was preceded by two spaces, return a hard
		// line break; otherwise a soft line break.
		var parseNewline = function(block) {
		    this.pos += 1; // assume we're at a \n
		    // check previous node for trailing spaces
		    var lastc = block._lastChild;
		    if (
		        lastc &&
		        lastc.type === "text" &&
		        lastc._literal[lastc._literal.length - 1] === " "
		    ) {
		        var hardbreak = lastc._literal[lastc._literal.length - 2] === " ";
		        lastc._literal = lastc._literal.replace(reFinalSpace, "");
		        block.appendChild(new Node(hardbreak ? "linebreak" : "softbreak"));
		    } else {
		        block.appendChild(new Node("softbreak"));
		    }
		    this.match(reInitialSpace); // gobble leading spaces in next line
		    return true;
		};

		// Attempt to parse a link reference, modifying refmap.
		var parseReference = function(s, refmap) {
		    this.subject = s;
		    this.pos = 0;
		    var rawlabel;
		    var dest;
		    var title;
		    var matchChars;
		    var startpos = this.pos;

		    // label:
		    matchChars = this.parseLinkLabel();
		    if (matchChars === 0) {
		        return 0;
		    } else {
		        rawlabel = this.subject.slice(0, matchChars);
		    }

		    // colon:
		    if (this.peek() === C_COLON) {
		        this.pos++;
		    } else {
		        this.pos = startpos;
		        return 0;
		    }

		    //  link url
		    this.spnl();

		    dest = this.parseLinkDestination();
		    if (dest === null) {
		        this.pos = startpos;
		        return 0;
		    }

		    var beforetitle = this.pos;
		    this.spnl();
		    if (this.pos !== beforetitle) {
		        title = this.parseLinkTitle();
		    }
		    if (title === null) {
		        title = "";
		        // rewind before spaces
		        this.pos = beforetitle;
		    }

		    // make sure we're at line end:
		    var atLineEnd = true;
		    if (this.match(reSpaceAtEndOfLine) === null) {
		        if (title === "") {
		            atLineEnd = false;
		        } else {
		            // the potential title we found is not at the line end,
		            // but it could still be a legal link reference if we
		            // discard the title
		            title = "";
		            // rewind before spaces
		            this.pos = beforetitle;
		            // and instead check if the link URL is at the line end
		            atLineEnd = this.match(reSpaceAtEndOfLine) !== null;
		        }
		    }

		    if (!atLineEnd) {
		        this.pos = startpos;
		        return 0;
		    }

		    var normlabel = normalizeReference(rawlabel);
		    if (normlabel === "") {
		        // label must contain non-whitespace characters
		        this.pos = startpos;
		        return 0;
		    }

		    if (!refmap[normlabel]) {
		        refmap[normlabel] = { destination: dest, title: title };
		    }
		    return this.pos - startpos;
		};

		// Parse the next inline element in subject, advancing subject position.
		// On success, add the result to block's children and return true.
		// On failure, return false.
		var parseInline = function(block) {
		    var res = false;
		    var c = this.peek();
		    if (c === -1) {
		        return false;
		    }
		    switch (c) {
		        case C_NEWLINE:
		            res = this.parseNewline(block);
		            break;
		        case C_BACKSLASH:
		            res = this.parseBackslash(block);
		            break;
		        case C_BACKTICK:
		            res = this.parseBackticks(block);
		            break;
		        case C_ASTERISK:
		        case C_UNDERSCORE:
		            res = this.handleDelim(c, block);
		            break;
		        case C_SINGLEQUOTE:
		        case C_DOUBLEQUOTE:
		            res = this.options.smart && this.handleDelim(c, block);
		            break;
		        case C_OPEN_BRACKET:
		            res = this.parseOpenBracket(block);
		            break;
		        case C_BANG:
		            res = this.parseBang(block);
		            break;
		        case C_CLOSE_BRACKET:
		            res = this.parseCloseBracket(block);
		            break;
		        case C_LESSTHAN:
		            res = this.parseAutolink(block) || this.parseHtmlTag(block);
		            break;
		        case C_AMPERSAND:
		            res = this.parseEntity(block);
		            break;
		        default:
		            res = this.parseString(block);
		            break;
		    }
		    if (!res) {
		        this.pos += 1;
		        block.appendChild(text(fromCodePoint(c)));
		    }

		    return true;
		};

		// Parse string content in block into inline children,
		// using refmap to resolve references.
		var parseInlines = function(block) {
		    this.subject = block._string_content.trim();
		    this.pos = 0;
		    this.delimiters = null;
		    this.brackets = null;
		    while (this.parseInline(block)) {}
		    block._string_content = null; // allow raw string to be garbage collected
		    this.processEmphasis(null);
		};

		// The InlineParser object.
		function InlineParser(options) {
		    return {
		        subject: "",
		        delimiters: null, // used by handleDelim method
		        brackets: null,
		        pos: 0,
		        refmap: {},
		        match: match,
		        peek: parsePeek,
		        spnl: spnl,
		        parseBackticks: parseBackticks,
		        parseBackslash: parseBackslash,
		        parseAutolink: parseAutolink,
		        parseHtmlTag: parseHtmlTag,
		        scanDelims: scanDelims,
		        handleDelim: handleDelim,
		        parseLinkTitle: parseLinkTitle,
		        parseLinkDestination: parseLinkDestination,
		        parseLinkLabel: parseLinkLabel,
		        parseOpenBracket: parseOpenBracket,
		        parseBang: parseBang,
		        parseCloseBracket: parseCloseBracket,
		        addBracket: addBracket,
		        removeBracket: removeBracket,
		        parseEntity: parseEntity,
		        parseString: parseString,
		        parseNewline: parseNewline,
		        parseReference: parseReference,
		        parseInline: parseInline,
		        processEmphasis: processEmphasis,
		        removeDelimiter: removeDelimiter,
		        options: options || {},
		        parse: parseInlines
		    };
		}

		/** ------------------------------------------------------------------------------------------------------
		 * blocks.js
		 */

		var CODE_INDENT = 4;

		var C_TAB = 9;
		var C_NEWLINE = 10;
		var C_GREATERTHAN = 62;
		var C_LESSTHAN = 60;
		var C_SPACE = 32;
		var C_OPEN_BRACKET = 91;

		var reHtmlBlockOpen = [
		    /./, // dummy for 0
		    /^<(?:script|pre|textarea|style)(?:\s|>|$)/i,
		    /^<!--/,
		    /^<[?]/,
		    /^<![A-Za-z]/,
		    /^<!\[CDATA\[/,
		    /^<[/]?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[123456]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:\s|[/]?[>]|$)/i,
		    new RegExp("^(?:" + OPENTAG + "|" + CLOSETAG + ")\\s*$", "i")
		];

		var reHtmlBlockClose = [
		    /./, // dummy for 0
		    /<\/(?:script|pre|textarea|style)>/i,
		    /-->/,
		    /\?>/,
		    />/,
		    /\]\]>/
		];

		var reThematicBreak = /^(?:\*[ \t]*){3,}$|^(?:_[ \t]*){3,}$|^(?:-[ \t]*){3,}$/;

		var reMaybeSpecial = /^[#`~*+_=<>0-9-]/;

		var reNonSpace = /[^ \t\f\v\r\n]/;

		var reBulletListMarker = /^[*+-]/;

		var reOrderedListMarker = /^(\d{1,9})([.)])/;

		var reATXHeadingMarker = /^#{1,6}(?:[ \t]+|$)/;

		var reCodeFence = /^`{3,}(?!.*`)|^~{3,}/;

		var reClosingCodeFence = /^(?:`{3,}|~{3,})(?=[ \t]*$)/;

		var reSetextHeadingLine = /^(?:=+|-+)[ \t]*$/;

		var reLineEnding = /\r\n|\n|\r/;

		// Returns true if string contains only space characters.
		var isBlank = function(s) {
		    return !reNonSpace.test(s);
		};

		var isSpaceOrTab = function(c) {
		    return c === C_SPACE || c === C_TAB;
		};

		var peek = function(ln, pos) {
		    if (pos < ln.length) {
		        return ln.charCodeAt(pos);
		    } else {
		        return -1;
		    }
		};

		// DOC PARSER

		// These are methods of a Parser object, defined below.

		// Returns true if block ends with a blank line, descending if needed
		// into lists and sublists.
		var endsWithBlankLine = function(block) {
		    while (block) {
		        if (block._lastLineBlank) {
		            return true;
		        }
		        var t = block.type;
		        if (!block._lastLineChecked && (t === "list" || t === "item")) {
		            block._lastLineChecked = true;
		            block = block._lastChild;
		        } else {
		            block._lastLineChecked = true;
		            break;
		        }
		    }
		    return false;
		};

		// Add a line to the block at the tip.  We assume the tip
		// can accept lines -- that check should be done before calling this.
		var addLine = function() {
		    if (this.partiallyConsumedTab) {
		        this.offset += 1; // skip over tab
		        // add space characters:
		        var charsToTab = 4 - (this.column % 4);
		        this.tip._string_content += " ".repeat(charsToTab);
		    }
		    this.tip._string_content += this.currentLine.slice(this.offset) + "\n";
		};

		// Add block of type tag as a child of the tip.  If the tip can't
		// accept children, close and finalize it and try its parent,
		// and so on til we find a block that can accept children.
		var addChild = function(tag, offset) {
		    while (!this.blocks[this.tip.type].canContain(tag)) {
		        this.finalize(this.tip, this.lineNumber - 1);
		    }

		    var column_number = offset + 1; // offset 0 = column 1
		    var newBlock = new Node(tag, [
		        [this.lineNumber, column_number],
		        [0, 0]
		    ]);
		    newBlock._string_content = "";
		    this.tip.appendChild(newBlock);
		    this.tip = newBlock;
		    return newBlock;
		};

		// Parse a list marker and return data on the marker (type,
		// start, delimiter, bullet character, padding) or null.
		var parseListMarker = function(parser, container) {
		    var rest = parser.currentLine.slice(parser.nextNonspace);
		    var match;
		    var nextc;
		    var spacesStartCol;
		    var spacesStartOffset;
		    var data = {
		        type: null,
		        tight: true, // lists are tight by default
		        bulletChar: null,
		        start: null,
		        delimiter: null,
		        padding: null,
		        markerOffset: parser.indent
		    };
		    if (parser.indent >= 4) {
		        return null;
		    }
		    if ((match = rest.match(reBulletListMarker))) {
		        data.type = "bullet";
		        data.bulletChar = match[0][0];
		    } else if (
		        (match = rest.match(reOrderedListMarker)) &&
		        (container.type !== "paragraph" || match[1] == 1)
		    ) {
		        data.type = "ordered";
		        data.start = parseInt(match[1]);
		        data.delimiter = match[2];
		    } else {
		        return null;
		    }
		    // make sure we have spaces after
		    nextc = peek(parser.currentLine, parser.nextNonspace + match[0].length);
		    if (!(nextc === -1 || nextc === C_TAB || nextc === C_SPACE)) {
		        return null;
		    }

		    // if it interrupts paragraph, make sure first line isn't blank
		    if (
		        container.type === "paragraph" &&
		        !parser.currentLine
		            .slice(parser.nextNonspace + match[0].length)
		            .match(reNonSpace)
		    ) {
		        return null;
		    }

		    // we've got a match! advance offset and calculate padding
		    parser.advanceNextNonspace(); // to start of marker
		    parser.advanceOffset(match[0].length, true); // to end of marker
		    spacesStartCol = parser.column;
		    spacesStartOffset = parser.offset;
		    do {
		        parser.advanceOffset(1, true);
		        nextc = peek(parser.currentLine, parser.offset);
		    } while (parser.column - spacesStartCol < 5 && isSpaceOrTab(nextc));
		    var blank_item = peek(parser.currentLine, parser.offset) === -1;
		    var spaces_after_marker = parser.column - spacesStartCol;
		    if (spaces_after_marker >= 5 || spaces_after_marker < 1 || blank_item) {
		        data.padding = match[0].length + 1;
		        parser.column = spacesStartCol;
		        parser.offset = spacesStartOffset;
		        if (isSpaceOrTab(peek(parser.currentLine, parser.offset))) {
		            parser.advanceOffset(1, true);
		        }
		    } else {
		        data.padding = match[0].length + spaces_after_marker;
		    }
		    return data;
		};

		// Returns true if the two list items are of the same type,
		// with the same delimiter and bullet character.  This is used
		// in agglomerating list items into lists.
		var listsMatch = function(list_data, item_data) {
		    return (
		        list_data.type === item_data.type &&
		        list_data.delimiter === item_data.delimiter &&
		        list_data.bulletChar === item_data.bulletChar
		    );
		};

		// Finalize and close any unmatched blocks.
		var closeUnmatchedBlocks = function() {
		    if (!this.allClosed) {
		        // finalize any blocks not matched
		        while (this.oldtip !== this.lastMatchedContainer) {
		            var parent = this.oldtip._parent;
		            this.finalize(this.oldtip, this.lineNumber - 1);
		            this.oldtip = parent;
		        }
		        this.allClosed = true;
		    }
		};

		// 'finalize' is run when the block is closed.
		// 'continue' is run to check whether the block is continuing
		// at a certain line and offset (e.g. whether a block quote
		// contains a `>`.  It returns 0 for matched, 1 for not matched,
		// and 2 for "we've dealt with this line completely, go to next."
		var blocks = {
		    document: {
		        continue: function() {
		            return 0;
		        },
		        finalize: function() {
		            return;
		        },
		        canContain: function(t) {
		            return t !== "item";
		        },
		        acceptsLines: false
		    },
		    list: {
		        continue: function() {
		            return 0;
		        },
		        finalize: function(parser, block) {
		            var item = block._firstChild;
		            while (item) {
		                // check for non-final list item ending with blank line:
		                if (endsWithBlankLine(item) && item._next) {
		                    block._listData.tight = false;
		                    break;
		                }
		                // recurse into children of list item, to see if there are
		                // spaces between any of them:
		                var subitem = item._firstChild;
		                while (subitem) {
		                    if (
		                        endsWithBlankLine(subitem) &&
		                        (item._next || subitem._next)
		                    ) {
		                        block._listData.tight = false;
		                        break;
		                    }
		                    subitem = subitem._next;
		                }
		                item = item._next;
		            }
		        },
		        canContain: function(t) {
		            return t === "item";
		        },
		        acceptsLines: false
		    },
		    block_quote: {
		        continue: function(parser) {
		            var ln = parser.currentLine;
		            if (
		                !parser.indented &&
		                peek(ln, parser.nextNonspace) === C_GREATERTHAN
		            ) {
		                parser.advanceNextNonspace();
		                parser.advanceOffset(1, false);
		                if (isSpaceOrTab(peek(ln, parser.offset))) {
		                    parser.advanceOffset(1, true);
		                }
		            } else {
		                return 1;
		            }
		            return 0;
		        },
		        finalize: function() {
		            return;
		        },
		        canContain: function(t) {
		            return t !== "item";
		        },
		        acceptsLines: false
		    },
		    item: {
		        continue: function(parser, container) {
		            if (parser.blank) {
		                if (container._firstChild == null) {
		                    // Blank line after empty list item
		                    return 1;
		                } else {
		                    parser.advanceNextNonspace();
		                }
		            } else if (
		                parser.indent >=
		                container._listData.markerOffset + container._listData.padding
		            ) {
		                parser.advanceOffset(
		                    container._listData.markerOffset +
		                        container._listData.padding,
		                    true
		                );
		            } else {
		                return 1;
		            }
		            return 0;
		        },
		        finalize: function() {
		            return;
		        },
		        canContain: function(t) {
		            return t !== "item";
		        },
		        acceptsLines: false
		    },
		    heading: {
		        continue: function() {
		            // a heading can never container > 1 line, so fail to match:
		            return 1;
		        },
		        finalize: function() {
		            return;
		        },
		        canContain: function() {
		            return false;
		        },
		        acceptsLines: false
		    },
		    thematic_break: {
		        continue: function() {
		            // a thematic break can never container > 1 line, so fail to match:
		            return 1;
		        },
		        finalize: function() {
		            return;
		        },
		        canContain: function() {
		            return false;
		        },
		        acceptsLines: false
		    },
		    code_block: {
		        continue: function(parser, container) {
		            var ln = parser.currentLine;
		            var indent = parser.indent;
		            if (container._isFenced) {
		                // fenced
		                var match =
		                    indent <= 3 &&
		                    ln.charAt(parser.nextNonspace) === container._fenceChar &&
		                    ln.slice(parser.nextNonspace).match(reClosingCodeFence);
		                if (match && match[0].length >= container._fenceLength) {
		                    // closing fence - we're at end of line, so we can return
		                    parser.lastLineLength =
		                        parser.offset + indent + match[0].length;
		                    parser.finalize(container, parser.lineNumber);
		                    return 2;
		                } else {
		                    // skip optional spaces of fence offset
		                    var i = container._fenceOffset;
		                    while (i > 0 && isSpaceOrTab(peek(ln, parser.offset))) {
		                        parser.advanceOffset(1, true);
		                        i--;
		                    }
		                }
		            } else {
		                // indented
		                if (indent >= CODE_INDENT) {
		                    parser.advanceOffset(CODE_INDENT, true);
		                } else if (parser.blank) {
		                    parser.advanceNextNonspace();
		                } else {
		                    return 1;
		                }
		            }
		            return 0;
		        },
		        finalize: function(parser, block) {
		            if (block._isFenced) {
		                // fenced
		                // first line becomes info string
		                var content = block._string_content;
		                var newlinePos = content.indexOf("\n");
		                var firstLine = content.slice(0, newlinePos);
		                var rest = content.slice(newlinePos + 1);
		                block.info = unescapeString(firstLine.trim());
		                block._literal = rest;
		            } else {
		                // indented
		                block._literal = block._string_content.replace(
		                    /(\n *)+$/,
		                    "\n"
		                );
		            }
		            block._string_content = null; // allow GC
		        },
		        canContain: function() {
		            return false;
		        },
		        acceptsLines: true
		    },
		    html_block: {
		        continue: function(parser, container) {
		            return parser.blank &&
		                (container._htmlBlockType === 6 ||
		                    container._htmlBlockType === 7)
		                ? 1
		                : 0;
		        },
		        finalize: function(parser, block) {
		            block._literal = block._string_content.replace(/(\n *)+$/, "");
		            block._string_content = null; // allow GC
		        },
		        canContain: function() {
		            return false;
		        },
		        acceptsLines: true
		    },
		    paragraph: {
		        continue: function(parser) {
		            return parser.blank ? 1 : 0;
		        },
		        finalize: function(parser, block) {
		            var pos;
		            var hasReferenceDefs = false;

		            // try parsing the beginning as link reference definitions:
		            while (
		                peek(block._string_content, 0) === C_OPEN_BRACKET &&
		                (pos = parser.inlineParser.parseReference(
		                    block._string_content,
		                    parser.refmap
		                ))
		            ) {
		                block._string_content = block._string_content.slice(pos);
		                hasReferenceDefs = true;
		            }
		            if (hasReferenceDefs && isBlank(block._string_content)) {
		                block.unlink();
		            }
		        },
		        canContain: function() {
		            return false;
		        },
		        acceptsLines: true
		    }
		};

		// block start functions.  Return values:
		// 0 = no match
		// 1 = matched container, keep going
		// 2 = matched leaf, no more block starts
		var blockStarts = [
		    // block quote
		    function(parser) {
		        if (
		            !parser.indented &&
		            peek(parser.currentLine, parser.nextNonspace) === C_GREATERTHAN
		        ) {
		            parser.advanceNextNonspace();
		            parser.advanceOffset(1, false);
		            // optional following space
		            if (isSpaceOrTab(peek(parser.currentLine, parser.offset))) {
		                parser.advanceOffset(1, true);
		            }
		            parser.closeUnmatchedBlocks();
		            parser.addChild("block_quote", parser.nextNonspace);
		            return 1;
		        } else {
		            return 0;
		        }
		    },

		    // ATX heading
		    function(parser) {
		        var match;
		        if (
		            !parser.indented &&
		            (match = parser.currentLine
		                .slice(parser.nextNonspace)
		                .match(reATXHeadingMarker))
		        ) {
		            parser.advanceNextNonspace();
		            parser.advanceOffset(match[0].length, false);
		            parser.closeUnmatchedBlocks();
		            var container = parser.addChild("heading", parser.nextNonspace);
		            container.level = match[0].trim().length; // number of #s
		            // remove trailing ###s:
		            container._string_content = parser.currentLine
		                .slice(parser.offset)
		                .replace(/^[ \t]*#+[ \t]*$/, "")
		                .replace(/[ \t]+#+[ \t]*$/, "");
		            parser.advanceOffset(parser.currentLine.length - parser.offset);
		            return 2;
		        } else {
		            return 0;
		        }
		    },

		    // Fenced code block
		    function(parser) {
		        var match;
		        if (
		            !parser.indented &&
		            (match = parser.currentLine
		                .slice(parser.nextNonspace)
		                .match(reCodeFence))
		        ) {
		            var fenceLength = match[0].length;
		            parser.closeUnmatchedBlocks();
		            var container = parser.addChild("code_block", parser.nextNonspace);
		            container._isFenced = true;
		            container._fenceLength = fenceLength;
		            container._fenceChar = match[0][0];
		            container._fenceOffset = parser.indent;
		            parser.advanceNextNonspace();
		            parser.advanceOffset(fenceLength, false);
		            return 2;
		        } else {
		            return 0;
		        }
		    },

		    // HTML block
		    function(parser, container) {
		        if (
		            !parser.indented &&
		            peek(parser.currentLine, parser.nextNonspace) === C_LESSTHAN
		        ) {
		            var s = parser.currentLine.slice(parser.nextNonspace);
		            var blockType;

		            for (blockType = 1; blockType <= 7; blockType++) {
		                if (
		                    reHtmlBlockOpen[blockType].test(s) &&
		                    (blockType < 7 || (container.type !== "paragraph" &&
		                     !(!parser.allClosed && !parser.blank &&
		                       parser.tip.type === "paragraph") // maybe lazy
		                    ))
		                ) {
		                    parser.closeUnmatchedBlocks();
		                    // We don't adjust parser.offset;
		                    // spaces are part of the HTML block:
		                    var b = parser.addChild("html_block", parser.offset);
		                    b._htmlBlockType = blockType;
		                    return 2;
		                }
		            }
		        }

		        return 0;
		    },

		    // Setext heading
		    function(parser, container) {
		        var match;
		        if (
		            !parser.indented &&
		            container.type === "paragraph" &&
		            (match = parser.currentLine
		                .slice(parser.nextNonspace)
		                .match(reSetextHeadingLine))
		        ) {
		            parser.closeUnmatchedBlocks();
		            // resolve reference link definitiosn
		            var pos;
		            while (
		                peek(container._string_content, 0) === C_OPEN_BRACKET &&
		                (pos = parser.inlineParser.parseReference(
		                    container._string_content,
		                    parser.refmap
		                ))
		            ) {
		                container._string_content = container._string_content.slice(
		                    pos
		                );
		            }
		            if (container._string_content.length > 0) {
		                var heading = new Node("heading", container.sourcepos);
		                heading.level = match[0][0] === "=" ? 1 : 2;
		                heading._string_content = container._string_content;
		                container.insertAfter(heading);
		                container.unlink();
		                parser.tip = heading;
		                parser.advanceOffset(
		                    parser.currentLine.length - parser.offset,
		                    false
		                );
		                return 2;
		            } else {
		                return 0;
		            }
		        } else {
		            return 0;
		        }
		    },

		    // thematic break
		    function(parser) {
		        if (
		            !parser.indented &&
		            reThematicBreak.test(parser.currentLine.slice(parser.nextNonspace))
		        ) {
		            parser.closeUnmatchedBlocks();
		            parser.addChild("thematic_break", parser.nextNonspace);
		            parser.advanceOffset(
		                parser.currentLine.length - parser.offset,
		                false
		            );
		            return 2;
		        } else {
		            return 0;
		        }
		    },

		    // list item
		    function(parser, container) {
		        var data;

		        if (
		            (!parser.indented || container.type === "list") &&
		            (data = parseListMarker(parser, container))
		        ) {
		            parser.closeUnmatchedBlocks();

		            // add the list if needed
		            if (
		                parser.tip.type !== "list" ||
		                !listsMatch(container._listData, data)
		            ) {
		                container = parser.addChild("list", parser.nextNonspace);
		                container._listData = data;
		            }

		            // add the list item
		            container = parser.addChild("item", parser.nextNonspace);
		            container._listData = data;
		            return 1;
		        } else {
		            return 0;
		        }
		    },

		    // indented code block
		    function(parser) {
		        if (
		            parser.indented &&
		            parser.tip.type !== "paragraph" &&
		            !parser.blank
		        ) {
		            // indented code
		            parser.advanceOffset(CODE_INDENT, true);
		            parser.closeUnmatchedBlocks();
		            parser.addChild("code_block", parser.offset);
		            return 2;
		        } else {
		            return 0;
		        }
		    }
		];

		var advanceOffset = function(count, columns) {
		    var currentLine = this.currentLine;
		    var charsToTab, charsToAdvance;
		    var c;
		    while (count > 0 && (c = currentLine[this.offset])) {
		        if (c === "\t") {
		            charsToTab = 4 - (this.column % 4);
		            if (columns) {
		                this.partiallyConsumedTab = charsToTab > count;
		                charsToAdvance = charsToTab > count ? count : charsToTab;
		                this.column += charsToAdvance;
		                this.offset += this.partiallyConsumedTab ? 0 : 1;
		                count -= charsToAdvance;
		            } else {
		                this.partiallyConsumedTab = false;
		                this.column += charsToTab;
		                this.offset += 1;
		                count -= 1;
		            }
		        } else {
		            this.partiallyConsumedTab = false;
		            this.offset += 1;
		            this.column += 1; // assume ascii; block starts are ascii
		            count -= 1;
		        }
		    }
		};

		var advanceNextNonspace = function() {
		    this.offset = this.nextNonspace;
		    this.column = this.nextNonspaceColumn;
		    this.partiallyConsumedTab = false;
		};

		var findNextNonspace = function() {
		    var currentLine = this.currentLine;
		    var i = this.offset;
		    var cols = this.column;
		    var c;

		    while ((c = currentLine.charAt(i)) !== "") {
		        if (c === " ") {
		            i++;
		            cols++;
		        } else if (c === "\t") {
		            i++;
		            cols += 4 - (cols % 4);
		        } else {
		            break;
		        }
		    }
		    this.blank = c === "\n" || c === "\r" || c === "";
		    this.nextNonspace = i;
		    this.nextNonspaceColumn = cols;
		    this.indent = this.nextNonspaceColumn - this.column;
		    this.indented = this.indent >= CODE_INDENT;
		};

		// Analyze a line of text and update the document appropriately.
		// We parse markdown text by calling this on each line of input,
		// then finalizing the document.
		var incorporateLine = function(ln) {
		    var all_matched = true;
		    var t;

		    var container = this.doc;
		    this.oldtip = this.tip;
		    this.offset = 0;
		    this.column = 0;
		    this.blank = false;
		    this.partiallyConsumedTab = false;
		    this.lineNumber += 1;

		    // replace NUL characters for security
		    if (ln.indexOf("\u0000") !== -1) {
		        ln = ln.replace(/\0/g, "\uFFFD");
		    }

		    this.currentLine = ln;

		    // For each containing block, try to parse the associated line start.
		    // Bail out on failure: container will point to the last matching block.
		    // Set all_matched to false if not all containers match.
		    var lastChild;
		    while ((lastChild = container._lastChild) && lastChild._open) {
		        container = lastChild;

		        this.findNextNonspace();

		        switch (this.blocks[container.type].continue(this, container)) {
		            case 0: // we've matched, keep going
		                break;
		            case 1: // we've failed to match a block
		                all_matched = false;
		                break;
		            case 2: // we've hit end of line for fenced code close and can return
		                return;
		            default:
		                throw "continue returned illegal value, must be 0, 1, or 2";
		        }
		        if (!all_matched) {
		            container = container._parent; // back up to last matching block
		            break;
		        }
		    }

		    this.allClosed = container === this.oldtip;
		    this.lastMatchedContainer = container;

		    var matchedLeaf =
		        container.type !== "paragraph" && blocks[container.type].acceptsLines;
		    var starts = this.blockStarts;
		    var startsLen = starts.length;
		    // Unless last matched container is a code block, try new container starts,
		    // adding children to the last matched container:
		    while (!matchedLeaf) {
		        this.findNextNonspace();

		        // this is a little performance optimization:
		        if (
		            !this.indented &&
		            !reMaybeSpecial.test(ln.slice(this.nextNonspace))
		        ) {
		            this.advanceNextNonspace();
		            break;
		        }

		        var i = 0;
		        while (i < startsLen) {
		            var res = starts[i](this, container);
		            if (res === 1) {
		                container = this.tip;
		                break;
		            } else if (res === 2) {
		                container = this.tip;
		                matchedLeaf = true;
		                break;
		            } else {
		                i++;
		            }
		        }

		        if (i === startsLen) {
		            // nothing matched
		            this.advanceNextNonspace();
		            break;
		        }
		    }

		    // What remains at the offset is a text line.  Add the text to the
		    // appropriate container.

		    // First check for a lazy paragraph continuation:
		    if (!this.allClosed && !this.blank && this.tip.type === "paragraph") {
		        // lazy paragraph continuation
		        this.addLine();
		    } else {
		        // not a lazy continuation

		        // finalize any blocks not matched
		        this.closeUnmatchedBlocks();
		        if (this.blank && container.lastChild) {
		            container.lastChild._lastLineBlank = true;
		        }

		        t = container.type;

		        // Block quote lines are never blank as they start with >
		        // and we don't count blanks in fenced code for purposes of tight/loose
		        // lists or breaking out of lists.  We also don't set _lastLineBlank
		        // on an empty list item, or if we just closed a fenced block.
		        var lastLineBlank =
		            this.blank &&
		            !(
		                t === "block_quote" ||
		                (t === "code_block" && container._isFenced) ||
		                (t === "item" &&
		                    !container._firstChild &&
		                    container.sourcepos[0][0] === this.lineNumber)
		            );

		        // propagate lastLineBlank up through parents:
		        var cont = container;
		        while (cont) {
		            cont._lastLineBlank = lastLineBlank;
		            cont = cont._parent;
		        }

		        if (this.blocks[t].acceptsLines) {
		            this.addLine();
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
		            }
		        } else if (this.offset < ln.length && !this.blank) {
		            // create paragraph container for line
		            container = this.addChild("paragraph", this.offset);
		            this.advanceNextNonspace();
		            this.addLine();
		        }
		    }
		    this.lastLineLength = ln.length;
		};

		// Finalize a block.  Close it and do any necessary postprocessing,
		// e.g. creating string_content from strings, setting the 'tight'
		// or 'loose' status of a list, and parsing the beginnings
		// of paragraphs for reference definitions.  Reset the tip to the
		// parent of the closed block.
		var finalize = function(block, lineNumber) {
		    var above = block._parent;
		    block._open = false;
		    block.sourcepos[1] = [lineNumber, this.lastLineLength];

		    this.blocks[block.type].finalize(this, block);

		    this.tip = above;
		};

		// Walk through a block & children recursively, parsing string content
		// into inline content where appropriate.
		var processInlines = function(block) {
		    var node, event, t;
		    var walker = block.walker();
		    this.inlineParser.refmap = this.refmap;
		    this.inlineParser.options = this.options;
		    while ((event = walker.next())) {
		        node = event.node;
		        t = node.type;
		        if (!event.entering && (t === "paragraph" || t === "heading")) {
		            this.inlineParser.parse(node);
		        }
		    }
		};

		var Document = function() {
		    var doc = new Node("document", [
		        [1, 1],
		        [0, 0]
		    ]);
		    return doc;
		};

		// The main parsing function.  Returns a parsed document AST.
		var parse = function(input) {
		    this.doc = new Document();
		    this.tip = this.doc;
		    this.refmap = {};
		    this.lineNumber = 0;
		    this.lastLineLength = 0;
		    this.offset = 0;
		    this.column = 0;
		    this.lastMatchedContainer = this.doc;
		    this.currentLine = "";
		    if (this.options.time) {
		        console.time("preparing input");
		    }
		    var lines = input.split(reLineEnding);
		    var len = lines.length;
		    if (input.charCodeAt(input.length - 1) === C_NEWLINE) {
		        // ignore last blank line created by final newline
		        len -= 1;
		    }
		    if (this.options.time) {
		        console.timeEnd("preparing input");
		    }
		    if (this.options.time) {
		        console.time("block parsing");
		    }
		    for (var i = 0; i < len; i++) {
		        this.incorporateLine(lines[i]);
		    }
		    while (this.tip) {
		        this.finalize(this.tip, len);
		    }
		    if (this.options.time) {
		        console.timeEnd("block parsing");
		    }
		    if (this.options.time) {
		        console.time("inline parsing");
		    }
		    this.processInlines(this.doc);
		    if (this.options.time) {
		        console.timeEnd("inline parsing");
		    }
		    return this.doc;
		};

		// The Parser object.
		function Parser(options) {
		    return {
		        doc: new Document(),
		        blocks: blocks,
		        blockStarts: blockStarts,
		        tip: this.doc,
		        oldtip: this.doc,
		        currentLine: "",
		        lineNumber: 0,
		        offset: 0,
		        column: 0,
		        nextNonspace: 0,
		        nextNonspaceColumn: 0,
		        indent: 0,
		        indented: false,
		        blank: false,
		        partiallyConsumedTab: false,
		        allClosed: true,
		        lastMatchedContainer: this.doc,
		        refmap: {},
		        lastLineLength: 0,
		        inlineParser: new InlineParser(options),
		        findNextNonspace: findNextNonspace,
		        advanceOffset: advanceOffset,
		        advanceNextNonspace: advanceNextNonspace,
		        addLine: addLine,
		        addChild: addChild,
		        incorporateLine: incorporateLine,
		        finalize: finalize,
		        processInlines: processInlines,
		        closeUnmatchedBlocks: closeUnmatchedBlocks,
		        parse: parse,
		        options: options || {}
		    };
		}

		/** ------------------------------------------------------------------------------------------------------
		 * Custom parser for Abstract Syntax Tree generated from commonmark
		 */

		let HTMLParser = function()
		{

		}
		HTMLParser.prototype.parse = function(ast)
		{
			var walker = ast.walker(),
		        event,
		        type;

		    let frag = new DocumentFragment();
		    this.dom = frag;
		    while ((event = walker.next())) {
		        type = event.node.type;
		        if (this[type]) {
		            this[type](event.node, event.entering);
		        }
		    }
		    return frag;
		}

		HTMLParser.prototype.text = function(node) 
		{
			// check if we are inside an image tag to add alt text
			if (this.dom.tagName === "IMG")
				this.dom.alt += node.literal;
			else this.dom.append(node.literal);
		};

		HTMLParser.prototype.softbreak = function(node) 
		{
			this.dom.append(document.createElement("br"));
		};

		HTMLParser.prototype.linebreak = function() 
		{
		    this.dom.append(document.createElement("br"));
		};

		HTMLParser.prototype.link = function(node, entering) 
		{
		    if (entering) 
		    {
		    	let link = document.createElement("a");
		    	link.href = escapeXml(node.destination);
		    	this.dom.append(link);
		    	this.dom = link;
		    }
		    else this.dom = this.dom.parentNode;
		};

		HTMLParser.prototype.embed = function(node, entering) 
		{
			if (entering) // TODO(randomuserhi): interpret different embeds differently, currently assumes all embeds are images
		    {
		    	let img = document.createElement("img");
		    	img.src = escapeXml(node.destination);
		    	this.dom.append(img);
		    	this.dom = img;
		    }
		    else this.dom = this.dom.parentNode;
		};

		HTMLParser.prototype.emph = function(node, entering)
		{
			if (entering)
			{
				let italics = document.createElement("i");
				this.dom.append(italics);
				this.dom = italics;
			}
			else this.dom = this.dom.parentNode;
		};

		HTMLParser.prototype.strong = function(node, entering)
		{
			if (entering)
			{
				let bold = document.createElement("b");
				this.dom.append(bold);
				this.dom = bold;
			}
			else this.dom = this.dom.parentNode;
		};

		HTMLParser.prototype.paragraph = function(node, entering)
		{
			let grandparent = node.parent.parent;
			if (grandparent !== null && grandparent.type === "list")
		        if (grandparent.listTight)
		            return;

			if (entering)
			{
				let p = document.createElement("p");
				this.dom.append(p);
				this.dom = p;
			}
			else this.dom = this.dom.parentNode;
		};

		HTMLParser.prototype.heading = function(node, entering)
		{
		    if (entering) 
		    {
		    	let h = document.createElement(`h${node.level}`);
				this.dom.append(h);
				this.dom = h;
		    } 
		    else this.dom = this.dom.parentNode;
		};

		HTMLParser.prototype.code = function(node)
		{
			let code = document.createElement("code");
			code.append(node.literal);
			this.dom.append(code);
		};

		HTMLParser.prototype.code_block = function(node)
		{
			let container = document.createElement("pre");
			let code = document.createElement("code");
			code.append(node.literal);
			container.append(code);
			this.dom.append(container);
		};

		HTMLParser.prototype.thematic_break = function(node)
		{
			let hr = document.createElement("hr");
			this.dom.append(hr);
		};

		HTMLParser.prototype.block_quote = function(node, entering)
		{
			if (entering) 
		    {
		    	let blockQuote = document.createElement("blockquote");
				this.dom.append(blockQuote);
				this.dom = blockQuote;
		    } 
		    else this.dom = this.dom.parentNode;
		};

		HTMLParser.prototype.list = function(node, entering) // TODO(randomuserhi): Change to allow custom numbering in numbered list...
		{
		    let tag = node.listType === "bullet" ? "ul" : "ol";

		    if (entering) 
		    {
		    	let list = document.createElement(tag);
		    	list.start = node.listStart;
				this.dom.append(list);
				this.dom = list;
		    } 
		    else this.dom = this.dom.parentNode;
		}

		HTMLParser.prototype.item = function(node, entering) // TODO(randomuserhi): Change to allow custom numbering in numbered list...
		{
		    if (entering) 
		    {
		    	let item = document.createElement("li");
				this.dom.append(item);
				this.dom = item;
		    } 
		    else this.dom = this.dom.parentNode;
		}

		HTMLParser.prototype.html_inline = function(node) {
		    this.dom.innerHTML += node.literal;
		}

		HTMLParser.prototype.html_block = function(node) {
			this.dom.innerHTML += node.literal;
		}

		HTMLParser.prototype.custom_inline = function(node, entering) {
			if (entering && node.onEnter) {
		        this.lit(node.onEnter);
		    } else if (!entering && node.onExit) {
		        this.lit(node.onExit);
		    }
		}

		/** ------------------------------------------------------------------------------------------------------
	     * NOTE(randomuserhi): Create interface for MD
	     */

	     _RHU.definePublicProperties(_MD, {
	        Parser: {
	            enumerable: false,
	            value: Parser
	        },
	        HTMLParser:{
	            enumerable: false,
	            value: HTMLParser
	        }
	    });

	    _RHU.definePublicAccessors(MD, {
	        Parser: {
	            get() { return _MD.Parser }
	        },
	        HTMLParser:{
	            get() { return _MD.HTMLParser }
	        }
	    });

	})((_RHU.MD || (_RHU.MD = {})),
   	   (RHU.MD || (RHU.MD = {})));

})((window[Symbol.for("RHU")] || (window[Symbol.for("RHU")] = {})), // Internal library that can only be accessed via Symbol.for("RHU")
   (window["RHU"] || (window["RHU"] = {}))); // Public interfact for library