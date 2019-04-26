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
const peekHeight = 16;
const timeStep = 100;
const fixationMaxSpeed = 0.5;
let studentData = [];

const AOIs = JSON.parse(fs.readFileSync('AOIs.json').toString());

/**
 * File upload for single log files
 */
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

/**
 * Server initialization
 */
server.listen(process.env.PORT || 2500);
console.log("Server started on PORT 2500");

/**
 * Server connection to client
 */
io.on('connection', function (socket) {
  socket.on('mainInput', function (data) {
    console.log("Connected");
  });

  /**
     * Processing of ONE log file
     * Output: processed data of one file
     */
  socket.on('computeOneFile', function (data, fn) {
    studentData = mapArray(0);
    fn({ data: studentData });
  });

  /**
     * Processing of ALL log files
     * Output: processed data of all files stored in ./clearLogs
     */
  socket.on('computeAllFiles', function (data, fn){
      getAllLogs('logsSecondRun');
  });

  /**
     * Processing of EyeTracker data
     * Output: processed data of .csv files with ET data of all students in ./processedET.json
     */
  socket.on('processETData', async function (data, fn){
      processETData();
  });

  /**
     * Processing of mouse data
     * Output: processed data of all files with mouse data
     */
  socket.on('processMouseData', async function (data, fn){
      processMouseData();
  });
});

/**
 * ParseLog Function
 * Input: raw log file
 * Output: parsed data from log files:
 *      - cursor, months of experience and exp level, overall evaluation
 *      - every question - mouse movements, name of the question, answer, difficulty
 */
function parseLog(lines){
    let myLines = [];
    let userData = {
        cursor: '',
        expMonths: '',
        expType: '',
        questions: []
    };
    let tempQuestion = {};

    // If we didn't receive log contents, read contents from uploaded log file
    if (!lines) {
        myLines = fs.readFileSync('./logs/uploadedLogs/log.txt').toString().split('\n');
    } else {
        myLines = lines;
    }

    myLines.forEach((line, index) => {
        // *** Introduction data retrieval - cursor and experience
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

        // *** Data retrieval from mouse movements
        const matchData = line.match(/====BEGIN\[{"(evs|mm)":/);
        const question = {};

        // If data starts with 'EVS'
        if (matchData && matchData[1] === 'evs') {
            let mm = line.match(new RegExp(/"mm":\[(.*)],"ans/));

            // If mm doesn't contain an answer
            if (!mm) {
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
            // If mm contains an answer
            else {
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
        // If data starts with 'MM'
        else if (matchData && matchData[1] === 'mm') {
            let mm = line.match(new RegExp(/"mm":\[(.*)],"evs/));
            const answer = line.match(new RegExp(/"ans_(code_\d{2}_\d)":(.*)}]END====/));

            // If mm doesn't contain an answer
            if (!answer) {
                question.mm = [];
                question.mm.push(mm[1]);
                question.name = 'n/a';
                question.answer = 'n/a';
            }
            // If mm contains an answer
            else {
                question.mm = [];
                question.mm.push(mm[1]);
                question.name = answer[1];
                question.answer = answer[2];
            }
            tempQuestion = question;
        }

        // *** Question evaluation data retrieval
        const evalData = line.match(/====BEGIN\[{"diff_(code_\d{2}_\d)":"(.*)"}]END====/);

        if (evalData) {
            tempQuestion.name = evalData[1];
            tempQuestion.difficulty = evalData[2];
            userData.questions.push(tempQuestion);
            tempQuestion = {};
        }

        // *** Overall evaluation data retrieval
        const evaluation = line.match(/====BEGIN\[{"eval":"(.*)","comment":"(.*)"}]END====/);

        if (evaluation) {
            userData.eval = evaluation[1];
            userData.comment = evaluation[2];
        }
    });

    // Saving parsed data results to log file
    writeFile("./logs/logData.json", userData);
    console.log('*** Data parsing complete');
    return userData;
}

/**
 * MapArray Function
 * Input: parsed data from log file
 * Output: processed data from log files with info about students and questions:
 *      - cursor, months of experience and exp level, overall evaluation
 *      - final score, number of (in)correctly answered questions
 *      - every question    - mouse velocities, name of the question, answer, difficulty
 *                          - AOIs fixation counts, saccades counts, corectness
 */
function mapArray(lines) {
    const data = parseLog(lines);
    let correctAnswers = 0;
    let incorrectAnswers = 0;

    const allQuestions = data.questions.map((question, i) => {
        let temp = '';
        let tempDistance = 0;   let tempIterator = 1;       let timeIterator = 1;
        let BeaconFixCount= 0;  let InputFixCount= 0;       let MainFixCount= 0;    let FunctionFixCount= 0;
        let OtherFixCount= 0;   let AllFixationsCount= 0;   let AllSaccadesCount= 0;

        // If there are no mouse movements, return empty velocities
        if (!question.mm || question.mm.length === 0) {
            return {
                velocities: [],
                name: question.name ? question.name : 'n/a',
                answer: question.answer,
                difficulty: question.difficulty,
                resultCorrect: 0,
                BeaconFixCount: 0,
                InputFixCount: 0,
                MainFixCount: 0,
                FunctionFixCount: 0,
                OtherFixCount: 0,
                AllFixationsCount: 0,
                AllSaccadesCount: 0
            }
        }

        const moves = question.mm[0].split(',');

        // Else compute all velocities and fixations
        const velocities = moves.map((move, index) => {
            if (index === 0) {
                temp = move;
                const currentVars = move.split(" ");
                const actTime = currentVars[0].replace('"', '');
                tempIterator = Math.floor(actTime / timeStep);
                AllSaccadesCount++;
                return {velocity: 0, time: 0, row: 1, isBeaconFix: 0, isInputFix: 0,
                    isMainFix: 0, isFunctionFix: 0, isOtherFix: 0, isSaccade: 1};
            }
            else {
                const currentVars = move.split(" ");
                const prevVars = temp.split(" ");
                const actTime = currentVars[0].replace('"', '');
                const prevTime = prevVars[0].replace('"', '');
                const actX = currentVars[1];
                const prevX = prevVars[1];
                const actY = currentVars[2].replace('"', '');
                const prevY = prevVars[2].replace('"', '');

                const deltaT = Math.abs(actTime - prevTime);
                const deltaX = Math.abs(actX - prevX);
                const deltaY = Math.abs(actY - prevY);
                const dist = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));

                temp = move;

                // Time Iterator for calculating at the same time steps
                timeIterator = Math.floor(actTime / timeStep);
                const actTimeStep = timeIterator * timeStep;
                const isFixation = ((tempDistance / timeStep) < fixationMaxSpeed) ? 1 : 0;

                if (timeIterator !== tempIterator) {
                    // Calculating, whether the move is saccade or fixation, and its belonging
                    const row = evaluateRowFixation(actY, question.name);
                    const {rowNumber, isBeaconFix, isInputFix, isMainFix, isFunctionFix, isOtherFix} = row;

                    BeaconFixCount = isFixation && isBeaconFix ? BeaconFixCount + 1 : BeaconFixCount;
                    InputFixCount = isFixation && isInputFix ? InputFixCount + 1 : InputFixCount;
                    MainFixCount = isFixation && isMainFix ? MainFixCount + 1 : MainFixCount;
                    FunctionFixCount = isFixation && isFunctionFix ? FunctionFixCount + 1 : FunctionFixCount;
                    OtherFixCount = isFixation && isOtherFix ? OtherFixCount + 1 : OtherFixCount;
                    AllFixationsCount = isFixation ? AllFixationsCount + 1 : AllFixationsCount;
                    AllSaccadesCount = isFixation ? AllSaccadesCount : AllSaccadesCount + 1;

                    // When actual time is exactly timeStep*iterator, calculate velocity and reset temp
                    if (actTime % timeStep === 0) {
                        const actVel = {
                            velocity: tempDistance / timeStep,
                            time: parseInt(actTime, 10),
                            row: rowNumber,
                            isBeaconFix: isBeaconFix ? 1 : 0,
                            isInputFix: isInputFix ? 1 : 0,
                            isMainFix: isMainFix ? 1 : 0,
                            isFunctionFix: isFunctionFix ? 1 : 0,
                            isOtherFix: isOtherFix ? 1 : 0,
                            isSaccade: isFixation ? 0 : 1,
                        };
                        tempDistance = 0;
                        tempIterator = timeIterator;

                        return actVel;
                    }
                    // When actual time is higher, calculate distance to timeStep*iterator
                    //  and return velocity in timeStep*iterator, also calculate fixations
                    else {
                        const row = evaluateRowFixation(actY, question.name);
                        const {rowNumber, isBeaconFix, isInputFix, isMainFix, isFunctionFix, isOtherFix} = row;

                        BeaconFixCount = isFixation && isBeaconFix ? BeaconFixCount + 1 : BeaconFixCount;
                        InputFixCount = isFixation && isInputFix ? InputFixCount + 1 : InputFixCount;
                        MainFixCount = isFixation && isMainFix ? MainFixCount + 1 : MainFixCount;
                        FunctionFixCount = isFixation && isFunctionFix ? FunctionFixCount + 1 : FunctionFixCount;
                        OtherFixCount = isFixation && isOtherFix ? OtherFixCount + 1 : OtherFixCount;
                        AllFixationsCount = isFixation ? AllFixationsCount++ + 1 : AllFixationsCount;
                        AllSaccadesCount = isFixation ? AllSaccadesCount++ + 1 : AllSaccadesCount;

                        const actVel = dist / deltaT;

                        const vel = {
                            velocity: tempDistance / timeStep,
                            time: actTimeStep,
                            row: rowNumber,
                            isBeaconFix: isFixation && isBeaconFix ? 1 : 0,
                            isInputFix: isFixation && isInputFix ? 1 : 0,
                            isMainFix: isFixation && isMainFix ? 1 : 0,
                            isFunctionFix: isFixation && isFunctionFix ? 1 : 0,
                            isOtherFix: isFixation && isOtherFix ? 1 : 0,
                            isSaccade: isFixation ? 0 : 1,
                        };
                        tempDistance = actVel * (actTime - actTimeStep);
                        tempIterator = timeIterator;
                        return vel;
                    }
                }
                // If we didnt reach timeStep, just add tempDistance
                else {
                    tempDistance += dist;
                }
            }
        });
        // Cleaning of null velocities
        const cleanVelocities = velocities.filter((v) => {
            return v !== undefined;
        });

        const quest = {
            velocities: cleanVelocities,
            name: question.name ? question.name : 'n/a',
            answer: question.answer.replace(/"/g, ''),
            difficulty: question.difficulty,
            BeaconFixCount,
            InputFixCount,
            MainFixCount,
            FunctionFixCount,
            OtherFixCount,
            AllFixationsCount,
            AllSaccadesCount,
        };

        quest.resultCorrect = evaluateCorrect(quest);
        quest.resultCorrect ? correctAnswers++ : incorrectAnswers++;

        return quest;
    });
    // Saving results to log file
    writeFile("./logs/logAllQuestions.json", allQuestions);

    // Calculating students score
    const {cursor, expMonths, expType, eval, comment} = data;
    const abilityAvg = ((100 * correctAnswers)/(correctAnswers + incorrectAnswers))/100;
    const correctAnswersCount = correctAnswers;
    const incorrectAnswersCount = incorrectAnswers;
    correctAnswers = 0;
    incorrectAnswers = 0;

    return {
        questions: allQuestions,
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

/**
 * EvaluateRowFixation Function
 * Input: Y-position of mouse move, name of the question
 * Output: info about fixations/ saccades belongings to AOI
 */
function evaluateRowFixation(y, questionName) {
    let isBeaconFix = false;
    let isInputFix = false;
    let isMainFix = false;
    let isFunctionFix = false;
    let isOtherFix = false;

    const questionNumber = questionName.slice(5, 7).replace('0', '');
    const {mainFn, mainChanging, secFn, primary} = AOIs[questionNumber-1];
    const rowNumber = Math.ceil((y) / rowHeight);

    // Calculating fixation at height of row + half of its height from top and bottom
    if ((y > ((mainFn.from - 1) * rowHeight - peekHeight)) && (y < (mainFn.to * rowHeight + peekHeight))){
        const mapInput = mainChanging.map((line) => {
            if ((y > ((line - 1) * rowHeight - peekHeight)) && (y < (line * rowHeight + peekHeight))) {
                isInputFix = true;
            }
        });
        isMainFix = true;
    }
    else if ((y > ((secFn.from - 1) * rowHeight - peekHeight)) && (y < (secFn.to * rowHeight + peekHeight))){
        const mapBeacon = primary.map((line) => {
            if ((y > ((line - 1) * rowHeight - peekHeight)) && (y < (line * rowHeight + peekHeight))) {
                isBeaconFix = true;
            }
        });
        isFunctionFix = true;
    }
    else {
        isOtherFix = true;
    }
    return {
        rowNumber,
        isBeaconFix,
        isInputFix,
        isMainFix,
        isFunctionFix,
        isOtherFix
    };
}

/**
 * EvaluateCorrect Function
 * Input: question info
 * Output: boolean value of answers correctness
 */
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

/**
 * GetAllLogs Function
 * Input: directory name with all saved log files, .csv file with student grades
 * Output: cleared log files with all data about student using mapArray()
 */
async function getAllLogs(dirName){
    const folders = fs.readdirSync(`./logs/${dirName}`);
    const studentData = await getStudentData();

    const allLogFiles = folders.map((folder, index) => {
        const logLines = fs.readFileSync(`./logs/${dirName}/${folder}/log`).toString().split('\n');
        console.log(index + ' Processing folder:        ' + folder);
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

/**
 * GetStudentData Function
 * Output: data from .csv file with student grades
 */
async function getStudentData() {
    return await csv().fromFile('./logs/data.csv');
}

/**
 * GetStudentData Function
 * Output: data from .csv file with EyeTracker data
 */
async function getEyetrackerData(){
    return await csv().fromFile('./logs/export.csv');
}

/**
 * ProcessETData Function
 * Output: processed ET data from .csv file to JSON file
 */
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

/**
 * WriteFile Function
 * Output: saved file with given name and data in JSON format
 */
function writeFile(name, data){
    fs.writeFileSync(name, JSON.stringify(data));
}
