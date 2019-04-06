const socket = io(); 
let serverVelocities = [];
let questionNumber = 0;

socket.on('connect', function () { 
    let data = 'connected';
    socket.emit('mainInput', data);
});

function createGraph() {
    const labels = serverVelocities.data[questionNumber].vels.map((vel) => {
        return vel.time;
    });
    const velData = serverVelocities.data[questionNumber].vels.map((vel) => {
        return vel.velocity;
    });

    $('#question-name').text(serverVelocities.data[questionNumber].name);

    let ctx = document.getElementById('myChart');
    const myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Speed',
                data: velData,
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

function compute(){
    socket.emit('computeData', serverVelocities, function(data){
        serverVelocities = data; 
        createGraph(0);
    });
}

function changeQuestionNumber(direction) {
    if (questionNumber >= 0 && questionNumber <= serverVelocities.data.length){
        direction ? questionNumber++ : questionNumber--;
        createGraph();
    }
    if (questionNumber === 0 ){
        $('#arrow-left').attr('disabled', true);
    } else if (questionNumber === serverVelocities.data.length ){
        $('#arrow-right').attr('disabled', true);
    } else {
        $('#arrow-right').attr('disabled', false);
        $('#arrow-left').attr('disabled', false);
    }
}