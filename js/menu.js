
const template = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Open file...',
                click: async () => {
                    let result = await dialog.showOpenDialog({
                        properties: [ 'openFile' ],
                        filters: [{ 
                            name: 'G Code', 
                            extensions: [ 'gcode' ] 
                        }]
                    });

                    if (result.canceled) {
                        return;
                    }

                    openFile = result.filePaths[0];

                    console.log(openFile);

                    loadGCodeFile();
                }
            },
            {
                role: 'close'
            }
            
        ]
    }, { 
        role: 'viewMenu' 
    }, {
        role: 'help',
        submenu: [
            {
                label: 'Learn More',
                click: async () => {
                    const { shell } = require('electron')
                    await shell.openExternal('https://electronjs.org')
                }
            }
        ]
    }
];

Menu.setApplicationMenu(Menu.buildFromTemplate(template));