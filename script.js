let n = 0, m = 0;
let allocation = [], max = [], need = [], available = [];
let request = [];

/* ====================== INIT ====================== */

numProcesses.addEventListener("change", initEmptyTables);
numResources.addEventListener("change", initEmptyTables);
fileInput.addEventListener("change", loadFromFile);

initEmptyTables();

/* ====================== INIT EMPTY ====================== */

function initEmptyTables() {
    n = +numProcesses.value;
    m = +numResources.value;

    allocation = createMatrix(n, m);
    max = createMatrix(n, m);
    request = createMatrix(n, m);
    available = Array(m).fill(0);

    renderAll();
}

/* ====================== RENDER ====================== */

function renderAll() {
    renderTable("allocationTable", allocation, "A");
    renderTable("maxTable", max, "M");
    renderTable("requestTable", request, "R");
    renderAvailable();
    renderProcessSelector();
}

function renderTable(id, matrix, prefix) {
    const table = document.getElementById(id);
    table.innerHTML = "";

    let header = "<tr><th></th>";
    for (let j = 0; j < m; j++) header += `<th>${prefix}${j}</th>`;
    header += "</tr>";
    table.innerHTML += header;

    matrix.forEach((row, i) => {
        let tr = `<tr><th>P${i}</th>`;
        row.forEach((val, j) => {
            tr += `<td><input type="number" value="${val}"
                onchange="matrixChange('${id}',${i},${j},this.value)"></td>`;
        });
        tr += "</tr>";
        table.innerHTML += tr;
    });
}

function renderAvailable() {
    const div = availableInputs;
    div.innerHTML = "";
    available.forEach((v, j) => {
        div.innerHTML += `
            <div>
                <label>R${j}</label>
                <input type="number" value="${v}"
                    onchange="available[${j}]=+this.value">
            </div>`;
    });
}

function renderProcessSelector() {
    requestProcess.innerHTML = "";
    for (let i = 0; i < n; i++) {
        requestProcess.innerHTML += `<option value="${i}">P${i}</option>`;
    }
}

/* ====================== DATA CHANGE ====================== */

function matrixChange(id, i, j, val) {
    val = +val;
    if (id === "allocationTable") allocation[i][j] = val;
    if (id === "maxTable") max[i][j] = val;
    if (id === "requestTable") request[i][j] = val;
}

/* ====================== FILE LOAD ====================== */

function loadFromFile(e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = () => {
        const lines = reader.result.trim().split("\n");
        let idx = 0;

        [n, m] = lines[idx++].split(" ").map(Number);
        numProcesses.value = n;
        numResources.value = m;

        allocation = readMatrix(lines, idx, n, m);
        idx += n;

        max = readMatrix(lines, idx, n, m);
        idx += n;

        available = lines[idx].split(" ").map(Number);
        request = createMatrix(n, m);

        renderAll();
    };

    reader.readAsText(file);
}

/* ====================== UTILS ====================== */

function readMatrix(lines, start, r, c) {
    return lines.slice(start, start + r)
        .map(l => l.split(" ").map(Number));
}

function createMatrix(r, c) {
    return Array.from({ length: r }, () => Array(c).fill(0));
}

/* ====================== BANKER CORE ====================== */

function calculateNeed() {
    need = allocation.map((row, i) =>
        row.map((v, j) => max[i][j] - v)
    );
    renderTable("needTable", need, "N");
}

function runBankersAlgorithm() {
    calculateNeed();

    let work = [...available];
    let finish = Array(n).fill(false);
    let safeSeq = [];
    let steps = [];
    let step = 1;

    while (safeSeq.length < n) {
        let found = false;

        for (let i = 0; i < n; i++) {
            if (!finish[i] && need[i].every((v, j) => v <= work[j])) {

                const workBefore = [...work];
                work = work.map((v, j) => v + allocation[i][j]);
                finish[i] = true;
                safeSeq.push(`P${i}`);

                steps.push(renderStep(step++, i, workBefore, need[i], allocation[i], work));
                found = true;
            }
        }
        if (!found) break;
    }

    displayResult(finish.every(v => v), safeSeq, steps);
}

/* ====================== REQUEST ====================== */

function handleRequestClick() {
    const p = +requestProcess.value;
    const req = request[p];

    if (!req.every((v, j) => v <= need[p][j] && v <= available[j])) {
        alert("Request không hợp lệ -> từ chối");
        return;
    }

    req.forEach((v, j) => {
        available[j] -= v;
        allocation[p][j] += v;
        need[p][j] -= v;
    });

    runBankersAlgorithm();
}

/* ====================== STEP VIEW ====================== */

function renderStep(step, p, wb, needP, allocP, wa) {
    const row = arr => arr.map(v => `<td>${v}</td>`).join("");
    return `
    <div class="step">
        <b>Bước ${step}: P${p}</b>
        <table>
            <tr><th colspan="${m}">WORK trước</th></tr>
            <tr>${row(wb)}</tr>
            <tr><th colspan="${m}">NEED</th></tr>
            <tr>${row(needP)}</tr>
            <tr><th colspan="${m}">ALLOCATION</th></tr>
            <tr>${row(allocP)}</tr>
            <tr><th colspan="${m}">WORK sau</th></tr>
            <tr>${row(wa)}</tr>
        </table>
    </div>`;
}

/* ====================== RESULT ====================== */

function displayResult(isSafe, seq, steps) {
    resultsCard.classList.add("show");
    statusBox.className = "status-box " + (isSafe ? "safe" : "unsafe");
    statusHeader.innerText = isSafe ? "HỆ THỐNG AN TOÀN" : "HỆ THỐNG KHÔNG AN TOÀN";
    safeSequence.innerText = isSafe ? "Chuỗi an toàn: " + seq.join(" → ") : "";
    stepsContainer.innerHTML = steps.join("");
}
