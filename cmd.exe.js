if (!args[0]) return "expected 1 argument";
const path = args[0].toPath();
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
};
let exit
let mode = Modes.Normal;

function add(buffer, str) {
    const cursor = Shell.terminal.cursor;
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

function del(buffer) {
    const cursor = Shell.terminal.cursor;
    const textArray = buffer
        .split("\n")
        .map((v) => v.split(""));

    while (textArray.length <= cursor.y) {
        textArray.push([]);
    }

    if (cursor.x === 0) {
        if (cursor.y > 0) {
            const deletedText = textArray.splice(cursor.y, 1)[0];
            Shell.terminal.cursor.y--;
            Shell.terminal.cursor.x = textArray[cursor.y].join("").length;

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

const Keys = {
    n(code, key) {
        switch(key) {
            case "q":
                exit();
                break;
            case "h":
                if(Shell.terminal.cursor.x > 0) Shell.terminal.cursor.x--;
                break;
            case "j":
                Shell.terminal.cursor.y++;
                break;
            case "k":
                if (Shell.terminal.cursor.y > 0) Shell.terminal.cursor.y--;
                break;
            case "l":
                Shell.terminal.cursor.x++;
                break;
            case "i":
                Shell.terminal.cursor.style = "pipe";
                mode = Modes.Insert;
                break;
        }
    },
    i(code, key) {
        if(code === ESCAPE) {
            Shell.terminal.cursor.style = "block";
            mode = Modes.Normal;           
            return;
        }
        switch (code) {
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
        Shell.terminal.text(highlight(buffer));
    }
}

if (await FS.exists(path)) {
    if (typeof (await FS.getFromPath(path)) === "object") {
        return "path can't be a dir";
    } else {
        buffer = await FS.getFromPath(path);
    }
}

function fansiHighlightJS(code) {
    const fg = color => `\x1bf[${color}m`;
    const reset = `\x1bf[ffffffm`;

    // Highlight multiline and single-line comments first
    code = code.replace(/(\/\*[\s\S]*?\*\/)/g, `${fg("888888")}$1${reset}`);
    code = code.replace(/(\/\/.*)/g, `${fg("888888")}$1${reset}`);

    // Then strings (single, double, template)
    code = code.replace(/(".*?(?<!\\)")/g, `${fg("00ff00")}$1${reset}`);
    code = code.replace(/('.*?(?<!\\)')/g, `${fg("00ff00")}$1${reset}`);
    code = code.replace(/(`[\s\S]*?`)/g, `${fg("00ff00")}$1${reset}`);

    // Then keywords
    code = code.replace(/\b(function|const|let|if|else|return|await|true|false|switch|case)\b/g, `${fg("00ffff")}$1${reset}`);

    return code;
}

function highlight(code) {
    if(!Shell.supports_fansi) return code;
    if(path.endsWith(".js") || path.endsWith(".exe")) return fansiHighlightJS(code);
    return code;
}

Shell.terminal.add(highlight(buffer));
Shell.terminal.cursor.x = 0;
Shell.terminal.cursor.y = 0;



const e = run(r => {
    exit = () => {
        Shell.terminal.clear();
        r(pre)
    };
});

Shell.keyPressed = (keycode, key) => {
    Keys[mode](keycode, key);
}


return await e;
