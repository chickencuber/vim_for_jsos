if (!args[0]) return "expected 1 argument";
const path = args[0].toPath(Shell);
let buffer = "";
const pre = Shell.terminal.text();
Shell.terminal.clear();

// Shell.terminal.scroll.allow = true;

let scroll = 0;
let scrollX = 0;
let cursorPad = 0;

function lineHeight() {
    return Shell.terminal.height-1;
}
function lineWidth() {
    return Shell.terminal.width-cursorPad;
}
/**
    * @enum {string}
    */
const Modes = {
    Normal: "n",
    Insert: "i",
    Command: "c",
    Delete: "d",
    Replace: "r",
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
    r(code, key) {
        if(code === ESCAPE) {
            Keys.i(ESCAPE, "");
            return;
        }
        if(code === ENTER || key.length === 1) {
            Keys.n(0, "a");
            Keys.i(BACKSPACE, "");
            Shell.keyPressed(code, key);
            Keys.i(ESCAPE, "");
        }
    },
    d(code, key) {
        if(code === ESCAPE) {
            Keys.i(ESCAPE, "");
        }
        switch(key)  {
            case "d": {
                const temp = buffer.split("\n");
                temp.splice(cursor.y, 1);
                buffer = temp.join("\n");
                Keys.i(ESCAPE, "");
            }
                break;
            case "j": {
                const temp = buffer.split("\n");
                temp.splice(cursor.y, 2);
                buffer = temp.join("\n");
                Keys.i(ESCAPE, "");
            }
                break;
            case "k": {
                const temp = buffer.split("\n");
                temp.splice(cursor.y-1, 2);
                buffer = temp.join("\n");
                Keys.i(ESCAPE, "");
                Keys.n(0, "k");
            }
                break;
            case "l":
                Keys.n(0, "a");
                Keys.i(BACKSPACE, "");
                Keys.i(ESCAPE, "");
                Keys.n(0, "l")
                break;
            case "h":
                Keys.i(BACKSPACE, "");
                Keys.i(ESCAPE, "");
                Keys.n(0, "l")
                break;
        }
    },
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
                    case "s":
                        Keys.d(0, "l");
                        Keys.n(0, "i");
                        break;
                    case "a":
                        cursor.x++;
                        Shell.terminal.cursor.style = "pipe";
                        mode = Modes.Insert;
                        break
                    case "d":
                        Shell.terminal.cursor.style = "underscore";
                        mode = Modes.Delete;
                        break;
                    case "r":
                        Shell.terminal.cursor.style = "underscore";
                        mode = Modes.Replace;
                        break;
                    case ":":
                        mode = Modes.Command;
                        commandBuffer = "";
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
                    case "o":
                        Shell.keyPressed(0, "$");
                        Shell.keyPressed(0, "a");
                        Shell.keyPressed(ENTER, "");
                        break;
                    case "O":
                        Shell.keyPressed(0, "k");
                        Shell.keyPressed(0, "$");
                        Shell.keyPressed(0, "a");
                        Shell.keyPressed(ENTER, "");
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
                commandBuffer = "";
                return;
            case ENTER:
                handleCommand(...commandBuffer.trim().split(" "));
                mode = Modes.Normal;
                Shell.terminal.cursor.style = "block";
                commandBuffer = "";
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

    },
    i(code, key) {
        switch (code) {
            case ESCAPE:
                buffer = buffer.split("\n").map(v=>v.trimEnd()).join("\n");
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
    [fg("888888"), /(\/\*[\s\S]*?\*\/)/y],           // block comments
    [fg("888888"), /(\/\/[^\n]*)/y],                 // line comments
    [fg("00ff00"), /`(?:\\[\s\S]|[^\\`])*`/y],       // template literals (simplified)
    [fg("00ff00"), /"(?:\\.|[^"\\])*"/y],            // double quoted strings
    [fg("00ff00"), /'(?:\\.|[^'\\])*'/y],            // single quoted strings
    [fg("ff8800"), /\/(?!\/)(?:\\\/|[^\n\/])+\/[gimsuy]*/y], // regex literals
    [fg("ff00ff"), /\b(0[xX][\da-fA-F]+|0[bB][01]+|\d+(\.\d+)?([eE][+-]?\d+)?)\b/y], // numbers
    [fg("00ffff"), /\b(get|set|constructor|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|let|new|null|return|super|switch|this|throw|try|typeof|var|void|while|with|yield|async|await)\b/y], // keywords
    [fg("00ffff"), /\b(true|false)\b/y],             // booleans
    [fg("ffff00"), /[+\-*/=<>!%&|^~?:]+/y],          // operators
    [fg("ffaa00"), /[()[\]{};,.]/y],                  // brackets and punctuation
  ],
  JSON: [
    [fg("00ff00"), /"(?:\\.|[^"\\])*"/y],             // strings
    [fg("ff00ff"), /\b(0[xX][\da-fA-F]+|0[bB][01]+|\d+(\.\d+)?([eE][+-]?\d+)?)\b/y], // numbers
    [fg("00ffff"), /\b(true|false|null)\b/y],          // booleans & null
    [fg("ffaa00"), /[()[\]{},]/y],                     // brackets
  ],
};

function tokenize(code, tokenDef) {
  let tokens = [];
  let pos = 0;

  while (pos < code.length) {
    let matched = false;

    for (const [color, regex] of tokenDef) {
      regex.lastIndex = pos;
      const match = regex.exec(code);
      if (match && match.index === pos) {
        tokens.push({color, value: match[0]});
        pos += match[0].length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Safety fallback, avoid infinite loop:
      tokens.push({color: '', value: code[pos]});
      pos++;
    }
  }
  return tokens;
}

function fansiHighlight(code, rules) {
    const tokens = tokenize(code, rules);
    let output = ""
    for(const token of tokens) {
        if(token.color === "") {
            output += token.value;
        } else {
        output += token.color + token.value + reset;
        }
    }
    return output;
}

function highlight(code) {
    if(!Shell.supports_fansi) return code;
    if(path.endsWith(".js") || path.endsWith(".exe")) return fansiHighlight(code, Highlighters.JS);
    if(path.endsWith(".json")) return fansiHighlight(code, Highlighters.JSON);
    return code;
}


function fansiSlice(str, start, end) {
    let result = "";
    let visible = 0;
    let i = 0;

    while (i < str.length && visible < end) {
        if (str[i] === "\x1b") {
            const escMatch = str.slice(i).match(/^\x1b[fbarg]\[[0-9A-Fa-f]{6}m/);
            if (escMatch) {
                result += escMatch[0]; // Keep the color code
                i += escMatch[0].length;
                continue;
            }
        }

        if (visible >= start) {
            result += str[i];
        }

        i++;
        visible++;
    }

    return result;
}

function displayBuff(buffer, f = false, buf="") {
    let isHighlight = Shell.supports_fansi;
    /**
        * @type {Array<any>}
        */
    const text =  highlight(buffer).split("\n");
    cursorPad = text.length.toString().length + 1;
    setCursor();
    let t = text.map((v, i) => {
        if(isHighlight) {
             return push + reset +(i+1).toString().padEnd(cursorPad-1, " ") + "\u2502"+pop+fansiSlice(v, scrollX, scrollX+lineWidth());
        } else {
            return (i+1).toString().padEnd(cursorPad-1, " ") + "\u2502"+v.slice(scrollX, scrollX+lineWidth());
        }
    });
    let matches = [];
    if(isHighlight){
        matches = [...t.slice(0, scroll).join("\n").matchAll(/\x1b[fbarg]\[[0-9A-Fa-f]{6}m/g)];
    }
    const v = padEnd(t.slice(scroll, lineHeight() + scroll), lineHeight() + 1, "");
    v[v.length-1]= (isHighlight?reset:"")+(f?":":"")+ buf;
    return matches.map(v=>v[0]).join("") + v.join("\n");
}
Shell.terminal.text(displayBuff(buffer));
cursor.x = 0;
cursor.y = 0;

function padEnd(arr, targetLength, padValue) {
  while (arr.length < targetLength) {
    arr.push(padValue);
  }
  return arr;
}


function setCursor() {
    Shell.terminal.cursor.x = cursor.x + cursorPad - scrollX;
    Shell.terminal.cursor.y = cursor.y - scroll;
    while(Shell.terminal.cursor.y >= lineHeight()) {
        scroll++;
        Shell.terminal.cursor.y = cursor.y - scroll;
    }
    while(Shell.terminal.cursor.y < 0) {
        scroll--;
        Shell.terminal.cursor.y = cursor.y - scroll;
    }
    while(Shell.terminal.cursor.x >= lineWidth()+cursorPad) {
        scrollX++;
        Shell.terminal.cursor.x = cursor.x + cursorPad - scrollX;
    }
    while(Shell.terminal.cursor.x < cursorPad) {
        scrollX--;
        Shell.terminal.cursor.x = cursor.x + cursorPad - scrollX;
    }
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
    if(exiting) return;
    Keys[mode](keycode, key);
    if(!exiting) {
        const len = buffer.split("\n")[cursor.y].length
        if(cursor.x > len) {
            cursor.x = len;
        }
        if(cursor.x < 0) {
            cursor.x = 0;
        }
        Shell.terminal.text(displayBuff(buffer, mode===Modes.Command,commandBuffer));
    }
}

Shell.windowResized = () => {
    Shell.terminal.text(displayBuff(buffer, mode===Modes.Command, commandBuffer));
}

return await e;
