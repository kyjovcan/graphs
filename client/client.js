const socket = io(); 
let studentData = [];
let allData = [];
let questionNumber = 0;

socket.on('connect', function () { 
    let data = 'connected';
    socket.emit('mainInput', data);
});

function createGraph() {
    const labels = studentData.data.questions[questionNumber].velocities.filter((vel) => {
        if (!vel) return false;
        else {
            return vel.time;
        }
    });

    const velData = studentData.data.questions[questionNumber].velocities.filter((vel) => {
        if (!vel) return false;
        else {
            return vel.velocity;
        }
    });

    const l = labels.map((lab) => {
        return lab.time;
    });

    const v = velData.map((vel) => {
        return vel.velocity;
    });

    $('#question-name').text(studentData.data.questions[questionNumber].name);
    $('#info-cursor').text(studentData.data.cursor);
    $('#info-expMonths').text(studentData.data.expMonths);
    $('#info-expType').text(studentData.data.expType);
    $('#info-eval').text(studentData.data.eval);
    $('#info-comment').text(studentData.data.comment);

    let ctx = document.getElementById('myChart');
    const myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: l,
            datasets: [{
                label: 'Speed',
                data: v,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        }
    });
}

function computeOneFile(){
    socket.emit('computeOneFile', studentData, function(data){
        studentData = data;
        console.log(studentData);
        createGraph();
    });
}

function computeAllFiles(){
    socket.emit('computeAllFiles', allData, function(data){
        console.log(data);
    });
}

function processETData(){
    socket.emit('processETData', allData, function(data){
        console.log(data);
    });
}

function processMouseData(){
    socket.emit('processMouseData', allData, function(data){
        console.log(data);
    });
}

function changeQuestionNumber(direction) {
    if (questionNumber >= 0 && questionNumber <= studentData.data.questions.length-1){
        direction ? questionNumber++ : questionNumber--;
        createGraph();
        console.log(questionNumber + ' / ' + studentData.data.questions.length);
    }
    if (questionNumber === 0 ){
        $('#arrow-left').attr('disabled', true);
    } else if (questionNumber + 1 === studentData.data.questions.length - 1){
        $('#arrow-right').attr('disabled', true);
    } else {
        $('#arrow-right').attr('disabled', false);
        $('#arrow-left').attr('disabled', false);
    }
}