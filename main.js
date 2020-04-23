// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain, dialog} = require('electron');
const path = require('path');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 360,
        minHeight: 500,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // and load the index.html of the app.
    mainWindow.loadFile('index.html');

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('isIos', process.platform === 'darwin');
    });

    mainWindow.on('close', (e) => {
        e.preventDefault();
        askForChangeState().then(() => {
            dialog.showMessageBox({
                type: 'info',
                title: 'DUDU todo',
                message: 'Save changes before close?',
                buttons: ['Save', 'Don\'t save', 'Cancel'],
                noLink: true,
            }, (index) => {
                if (index === 0) {
                    e.preventDefault();
                    mainWindow.webContents.send('save', true);
                    // mainWindow = null;
                    // app.exit();
                } else if (index === 1) {
                    mainWindow = null;
                    app.exit();
                } else {
                    e.preventDefault();
                }
            });
        }).catch(() => {
            mainWindow = null;
            app.exit();
        });
    });

    // Emitted when the window is closed.
    // mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        // mainWindow = null;
    // });
}

function askForChangeState() {
    return new Promise((resolve, reject) => {
        ipcMain.on('set-need-save-state', (event, bool) => {
            if (bool) {
                resolve();
            } else {
                reject();
            }
        });
        mainWindow.webContents.send('ask-change-sate-before-quit', true);
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    createWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) createWindow();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcMain.on('close-window', () => {
    if (mainWindow) {
        mainWindow.close();
    }
});

ipcMain.on('close-window-after-save', () => {
    if (mainWindow) {
        mainWindow.close();
    }
});

ipcMain.on('maximize-window', (event) => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
        event.returnValue = mainWindow.isMaximized();
    }
});

ipcMain.on('minimize-window', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

ipcMain.on('topen-widnow', (event, arg) => {
    if (mainWindow) {
        const bool = !mainWindow.isAlwaysOnTop();
        mainWindow.setAlwaysOnTop(bool);
        event.returnValue = bool;
    }
});

ipcMain.on('show-open-dialog', (event, arg) => {
    const res = dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            {name: 'Custome Files', extensions: ['todo']},
            {name: 'All Files', extensions: ['*']}
        ],
    });
    event.sender.send('open-dialog-result', res);
});

ipcMain.on('show-save-dialog', (event) => {
    const res = dialog.showSaveDialog({
        filters: [
            {name: 'Custome Files', extensions: ['todo']},
            {name: 'All Files', extensions: ['*']}
        ],
    });
    event.sender.send('save-dialog-result', res);
});

// Send file full name to the render process
ipcMain.on('get-file-data', function(event) {
    let data = null;
    if (process.argv.length >= 2) {
      data = process.argv[1];
    }
    event.returnValue = data;
});

ipcMain.on('show-read-me', function(event) {
    const readMeWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 360,
        minHeight: 500,
    });

    readMeWindow.loadFile('readme.html');

    readMeWindow.show();
});

ipcMain.on('load-file', function(e) {
    askForChangeState().then(() => {
        dialog.showMessageBox({
            type: 'info',
            title: 'DUDU todo',
            message: 'Save changes before load another file?',
            buttons: ['Save', 'Don\'t save', 'Cancel'],
            noLink: true,
        }, (index) => {
            if (index === 0) {
                e.preventDefault();
                mainWindow.webContents.send('save-load', true);
            } else if (index === 1) {
                mainWindow.webContents.send('load-file', true);
            } else {
                e.preventDefault();
            }
        });
    }).catch(() => {
        mainWindow.webContents.send('load-file', true);
    });
});