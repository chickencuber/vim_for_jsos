if (!args[0]) return "expected 1 argument";
const path = args[0].toPath(Shell);
let buffer = "";
const pre = Shell.terminal.text();
Shell.terminal.clear();

Shell.terminal.scroll.allow = true;

/**
    * @enum {string}
    */
const Modes = {
    Normal: "n",
    Insert: "i",
    Command: "c",
};
let exit
let mode = Modes.Normal;

function add(buffer, str) {
    const arr = buffer
        .split("\n")
        .map((v) => v.split(""));
    while (arr.length <= cursor.y) {
        arr.push([]);
    }
    while(arr[cursor.y].length <= cursor.x) {
        arr[cursor.y].push(" ");
    }
    arr[cursor.y].splice(cursor.x, 0, str);
    arr[cursor.y] = arr[cursor.y].map((v) => (v === undefined ? " " : v));
    buffer = arr.map((v) => v.join("")).join("\n");
    cursor.x += str.length;
    cursor.y += (str.match(/\n/g) || []).length;
    if (str.split("\n").length>1) {
        cursor.x = str.split("\n").at(-1).length;
    }
    return buffer;
}

const cursor = {x: 0, y: 0};

function del(buffer) {
    const textArray = buffer
        .split("\n")
        .map((v) => v.split(""));

    while (textArray.length <= cursor.y) {
        textArray.push([]);
    }

    if (cursor.x === 0) {
        if (cursor.y > 0) {
            const deletedText = textArray.splice(cursor.y, 1)[0];
            cursor.y--;
            cursor.x = textArray[cursor.y].join("").length;

            textArray[cursor.y].push(...deletedText);

            buffer = (textArray.map((v) => v.join("")).join("\n"));
        }
        return buffer;
    }

    textArray[cursor.y].splice(cursor.x - 1, 1);

    buffer = (textArray.map((v) => v.join("")).join("\n"));

    cursor.x--;
    return buffer;
}


let commandBuffer = "";

const Commands = {
    async w() {
        await FS.addFile(path, buffer); 
    },
    q() {
        exit();
    },
    async wq() {
        await Commands.w();
        Commands.q();
    },
}

function handleCommand(name, ...args) {
    Commands[name]?.(...args);
}

const Keys = {
    n(code, key) {
        switch(code) {
            case LEFT_ARROW:
                if(cursor.x > 0) cursor.x--;
                break;
            case DOWN_ARROW:
                if(cursor.y < buffer.split("\n").length-1) cursor.y++;
                break;
            case UP_ARROW:
                if (cursor.y > 0) cursor.y--;
                break;
            case RIGHT_ARROW:
                cursor.x++;
                break
            default:
                switch(key) {
                    case "h":
                        if(cursor.x > 0) cursor.x--;
                        break;
                    case "j":
                        if(cursor.y < buffer.split("\n").length-1) cursor.y++;
                        break;
                    case "k":
                        if (cursor.y > 0) cursor.y--;
                        break;
                    case "l":
                        cursor.x++;
                        break;
                    case "i":
                        Shell.terminal.cursor.style = "pipe";
                        mode = Modes.Insert;
                        break;
                    case "a":
                        cursor.x++;
                        Shell.terminal.cursor.style = "pipe";
                        mode = Modes.Insert;
                        break
                    case ":":
                        mode = Modes.Command;
                        commandBuffer = "";
                        Shell.terminal.text(displayBuff(buffer, true));
                        Shell.terminal.cursor.style = "underscore";
                        break;
                    case "0":
                        cursor.x = 0;
                        break
                    case "^":
                    case "_": {
                        const str = buffer.split("\n")[cursor.y]; 
                        const firstChar = str.match(/\S/); // \S = non-whitespace
                        const firstIndex = firstChar ? firstChar.index : -1;
                        cursor.x = Math.max(firstIndex);
                    }
                        break;
                    case "$": {
                        const str = buffer.split("\n")[cursor.y]; 
                        const match = [...str.matchAll(/\S/g)].at(-1); // get last non-whitespace match
                        cursor.x = match ? match.index : cursor.x;
                    }
                        break;
                }
                break;
        }
    },
    c(code, key) {
        switch (code) {
            case ESCAPE:
                mode = Modes.Normal;
                Shell.terminal.cursor.style = "block";
                Shell.terminal.text(displayBuff(buffer));
                return;
            case ENTER:
                handleCommand(...commandBuffer.trim().split(" "));
                mode = Modes.Normal;
                Shell.terminal.cursor.style = "block";
                Shell.terminal.text(displayBuff(buffer));
                return;
            case BACKSPACE:
                commandBuffer = commandBuffer.slice(0, -1);
                break;
            default:
                if (key.length === 1) {
                    commandBuffer += key;
                }
                break;
        }

        Shell.terminal.text(displayBuff(buffer, true, commandBuffer));
    },
    i(code, key) {
        switch (code) {
            case ESCAPE:
                cursor.x--;
                Shell.terminal.cursor.style = "block";
                mode = Modes.Normal;           
                break
            case LEFT_ARROW:
                if(cursor.x > 0) cursor.x--;
                break;
            case DOWN_ARROW:
                cursor.y++;
                break;
            case UP_ARROW:
                if (cursor.y > 0) cursor.y--;
                break;
            case RIGHT_ARROW:
                if(cursor.y < buffer.split("\n").length-1) cursor.y++;
                break
            case BACKSPACE:
                buffer = del(buffer);
                break
            case ENTER:
                buffer = add(buffer, "\n");
                break;
            case TAB:
                buffer = add(buffer, "    ");
                break;
            default:
                if(key.length > 1) return;
                buffer = add(buffer, key);
                break;
        }
        Shell.terminal.text(displayBuff(buffer));
    }
}

if (await FS.exists(path)) {
    if (typeof (await FS.getFromPath(path)) === "object") {
        return "path can't be a dir";
    } else {
        buffer = await FS.getFromPath(path);
    }
}
const fg = color => `\x1bf[${color}m`;
const reset = `\x1bf[ffffffm`;
const push = `\x1ba[ffffffm`;
const pop= `\x1br[ffffffm`;

const Highlighters = {
    JS: [
        // Block comments
        [/(\/\*[\s\S]*?\*\/)/, `${fg("888888")}$1${reset}`],
        // Line comments
        [/(\/\/[^\n]*)/, `${fg("888888")}$1${reset}`],
        // Template literals
        [/(`(?:\\[\s\S]|[^\\`])*`)/, (m) => {
            m = m.replaceAll(/((?<!\\)(?:\\\\)*\$\{[\s\S]*?\})/g, (_, a) => {
                return `${push+reset}${fansiHighlight(a, Highlighters.JS)}${pop}`
            }); 
            return `${fg("00ff00")}${m}${reset}`
        }],
        // Double-quoted strings (no multiline)
        [/("(?:(?:\\.)|[^\n\r"\\])*")/, `${fg("00ff00")}$1${reset}`],

        // Single-quoted strings (no multiline)
        [/('(?:(?:\\.)|[^\n\r'\\])*')/, `${fg("00ff00")}$1${reset}`],
        [/\/(?!\/)(?:\\\/|[^\n\/])+\/[gimsuy]*/g, `${fg("ff8800")}$&${reset}`],

        // Numbers (int, float, hex, binary)
        [/(0[xX][\da-fA-F]+|0[bB][01]+|\d+(\.\d+)?([eE][+-]?\d+)?)\b/, `${fg("ff00ff")}$1${reset}`],
        // Keywords
        [/(break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|let|new|null|return|super|switch|this|throw|try|typeof|var|void|while|with|yield|async|await)\b/, `${fg("00ffff")}$1${reset}`],
        // Booleans
        [/(true|false)\b/, `${fg("00ffff")}$1${reset}`],
        // Operators
        [/([+\-*/=<>!%&|^~?:]+)/, `${fg("ffff00")}$1${reset}`],
        // Brackets
        [/([()[\]{};,.])/, `${fg("ffaa00")}$1${reset}`],
        // Fallback
        [/([A-Za-z_$][A-Za-z_$0-9]*)/, "$1"],
        [/(.)/, "$1"],
    ],
    JSON: [
        [/("(?:(?:\\.)|[^\n\r"\\])*")/, `${fg("00ff00")}$1${reset}`],

        // Numbers (int, float, hex, binary)
        [/(0[xX][\da-fA-F]+|0[bB][01]+|\d+(\.\d+)?([eE][+-]?\d+)?)\b/, `${fg("ff00ff")}$1${reset}`],
        [/(true|false)\b/, `${fg("00ffff")}$1${reset}`],
        [/(true|false|null)\b/, `${fg("00ffff")}$1${reset}`],
        // Brackets
        [/([()[\]{},])/, `${fg("ffaa00")}$1${reset}`],
        [/(.)/, "$1"],
    ]
};

function fansiHighlight(code, rules) {
    let output = "";
    let index = 0;

    while (index < code.length) {
        let earliestMatch = null;
        let earliestIndex = Infinity;
        let replacement = null;

        for (const [regex, repl] of rules) {
            regex.lastIndex = 0; // reset state for global/multiline regex
            const match = regex.exec(code.slice(index));
            if (match && match.index < earliestIndex) {
                earliestMatch = match;
                earliestIndex = match.index;
                replacement =  match[0].replace(regex, repl);
            }
        }

        if (!earliestMatch) {
            output += code.slice(index);
            break;
        }

        output += code.slice(index, index + earliestIndex); // unhighlighted part
        output += replacement;
        index += earliestIndex + earliestMatch[0].length;
    }

    return output;
}

function highlight(code) {
    if(!Shell.supports_fansi) return code;
    if(path.endsWith(".js") || path.endsWith(".exe")) return fansiHighlight(code, Highlighters.JS);
    if(path.endsWith(".json")) return fansiHighlight(code, Highlighters.JSON);
    return code;
}



let cursorPad = 0;
function displayBuff(buffer, e=false, buf="") {
    let isHighlight = Shell.supports_fansi;
    /**
        * @type {Array<any>}
        */
    const text =  highlight(buffer).split("\n");
    cursorPad = text.length.toString().length + 1;
    setCursor();
    let t = text.map((v, i) => {
        if(isHighlight) {
             return push + reset +(i+1).toString().padEnd(cursorPad-1, " ") + "\u2502"+pop+v       
        } else {
            return (i+1).toString().padEnd(cursorPad-1, " ") + "\u2502"+v
        }
    });
    if(e) {
        t = t.map((v, i) => {
            if(i !== cursor.y) {
                return v;
            }
            return " ".repeat(cursor.x + cursorPad) + (":" + buf);
            ;
        })
    }
    return t.join("\n")
}
Shell.terminal.text(displayBuff(buffer));
cursor.x = 0;
cursor.y = 0;


function setCursor() {
    Shell.terminal.cursor.x = cursor.x + cursorPad;
    Shell.terminal.cursor.y = cursor.y;
}

let exiting = false;
const e = run(r => {
    exit = () => {
        exiting = true; 
        Shell.terminal.clear();
        r(pre)
    };
});

Shell.keyPressed = (keycode, key) => {
    Keys[mode](keycode, key);
    if(!exiting) {
        if(cursor.x < 0) {
            cursor.x = 0;
        }
        setCursor();
    }
}


return await e;
