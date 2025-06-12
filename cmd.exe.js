const pre = Shell.terminal.text();
Shell.terminal.clear();
if (!args[0]) return "expected 1 argument";
const path = args[0].toPath();
let buffer = "";

if (await FS.exists(path)) {
    if (typeof (await FS.getFromPath(path)) === "object") {
        return "path can't be a dir";
    } else {
        buffer = await FS.getFromPath(path);
    }
}

Shell.terminal.add(content);

Shell.keyPressed = (keycode, key) => {

}
Shell.onExit = () => {
    Shell.terminal.clear();
    Shell.terminal.text(pre);
}
