const request = require('request');
const fs = require('fs');
const express = require('express');
const app = express();
const fileUpload = require('express-fileupload');
const server = require('http').Server(app);
const io = require('socket.io')(server);

app.get('', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.get('/client.js', function(req, res){
    res.sendFile(__dirname + '/client/client.js');
});
app.get('/icon.gif', function(req, res){
    res.sendFile(__dirname + '/client/icon.gif');
});
app.get('/style.css', function(req, res){
    res.sendFile(__dirname + '/client/style.css');
});
app.get('/jquery-3.3.1.min.js', function(req, res){
    res.sendFile(__dirname + '/client/jquery-3.3.1.min.js');
});
app.get('/Chart.bundle.js', function(req, res){
    res.sendFile(__dirname + '/node_modules/chart.js/dist/Chart.bundle.js');
});

const rowHeight = 32;
const peepholeHeight = 20;
const timeStep = 200;
let vels = [];

app.use(fileUpload());

app.post('/upload', function(req, res) {
    if (Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }
    console.log('Files uploading');

    let sampleFile = req.files.sampleFile;

    sampleFile.mv('./uploadedLogs/log.txt', function(err) {
        if (err)
          return res.status(500).send(err);
    
        res.send('LOG received', 200);
        res.end();
    });
});

// inicializacia servera
server.listen(process.env.PORT || 2500);
console.log("Server started on PORT 2500");

// pripojenie na klienta
io.on('connection', function (socket) {
  socket.on('mainInput', function (data) {
    console.log("Connected");
  });

  socket.on('computeData', function (data, fn){
    vels = mapArray(0);
      console.log(vels);
    fn({ data: vels.velocities });
  });

  socket.on('computeAll', function (data, fn){
    getAllLogs();
  });
});

function parseLog(lines){
    let myLines = [];

    if (!lines) {
        myLines = fs.readFileSync('./uploadedLogs/log.txt').toString().split('\n');
    } else {
        myLines = lines;
    }

    let userData = {
        cursor: '',
        expMonths: '',
        expType: '',
        questions: []
    };

    let tempQuestion = {};

    myLines.forEach((line, index) => {
        // INTRODUCTION INFORMATION RETRIEVAL
        const matchIntro = line.match(/====BEGIN\[{"cursor"/);
        if (matchIntro) {
            const intro = line.match(/"cursor":"(.*)","exp_months":"(.*)","exp_type":"(.*)"}]END====/);
            userData.cursor = intro[1];
            userData.expMonths = intro[2];
            userData.expType = intro[3];
        }

        // QUESTION MOUSE DATA RETRIEVAL
        const matchData = line.match(/====BEGIN\[{"(evs|mm)":/);
        const question = {};

        // IF DATA STARTS WITH 'EVS'
        if (matchData && matchData[1] === 'evs') {
            let mm = line.match(new RegExp(/"mm":\[(.*)],"ans/));

            if (!mm) {  // IF MM DOESNT CONTAIN ANSWER
                mm = line.match(new RegExp(/"mm":\[(.*)]}]END====/));
                if (!mm) {
                    const answer = line.match(new RegExp(/"ans_(code_\d{2}_\d|tutorial_\d{2})":(.*)}]END====/));
                    if (answer && answer[1].indexOf("code") > -1) {
                        question.mm = [];
                        question.name = answer[1];
                        question.answer = answer[2];
                    }
                }
                else {
                    question.mm = [];
                    question.mm.push(mm[1]);
                    question.name = 'n/a';
                    question.answer = 'n/a';
                }
            }
            else {      // IF MM CONTAINS ANSWER
                const answer = line.match(new RegExp(/"ans_(code_\d{2}_\d|tutorial_\d{2})":(.*)}]END====/));
                if (answer && answer[1].indexOf("code") > -1) {
                    question.mm = [];
                    question.mm.push(mm[1]);
                    question.name = answer[1];
                    question.answer = answer[2];
                }
            }
            tempQuestion = question;
        }
        // IF DATA STARTS WITH 'MM'
        else if (matchData && matchData[1] === 'mm') {
            let mm = line.match(new RegExp(/"mm":\[(.*)],"evs/));

            const answer = line.match(new RegExp(/"ans_(code_\d{2}_\d)":(.*)}]END====/));

            if (!answer) {  // IF MM DOESNT CONTAIN ANSWER
                question.mm = [];
                question.mm.push(mm[1]);
                question.name = 'n/a';
                question.answer = 'n/a';
            }
            else {          // IF MM CONTAINS ANSWER
                question.mm = [];
                question.mm.push(mm[1]);

                question.name = answer[1];
                question.answer = answer[2];
            }
            tempQuestion = question;
        }

        // QUESTION EVALUATION DATA RETRIEVAL
        const evalData = line.match(/====BEGIN\[{"diff_(code_\d{2}_\d)":"(.*)"}]END====/);

        if (evalData) {
            tempQuestion.difficulty = evalData[2];
            userData.questions.push(tempQuestion);
            tempQuestion = {};
        }

        // OVERALL EVALUATION DATA RETRIEVAL
        const evaluation = line.match(/====BEGIN\[{"eval":"(.*)","comment":"(.*)"}]END====/);

        if (evaluation) {
            userData.eval = evaluation[1];
            userData.comment = evaluation[2];
        }
    });
    writeFile("./logData.json", userData);

    return userData;
}

function mapArray(lines) {
    const data = parseLog(lines);

    const allVelocities = data.questions.map((question) => {
        // IF THERE ARE NO MOUSE MOVEMENTS RETURN EMPTY VELOCITIES
        if (question.mm.length === 0) {
            console.log('QUESTION MM IS EMPTY');
            return {
                vels: [],
                name: question.name ? question.name : 'n/a',
                answer: question.answer,
                difficulty: question.difficulty,
            }
        }

        const moves = question.mm[0].split(',');
        let temp = '';
        let tempDistance = 0;
        let tempIterator = 1;
        let timeIterator = 1;

        const vels = moves.map((move, index) => {
            if (index === 0) {
                temp = move;
                const currentVars = move.split(" ");
                actTime = currentVars[0].replace('"', '');
                tempIterator = Math.floor(actTime / timeStep);
                return {velocity: 0, time: 0, row: 1};
            }
            else {
                const currentVars = move.split(" ");
                const prevVars = temp.split(" ");
                actTime = currentVars[0].replace('"', '');
                prevTime = prevVars[0].replace('"', '');
                actX = currentVars[1];
                prevX = prevVars[1];
                actY = currentVars[2].replace('"', '');
                prevY = prevVars[2].replace('"', '');

                temp = move;
                const deltaT = Math.abs(actTime - prevTime);
                const deltaX = Math.abs(actX - prevX);
                const deltaY = Math.abs(actY - prevY);
                const dist = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
                const rowNumber = Math.floor((actY - 1) / rowHeight);

                timeIterator = Math.floor(actTime / timeStep);
                const actTimeStep = timeIterator * timeStep;

                if (timeIterator !== tempIterator) {
                    if (actTime % timeStep === 0) {
                        // ak sme presne na 200*TI normalne vypocitaj vel a resetuj temp dist
                        const actVel = {
                            velocity: tempDistance / timeStep,
                            time: actTime,
                            row: rowNumber,
                        };
                        tempDistance = 0;
                        tempIterator = timeIterator;
                        return actVel;
                    }
                    else {
                        // ked sme vyssie (205) vypocitaj temp dist od 200 a vrat velocity v case 200
                        const actVel = dist / deltaT;

                        const vel = {
                            velocity: tempDistance / timeStep,
                            time: actTimeStep,
                            row: rowNumber,
                        };
                        tempDistance = actVel * (actTime - actTimeStep);
                        tempIterator = timeIterator;
                        return vel;
                    }
                }
                else {
                    tempDistance += dist;
                }
            }
        });

        const cleanVels = vels.filter((v) => {
            return v !== undefined;
        });

        const quest = {
            vels: cleanVels,
            name: question.name ? question.name : 'n/a',
            answer: question.answer,
            difficulty: question.difficulty,
        };
        return quest;
    });

    writeFile("./logAllVelocities.json", allVelocities);

    const {cursor, expMonths, expType, eval, comment} = data;

    return {
        velocities: allVelocities,
        cursor,
        expMonths,
        expType,
        eval,
        comment,
    };
}

function getAllLogs(){
    const folders = fs.readdirSync('./allLogs');

    const allLogFiles = folders.map((folder, i) => {
        const logLines = fs.readFileSync('log').toString().split('\n');
        console.log(folder + ' ------ prechadzam');
        const logContents = mapArray(logLines);

        const logFile = {
            //logLines: logLines,
            userId: folder,
            logContents,
        };

        writeFile(`./clearLogs/${folder}.json`, logFile);

        return logFile;
    })

}

function writeFile(name, data){
    fs.writeFileSync(name, JSON.stringify(data));
}
