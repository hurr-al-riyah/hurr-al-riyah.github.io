// version: 1.8.3

let globalData = null;  // graph data 
let raceCategory = "";   // ex) 1007_실전레이스
let raceDetail = "";    // ex) 더트-단거리.txt -> 더트 단거리
let raceImage = "";     // ex) 단거리_1400.png
let raceWeather = "";   // ex) 양호
let raceCourse = [];    // ex) 100-200-300-400-200 -> [100, 300, 600, 1000, 1200]

const colors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
    '#9edae5', '#c5b0d5', '#dbdb8d', '#g6abae', '#c49c94',
];

var categories = {};

function loadCategories() {
    fetch('categories.json')
      .then(response => response.json())
      .then(data => {
        categories = data;
        // console.log('Categories loaded:', categories);
    })
    .catch(error => {
        console.error("Error loading the JSON file", error);
    });
}

loadCategories();

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
            option.label = item.display
            option.setAttribute('image', item.image);
            option.setAttribute('course', item.course);
            option.setAttribute('weather', item.weather);
            fileSelect.appendChild(option);
        });
    } else {
        fileSelect.disabled = true;
    }
});

function getWeatherEmoji(weather) {
    var weatherEmojis = {
        "양호": "☀️",
        "다습": "💧",
        "포화": "🌧️",
        "불량": "⚠️",
    };

    return weatherEmojis[weather] || "❓";
}

document.getElementById('fileSelect').addEventListener('change', function(e) {
    const filePath = e.target.value;
    raceImage = e.target.options[e.target.selectedIndex].getAttribute('image');

    raceWeather = e.target.options[e.target.selectedIndex].getAttribute('weather');
    let weatherInfo = document.getElementById('weatherInfo');
    weatherInfo.innerHTML = "날씨: " + getWeatherEmoji(raceWeather) + raceWeather;

    let raceCourseInfo = e.target.options[e.target.selectedIndex].getAttribute('course');
    const courseInfo = document.getElementById('course-info');
    courseInfo.innerHTML = '<b>직-곡 구간 번갈아서:</b> ' + raceCourseInfo;

    raceCourse = raceCourseInfo.split('-').map(Number);

    for (let i = 1; i < raceCourse.length; i++) {
        raceCourse[i] += raceCourse[i - 1];
    }
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
let showCourse = true;

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
            
            document.getElementById('race-video').style.display = 'none';
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

        if (index == 0) {
            baseUmaItem.classList.add('selected');
        }

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

document.getElementById('course').addEventListener('click', () => {
    showCourse = !showCourse;
    drawGraph(globalData);
    const speedBtn = document.getElementById('course');
    if(showCourse) {
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
                <th>마장</th>
                <th>거리</th>
                <th>각질</th>
            </tr>
    `;

    data.forEach(uma => {
        const umaName = uma.name;
        const stats = raceStats[umaName]?.stat;
        if (stats) {
            let words = raceDetail.split(' ');
            let road = words[0];
            let length = words[1];

            tableHtml += `
                <tr>
                    <td>${umaName}</td>
                    <td>${stats.speed}</td>
                    <td>${stats.stamina}</td>
                    <td>${stats.power}</td>
                    <td>${stats.tough}</td>
                    <td>${stats.intel}</td>
                    <td>${raceStats[umaName]["running_style"][raceDetail]}</td>
                    <td>${raceStats[umaName]["grade"][road]}</td>
                    <td>${raceStats[umaName]["grade"][length]}</td>
                    <td>${raceStats[umaName]["grade"][raceStats[umaName]["running_style"][raceDetail]]}</td>
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
    
    // draw course (직/곡)
    let shadedRegions = [];
    for (let i = 0; i < raceCourse.length - 1; i += 2) {
        let startValue = raceCourse[i];
        let endValue = raceCourse[i + 1];
    
        let startIndex = baseUma.distance.findIndex(d => d >= startValue);
        let endIndex = baseUma.distance.findIndex(d => d > endValue);
    
        if (startIndex !== -1 && endIndex !== -1) {
            shadedRegions.push({ start: startIndex * 20, end: endIndex * 20 });
        }
    }

    svg.selectAll(".shaded-region").remove();  // 기존 shaded region 삭제

    if (showCourse && raceCourse.length > 1) {
        svg.selectAll(".shaded-region")
            .data(shadedRegions)
            .enter()
            .append("rect")
            .attr("class", "shaded-region")
            .attr("x", d => xScale(d.start))
            .attr("y", 0)
            .attr("width", d => xScale(d.end) - xScale(d.start))
            .attr("height", height)
            .attr("fill", "grey")
            .attr("opacity", 0.3);
    }
    // draw course (직/곡) end

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
            // select-base-uma div 우측에 툴팁을 표시 (사실 툴팁이어야 할 이유는 없으나... 디자인 변경이 귀찮다ㅜㅜ)
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
    drawTrack(currentTurn);
});

let shadedRegionsVideo = [];

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
                    const positionKeep = labels.map(label => umaVideoData[label].positionKeep);

                    globalVideoData.push({
                        name: umaName,
                        posX,
                        posY,
                        stamina,
                        positionKeep,
                        laneNo: umaVideoData.laneNo
                    });
                })
                .catch(error => console.error('Error:', error));
        });
        Promise.all(promises).then(() => {
            document.getElementById('race-video').style.display = 'block';

            shadedRegionsVideo = [];
            for (let i = 0; i < raceCourse.length; i += 2) {
                shadedRegionsVideo.push({start: raceCourse[i], end: raceCourse[i + 1]});
            }
            shadedRegionsVideo[shadedRegionsVideo.length-1].end = shadedRegionsVideo[shadedRegionsVideo.length-1].start;

            globalVideoData.sort((a, b) => a.laneNo - b.laneNo);

            videoSlider.max = maxVideoTurn - 1;
            videoSlider.value = 0;
            drawVideo(0);
            drawTrack(0);
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
    umaData[0].positionKeep = "Ready";
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        const posX = parseFloat(parts[4]);
        const posY = parseFloat(parts[5]);
        const stamina = parseFloat(parts[6]);
        const positionKeep = parts[8];

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
        umaData[i].positionKeep = positionKeep;
    };
    umaData.laneNo = laneNo;

    return umaData;
}

// videoSlider.value는 이 함수에서만 변경됨
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

    const minY = Math.min(...allPosY);
    const maxY = Math.max(...allPosY);
    const rangeYMin = (maxY - minY) * 6.5 > 15 ? (maxY - minY) * 6.5 : 15;
    
    const yScale = d3.scaleLinear()
        // .domain([Math.min(...allPosY), globalVideoData.length])
        .domain([minY, maxY])
        .range([80, 80 - rangeYMin]);  
    
    shadedRegionsVideo.forEach(region => {
        svg.append("rect")
            .attr("x", xScale(region.start))
            .attr("y", 0)
            .attr("width", xScale(region.end) - xScale(region.start))
            .attr("height", svg.attr("height"))
            .attr("fill", "grey")
            .attr("opacity", 0.3);
    });

    function onMouseOver(event, d) {
        videoTooltip.transition()
            .duration(0)
            .style("opacity", .9);      
        videoTooltip.html(d.laneNo + ": " + d.name + "<br/>"  
                + "PosX: " + d.posX[turn].toFixed(2) + " m<br/>"
                + "PosY: " + d.posY[turn].toFixed(2) + "<br/>"
                + "Stamina: " + d.stamina[turn].toFixed(2) + "%<br/>"
                + "positionKeep: " + d.positionKeep[turn])
            .style("left", (event.pageX) + "px")
            .style("top", (event.pageY - 28) + "px");
    }
    function onMouseOut(d) {
        videoTooltip.transition()        
            .duration(0)
            .style("opacity", 0);
    }
    
    const circleBackgrounds = svg.selectAll(".circleBackground")
        .data(globalVideoData)
        .join("circle")
        .attr("class", "circleBackground")
        .attr("cx", d => xScale(d.posX[turn]))
        .attr("cy", d => yScale(d.posY[turn]))
        .attr("r", 12)
        .attr("fill", d => {
            switch (d.positionKeep[turn]) {
                case 'SpeedUp':
                    return 'lightblue';
                case 'Overtaking':
                    return 'lightgreen';
                case 'paceUp':
                    return 'lightcoral';
                default:
                    return 'none';
            }
        });

    const circles = svg.selectAll(".circle")
        .data(globalVideoData)
        .join("circle")
        .attr("class", "circle")
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

function drawTrack(turn) {
    // 필요한 라이브러리를 불러옵니다.
    const svg = d3.select("#track-svg")
    svg.selectAll("*").remove();

    const allPosX = globalVideoData.map(uma => uma.posX[turn]);
    const posMin = Math.min(...allPosX);
    const posMax = Math.max(...allPosX);

    if (raceImage != "") {
        svg.append('image')
        .attr('xlink:href', 'image/' + raceImage)
        .attr('width', 800)
        .attr('height', 250);
    }

    switch (raceImage) {
    case "단거리_1400.png":
        // 첫 직선
        if (posMin <= 100) {
            const shadedArea = svg.append('rect')
            .attr('x', Math.max(180, 250 - posMax * 0.7))
            .attr('y', 110)
            .attr('width', Math.min(Math.min(posMax, 100) - posMin, 100) * 0.7) 
            .attr('height', 30)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }

        // 첫 곡선
        if (posMax > 100 && posMax <= 300 || posMin > 100 && posMin <= 300) {
            const centerX = 180;
            const centerY = 180;
            const radiusOut = 70;
            const radiusIn = 40;

            const startAngle = (Math.max(posMin, 100) - 100) / 100 * Math.PI / 2;
            const endAngle = (Math.min(posMax, 300) - 100) / 100 * Math.PI / 2;

            const startXInner = centerX - radiusIn * Math.sin(startAngle);
            const startYInner = centerY - radiusIn * Math.cos(startAngle);
            
            const endXInner = centerX - radiusIn * Math.sin(endAngle);
            const endYInner = centerY - radiusIn * Math.cos(endAngle);
            
            const startXOuter = centerX - radiusOut * Math.sin(startAngle);
            const startYOuter = centerY - radiusOut * Math.cos(startAngle);
            
            const endXOuter = centerX - radiusOut * Math.sin(endAngle);
            const endYOuter = centerY - radiusOut * Math.cos(endAngle);

            const arcPath = `
                M ${startXInner} ${startYInner}
                A ${radiusIn} ${radiusIn} 0 0 0 ${endXInner} ${endYInner}
                L ${endXOuter} ${endYOuter}
                A ${radiusOut} ${radiusOut} 0 0 1 ${startXOuter} ${startYOuter}
                Z `;

            const shadedArea = svg.append('path')
            .attr('d', arcPath)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }
        // 두 번째 직선
        if (posMax > 300 && posMax <= 900 || posMin > 300 && posMin <= 900) {
            const shadedArea = svg.append('rect')
            .attr('x', 180 + Math.max(posMin - 300, 0) * 0.7417)
            .attr('y', 220)
            .attr('width', Math.min(Math.min(posMax, 900) - Math.max(posMin, 300), 600) * 0.7417) 
            .attr('height', 30)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }
        // 두 번째 곡선
        if (posMax > 900 && posMax <= 1100 || posMin > 900 && posMin <= 1100) {
            const centerX = 625;
            const centerY = 180;
            const radiusOut = 70;
            const radiusIn = 40;

            const startAngle = (Math.max(posMin, 900) + 900) / 100 * Math.PI / 2;
            const endAngle = (Math.min(posMax, 1100) + 900) / 100 * Math.PI / 2;

            const startXInner = centerX - radiusIn * Math.sin(startAngle);
            const startYInner = centerY - radiusIn * Math.cos(startAngle);
            
            const endXInner = centerX - radiusIn * Math.sin(endAngle);
            const endYInner = centerY - radiusIn * Math.cos(endAngle);
            
            const startXOuter = centerX - radiusOut * Math.sin(startAngle);
            const startYOuter = centerY - radiusOut * Math.cos(startAngle);
            
            const endXOuter = centerX - radiusOut * Math.sin(endAngle);
            const endYOuter = centerY - radiusOut * Math.cos(endAngle);

            const arcPath = `
                M ${startXInner} ${startYInner}
                A ${radiusIn} ${radiusIn} 0 0 0 ${endXInner} ${endYInner}
                L ${endXOuter} ${endYOuter}
                A ${radiusOut} ${radiusOut} 0 0 1 ${startXOuter} ${startYOuter}
                Z `;

            const shadedArea = svg.append('path')
            .attr('d', arcPath)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }
        // 최종 직선
        if (posMax > 1100) {
            const shadedArea = svg.append('rect')
            .attr('x', 625 - (posMax - 1100) * 0.75)
            .attr('y', 110)
            .attr('width', Math.min(posMax - Math.max(posMin, 1100), 300) * 0.75) 
            .attr('height', 30)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }
        break;
    case "마일_1700.png":
        // 첫 직선
        if (posMin <= 100) {
            const shadedArea = svg.append('rect')
            .attr('x', Math.max(180, 250 - posMax * 0.7))
            .attr('y', 110)
            .attr('width', Math.min(Math.min(posMax, 100) - posMin, 100) * 0.7) 
            .attr('height', 30)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }

        // 첫 곡선
        if (posMax > 100 && posMax <= 300 || posMin > 100 && posMin <= 300) {
            const centerX = 180;
            const centerY = 180;
            const radiusOut = 70;
            const radiusIn = 40;

            const startAngle = (Math.max(posMin, 100) - 100) / 100 * Math.PI / 2;
            const endAngle = (Math.min(posMax, 300) - 100) / 100 * Math.PI / 2;

            const startXInner = centerX - radiusIn * Math.sin(startAngle);
            const startYInner = centerY - radiusIn * Math.cos(startAngle);
            
            const endXInner = centerX - radiusIn * Math.sin(endAngle);
            const endYInner = centerY - radiusIn * Math.cos(endAngle);
            
            const startXOuter = centerX - radiusOut * Math.sin(startAngle);
            const startYOuter = centerY - radiusOut * Math.cos(startAngle);
            
            const endXOuter = centerX - radiusOut * Math.sin(endAngle);
            const endYOuter = centerY - radiusOut * Math.cos(endAngle);

            const arcPath = `
                M ${startXInner} ${startYInner}
                A ${radiusIn} ${radiusIn} 0 0 0 ${endXInner} ${endYInner}
                L ${endXOuter} ${endYOuter}
                A ${radiusOut} ${radiusOut} 0 0 1 ${startXOuter} ${startYOuter}
                Z `;

            const shadedArea = svg.append('path')
            .attr('d', arcPath)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }
        // 두 번째 직선
        if (posMax > 300 && posMax <= 900 || posMin > 300 && posMin <= 900) {
            const shadedArea = svg.append('rect')
            .attr('x', 180 + Math.max(posMin - 300, 0) * 0.7417)
            .attr('y', 220)
            .attr('width', Math.min(Math.min(posMax, 900) - Math.max(posMin, 300), 600) * 0.7417) 
            .attr('height', 30)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }
        // 두 번째 곡선
        if (posMax > 900 && posMax <= 1300 || posMin > 900 && posMin <= 1300) {
            const centerX = 625;
            const centerY = 125;
            const radiusOut = 125;
            const radiusIn = 95;

            const startAngle = (Math.max(posMin, 900) + 2700) / 200 * Math.PI / 2;
            const endAngle = (Math.min(posMax, 1300) + 2700) / 200 * Math.PI / 2;

            const startXInner = centerX - radiusIn * Math.sin(startAngle);
            const startYInner = centerY - radiusIn * Math.cos(startAngle);
            
            const endXInner = centerX - radiusIn * Math.sin(endAngle);
            const endYInner = centerY - radiusIn * Math.cos(endAngle);
            
            const startXOuter = centerX - radiusOut * Math.sin(startAngle);
            const startYOuter = centerY - radiusOut * Math.cos(startAngle);
            
            const endXOuter = centerX - radiusOut * Math.sin(endAngle);
            const endYOuter = centerY - radiusOut * Math.cos(endAngle);

            const arcPath = `
                M ${startXInner} ${startYInner}
                A ${radiusIn} ${radiusIn} 0 0 0 ${endXInner} ${endYInner}
                L ${endXOuter} ${endYOuter}
                A ${radiusOut} ${radiusOut} 0 0 1 ${startXOuter} ${startYOuter}
                Z `;

            const shadedArea = svg.append('path')
            .attr('d', arcPath)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }
        if (posMax > 1300) {
            const shadedArea = svg.append('rect')
            .attr('x', 625 - (posMax - 1300) * 0.75)
            .attr('y', 0)
            .attr('width', Math.min(posMax - Math.max(posMin, 1300), 400) * 0.75) 
            .attr('height', 30)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }
        break;
    case "중거리_2400.png":
        // 첫 번째 직선
        if (posMin <= 400) {
            const shadedArea = svg.append('rect')
            .attr('x', Math.max(180, 480 - posMax * 0.75))
            .attr('y', 0)
            .attr('width', Math.min(Math.min(posMax, 400) - posMin, 400) * 0.75) 
            .attr('height', 30)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }
        // 첫 번째 곡선
        if (posMax > 400 && posMax <= 800 || posMin > 400 && posMin <= 800) {
            const centerX = 180;
            const centerY = 125;
            const radiusOut = 125;
            const radiusIn = 95;

            const startAngle = (Math.max(posMin, 400) + 400) / 200 * Math.PI / 2;
            const endAngle = (Math.min(posMax, 800) + 400) / 200 * Math.PI / 2;

            const startXInner = centerX - radiusIn * Math.sin(startAngle);
            const startYInner = centerY - radiusIn * Math.cos(startAngle);
            
            const endXInner = centerX - radiusIn * Math.sin(endAngle);
            const endYInner = centerY - radiusIn * Math.cos(endAngle);
            
            const startXOuter = centerX - radiusOut * Math.sin(startAngle);
            const startYOuter = centerY - radiusOut * Math.cos(startAngle);
            
            const endXOuter = centerX - radiusOut * Math.sin(endAngle);
            const endYOuter = centerY - radiusOut * Math.cos(endAngle);

            const arcPath = `
                M ${startXInner} ${startYInner}
                A ${radiusIn} ${radiusIn} 0 0 0 ${endXInner} ${endYInner}
                L ${endXOuter} ${endYOuter}
                A ${radiusOut} ${radiusOut} 0 0 1 ${startXOuter} ${startYOuter}
                Z `;

            const shadedArea = svg.append('path')
            .attr('d', arcPath)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }
        // 두 번째 직선
        if (posMax > 800 && posMax <= 1400 || posMin > 800 && posMin <= 1400) {
            const shadedArea = svg.append('rect')
            .attr('x', 180 + Math.max(posMin - 800, 0) * 0.7417)
            .attr('y', 220)
            .attr('width', Math.min(Math.min(posMax, 1400) - Math.max(posMin, 800), 600) * 0.7417) 
            .attr('height', 30)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }
        // 두 번째 곡선
        if (posMax > 1400 && posMax <= 1800 || posMin > 1400 && posMin <= 1800) {
            const centerX = 625;
            const centerY = 125;
            const radiusOut = 125;
            const radiusIn = 95;

            const startAngle = (Math.max(posMin, 1400) + 1400) / 200 * Math.PI / 2;
            const endAngle = (Math.min(posMax, 1800) + 1400) / 200 * Math.PI / 2;

            const startXInner = centerX - radiusIn * Math.sin(startAngle);
            const startYInner = centerY - radiusIn * Math.cos(startAngle);
            
            const endXInner = centerX - radiusIn * Math.sin(endAngle);
            const endYInner = centerY - radiusIn * Math.cos(endAngle);
            
            const startXOuter = centerX - radiusOut * Math.sin(startAngle);
            const startYOuter = centerY - radiusOut * Math.cos(startAngle);
            
            const endXOuter = centerX - radiusOut * Math.sin(endAngle);
            const endYOuter = centerY - radiusOut * Math.cos(endAngle);

            const arcPath = `
                M ${startXInner} ${startYInner}
                A ${radiusIn} ${radiusIn} 0 0 0 ${endXInner} ${endYInner}
                L ${endXOuter} ${endYOuter}
                A ${radiusOut} ${radiusOut} 0 0 1 ${startXOuter} ${startYOuter}
                Z `;

            const shadedArea = svg.append('path')
            .attr('d', arcPath)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }
        // 최종 직선
        if (posMax > 1800) {
            const shadedArea = svg.append('rect')
            .attr('x', 625 - (posMax - 1800) * 0.75)
            .attr('y', 0)
            .attr('width', Math.min(posMax - Math.max(posMin, 1800), 600) * 0.75) 
            .attr('height', 30)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }
        break;
    case "장거리_3200.png":
        // 첫 번째 직선
        if (posMin <= 400) {
            const shadedArea = svg.append('rect')
            .attr('x', Math.max(180, 480 - posMax * 0.75))
            .attr('y', 110)
            .attr('width', Math.min(Math.min(posMax, 400) - posMin, 400) * 0.75) 
            .attr('height', 30)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }
        // 첫 번째 곡선
        if (posMax > 400 && posMax <= 600 || posMin > 400 && posMin <= 600) {
            const centerX = 180;
            const centerY = 180;
            const radiusOut = 70;
            const radiusIn = 40;

            const startAngle = (Math.max(posMin, 400) - 400) / 100 * Math.PI / 2;
            const endAngle = (Math.min(posMax, 600) - 400) / 100 * Math.PI / 2;

            const startXInner = centerX - radiusIn * Math.sin(startAngle);
            const startYInner = centerY - radiusIn * Math.cos(startAngle);
            
            const endXInner = centerX - radiusIn * Math.sin(endAngle);
            const endYInner = centerY - radiusIn * Math.cos(endAngle);
            
            const startXOuter = centerX - radiusOut * Math.sin(startAngle);
            const startYOuter = centerY - radiusOut * Math.cos(startAngle);
            
            const endXOuter = centerX - radiusOut * Math.sin(endAngle);
            const endYOuter = centerY - radiusOut * Math.cos(endAngle);

            const arcPath = `
                M ${startXInner} ${startYInner}
                A ${radiusIn} ${radiusIn} 0 0 0 ${endXInner} ${endYInner}
                L ${endXOuter} ${endYOuter}
                A ${radiusOut} ${radiusOut} 0 0 1 ${startXOuter} ${startYOuter}
                Z `;

            const shadedArea = svg.append('path')
            .attr('d', arcPath)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }
        // 두 번째 직선
        if (posMax > 600 && posMax <= 1200 || posMin > 600 && posMin <= 1200) {
            const shadedArea = svg.append('rect')
            .attr('x', 180 + Math.max(posMin - 600, 0) * 0.7417)
            .attr('y', 220)
            .attr('width', Math.min(Math.min(posMax, 1200) - Math.max(posMin, 600), 600) * 0.7417) 
            .attr('height', 30)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }
        // 두 번째 곡선
        if (posMax > 1200 && posMax <= 1600 || posMin > 1200 && posMin <= 1600) {
            const centerX = 625;
            const centerY = 125;
            const radiusOut = 125;
            const radiusIn = 95;

            const startAngle = (Math.max(posMin, 1200)) / 200 * Math.PI / 2;
            const endAngle = (Math.min(posMax, 1600)) / 200 * Math.PI / 2;

            const startXInner = centerX - radiusIn * Math.sin(startAngle);
            const startYInner = centerY - radiusIn * Math.cos(startAngle);
            
            const endXInner = centerX - radiusIn * Math.sin(endAngle);
            const endYInner = centerY - radiusIn * Math.cos(endAngle);
            
            const startXOuter = centerX - radiusOut * Math.sin(startAngle);
            const startYOuter = centerY - radiusOut * Math.cos(startAngle);
            
            const endXOuter = centerX - radiusOut * Math.sin(endAngle);
            const endYOuter = centerY - radiusOut * Math.cos(endAngle);

            const arcPath = `
                M ${startXInner} ${startYInner}
                A ${radiusIn} ${radiusIn} 0 0 0 ${endXInner} ${endYInner}
                L ${endXOuter} ${endYOuter}
                A ${radiusOut} ${radiusOut} 0 0 1 ${startXOuter} ${startYOuter}
                Z `;

            const shadedArea = svg.append('path')
            .attr('d', arcPath)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }
        // 세 번째 직선
        if (posMax > 1600 && posMax <= 2200 || posMin > 1600 && posMin <= 2200) {
            const shadedArea = svg.append('rect')
            .attr('x', 625 - ((Math.min(posMax, 2200) - 1600) * 0.7417))
            .attr('y', 0)
            .attr('width', Math.min(Math.min(posMax, 2200) - Math.max(posMin, 1600), 600) * 0.7417) 
            .attr('height', 30)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }
        // 세 번째 곡선
        if (posMax > 2200 && posMax <= 2600 || posMin > 2200 && posMin <= 2600) {
            const centerX = 180;
            const centerY = 125;
            const radiusOut = 125;
            const radiusIn = 95;

            const startAngle = (Math.max(posMin, 2200) + 200) / 200 * Math.PI / 2;
            const endAngle = (Math.min(posMax, 2600) + 200) / 200 * Math.PI / 2;

            const startXInner = centerX - radiusIn * Math.sin(startAngle);
            const startYInner = centerY - radiusIn * Math.cos(startAngle);
            
            const endXInner = centerX - radiusIn * Math.sin(endAngle);
            const endYInner = centerY - radiusIn * Math.cos(endAngle);
            
            const startXOuter = centerX - radiusOut * Math.sin(startAngle);
            const startYOuter = centerY - radiusOut * Math.cos(startAngle);
            
            const endXOuter = centerX - radiusOut * Math.sin(endAngle);
            const endYOuter = centerY - radiusOut * Math.cos(endAngle);

            const arcPath = `
                M ${startXInner} ${startYInner}
                A ${radiusIn} ${radiusIn} 0 0 0 ${endXInner} ${endYInner}
                L ${endXOuter} ${endYOuter}
                A ${radiusOut} ${radiusOut} 0 0 1 ${startXOuter} ${startYOuter}
                Z `;

            const shadedArea = svg.append('path')
            .attr('d', arcPath)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }
        // 최종 직선
        if (posMax > 2600) {
            const shadedArea = svg.append('rect')
            .attr('x', 180 + Math.max(posMin - 2600, 0) * 0.7417)
            .attr('y', 220)
            .attr('width', Math.min(posMax - Math.max(posMin, 2600), 600) * 0.7417) 
            .attr('height', 30)
            .attr('fill', 'grey')
            .attr('opacity', 0.5);
        }
        break;
    }

}

function videoStart(){
    if (animationInterval == null) {
        animationInterval  = setInterval(() => {
            drawVideo(currentTurn);
            drawTrack(currentTurn);
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
    drawTrack(0);
}