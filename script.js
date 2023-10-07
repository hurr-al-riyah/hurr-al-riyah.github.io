let globalData = null;  // 그래프를 그릴 때 사용할 데이터를 저장할 전역 변수

const colors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
    '#9edae5', '#c5b0d5', '#dbdb8d', '#g6abae', '#c49c94',
];

document.getElementById('fileInput').addEventListener('change', handleFileSelect, false);

let showDistance = true;
let showSpeed = true;

function is_valid_data_line(line) {
    return line.startsWith("◎Turn") || line.trim().match(/^\d+\s:/);
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function(fileEvent) {
        const contents = fileEvent.target.result;
        const lines = contents.split('\n').filter(is_valid_data_line);
        const umaData = {};
        let turns = [];

        lines.forEach(line => {
            if (line.startsWith("◎Turn")) {
                turns.push(parseInt(line.split(" ")[1]));
                return;
            }

            const parts = line.split('/');
            const name = line.split(':')[1].split(':')[0].trim();
            const distance = parseFloat(line.split(':')[2].split('/')[0].trim().slice(0, -1));
            const speed = parseFloat(line.split(':')[3].trim().slice(0, -4));


            if (!(name in umaData)) {
                umaData[name] = {distance: [], speed: []};
            }

            umaData[name].distance.push(distance);
            umaData[name].speed.push(speed);
        });

        const labels = Object.keys(umaData);
        populateBaseUmaSelect(labels); // 드롭다운 메뉴에 옵션 추가

        globalData = labels.map(label => ({  // globalData에 그래프 데이터 저장
            name: label,
            distance: umaData[label].distance,
            speed: umaData[label].speed,
            turns: turns,
            active: true
        }));

        drawGraph(globalData);
        drawLegend(globalData);
    };
    reader.readAsText(file);
}

function populateBaseUmaSelect(labels) {
    const baseUmaContainer = document.getElementById('baseUmaContainer');
    baseUmaContainer.innerHTML = '';

    labels.forEach((label, index) => {
        const baseUmaItem = document.createElement('div');
        baseUmaItem.classList.add('base-item');  // 레전드 스타일을 사용
        baseUmaItem.textContent = label;
        baseUmaItem.style.color = colors[index];  // colors는 그래프의 색상 배열

        baseUmaItem.onclick = () => {
            document.querySelectorAll('#baseUmaContainer .base-item').forEach(item => {
                item.classList.remove('selected');  // 다른 항목의 선택을 제거
            });
            baseUmaItem.classList.add('selected');  // 클릭된 항목을 선택
            drawGraph(globalData);  // 그래프를 업데이트
        };

        baseUmaContainer.appendChild(baseUmaItem);
    });
}

document.getElementById('selectAll').addEventListener('click', () => {
    globalData.forEach(item => item.active = true);  // 모든 데이터를 활성 상태로 설정
    drawGraph(globalData);  // 그래프를 다시 그림
    updateLegendStyles();  // 레전드의 스타일을 업데이트
});

document.getElementById('deselectAll').addEventListener('click', () => {
    globalData.forEach(item => item.active = false);  // 모든 데이터를 비활성 상태로 설정
    drawGraph(globalData);  // 그래프를 다시 그림
    updateLegendStyles();  // 레전드의 스타일을 업데이트
});

document.getElementById('distance').addEventListener('click', () => {
    showDistance = !showDistance;
    drawGraph(globalData);  // 그래프를 다시 그림
});

document.getElementById('speed').addEventListener('click', () => {
    showSpeed = !showSpeed;
    drawGraph(globalData);  // 그래프를 다시 그림
});

function updateLegendStyles() {
    const legendItems = document.querySelectorAll('.legend-item');
    legendItems.forEach(item => {
        const itemName = item.textContent.trim();
        const isActive = globalData.find(data => data.name === itemName).active;
        if (isActive) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

function drawLegend(data) {
    const legendContainer = document.getElementById('legend');
    legendContainer.innerHTML = '';

    data.forEach((item, index) => {
        const legendItem = document.createElement('div');
        legendItem.classList.add('legend-item');
        legendItem.textContent = item.name;
        legendItem.style.color = colors[index];  // colors는 그래프의 색상 배열

        legendItem.onclick = () => {
            legendItem.classList.toggle('selected');
            toggleData(item.name);  // toggleData는 데이터를 표시/숨기는 함수
        };

        legendContainer.appendChild(legendItem);
    });
}

function toggleData(name) {
    const target = globalData.find(d => d.name === name);
    target.active = !target.active;  // active 상태 토글
    drawGraph(globalData);  // 그래프 다시 그리기
}


function drawGraph(data) {
    const baseUmaSelect = document.querySelector('#baseUmaContainer .base-item.selected');
    let baseUmaName;
    if (baseUmaSelect == null) {
        baseUmaName = data[0].name;
    }else{
        baseUmaName = baseUmaSelect.innerText;
    }
    const baseUma = data.find(uma => uma.name === baseUmaName);

    const turns = data[0].turns;

    const margin = {top: 20, right: 30, bottom: 40, left: 50};
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    // SVG를 선택하거나 없으면 새로 만듭니다.
    const svg = d3.select("#svg").selectAll("svg")
    .data([data])
    .join(
        enter => enter.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`),
        update => update
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
    )
    .select("g");
        
    const minY = Math.min(0, d3.min(data, uma => d3.min(uma.distance, (d, i) => d - baseUma.distance[i])));
    const maxY = Math.max(0, d3.max(data, uma => d3.max(uma.distance, (d, i) => d - baseUma.distance[i])));

    const xScale = d3.scaleLinear()
        .domain([d3.min(turns), d3.max(turns)])  // 실제 턴 값으로 도메인 설정
        .range([0, width]);
    const yScale = d3.scaleLinear().domain([minY, maxY]).range([height, 0]);
    
    // 속도 y축
    const y2Max = d3.max(data, uma => d3.max(uma.speed));
    const y2Min = d3.min(data, uma => d3.min(uma.speed));
    const y2Scale = d3.scaleLinear().domain([y2Min, y2Max]).range([height, 0]);


    const line = d3.line()
        .x((d, i) => xScale(turns[i])) 
        .y(d => yScale(d));

    svg.selectAll("path")
    .data(data.map(uma => uma.distance.map((d, i) => d - baseUma.distance[i])))
    .join(
        enter => enter.append("path")
            .attr("d", line)
            .attr("fill", "none")
            .attr("stroke", (d, i) => colors[i])
            .attr("stroke-opacity", (d, i) => showDistance? (data[i].active ? 1 : 0) : 0),  // 활성 상태에 따라 투명도 설정
        update => update
            .transition()
            .duration(300)
            .attr("d", line)
            .attr("stroke-opacity", (d, i) => showDistance? (data[i].active ? 1 : 0) : 0),  // 활성 상태에 따라 투명도 설정
        exit => exit.remove()
    );

    const speedLine = d3.line()
        .x((d, i) => xScale(turns[i])) 
        .y(d => y2Scale(d))

    svg.selectAll(".speed-path")
    .data(data.map(uma => uma.speed))
    .join(
        enter => enter.append("path")
            .attr("class", "speed-path")
            .attr("d", speedLine)
            .attr("fill", "none")
            .attr("stroke", (d, i) => colors[i])
            .attr("stroke-dasharray", ("3, 3"))  // 점선 스타일로 만듭니다.
            .attr("stroke-opacity", (d, i) => showSpeed? (data[i].active ? 1 : 0) : 0),  // 활성 상태에 따라 투명도 설정
        update => update
            .transition()
            .duration(300)
            .attr("d", speedLine)
            .attr("stroke-opacity", (d, i) => showSpeed ? (data[i].active ? 1 : 0) : 0),  // 활성 상태에 따라 투명도 설정
        exit => exit.remove()
    );
        
    svg.selectAll("g.axis").remove();  // 기존 축을 삭제
        
    const tickValues = turns.filter((_, i, arr) => i % Math.ceil(arr.length / 20) === 0);
    // X축 추가
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0,360)")  // X축의 위치 조정
        .call(d3.axisBottom(xScale).tickValues(tickValues));

    // Y축 추가
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0,0)")  // Y축의 위치 조정
        .call(d3.axisLeft(yScale));

    svg.append("g")
    .attr("class", "y2 axis")
    .attr("transform", `translate(${width},0)`) 
    .call(d3.axisRight(y2Scale));  // 우측에 위치한 Y축을 그립니다.
}
