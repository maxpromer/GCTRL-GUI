let openFile;

let svgScale = 2.5;

let svg = document.getElementById("preview");

let gcodeLine = [];

let minX = 99999999999.99, minY = 99999999999.99, maxX = -99999999999.99, maxY = -99999999999.99;

let loadGCodeFile = () => {
    let rd = readline.createInterface({
        input: fs.createReadStream(openFile),
        output: process.stdout,
        console: false
    });
    
    let penDownFlag = false;
    let lastX = 0;
    let lastY = 0;
    let pathCode = "";
    

    rd.on('line', function(line) {
        // console.log(line);
        gcodeLine.push(line);
    });

    rd.on('close', () => {
        // Find size
        for (let line of gcodeLine) {
            if (/^M300\s?S30/g.test(line)) { // pen down
                penDownFlag = true;

                if (lastX < minX) {
                    minX = lastX;
                }
                if (lastX > maxX) {
                    maxX = lastX;
                }
                if (lastY < minY) {
                    minY = lastY;
                }
                if (lastY > maxY) {
                    maxY = lastY;
                }
            } else if (/^M300\s?S50/g.test(line)) { // pen up
                penDownFlag = false;
            } else if (/^G[12]\sX[0-9-.]+\sY[0-9-.]+/g.test(line)) {
                let res = /^G[12]\sX([0-9-.]+)\sY([0-9-.]+)/g.exec(line);
                let x = parseFloat(res[1]);
                let y = parseFloat(res[2]);

                if (penDownFlag) {
                    if (x < minX) {
                        minX = x;
                    }
                    if (x > maxX) {
                        maxX = x;
                    }
                    if (y < minY) {
                        minY = y;
                    }
                    if (y > maxY) {
                        maxY = y;
                    }
                }

                lastX = x;
                lastY = y;
            }
        }

        let width = Math.abs(maxX - minX);
        let height = Math.abs(maxY - minY);

        // width += 10; // add 10mm
        // height += 10; // add 10mm

        // Draw preview
        for (let line of gcodeLine) {
            if (/^M300\s?S30/g.test(line)) { // pen down
                penDownFlag = true;
                pathCode = `${lastX},${lastY}`;
            } else if (/^M300\s?S50/g.test(line)) { // pen up
                penDownFlag = false;
                
                let polyline = document.createElement('polyline');
                polyline.setAttribute('points', pathCode);
                polyline.setAttribute('style', 'fill:none;stroke:black;stroke-width:1');
                // console.log(polyline);
    
                svg.appendChild(polyline);
    
                pathCode = "";
            } else if (/^G[12]\sX[0-9-.]+\sY[0-9-.]+/g.test(line)) { // drew
                let res = /^G[12]\sX([0-9-.]+)\sY([0-9-.]+)/g.exec(line);
                let x = (parseFloat(res[1]) + (minX < 0 ? Math.abs(minX) : -minX)) * svgScale;
                let y = (height - parseFloat(res[2]) - (minY < 0 ? Math.abs(minY) : -minY)) * svgScale;
                // console.log(x, y);
    
                if (penDownFlag) {
                    pathCode += ` ${x},${y}`;
                }
    
                lastX = x;
                lastY = y;
            }
        }

        svg.setAttribute('width', width * svgScale);
        svg.setAttribute('height', height * svgScale);
        svg.innerHTML = svg.innerHTML + ' SVG Not support';
        
    });
};



let serial;
let file_image;
let moveEND = false;

let serialConnect = (port) => {
    serial = new SerialPort(port, { baudRate: 9600 });

    serial.on('data', (chunk) => {
        console.log(`Received ${chunk.length} bytes of data.`);
        console.log('data', chunk.toString('utf-8'));

        if (chunk.toString('utf-8').indexOf("ok") >= 0) {
            moveEND = true;
        }
    });

    serial.on('end', () => {
        console.log('Serial disconnect');
    });
};

let delay = (time_ms) => {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, time_ms);
    });
};

let writeLine = async (x, y, z) => {
    moveEND = false;
    serial.write(`${writeLine}\n`);
    while(moveEND === false) {
        console.log("Wait move END");
        await delay(10);
    }
}

$(async () => {
    /*
    $("#btn-file-select").click(async () => {
        let files = await dialog.showOpenDialog({
            properties: [ 'openFile' ],
            filters: [{ 
                name: 'Images', 
                extensions: ['jpg', 'png', 'gif', 'bmp'] 
            }]
        });

        if (files.canceled) {
            return;
        }

        file_image = files.filePaths[0];

        console.log(file_image);
        $("#img-preview").attr("src", file_image).hide();

        $("#img-preview").on("load", () => {
            var canvas = document.getElementById("area");
            var image = $("#img-preview")[0];
            canvas.width = image.width;
            canvas.height = image.height;
            var context = canvas.getContext("2d");
            
            context.drawImage(image, 0, 0);

            var imgd = context.getImageData(0, 0, image.width, image.height);
            var pix = imgd.data;
            for (var i = 0, n = pix.length; i < n; i += 4) {
                var grayscale = pix[i] * .3 + pix[i+1] * .59 + pix[i+2] * .11;
                pix[i ] = grayscale;  // red
                pix[i+1] = grayscale; // green
                pix[i+2] = grayscale; // blue
            }
            context.putImageData(imgd, 0, 0);
        });

        $("#btn-start").click(async () => {
            var canvas = document.getElementById("area");
            var context = canvas.getContext("2d");
            var imgd = context.getImageData(0, 0, canvas.width, canvas.height);
            var pix = imgd.data;
            var dataBlackWhite = [];
            for (let y=0;y<canvas.height;y++) {
                for (let x=0;x<canvas.width;x++) {
                    if (typeof dataBlackWhite[y] !== 'object') {
                        dataBlackWhite[y] = [];
                    }
                    let index = ((y * canvas.width) + x) * 4;
                    // console.log(pix[index], pix[index + 1], pix[index + 2]);
                    if ((pix[index] + pix[index + 1] + pix[index + 2]) < (255 * 3 / 2)) {
                        dataBlackWhite[y].push(1);
                    } else {
                        dataBlackWhite[y].push(0);
                    }
                }
            }

            //console.log(dataBlackWhite);
            for (let y=0;y<canvas.height;y++) {
                startX = -1;
                endX = -1;
                for (let x=0;x<canvas.width;x++) {
                    if (dataBlackWhite[y][x] == 1 && dataBlackWhite[y][x - 1] == 0) {
                        startX = x;
                    } else if ((dataBlackWhite[y][x] == 0 && dataBlackWhite[y][x - 1] == 1) || (startX !== -1 && x == (canvas.width - 1))) {
                        endX = x - 1;

                        // console.log(y, startX, endX)
                        await moveTo(y, startX, 900);
                        await delay(1000);
                        await moveTo(y, startX, 0);
                        await delay(1000);
                        await moveTo(y, endX, 0);
                        await delay(1000);
                        await moveTo(y, endX, 90);
                        await delay(1000);

                        startX = -1;
                        endX = -1;
                    }
                }
            }
        });
    });
*/
    // List port
    let ports = await SerialPort.list();
    if (ports.length == 0) {
        console.log("Not found port");
        return;
    }

    // Connect
    serialConnect(ports[0].path);
    

    $("#start-btn").click(async () => {
        for (let line of gcodeLine) {
            await writeLine(line);
        }
    });
});