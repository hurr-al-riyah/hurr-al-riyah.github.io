let globalData = null;  // graph data
let raceCategory = "";   // ex) 1007_실전레이스
let raceDetail = "";    // ex) 더트-단거리.txt -> 더트 단거리

const colors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
    '#9edae5', '#c5b0d5', '#dbdb8d', '#g6abae', '#c49c94',
];

const categories = {
    "1014_실전레이스": [
        {display: "더트 단거리 - 오푼시아 컵", file: "더트_단거리.txt"},
        {display: "잔디 장거리 - 다우소니아 컵", file: "잔디_장거리.txt"},
        {display: "잔디 중거리 - 헤반시아 컵", file: "잔디_중거리.txt"},
        {display: "잔디 마일 - 올리고 컵", file: "잔디_마일.txt"}
    ],
    "1007_실전레이스": [
        {display: "더트 단거리 - 불비넬라 컵", file: "더트_단거리.txt"},
        {display: "더트 장거리 - 요렐리아 컵", file: "더트_장거리.txt"},
        {display: "잔디 중거리 - 쿠쿠라타 컵", file: "잔디_중거리.txt"},
        {display: "잔디 마일 - 나탄스 컵", file: "잔디_마일.txt"},
        {display: "잔디 단거리 - 미니마 컵", file: "잔디_단거리.txt"},
        {display: "더트 중거리 - 니포피아 컵", file: "더트_중거리.txt"},
        {display: "더트 마일 - 하월시아 컵", file: "더트_마일.txt"},
        {display: "잔디 장거리 - 몰레스타 컵", file: "잔디_장거리.txt"}
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

const umaOrder = [
    '후르 알-리야흐',
    '마운틴스 섀플리',
    '블랙 팁 마블',
    '미티어 더스트',
    '포츈 투유',
    '더 라스트 일루전',
    '박 섬광석화',
    '유피아 데저트로즈',
    '치쿠모 코토리',
    '온 세마치',
    '굿나잇 스이밍',
    '이터니티 블랙홀',
    '페니 레인',
    '트윈 페르소나',
    '데네브 네오스',
    '페트리코어 선샤워'
];

function getUmaOrder(name) {
    const index = umaOrder.indexOf(name);
    return index === -1 ? 999 : index;
}

async function loadUmaStats() {
    const response = await fetch('umaStats.json');
    const data = await response.json();
    return data;
}


document.getElementById('categorySelect').addEventListener('change', function(e) {
    const fileSelect = document.getElementById('fileSelect');
    fileSelect.innerHTML = '<option value="" disabled selected>경주 종목 선택</option>';
    
    const selectedCategory = e.target.value;
    raceCategory = selectedCategory;

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
    raceDetail = filePath.split('/').pop().replace('.txt', '').replace(/_/g, ' ');

    fetch(filePath)
        .then(response => response.text())
        .then(contents => {
            const filePath = e.target.value;
            handleSelectedFile(filePath);

            document.getElementById('select-uma').style.display = 'flex';
            document.getElementById('legend-controls').style.display = 'block';
            videoInit();
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
            
            globalData = labels.map(label => ({  // globalData에 그래프 데이터 저장
                name: label,
                distance: umaData[label].distance,
                speed: umaData[label].speed,
                turns: turns,
                active: true
            }));
            
            globalData.sort((a, b) => getUmaOrder(a.name) - getUmaOrder(b.name));
            
            populateBaseUmaSelect(globalData);
            drawLegend(globalData);
            drawStat(globalData);
            drawGraph(globalData);
        })
        .catch(error => console.error('Error:', error));
}


function populateBaseUmaSelect(data) {
    const baseUmaContainer = document.getElementById('baseUmaContainer');
    baseUmaContainer.innerHTML = '';

    data.forEach((item, index) => {
        const baseUmaItem = document.createElement('div');
        baseUmaItem.classList.add('base-item');
        baseUmaItem.textContent = item.name;
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

async function drawStat(data) {
    const umaStats = await loadUmaStats();
    const raceStats = umaStats[raceCategory];

    let tableHtml = `
        <table border="1">
            <tr>
                <th>우마무스메 이름</th>
                <th>속도</th>
                <th>스태</th>
                <th>파워</th>
                <th>근성</th>
                <th>지능</th>
                <th>각질</th>
            </tr>
    `;

    data.forEach(uma => {
        const umaName = uma.name;
        const stats = raceStats[umaName]?.stat;
        if (stats) {
            tableHtml += `
                <tr>
                    <td>${umaName}</td>
                    <td>${stats.speed}</td>
                    <td>${stats.stamina}</td>
                    <td>${stats.power}</td>
                    <td>${stats.tough}</td>
                    <td>${stats.intel}</td>
                    <td>${raceStats[umaName]["running_style"][raceDetail]}</td>
                </tr>
            `;
        }
    });

    tableHtml += '</table>';
    document.getElementById('uma-stats').innerHTML = tableHtml;
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
        const xValue = xScale.invert(x - margin.left);
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
            const selectUmaStatsRect = document.getElementById('uma-stats').getBoundingClientRect();
            left = selectUmaStatsRect.left;
            top = selectUmaStatsRect.bottom + 20 + window.scrollY;
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


// race video start
let globalVideoData = [];
let maxVideoTurn = 100000;
let currentTurn = 0;
let animationInterval = null;
let videoSpeed = 50;

const videoSlider = document.getElementById("video-turn-slider");
videoSlider.addEventListener('input', (e) => {
    currentTurn = parseInt(e.target.value, 10); 
    drawVideo(currentTurn);
});

document.addEventListener('DOMContentLoaded', (event) => {
    const videoSpeedInput = document.getElementById('video-speed-input');

    videoSpeedInput.addEventListener('input', (e) => {
        const value = parseInt(e.target.value, 10);

        if (value >= 1 && value <= 200) {
            videoSpeed = value;
            if (animationInterval != null) {
                videoStop();
                videoStart();
            }
        } else {
            e.target.value = videoSpeed;
        }
    });
});

const videoTooltip = d3.select("body").append("div")
    .attr("id", "video-tooltip")
    .attr("class", "tooltip")
    .style("opacity", 0);

function videoInit()
{
    fetch('raceDataPath.json')
    .then(response => response.json())
    .then(data => {
        // 값 초기화
        globalVideoData = [];
        maxVideoTurn = 100000;
        currentTurn = 0;
        clearInterval(animationInterval);
        animationInterval = null;
        videoSpeed = 50;

        let files = data[raceCategory][raceDetail];
        const promises = files.map(file => {
            return fetch("data/" + raceCategory + "/" + raceDetail + "/" + file)
                .then(response => response.text())
                .then(contents => {
                    const umaName = file.split('_').pop().replace('.csv', '')
                    const umaVideoData = handleVideoDataSingleUma(contents);
            
                    const labels = Object.keys(umaVideoData);

                    const posX = labels.map(label => umaVideoData[label].posX);
                    const posY = labels.map(label => umaVideoData[label].posY);
                    const stamina = labels.map(label => umaVideoData[label].stamina);

                    globalVideoData.push({
                        name: umaName,
                        posX,
                        posY,
                        stamina,
                        laneNo: umaVideoData.laneNo
                    });
                })
                .catch(error => console.error('Error:', error));
        });
        Promise.all(promises).then(() => {
            document.getElementById('race-video').style.display = 'block';

            globalVideoData.sort((a, b) => a.laneNo - b.laneNo);

            videoSlider.max = maxVideoTurn;
            videoSlider.value = 0;
            drawVideo(0);
        });
    })
    .catch(error => console.error('Error:', error));
}

function handleVideoDataSingleUma(data)
{
    const lines = data.split('\n');
    const umaData = {};
    let laneNo = 0;

    // 첫 번째 line은 skip. 두 번째 line부터 시작 (두 번째 line이 turn 1이므로)
    umaData[0] = {};
    umaData[0].posX = 0;
    umaData[0].posY = parseFloat(lines[1].split(',')[5]);
    umaData[0].stamina = 100;
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        const posX = parseFloat(parts[4]);
        const posY = parseFloat(parts[5]);
        const stamina = parseFloat(parts[6]);

        if (i === 1) {
            laneNo = posY;
        }else{
            if (umaData[i-1].posX == posX) {
                if (maxVideoTurn > i) {
                    maxVideoTurn = i;
                }
            }
        }
        umaData[i] = {};
        umaData[i].posX = posX;
        umaData[i].posY = posY;
        umaData[i].stamina = stamina;
    };
    umaData.laneNo = laneNo;

    return umaData;
}

function drawVideo(turn)
{
    const svg = d3.select("#video-svg");
    svg.selectAll("*").remove();

    const uma_index = {};
    globalVideoData.forEach((uma) => {
        uma_index[uma.name] = getUmaOrder(uma.name);
    });
    const orderedUmas = Object.keys(uma_index)
    .filter(name => uma_index[name] !== 999)
    .sort((a, b) => uma_index[a] - uma_index[b]);
    orderedUmas.forEach((name, index) => {
        uma_index[name] = index;
    });

    const allPosX = globalVideoData.map(uma => uma.posX[turn]);
    const allPosY = globalVideoData.map(uma => uma.posY[turn]);

    const diffPosX = Math.max(...allPosX) - Math.min(...allPosX);
    const rangeXMin = 400 - diffPosX * 10 > 100 ? 400 - diffPosX * 10 : 100;

    const xScale = d3.scaleLinear()
        .domain([Math.min(...allPosX), Math.max(...allPosX)])
        .range([rangeXMin, 800-rangeXMin]);

    const yScale = d3.scaleLinear()
        // .domain([Math.min(...allPosY), globalVideoData.length])
        .domain([Math.min(...allPosY), Math.max(...allPosY)])
        .range([80, 20]);  
    
    function onMouseOver(event, d) {
        videoTooltip.transition()
            .duration(0)
            .style("opacity", .9);      
        videoTooltip.html(d.laneNo + ": " + d.name + "<br/>"  
                + "PosX: " + d.posX[turn].toFixed(2) + " m<br/>"
                + "PosY: " + d.posY[turn].toFixed(2) + "<br/>"
                + "Stamina: " + d.stamina[turn].toFixed(2) + "%")
            .style("left", (event.pageX) + "px")
            .style("top", (event.pageY - 28) + "px");
    }
    function onMouseOut(d) {
        videoTooltip.transition()        
            .duration(0)
            .style("opacity", 0);
    }
        
    const circles = svg.selectAll("circle")
        .data(globalVideoData)
        .join("circle")
        .attr("cx", d => xScale(d.posX[turn]))
        .attr("cy", d => yScale(d.posY[turn]))
        .attr("r", 8)
        .attr("fill", d => colors[uma_index[d.name]])
        .on("mouseover", onMouseOver)
        .on("mouseout", onMouseOut);
        

    const texts = svg.selectAll("text")
        .data(globalVideoData)
        .join("text")
        .attr("x", d => xScale(d.posX[turn]))
        .attr("y", d => yScale(d.posY[turn]))
        .attr("dy", "0.3em")
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", "white")
        .text(d => d.laneNo)
        .on("mouseover", onMouseOver)
        .on("mouseout", onMouseOut);

    const staminaBarBackground = svg.selectAll("rect.bar-background")
        .data(globalVideoData)
        .join("rect")
        .attr("class", "bar-background")
        .attr("x", d => xScale(d.posX[turn]) - 20)
        .attr("y", d => yScale(d.posY[turn]) + 10)
        .attr("width", 40)
        .attr("height", 2)
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", 0.2);

    const staminaBarFilled = svg.selectAll("rect.bar-filled")
        .data(globalVideoData)
        .join("rect")
        .attr("class", "bar-filled")
        .attr("x", d => xScale(d.posX[turn]) - 20)
        .attr("y", d => yScale(d.posY[turn]) + 10)
        .attr("width", d => d.stamina[turn] > 0 ? d.stamina[turn] * 0.4 : 40)
        .attr("height", 2)
        .attr("fill", d => d.stamina[turn] > 0 ? colors[uma_index[d.name]] : "pink");

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append("text")
        .attr("x", 20)
        .attr("y", 95)
        .text(`${Math.min(...allPosX).toFixed(1)}m`);

    svg.append("text")
        .attr("x", 720)
        .attr("y", 95)
        .text(`${Math.max(...allPosX).toFixed(1)}m`);

    svg.append("text")
        .attr("x", 20)
        .attr("y", 75)
        .text(`${Math.min(...allPosY).toFixed(2)}`);

    svg.append("text")
        .attr("x", 20)
        .attr("y", 25)
        .text(`${Math.max(...allPosY).toFixed(2)}`);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", `translate(0,100)`)
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);
    
    document.getElementById('current-turn').innerText = `Turn: ${turn}`;
    videoSlider.value = turn;
}

function videoStart(){
    if (animationInterval == null) {
        animationInterval  = setInterval(() => {
            drawVideo(currentTurn);
            currentTurn += 1;
            if (currentTurn >= maxVideoTurn) {
                clearInterval(animationInterval);
                currentTurn = maxVideoTurn;
            }
        }, videoSpeed);
    }
};

function videoStop() {
    clearInterval(animationInterval);
    animationInterval = null;
}

function videoToFirst() {
    currentTurn = 0;
    drawVideo(0);
}