/**
 * The WebVN script controller <br>
 * Include lexer, javascript eval and a bunch of other things
 * for controlling the scripts.<br>
 * Note: the parser is generated by jison.
 * @namespace webvn.script
 */
webvn.module('script',
    ['parserNew', 'parserNode', 'class', 'util', 'log', 'config', 'loader'],
    function (s, parser, parserYy, kclass, util, log, config, loader) {

        var conf = config.create('core-script');
        conf.set(config.script, false);

        var exports = {};

        // Lexer
        /**
         * @class webvn.script.Token
         * @param {string} tag tag name
         * @param {string} value value
         * @param {object} locationData {first_line, first_column, last_line, last_column}
         * @returns {Array} result [tag, value, locationData]
         */
        var Token = exports.Token = kclass.create({
            constructor: function (tag, value, locationData) {
                var token = [];
                token[0] = tag;
                token[1] = value;
                token[2] = locationData;
                return token;
            }
        });

        var EOF = 'END_OF_FILE';

        var Lexer = exports.Lexer = kclass.create({
            constructor: function Lexer() { },
            reConfigure: function (code) {

                this.input = code;
                this.length = code.length;
                this.i = 0;
                this.c = this.input.charAt(this.i);
                this.currentLine = 1;
                this.currentColumn = 1;
                this.tokens = [];

            },
            tokenize: function (code) {

                this.reConfigure(code);

                var token = this.nextToken();
                while (token) {
                    this.pushToken(token);
                    token = this.nextToken();
                }

                return this.tokens;

            },
            lastTokenIs: function (target) {
                var token = this.tokens[this.tokens.length - 1];
                return token && token[0] === target;
            },
            pushToken: function (token) {

                this.tokens.push(token);

            },
            createToken: function (tag, value, locationData) {

                if (value === undefined) {
                    value = tag;
                    if (locationData === undefined) {
                        locationData = {
                            first_line: this.currentLine,
                            first_column: this.currentColumn - tag.length,
                            last_line: this.currentLine,
                            last_column: this.currentColumn - 1
                        };
                    }
                }

                return new Token(tag, value, locationData);

            },
            nextToken: function () {

                while (this.c !== EOF) {
                    switch (this.c) {
                        case ' ': case '\t': case '\r': this.WS(); continue;
                        case '/': {
                            if (this.lookAhead(1, '/')) {
                                this.commentLine();
                            } else if (this.lookAhead(1, '*')) {
                                this.commentBlock();
                            }
                        } this.consume(); continue; // Comment
                        case '`': {
                            if (this.lookAhead(2, '``')) {
                                this.consume();
                                return this.codeBlock();
                            } else {
                                this.consume();
                                return this.codeLine();
                            }
                        }
                        case '(': {
                            if (this.lastTokenIs('IF')) {
                                this.consume();
                                return this.condition();
                            } else if (this.lastTokenIs('FUNCTION_NAME')) {
                                this.consume();
                                if (this.c !== ')') {
                                    return this.functionParam();
                                } else {
                                    this.consume();
                                }
                            } else {
                                this.consume();
                            }
                            break;
                        }
                        case ',': {
                            if (this.lastTokenIs('PARAM')) {
                                this.consume();
                                return this.functionParam();
                            } else {
                                this.consume();
                            }
                            break;
                        }
                        case '{': this.consume(); return this.createToken('{');
                        case '}': this.consume(); return this.createToken('}');
                        default: {
                            if (this.lastTokenIs('FUNCTION') && this.isLetter(this.c)) {
                                return this.functionName();
                            } else if (this.c === 'i' && this.lookAhead(1, 'f')) {
                                this.consumes(2);
                                return this.createToken('IF');
                            } else if (this.c === 'e' && this.lookAhead(3, 'lse')) {
                                this.consumes(4);
                                return this.createToken('ELSE');
                            } else if (this.c === 'f' && this.lookAhead(7, 'unction')) {
                                this.consumes(8);
                                return this.createToken('FUNCTION');
                            } else if (this.isLetter(this.c)) {
                                /* If nothing above matches and it is a letter currently,
                                 * it is a command(function call, alias command).
                                 */
                                return this.command();
                            } else {
                                this.consume();
                            }
                        }
                    }
                }

            },
            /* WS: (' ' | '\t' | '\r')*; Ignore any white space.
             * Line break is not part of the white space group
             * since it is used to indicate the end of line comment and other stuff
             */
            WS: function () {
                while (this.c === ' ' ||
                    this.c === '\t' ||
                    this.c === '\r') {
                    this.advance();
                }
            },
            // Move one character and detect end of file
            advance: function () {

                this.i++;
                if (this.i >= this.length) {
                    this.c = EOF;
                } else {
                    if (this.c === '\n') {
                        this.currentLine++;
                        this.currentColumn = 1;
                    } else {
                        this.currentColumn++;
                    }
                    this.c = this.input.charAt(this.i);
                }

            },
            // Move to next non-whitespace character
            consume: function () {

                this.advance();
                this.WS();

            },
            // Consume several times
            consumes: function (num) {

                var i;

                for (i = 0; i < num; i++) {
                    this.consume();
                }

            },
            // Look ahead n character, and see if it resembles target
            lookAhead: function (len, target) {
                var str = '', i;
                for (i = 1; i <= len; i++) {
                    str += this.input.charAt(this.i + i);
                }
                return str === target;
            },
            isLetter: function (char) {
                if (!util.isString(char) || char.length !== 1) {
                    return false;
                }
                var code = char.charCodeAt(0);
                return ((code >= 65) && (code <= 90)) ||
                    ((code >= 97) && (code <= 122));
            },
            // Line comment, starts with '//' until the line break
            commentLine: function () {

                this.consumes(2);
                while (!(this.c === '\n')) {
                    this.consume();
                    if (this.c === EOF) {
                        break;
                    }
                }

            },
            // Block comment, starts with '/*', ends with '*/'
            commentBlock: function () {

                this.consumes(2);
                while (!(this.c === '*' && this.lookAhead(1, '/'))) {
                    this.consume();
                    if (this.c === EOF) {
                        throw new Error('The comment block must end with "*/"');
                    }
                }
                this.consume();

            },
            // Line code, starts with '`' until the line break
            codeLine: function () {

                var value = '',
                    firstLine, firstColumn, lastLine, lastColumn;

                firstLine = this.currentLine;
                firstColumn = this.currentColumn;

                while (!(this.c === '\n')) {
                    value += this.c;
                    // Use advance() instead of consume() because white space should be keep
                    this.advance();
                    if (this.c === EOF) {
                        break;
                    }
                }

                lastLine = this.currentLine;
                lastColumn = this.currentColumn - 1;

                return this.createToken('CODE_LINE', value, {
                    first_line: firstLine,
                    first_column: firstColumn,
                    last_line: lastLine,
                    last_column: lastColumn
                });

            },
            // Block code, starts with '```', ends with '```'
            codeBlock: function () {

                var value = '',
                    firstLine, firstColumn, lastLine, lastColumn;

                this.consumes(2);

                firstLine = this.currentLine;
                firstColumn = this.currentColumn;

                while (!(this.c === '`' && this.lookAhead(2, '``'))) {
                    value += this.c;
                    this.advance();
                    if (this.c === EOF) {
                        throw new Error('The code line must end with "```"');
                    }
                }

                lastLine = this.currentLine;
                lastColumn = this.currentColumn - 1;

                this.consumes(3);

                return this.createToken('CODE_BLOCK', value, {
                    first_line: firstLine,
                    first_column: firstColumn,
                    last_line: lastLine,
                    last_column: lastColumn
                });

            },
            // Condition
            condition: function () {

                var value = '', leftBracket = 0,
                    firstLine, firstColumn, lastLine, lastColumn;

                firstLine = this.currentLine;
                firstColumn = this.currentColumn;

                while (!(this.c === ')' && leftBracket === 0)) {
                    value += this.c;
                    if (this.c === '(') {
                        leftBracket++;
                    } else if (this.c === ')') {
                        leftBracket--;
                    }
                    this.advance();
                    if (this.c === EOF) {
                        throw new Error("One right bracket is missing");
                    }
                }

                lastLine = this.currentLine;
                lastColumn = this.currentColumn - 1;

                this.consume();

                return this.createToken('CONDITION', value, {
                    first_line: firstLine,
                    first_column: firstColumn,
                    last_line: lastLine,
                    last_column: lastColumn
                });

            },
            functionName: function () {

                var value = '',
                    firstLine, firstColumn, lastLine, lastColumn;

                firstLine = this.currentLine;
                firstColumn = this.currentColumn;

                while (this.isLetter(this.c)) {
                    value += this.c;
                    this.advance();
                }

                lastLine = this.currentLine;
                lastColumn = this.currentColumn - 1;

                return this.createToken('FUNCTION_NAME', value, {
                    first_line: firstLine,
                    first_column: firstColumn,
                    last_line: lastLine,
                    last_column: lastColumn
                });

            },
            functionParam: function () {

                var value = '',
                    firstLine, firstColumn, lastLine, lastColumn;

                firstLine = this.currentLine;
                firstColumn = this.currentColumn;

                while (this.isLetter(this.c)) {
                    value += this.c;
                    this.advance();
                }

                lastLine = this.currentLine;
                lastColumn = this.currentColumn - 1;

                return this.createToken('PARAM', value, {
                    first_line: firstLine,
                    first_column: firstColumn,
                    last_line: lastLine,
                    last_column: lastColumn
                });

            },
            // Command, ends with line break;
            command: function () {

                var value = '',
                    firstLine, firstColumn, lastLine, lastColumn;

                firstLine = this.currentLine;
                firstColumn = this.currentColumn;

                var lastC = '';

                // If there is a '\' before line break, then it is not the end of command.
                while (!(this.c === '\n' && lastC !== '\\')) {
                    if (this.c === '\n' && lastC === '\\') {
                        value = value.substr(0, value.length - 1) + this.c;
                    } else {
                        value += this.c;
                    }
                    lastC = this.c;
                    if (lastC === '\\') {
                        this.consume();
                    } else {
                        this.advance();
                    }
                    if (this.c === EOF) {
                        break;
                    }
                }

                lastLine = this.currentLine;
                lastColumn = this.currentColumn - 1;

                return this.createToken('COMMAND', value, {
                    first_line: firstLine,
                    first_column: firstColumn,
                    last_line: lastLine,
                    last_column: lastColumn
                });

            }
        });

        var _lexer = new Lexer;

        var lexer = exports.lexer = function (code) {

            var tokens;

            try {
                tokens = _lexer.tokenize(code);
                return tokens;
            } catch (e) {
                log.error(e.message);
            }

        };

        // Parser

        parser = parser.parser;

        parser.lexer = {
            lex: function () {

                var tag, token;
                token = parser.tokens[this.pos++];

                if (token) {
                    tag = token[0];
                    this.yytext = token[1];
                    this.yyloc = token[2];
                    this.yylineno = this.yyloc.first_line;
                } else {
                    tag = '';
                }

                return tag;

            },
            setInput: function (tokens) {

                parser.tokens = tokens;

                return this.pos = 0;

            }
        };

        parser.yy = parserYy;

        var parse = exports.parse = function (scenario) {

            var tokens = lexer(scenario);
            return parser.parse(tokens);

        };

        // Parse the source code and eval it
        var wvnEval = exports.eval = function (code) {

            jsEval(parse(code));

        };

        // JavaScript Eval.

        // Eval javaScript code with not return value.
        var jsEval = exports.jsEval = function (code) {

            _jsEval(code);

        };

        /* Eval javaScript code with return value.
         * Only simple expressions are allowed to pass in.
         */
        exports.jsEvalVal = function (code) {

            return _jsEval(code, true);

        };

        var emptyStr = '';

        function _jsEval(code, returnOrNot) {
            "use strict";

            if (util.trim(code) === '') {
                return emptyStr;
            }

            var scope = {};

            var functionName = util.guid('eval');

            code = 'scope["' + functionName + '"]=function(){' +
                (returnOrNot ? 'return (' : '') +
                code +
                (returnOrNot ? ');' : '') +'}';

            try {
                eval(code);
            } catch (e) {
                log.error(e.message);
                return emptyStr;
            }

            return scope[functionName]();

        }

        // Script controller

        /* Contains the result of source file eval:
         * [ ['command', 'dialog -d'], ['if', function () { if... }]... ]
         */
        var sources = [];

        // Middle scripts, temporary usage
        var middles = [];

        /* Final command waiting for executing
         */
        var executions = [];

        var isSource = true;

        //noinspection JSUnusedLocalSymbols
        var $$ = exports.$$ = function (type, value) {
            var source = util.makeArray(arguments);

            /* When executing,
             * command defined inside a if statement
             * should be loaded into middles.
             */
            if (isSource) {
                sources.push(source);
            } else {
                middles.push(source);
            }
        };

        // Load scenarios and begin executing them
        exports.load = function (scenarios) {

            scenarios = scenarios || conf.get('scenarios');

            var prefix = conf.get('prefix'),
                fileType = conf.get('fileType');

            if (!util.isArray(scenarios)) {
                scenarios = [scenarios];
            }

            scenarios = scenarios.map(function (val) {

                return prefix + val + '.' + fileType;

            });

            loader.scenario(scenarios, function (data, isLast) {

                loadText(data, isLast);

            });

        };

        /**
         * @function webvn.script.loadText
         * @param {string} str
         * @param {boolean=} startGame
         */
        var loadText = exports.loadText = function (str, startGame) {
            wvnEval(str);
            if (startGame) {
                start();
            }
        };

        // Execute command or code
        var exec = exports.exec = function (unit) {

            switch (unit[0]) {
                case 'command':
                    execCommand(unit);
                    break;
                case 'code':
                    execCode(unit);
                    break;
                default:
                    log.warn("Unknown command type");
                    break;
            }

        };

        function execCommand(command) {
            var lineNum = command[2],
                commandText = cmdBeautify(command[1]);
            command = parseCommand(commandText);
            var name = command.name,
                options = command.options;
            var cmd = commands[name];
            if (!cmd) {
                log.warn('Command ' + name + ' doesn\'t exist');
                return;
            }
            log.info('Command: ' + commandText + ' ' + lineNum);
            cmd.exec(options);
        }

        function cmdBeautify(str) {
            "use strict";
            return str.split('\n').
                map(function (value) {
                return util.trim(value);
            }).join(' ');
        }

        function execCode(code) {
            var lineNum = code[2];
            log.info('Code: ' + code[1] + ' ' + lineNum);
            jsEval(code[1]);
        }

        /* Indicate which line is being executed now,
         * related to sources array.
         */
        var curNum = 0;

        // Start executing the scripts from beginning.
        var start = exports.start = function () {

            reset();
            play();

        };

        // Reset everything to initial state
        var reset = exports.reset = function () {

            isPaused = false;
            curNum = 0;
            middles = [];
            executions = [];

        };

        // Whether
        var isPaused = false;

        // Similar to play, except the isPaused will be changed to true.
        //noinspection JSUnusedLocalSymbols
        var resume = exports.resume = function () {

            isPaused = false;
            play();

        };

        /* Play the next command,
         * if isPaused is true, then it's not going to work.
         */
        var play = exports.play = function () {
            if (isPaused) {
                return;
            }
            var execution = loadExecutions();
            if (execution) {
                exec(execution);
            }
        };

        // Load executions script
        function loadExecutions() {

            var source;

            while (true) {
                if (!_loadExecutions()) {
                    return;
                }
                source = executions.shift();
                if (source[0] !== 'if') {
                    break;
                }
                isSource = false;
                source[1]();
                isSource = true;
                executions = middles.concat(executions);
                middles = [];
            }

            return source;

        }

        function _loadExecutions() {

            if (executions.length === 0) {
                if (curNum >= sources.length) {
                    log.warn('End of scripts');
                    isPaused = true;
                    return false;
                }
                executions.push(sources[curNum]);
                curNum++;
            }

            return true;

        }

        //noinspection JSUnusedLocalSymbols
        var pause = exports.pause = function (duration) {

            isPaused = true;

            if (duration) {
                setTimeout(function () {

                    isPaused = false;

                }, duration);
            }

        };

        // Command

        // Container of commands
        var commands = {};

        /**
         * Command Class <br>
         * Every command that is used should be created using this class.
         * otherwise, the command may not be executed properly by the script interpreter.
         * @class webvn.script.Command
         * @param {string} name command name
         */
        exports.Command = kclass.create({
            constructor: function Command(name) {
                // Add to commands first
                if (commands[name]) {
                    log.warn('The command ' + name + ' is overwritten');
                }
                commands[name] = this;
                // Init shortHands
                var shortHands = {};
                util.each(this.options, function (value, key) {
                    if (value.shortHand) {
                        shortHands[value.shortHand] = key;
                    }
                });
                this.shortHands = shortHands;
            },
            shortHands: {},
            options: {},
            orders: [],
            /**
             * Execute command with given options.
             * @method webvn.script.Command#exec
             * @param {object} values
             */
            exec: function (values) {
                values = this.parseOptions(values);
                this.execution(values);
            },
            /**
             * Call functions according to option values.
             * If you like, you can re-implement it.
             * @method webvn.script.Command#execution
             * @param {object} values values parsed from scripts
             */
            execution: function (values) {
                "use strict";
                var orders = this.orders, value, order;
                for (var i = 0, len = orders.length; i < len; i++) {
                    order = orders[i];
                    value = values[order];
                    if (value && this[order] && util.isFunction(this[order])) {
                        this[order](value);
                    }
                }
            },
            /**
             * Parse options for final usage in execution function.
             * @param values
             * @returns {object}
             */
            parseOptions: function (values) {
                var ret = {},
                    self = this,
                    shortHands = this.shortHands;
                util.each(values, function (value, key) {
                    var keys = [], opt;
                    if (util.startsWith(key, '--')) {
                        key = key.substr(2, key.length - 2);
                        ret[key] = value;
                        keys.push(key);
                    } else {
                        key = key.substr(1, key.length - 1);
                        if (shortHands[key]) {
                            ret[shortHands[key]] = value;
                            keys.push(shortHands[key]);
                        } else {
                            for (var i = 0, len = key.length; i < len; i++) {
                                var k = shortHands[key[i]];
                                if (k) {
                                    ret[k] = value;
                                }
                                keys.push(k);
                            }
                        }
                    }
                    // Get rid of illegal options and parse values
                    for (i = 0, len = keys.length; i < len; i++) {
                        key = keys[i];
                        opt = self.options[key];
                        if (opt) {
                            ret[key] = self.parseValue(opt.type, ret[key]);
                        } else {
                            delete ret[key];
                        }
                    }
                });
                return ret;
            },
            /**
             * Parse option value into specific type
             * @method webvn.script.Command#parseValue
             * @param {string} type String, Boolean...
             * @param {string} value value to be parsed
             * @returns {string|boolean|number|object}
             */
            parseValue: function (type, value) {
                switch (type) {
                    case 'String':
                        return String(value);
                    case 'Boolean':
                        return !(value === 'false' || value === '0');
                    case 'Number':
                        return Number(value);
                    case 'Json':
                        return JSON.parse(value);
                    default:
                        return value;
                }
            }
        });

        function parseCommand(text) {

            /* Break the command into different parts by space
             * The space inside quotes is ignored.
             */
            var parts = [],
                sq = "'",
                dq = '"',
                insideSq = false,
                insideDq = false,
                word = '',
                lastC = '';
            for (var i = 0, len = text.length; i < len; i++, lastC = c) {
                var c = text[i];
                if (i === len - 1) {
                    if (c !== sq && c !== dq) {
                        word += c;
                    }
                    parts.push(word);
                }
                switch (c) {
                    case ' ':
                        if (lastC !== ' ') {
                            if (insideDq || insideSq) {
                                word += c;
                                continue;
                            } else {
                                parts.push(word);
                                word = '';
                            }
                        }
                        continue;
                    case sq:
                        if (insideSq) {
                            insideSq = false;
                        } else {
                            if (!insideDq) {
                                insideSq = true;
                            } else {
                                word += c;
                            }
                        }
                        continue;
                    case dq:
                        if (insideDq) {
                            insideDq = false;
                        } else {
                            if (!insideSq) {
                                insideDq = true;
                            } else {
                                word += c;
                            }
                        }
                        continue;
                }
                word += c;
            }

            var options = {},
                ret = {},
                value = [];
            ret.name = parts.shift();
            for (i = 0, len = parts.length; i < len; i++) {
                var part = parts[i];
                if (util.startsWith(part, '-')) {
                    var opt = parseOption(part);
                    options[opt.name] = opt.value;
                    continue;
                }
                value.push(part);
            }
            ret.options = options;
            ret.value = value;

            return ret;

        }

        /* Change --t=none
         * into {name:'--t', value:'none'}
         */
        function parseOption(text) {

            var ret = {},
                equalPos = text.indexOf('=');

            /* If the option has value, set it to the value
             * Otherwise, just set it to true
             */
            if (equalPos > -1) {
                ret.name = text.substr(0, equalPos);
                ret.value = text.substr(equalPos + 1, text.length - equalPos - 1);
            } else {
                ret.name = text;
                ret.value = true;
            }

            return ret;

        }

        return exports;

    });