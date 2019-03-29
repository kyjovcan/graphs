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


const moves = {
    "mm":[  
        "247 500 684",
        "261 495 661",
        "277 490 635",
        "295 481 594",
        "311 474 562",
        "328 460 519",
        "344 440 473",
        "361 411 417",
        "378 390 385",
        "394 379 362",
        "411 370 342",
        "427 365 325",
        "444 357 304",
        "461 351 288",
        "477 344 273",
        "495 337 259",
        "511 330 250",
        "527 325 244",
        "544 322 240",
        "561 317 234",
        "578 312 230",
        "594 306 226",
        "611 301 223",
        "628 294 220",
        "645 289 217",
        "662 285 213",
        "678 280 203",
        "694 278 194",
        "711 273 183",
        "728 270 179",
        "745 267 176",
        "761 266 174",
        "779 265 172",
        "795 265 170",
        "812 265 167",
        "829 265 163",
        "845 267 162",
        "862 279 159",
        "878 293 159",
        "895 306 157",
        "912 315 155",
        "929 319 151",
        "945 321 151",
        "962 332 154",
        "978 350 165",
        "995 368 182",
        "1013 386 207",
        "1030 399 229",
        "1048 405 251",
        "1063 404 272",
        "1078 399 292",
        "1095 386 319",
        "1112 372 332",
        "1128 360 346",
        "1146 353 360",
        "1162 348 368",
        "1179 340 372",
        "1195 330 374",
        "1212 323 375",
        "1229 320 375",
        "1246 318 377",
        "1262 318 379",
        "1279 318 382",
        "1296 320 385",
        "1313 323 386",
        "1329 326 386",
        "1345 343 391",
        "1362 352 395",
        "1379 357 398",
        "1396 360 402",
        "1412 368 406",
        "1429 386 410",
        "1446 411 414",
        "1463 433 417",
        "1479 446 418",
        "1497 448 419",
        "1547 449 419",
        "1563 451 419",
        "1580 453 419",
        "1713 454 418",
        "1730 453 416",
        "1747 450 412",
        "1763 447 409",
        "1780 444 407",
        "1796 441 405",
        "1813 437 403",
        "1830 431 401",
        "1847 428 400",
        "1864 426 399",
        "1880 423 399",
        "1897 422 399",
        "1913 419 399",
        "1931 416 399",
        "1947 413 399",
        "2014 412 399",
        "2030 411 399",
        "2048 410 399",
        "2065 409 398",
        "2100 409 397",
        "2366 407 396",
        "2382 403 390",
        "2399 399 378",
        "2415 394 367",
        "2431 390 355",
        "2449 389 342",
        "2465 385 325",
        "2482 384 306",
        "2499 379 286",
        "2517 372 257",
        "2532 367 242",
        "2548 360 228",
        "2565 351 217",
        "2582 342 209",
        "2598 336 199",
        "2615 330 191",
        "2632 323 181",
        "2649 308 166",
        "2665 286 146",
        "2682 273 139",
        "2699 266 136",
        "2716 263 134",
        "2733 261 133",
        "2749 258 132",
        "2766 253 132",
        "2782 250 132",
        "2799 247 132",
        "2816 244 132",
        "2833 241 132",
        "2849 237 130",
        "2866 232 127",
        "2883 228 125",
        "2899 224 123",
        "2916 223 123",
        "3051 222 123",
        "3083 220 123",
        "3100 217 127",
        "3117 214 129",
        "3134 211 133",
        "3150 208 134",
        "3167 206 136",
        "3183 204 137",
        "3200 202 139",
        "3217 199 140",
        "3234 198 141",
        "3251 197 141",
        "3267 195 141",
        "3283 195 142",
        "3301 193 142",
        "3319 192 143",
        "3333 191 145",
        "3350 190 146",
        "3366 190 147",
        "3684 190 148",
        "3700 190 151",
        "3718 192 155",
        "3735 193 156",
        "3751 195 157",
        "3768 199 159",
        "3785 202 160",
        "3801 207 159",
        "3818 210 158",
        "3834 213 155",
        "3851 215 154",
        "3868 220 154",
        "3885 227 152",
        "3901 235 151",
        "3918 246 149",
        "3935 257 144",
        "3951 276 139",
        "3968 286 136",
        "3985 299 136",
        "4002 313 138",
        "4019 326 141",
        "4035 339 142",
        "4052 350 142",
        "4070 366 142",
        "4085 379 142",
        "4102 394 142",
        "4119 407 143",
        "4135 417 144",
        "4153 420 144",
        "4169 423 144",
        "4185 424 144",
        "4202 427 144",
        "4219 430 144",
        "4235 434 144",
        "4252 437 143",
        "4269 436 141",
        "4285 420 138",
        "4303 396 134",
        "4319 368 129",
        "4335 344 124",
        "4353 324 123",
        "4369 304 119",
        "4385 295 116",
        "4402 283 114",
        "4419 265 113",
        "4436 247 113",
        "4454 234 117",
        "4470 220 118",
        "4486 213 119",
        "4503 201 121",
        "4519 191 121",
        "4536 179 119",
        "4553 169 118",
        "4569 164 117",
        "4586 161 116",
        "4603 158 115",
        "4619 154 115",
        "4687 153 115",
        "4740 164 126",
        "4753 180 142",
        "4770 202 172",
        "4787 227 225",
        "4803 257 315",
        "4820 272 358",
        "4837 292 404",
        "4854 310 441",
        "4870 337 480",
        "4886 362 517",
        "4904 384 555",
        "4920 400 585",
        "4937 414 607",
        "4955 440 642",
        "4971 458 664",
        "4987 476 684",
        "4999 482 693",
        "6390 644 699",
        "6407 675 690",
        "6423 698 689",
        "6440 717 691",
        "6457 737 694",
        "6473 757 699"
     ]
}

let vels = [];

app.use(fileUpload());

app.post('/upload', function(req, res) {
    if (Object.keys(req.files).length == 0) {
        return res.status(400).send('No files were uploaded.');
    }
    console.log(req.files.sampleFile.data); 

    let sampleFile = req.files.sampleFile;

    sampleFile.mv('./logs/log.txt', function(err) {
        if (err)
          return res.status(500).send(err);
    
        res.send('LOG recieved', 200);
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

function mapArray() {
    const data = parseLog();

    let processedData = {};
    console.log(data.questions.length)
    const moves = data.questions[0].mm[0].split(',');

    let temp = '';
    const vels = moves.map((move, index) => {
        if (index === 0) {
            temp = move;
            return {velocity: 0, time: 0};
        }
        else {
            const currentVars = move.split(" ");
            const prevVars = temp.split(" ");
            temp = move;
            const deltaT = Math.abs(currentVars[0].replace('"', '') - prevVars[0].replace('"', ''));
            const deltaX = Math.abs(currentVars[1] - prevVars[1]);
            const deltaY = Math.abs(currentVars[2].replace('"', '') - prevVars[2].replace('"', ''));
            const dist = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
            const vel = {
                velocity: dist / deltaT,
                time: currentVars[0].replace('"', ''),
            };
            
            return vel;
        }
    });
    
    return vels;
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

    fs.writeFile("./logData.json", JSON.stringify(userData), function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    }); 

    return userData;
} 