var socket = io(); 

socket.on('connect', function () { 
    let data = 'connected'
    socket.emit('mainInput', data);
});

function createGraph(velocities) {

    d3.select("body").transition().style("background-color", "black");

    return 0;
}

function compute(){
    socket.emit('computeData', function(){
        socket.on('velocityData', function (data){
            const pele = createGraph(data);
        });
    });
}
