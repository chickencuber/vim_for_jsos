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

Shell.terminal.add(buffer);


let exit

const e = run(r => {
    exit = r.bind(null, pre);
});

Shell.keyPressed = (keycode, key) => {
    if(key == "q") {
        exit();
    }
}


return await e;
