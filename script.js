let globalData = null;  // graph data

const colors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
    '#9edae5', '#c5b0d5', '#dbdb8d', '#g6abae', '#c49c94',
];

const categories = {
    "1007_실전레이스": [
        {display: "더트 단거리 - 불비넬라 컵", file: "더트_단거리.txt"},
        {display: "더트 장거리 - 요렐리아 컵", file: "더트_장거리.txt"},
        {display: "잔디 중거리 - 쿠쿠라타 컵", file: "잔디_중거리.txt"},
        {display: "잔디 마일 - 나탄스 컵", file: "잔디_마일.txt"}
    ],
    "팀선발_모의레이스": [
        {display: "더트 단거리", file: "더트_단거리.txt"},
        {display: "더트 장거리", file: "더트_장거리.txt"},
        {display: "더트 중거리", file: "더트_중거리.txt"},
        {display: "잔디 마일", file: "잔디_마일.txt"},
        {display: "잔디 장거리", file: "잔디_장거리.txt"},
        {display: "잔디 중거리", file: "잔디_중거리.txt"}
    ]
};

document.getElementById('categorySelect').addEventListener('change', function(e) {
    const fileSelect = document.getElementById('fileSelect');
    fileSelect.innerHTML = '<option value="" disabled selected>경주 종목 선택</option>';
    
    const selectedCategory = e.target.value;
    if (selectedCategory) {
        fileSelect.disabled = false;
        categories[selectedCategory].forEach(item => {
            const option = document.createElement('option');
            option.value = `data/${selectedCategory}/${item.file}`;
            option.textContent = item.display;
            fileSelect.appendChild(option);
        });
    } else {
        fileSelect.disabled = true;
    }
});

document.getElementById('fileSelect').addEventListener('change', function(e) {
    const filePath = e.target.value;
    fetch(filePath)
        .then(response => response.text())
        .then(contents => {
            const filePath = e.target.value;
            handleSelectedFile(filePath);

            document.getElementById('select-uma').style.display = 'flex';
            document.getElementById('legend-controls').style.display = 'block';
        })
        .catch(error => console.error('Error:', error));
});


let showDistance = true;
let showSpeed = true;

function is_valid_data_line(line) {
    return line.startsWith("◎Turn") || line.trim().match(/^\d+\s:/);
}

function handleSelectedFile(filePath) {
    fetch(filePath)
        .then(response => response.text())
        .then(contents => {
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

            drawLegend(globalData);
            drawGraph(globalData);
        })
        .catch(error => console.error('Error:', error));
}


function populateBaseUmaSelect(labels) {
    const baseUmaContainer = document.getElementById('baseUmaContainer');
    baseUmaContainer.innerHTML = '';

    labels.forEach((label, index) => {
        const baseUmaItem = document.createElement('div');
        baseUmaItem.classList.add('base-item');
        baseUmaItem.textContent = label;
        baseUmaItem.style.color = colors[index];

        baseUmaItem.onclick = () => {
            document.querySelectorAll('#baseUmaContainer .base-item').forEach(item => {
                item.classList.remove('selected'); 
            });
            baseUmaItem.classList.add('selected');
            drawGraph(globalData);
        };

        baseUmaContainer.appendChild(baseUmaItem);
    });
}

document.getElementById('selectAll').addEventListener('click', () => {
    globalData.forEach(item => item.active = true);
    drawGraph(globalData);
    updateLegendStyles();
});

document.getElementById('deselectAll').addEventListener('click', () => {
    globalData.forEach(item => item.active = false); 
    drawGraph(globalData);
    updateLegendStyles();
});

document.getElementById('distance').addEventListener('click', () => {
    showDistance = !showDistance;
    drawGraph(globalData);

    const distanceBtn = document.getElementById('distance');
    if(showDistance) {
        distanceBtn.classList.remove('category-off');
        distanceBtn.classList.add('category-on');
    } else {
        distanceBtn.classList.remove('category-on');
        distanceBtn.classList.add('category-off');
    }
});

document.getElementById('speed').addEventListener('click', () => {
    showSpeed = !showSpeed;
    drawGraph(globalData);
    const speedBtn = document.getElementById('speed');
    if(showSpeed) {
        speedBtn.classList.remove('category-off');
        speedBtn.classList.add('category-on');
    } else {
        speedBtn.classList.remove('category-on');
        speedBtn.classList.add('category-off');
    }
});

function updateLegendStyles() {
    const legendItems = document.querySelectorAll('.legend-item');
    legendItems.forEach(item => {
        const itemName = item.textContent.trim();
        const isActive = globalData.find(data => data.name === itemName).active;
        if (isActive) {
            item.classList.remove('selected');
        } else {
            item.classList.add('selected');
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
        legendItem.style.color = colors[index];

        legendItem.onclick = () => {
            legendItem.classList.toggle('selected');
            toggleData(item.name);
        };

        legendContainer.appendChild(legendItem);
    });
}

function toggleData(name) {
    const target = globalData.find(d => d.name === name);
    target.active = !target.active;
    drawGraph(globalData);
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

    const uma_index = {};
    data.forEach((uma, index) => {
        uma_index[uma.name] = index;
    });
    
    // svg 선택 (없으면 새로 생성)
    let svg = d3.select("#svg").select("svg");
    if (svg.empty()) {
        svg = d3.select("#svg")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    } else {
        svg = svg.select("g");
    }
        
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
            .attr("stroke-opacity", (d, i) => showDistance? (data[i].active ? 1 : 0) : 0),
        update => update
            .transition()
            .duration(300)
            .attr("d", line)
            .attr("stroke-opacity", (d, i) => showDistance? (data[i].active ? 1 : 0) : 0),
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
            .attr("stroke-dasharray", ("3, 3"))
            .attr("stroke-opacity", (d, i) => showSpeed? (data[i].active ? 1 : 0) : 0),
        update => update
            .transition()
            .duration(300)
            .attr("d", speedLine)
            .attr("stroke-opacity", (d, i) => showSpeed ? (data[i].active ? 1 : 0) : 0),
        exit => exit.remove()
    );

    // 토글
    let tooltip = d3.select("body").select(".tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
    }

    d3.select("#svg").select("svg").on("mousemove", (event) => {
        const screenWidth = window.innerWidth;
        const [x, y] = d3.pointer(event);
        const xValue = xScale.invert(x - margin.left); // margin.left를 빼서 그래프의 x 좌표를 정확하게 매핑합니다.
        const turnIndex = d3.bisect(turns, xValue); 
        const turn = turns[turnIndex]; 
        let left;
        let top;
    
        if (screenWidth > 1150) {
            // select-base-uma div 우측에 툴팁을 표시
            const svgRect = d3.select("#svg").node().getBoundingClientRect();
            left = 850;
            top = svgRect.top + window.scrollY;
        } 
        else if (screenWidth > 820) {
            const selectBaseUmaRect = document.getElementById('select-base-uma').getBoundingClientRect();
            left = 500;
            top = selectBaseUmaRect.top + window.scrollY;
        }else{
            const selectBaseUmaRect = document.getElementById('select-uma').getBoundingClientRect();
            left = selectBaseUmaRect.left;
            top = selectBaseUmaRect.bottom + 20 + window.scrollY;
        }

        if (turnIndex < 0 || turnIndex >= turns.length) {
            tooltip.style("opacity", 0);
            return;
        }
    
        const values = data
            .filter(uma => uma.active)  
            .map(uma => {
                const distance = uma.distance[turnIndex];
                const speed = uma.speed[turnIndex];
                return {
                    name: uma.name,
                    speed,
                    distance,
                    isBase: uma.name === baseUmaName
                };
            })
            .sort((a, b) => b.distance - a.distance);
    
        const tableRows = values.map(uma => {
            let umaName = uma.name;
            if (uma.name === baseUmaName) {
                umaName = `<strong>${umaName}</strong>`;
            }
            return `<tr style="${uma.isBase ? 'background-color: rgba(0,0,0,0.1);' : ''}">
                        <td><span style="color: ${colors[uma_index[uma.name]]}">${umaName}</span></td>
                        <td>${uma.speed.toFixed(2)}</td>
                        <td>${uma.distance.toFixed(2)}</td>
                    </tr>`;
        }).join('');
    
        tooltip.html(`<div>Turn: ${turn}</div>
                      <table>
                          <thead>
                              <tr>
                                  <th>Name</th>
                                  <th>Speed</th>
                                  <th>Position</th>
                              </tr>
                          </thead>
                          <tbody>
                              ${tableRows}
                          </tbody>
                      </table>`)
                .style("left", left + "px")
                .style("top", top + "px")
                .style("opacity", 1);
    });
    


    // x축, y축, y보조축
        
    svg.selectAll("g.axis").remove();  // 기존 축 삭제 (없으면 새로 불러올때 축 겹침)
        
    const tickValues = turns.filter((_, i, arr) => i % Math.ceil(arr.length / 20) === 0);
    // X축 추가
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0,360)")
        .call(d3.axisBottom(xScale).tickValues(tickValues));

    // Y축 추가
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0,0)")
        .call(d3.axisLeft(yScale));

    svg.append("g")
    .attr("class", "y2 axis")
    .attr("transform", `translate(${width},0)`) 
    .call(d3.axisRight(y2Scale));
}
