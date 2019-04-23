const socket = io(); 
let serverVelocities = [];
let allData = [];
let questionNumber = 0;

socket.on('connect', function () { 
    let data = 'connected';
    socket.emit('mainInput', data);
});

function createGraph() {
    const labels = serverVelocities.data.velocities[questionNumber].vels.filter((vel) => {
        if (!vel) return false;
        else {
            return vel.time;
        }
    });

    const velData = serverVelocities.data.velocities[questionNumber].vels.filter((vel) => {
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

    $('#question-name').text(serverVelocities.data.velocities[questionNumber].name);
    $('#info-cursor').text(serverVelocities.data.cursor);
    $('#info-expMonths').text(serverVelocities.data.expMonths);
    $('#info-expType').text(serverVelocities.data.expType);
    $('#info-eval').text(serverVelocities.data.eval);
    $('#info-comment').text(serverVelocities.data.comment);

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
    socket.emit('computeOneFile', serverVelocities, function(data){
        serverVelocities = data;
        console.log(serverVelocities);
        createGraph(0);
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
    if (questionNumber >= 0 && questionNumber <= serverVelocities.data.velocities.length-1){
        direction ? questionNumber++ : questionNumber--;
        createGraph();
        console.log(questionNumber + ' / ' + serverVelocities.data.velocities.length);
    }
    if (questionNumber === 0 ){
        $('#arrow-left').attr('disabled', true);
    } else if (questionNumber + 1 === serverVelocities.data.velocities.length - 1){
        $('#arrow-right').attr('disabled', true);
    } else {
        $('#arrow-right').attr('disabled', false);
        $('#arrow-left').attr('disabled', false);
    }
}