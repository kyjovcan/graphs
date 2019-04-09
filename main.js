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

    sampleFile.mv('./logs/log.txt', function(err) {
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
    vels = mapArray();
    fn({ data: vels });
  });
});

/* OLD FUNCTION MAP ARRAY WITHOUT EQUAL TIMES
function mapArray() {
    const data = parseLog();

    const allVelocities = data.questions.map((question, i) => {
        if (i == 5) {
            const moves = question.mm[0].split(',');
            if (question.name)
                console.log(question.name + ' otazka ');

            let temp = '';
            let tempDistance = 0;
            let itRoll = 0;

            const vels = moves.map((move, index) => {
                if (index === 0) {
                    temp = move;
                    return {velocity: 0, time: 0, row: 1};
                }
                else {
                    const currentVars = move.split(" ");
                    const prevVars = temp.split(" ");
                    temp = move;
                    const deltaT = Math.abs(currentVars[0].replace('"', '') - prevVars[0].replace('"', ''));
                    const deltaX = Math.abs(currentVars[1] - prevVars[1]);
                    const deltaY = Math.abs(currentVars[2].replace('"', '') - prevVars[2].replace('"', ''));
                    const dist = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));

                    const rowNumber = Math.floor((currentVars[2].replace('"', '') - 1) / rowHeight);

                    const vel = {
                        velocity: dist / deltaT,
                        time: currentVars[0].replace('"', ''),
                        row: rowNumber,
                    };

                    return vel;
                }
            });

            const quest = {
                vels: vels,
                name: question.name ? question.name : 'n/a',
                answer: question.answer,
                difference: question.difference,
            };
            return quest;
        }
    });

    writeFile("./logAllVelocities.json", allVelocities);

    return allVelocities;
}
*/

// NEW FUNCTION WITH EQUAL TIMES
function mapArray() {
    const data = parseLog();

    const allVelocities = data.questions.map((question, i) => {
        if (i === 6) {      // TOTO POJDE PREC ***************************************
            const moves = question.mm[0].split(',');
            if (question.name)
                console.log(question.name + ' otazka ');

            let temp = '';
            let tempDistance = 0;
            let tempIterator = 1;              // ssssssssssssssssss
            let timeIterator = 1;
            let isNewTimeStep = true;

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

                    console.log('\noooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo');

                    const rowNumber = Math.floor((actY - 1) / rowHeight);

                    timeIterator = Math.floor(actTime / timeStep);
                    const actTimeStep = timeIterator * timeStep;

                    if ( timeIterator !== tempIterator ){           // presli sme vyssie
                        if (actTime % timeStep === 0) {
                            // ak sme presne na 200*TI normalne vypocitaj vel a resetuj temp dist
                            const actVel = {
                                velocity: tempDistance / timeStep,
                                time: actTime,
                                row: rowNumber,
                            };
                            tempDistance = 0;
                            tempIterator = timeIterator;
                            console.log('* ' + actTime + ' / ' + actTimeStep
                                + ' dist ' + tempDistance + ' time ' + actVel.time + ' vel ' + actVel.velocity);
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
                            console.log('---------------- ' + actTime + ' / ' + actTimeStep
                                + ' dist ' + tempDistance + ' time ' + vel.time  + ' vel ' + vel.velocity);
                            return vel;
                        }
                    }
                    else {
                        tempDistance += dist;
                        console.log('++++++++ ' + actTime + ' / ' + actTimeStep + ' dist ' + tempDistance);
                    }
                }
            });

            const quest = {
                vels: vels,
                name: question.name ? question.name : 'n/a',
                answer: question.answer,
                difference: question.difference,
            };
            return quest;
        }
    });

    writeFile("./logAllVelocities.json", allVelocities);

    return allVelocities;
}


function parseLog(){
    const myLines = fs.readFileSync('./logs/log.txt').toString().split('\n');

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
        };
        
        // QUESTION MOUSE DATA RETRIEVAL
        const matchData = line.match(/====BEGIN\[{"(evs|mm)":/);
        const question = {};

        if (matchData) {
            let mm = line.match(new RegExp(/"mm":\[(.*)],"(ans|evs)/));
            if (!mm) {
                mm = line.match(new RegExp(/"mm":\[(.*)]}]END====/));
                question.mm = [];
                question.mm.push(mm[1]);
                question.answer = 'n/a';
            } else {
                question.mm = [];
                question.mm.push(mm[1]);
                const answer = line.match(new RegExp(/"ans_(code_\d{2}_\d|tutorial_\d{2})":(.*)}]END====/));
                question.name = answer[1];
                question.answer = answer[2];
            }
            tempQuestion = question;
        };

        // QUESTION EVALUATION DATA RETRIEVAL
        const evalData = line.match(/====BEGIN\[{"diff_(code_\d{2}_\d)":"(.*)"}]END====/);
        
        if (evalData) {
            tempQuestion.difference = evalData[2];
            userData.questions.push(tempQuestion);
            tempQuestion = {};
        };

        // OVERALL EVALUATION DATA RETRIEVAL
        const evaluation = line.match(/====BEGIN\[{"eval":"(.*)","comment":"(.*)"}]END====/);
        
        if (evaluation) {
            userData.eval = evaluation[1];
            userData.comment = evaluation[2];
        };
    });

    writeFile("./logData.json", userData);

    return userData;
}

function writeFile(name, data){
    fs.writeFile(name, JSON.stringify(data), function(err) {
        if(err) {
            return console.log(err);
        }
        console.log(`The file ${name} was saved!`);
    });
}