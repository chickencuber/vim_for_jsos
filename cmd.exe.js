if (!args[0]) return "expected 1 argument";
const path = args[0].toPath();
let buffer = "";
const pre = Shell.terminal.text();
Shell.terminal.clear();

if (await FS.exists(path)) {
    if (typeof (await FS.getFromPath(path)) === "object") {
        return "path can't be a dir";
    } else {
        buffer = await FS.getFromPath(path);
    }
}

function fansiHighlightJS(code) {
    const fg = color => `\x1b[f[${color}]m`;
    const reset = `\x1b[f[ffffff]m`;

    return code
        .replace(/(function|const|let|if|else|return|await)/g, `${fg("00ffff")}$1${reset}`)
        .replace(/(["'`].*?["'`])/g, `${fg("00ff00")}$1${reset}`)
        .replace(/(\/\/.*)/g, `${fg("888888")}$1${reset}`);
}

function highlight(code) {
    if(!Shell.supports_fansi) return code;
    if(path.endsWith(".js") || path.endsWith(".exe")) return fansiHighlightJS(code);
    return code;
}

Shell.terminal.add(highlight(buffer));


let exit

const e = run(r => {
    exit = () => {
        Shell.terminal.clear();
        r(pre)
    };
});

Shell.keyPressed = (keycode, key) => {
    if(key == "q") {
        exit();
    }
}


return await e;
