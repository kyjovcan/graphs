const socket = io(); 
let serverVelocities = [];

socket.on('connect', function () { 
    let data = 'connected'
    socket.emit('mainInput', data);
});

function createGraph() {
    
    const labels = serverVelocities.data.map((vel) => {
        return vel.time;
    });
    const velData = serverVelocities.data.map((vel) => {
        return vel.velocity;
    });

    var ctx = document.getElementById('myChart');
    var myChart = new Chart(ctx, {
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

    return 0;
}

function compute(){
    socket.emit('computeData', serverVelocities, function(data){
        serverVelocities = data; 
        const pele = createGraph();
    });
}

