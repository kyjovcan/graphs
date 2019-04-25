const request = require('request');
const fs = require('fs');
const express = require('express');
const app = express();
const fileUpload = require('express-fileupload');
const server = require('http').Server(app);
const io = require('socket.io')(server);
const csv = require("csvtojson");

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
const timeStep = 200;
let vels = [];

const AOIs = JSON.parse(fs.readFileSync('AOIs.json').toString());

app.use(fileUpload());

app.post('/upload', function(req, res) {
    if (Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }
    console.log('Files uploading');

    let sampleFile = req.files.sampleFile;

    sampleFile.mv('./logs/uploadedLogs/log.txt', function(err) {
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

  socket.on('computeOneFile', function (data, fn){
    vels = mapArray(0);
    fn({ data: vels });
  });   // VYSTUP -> jeden uploadnuty log subor spracovany

  socket.on('computeAllFiles', function (data, fn){
      getAllLogs();
  });   // VYSTUP -> vsetky log subory v CLEARLOGS ocistene so vsetkymi datami

  socket.on('processETData', async function (data, fn){
      processETData();
  });   // VYSTUP -> vsetky ET data z hash/log suborov , ID, znamky + fixacie z EXPORT CSV

  socket.on('processMouseData', async function (data, fn){
      processMouseData();
  });   // VYSTUP -> spracovane mouse data

});

function parseLog(lines){
    let myLines = [];

    if (!lines) {
        myLines = fs.readFileSync('./logs/uploadedLogs/log.txt').toString().split('\n');
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
        const matchIntro = line.match(/====BEGIN\[{"(cursor|exp_months|exp_type)"/);
        if (matchIntro) {
            const cursor = line.match(/"cursor":"(.{1,10})(","exp_type|","exp_months|"}]END)/);
            if (cursor) {
                userData.cursor = cursor[1];
            }
            const expMonths = line.match(/"exp_months":"(.{1,10})(","cursor|","exp_|"}]END)/);
            if (expMonths) {
                userData.expMonths = expMonths[1];
            }
            const expType = line.match(/"exp_type":"(.{1,15})(","exp_|","cursor|"}]END====)/);
            if (expType) {
                userData.expType = expType[1];
            }
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
            tempQuestion.name = evalData[1];
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

    writeFile("./logs/logData.json", userData);
    console.log('Parse data complete');
    return userData;
}

function mapArray(lines) {
    const data = parseLog(lines);
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    const allVelocities = data.questions.map((question) => {
        // IF THERE ARE NO MOUSE MOVEMENTS RETURN EMPTY VELOCITIES
        if (!question.mm || question.mm.length === 0) {
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
            answer: question.answer.replace(/"/g, ''),
            difficulty: question.difficulty,
        };

        quest.resultCorrect = evaluateCorrect(quest);
        quest.resultCorrect ? correctAnswers++ : incorrectAnswers++;

        return quest;
    });

    writeFile("./logs/logAllVelocities.json", allVelocities);

    const {cursor, expMonths, expType, eval, comment} = data;
    const abilityAvg = ((100 * correctAnswers)/(correctAnswers + incorrectAnswers))/100;
    const correctAnswersCount = correctAnswers;
    const incorrectAnswersCount = incorrectAnswers;
    correctAnswers = 0;
    incorrectAnswers = 0;

    return {                // tu pridame metriky
        velocities: allVelocities,
        cursor,
        expMonths,
        expType,
        eval,
        comment,
        abilityAvg,
        correctAnswersCount,
        incorrectAnswersCount
    };
}

function evaluateRowFixation() {

}

function evaluateCorrect(question) {
    const questionName = question.name.slice(0, 7);
    const questionVariant = question.name.slice(8, 9);
    const ResultCorrect = AOIs.find((q) => {
        return questionName === q.name
    });

    if (ResultCorrect) {
        return ResultCorrect.correct[questionVariant-1] === question.answer;
    }
    else return false;
}

async function getAllLogs(){
    const folders = fs.readdirSync('./logs/logsSecondRun');
    const studentData = await getStudentData();

    const allLogFiles = folders.map((folder, index) => {
        const logLines = fs.readFileSync(`./logs/logsSecondRun/${folder}/log`).toString().split('\n');
        console.log(index + ' folder       ' + folder);
        const logContents = mapArray(logLines);

        const student = studentData.find(line => {
            return line.studentHash === folder;
        });

        const logFile = {
            grade: student ? student.grade : 'n/a',
            studentId: student ? student.studentId : 'n/a',
            userId: folder,
            logContents,
        };

        writeFile(`./logs/clearLogs/${folder}.json`, logFile);

        return logFile;
    });
}

function processMouseData() {
    evaluateCorrect(0);
}

async function getStudentData() {
    return await csv().fromFile('./logs/data.csv');
}

async function getEyetrackerData(){
    return await csv().fromFile('./logs/export.csv');
}

async function processETData() {
    const studentData = await getStudentData();
    const eyetrackerData = await getEyetrackerData();

    writeFile(`./logs/students.json`, studentData);
    writeFile(`./logs/ET.json`, eyetrackerData);

    let tempStudent = {};
    tempStudent.Metrics = [];
    let student = {};
    let isNew = 0;

    let processedET = eyetrackerData.map((line) => {
        const {
            UserId, CodeId, Variant1, Variant2, Variant3, ResultCorrect,
            DiffAvg, SubjDiffAvg, SubjDiffCorrectAvg, SubjDiffIncorrectAvg,
            DurationAvg, DurationCorrectAvg, DurationIncorrectAvg, SubjDiff,
            Duration, DurationSum, AbilityAvg,
            PriorExpHighSchool, PriorExpSmallProjects, PriorExpPublicProjects,
            ExpIndividual, ExpProfessional, ExpOther, ProgLangCount,
            FixationCodeCount, FixationCodeDuration, FixationOtherDuration,
            SaccadeDuration, FixationCodeDurationAvg, FixationCodeDurationSD,
            AoiMainFixDurationRatio, AoiMainFixDurationAvg, AoiFuncFixDurationRatio, AoiFuncFixDurationAvg,
            MouseClickAccuracyAvg, MouseClickAccuracySD, MouseClickSpeedAvg, MouseClickSpeedSD,
            ReactionSpeedAvg, ReactionSpeedSD,
            MemorySearchSpeedSlopeAvg, MemorySearchSpeedSlopeSD,
            MouseTrailHitTimeAvg, MouseTrailHitTimeSD, MouseTrailTwoSlope,
            MemorySize, MemoryPeek
        } = line;

        if (tempStudent.UserId && tempStudent.UserId !== UserId){
            student = tempStudent;
            isNew = 1;
            tempStudent = {};
            tempStudent.Metrics = [];
        }

        const userHash = studentData.find(line => {
            if (line.studentId === UserId) {
                return line;
            }
        });

        if (Variant1 === '1'){
            questionName = CodeId > 9 ? `code_${CodeId}_1`: `code_0${CodeId}_1`;
        }
        else if (Variant2 === '1'){
            questionName = CodeId > 9 ? `code_${CodeId}_2`: `code_0${CodeId}_2`;
        }
        else if(Variant3 === '1'){
            questionName = CodeId > 9 ? `code_${CodeId}_3`: `code_0${CodeId}_3`;
        }

        tempStudent.UserId = UserId;
        tempStudent.UserHash = userHash ? userHash.studentHash : 'n/a';
        tempStudent.Grade = userHash ? userHash.grade : 'n/a';
        tempStudent.AbilityAvg = AbilityAvg;
        tempStudent.Experience  = {
                PriorExpHighSchool,
                PriorExpSmallProjects,
                PriorExpPublicProjects,
                ExpIndividual,
                ExpProfessional,
                ExpOther,
                ProgLangCount,
            };
        tempStudent.Cognitive = {
                MouseClickAccuracyAvg,
                MouseClickAccuracySD,
                MouseClickSpeedAvg,
                MouseClickSpeedSD,
                ReactionSpeedAvg,
                ReactionSpeedSD,
                MemorySearchSpeedSlopeAvg,
                MemorySearchSpeedSlopeSD,
                MouseTrailHitTimeAvg,
                MouseTrailHitTimeSD,
                MouseTrailTwoSlope,
                MemorySize,
                MemoryPeek,
            };
        tempStudent.Metrics.push({
            name: questionName,
            ResultCorrect,
            DiffAvg,
            SubjDiffAvg,
            SubjDiffCorrectAvg,
            SubjDiffIncorrectAvg,
            DurationAvg,
            DurationCorrectAvg,
            DurationIncorrectAvg,
            SubjDiff,
            Duration,
            DurationSum,
            FixationCodeCount,
            FixationCodeDuration,
            FixationOtherDuration,
            SaccadeDuration,
            FixationCodeDurationAvg,
            FixationCodeDurationSD,
            AoiMainFixDurationRatio,
            AoiMainFixDurationAvg,
            AoiFuncFixDurationRatio,
            AoiFuncFixDurationAvg,
        });

        if (isNew){
            isNew = 0;
            return student;
        }
    });

    processedET =  processedET.filter((data) => {
        if (!data) return false;
        else {
            return data;
        }
    });

    writeFile(`./logs/processedET.json`, processedET);
    console.log('processed ET ');
}

function writeFile(name, data){
    fs.writeFileSync(name, JSON.stringify(data));
}
