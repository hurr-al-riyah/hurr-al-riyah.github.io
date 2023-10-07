document.getElementById('fileInput').addEventListener('change', handleFileSelect, false);

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function(fileEvent) {
        const contents = fileEvent.target.result;
        const lines = contents.split('\n');
        const data = lines.map(line => {
            const parts = line.split(',');
            return {
                name: parts[0],
                speed: parseFloat(parts[1]),
                distance: parseFloat(parts[2])
            };
        });

        drawGraph(data);
    };
    reader.readAsText(file);
}

function drawGraph(data) {
    const traces = data.map(item => {
        return {
            x: [item.distance],
            y: [item.speed],
            mode: 'markers',
            type: 'scatter',
            name: item.name
        };
    });

    Plotly.newPlot('graph', traces, {
        xaxis: {
            title: '거리'
        },
        yaxis: {
            title: '속도'
        }
    });
}
