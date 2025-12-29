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
    need = createMatrix(n, m);

    renderAll();
}

/* ====================== RENDER ====================== */

function renderAll() {
    renderTable("allocationTable", allocation, "A");
    renderTable("maxTable", max, "M");
    renderTable("requestTable", request, "R");
    renderTable("needTable", need, "N");
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
    availableInputs.innerHTML = "";
    available.forEach((v, j) => {
        availableInputs.innerHTML += `
            <div>
                <label>R${j}</label>
                <input type="number" value="${v}"
                    onchange="available[${j}] = +this.value">
            </div>`;
    });
}

function renderProcessSelector() {
    requestProcess.innerHTML = "";
    for (let i = 0; i < n; i++)
        requestProcess.innerHTML += `<option value="${i}">P${i}</option>`;
}

/* ====================== DATA CHANGE ====================== */

function matrixChange(id, i, j, val) {
    val = Number(val);
    if (isNaN(val)) val = 0;

    if (id === "allocationTable") allocation[i][j] = val;
    if (id === "maxTable") max[i][j] = val;
    if (id === "requestTable") request[i][j] = val;

    calculateNeed();
}

/* ====================== FILE LOAD ====================== */

function loadFromFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const lines = reader.result.replace(/\r/g, "")
                .split("\n").map(l => l.trim()).filter(l => l !== "");

            let idx = 0;

            [n, m] = splitNumbers(lines[idx++], 2, "n m");
            numProcesses.value = n;
            numResources.value = m;

            allocation = readMatrixSafe(lines, idx, n, m, "Allocation");
            idx += n;

            max = readMatrixSafe(lines, idx, n, m, "Max");
            idx += n;

            for (let i = 0; i < n; i++)
                for (let j = 0; j < m; j++)
                    if (allocation[i][j] > max[i][j])
                        throw `Allocation[P${i}][R${j}] > Max`;

            available = splitNumbers(lines[idx], m, "Available");

            request = createMatrix(n, m);
            calculateNeed();
            renderAll();

            alert(" Load file thành công!");
        } catch (err) {
            alert(" Lỗi file:\n" + err);
            console.error(err);
        }
    };
    reader.readAsText(file);
}

/* ====================== UTILS ====================== */

function createMatrix(r, c) {
    return Array.from({ length: r }, () => Array(c).fill(0));
}

function splitNumbers(line, expected, label) {
    const arr = line.split(/[\s,]+/).map(Number);
    if (arr.length !== expected || arr.some(isNaN))
        throw `${label} không hợp lệ`;
    return arr;
}

function readMatrixSafe(lines, start, r, c, label) {
    const matrix = [];
    for (let i = 0; i < r; i++)
        matrix.push(splitNumbers(lines[start + i], c, `${label}[P${i}]`));
    return matrix;
}

/* ====================== BANKER CORE ====================== */

function calculateNeed() {
    need = allocation.map((row, i) =>
        row.map((v, j) => Math.max(0, max[i][j] - v))
    );
    renderTable("needTable", need, "N");
}

function runBankersAlgorithm() {
    calculateNeed();

    let work = [...available];
    let finish = Array(n).fill(false);
    let needSim = need.map(r => [...r]);
    let allocSim = allocation.map(r => [...r]);

    let safeSeq = [];
    let steps = [];
    let step = 1;

    while (safeSeq.length < n) {
        let found = false;

        for (let i = 0; i < n; i++) {
            if (!finish[i] && needSim[i].every((v, j) => v <= work[j])) {
                const workBefore = [...work];

                work = work.map((v, j) => v + allocSim[i][j]);
                finish[i] = true;
                safeSeq.push(`P${i}`);

                steps.push(renderStep(
                    step++, i, workBefore, needSim[i], allocSim[i], work
                ));
                found = true;
            }
        }
        if (!found) break;
    }

    displayResult(finish.every(v => v), safeSeq, steps);
}

/* ====================== REQUEST (CHUẨN BANKER) ====================== */

function handleRequestClick() {
    calculateNeed();

    const p = +requestProcess.value;
    const req = request[p];

    // 1. Request > Need
    if (!req.every((v, j) => v <= need[p][j])) {
        alert(`Request của P${p} vượt NEED → TỪ CHỐI`);
        return;
    }

    // 2. Request > Available
    if (!req.every((v, j) => v <= available[j])) {
        alert(` Tài nguyên chưa đủ → P${p} PHẢI CHỜ`);
        return;
    }

    // 3. GIẢ LẬP CẤP PHÁT
    let availSim = [...available];
    let allocSim = allocation.map(r => [...r]);
    let needSim  = need.map(r => [...r]);

    req.forEach((v, j) => {
        availSim[j] -= v;
        allocSim[p][j] += v;
        needSim[p][j] -= v;
    });

    // 4. KIỂM TRA AN TOÀN
    const check = checkSafety(availSim, allocSim, needSim);

    if (!check.isSafe) {
        alert(" Request bị từ chối vì gây TRẠNG THÁI KHÔNG AN TOÀN");
        return;
    }

    // 5. CẤP PHÁT THẬT
    req.forEach((v, j) => {
        available[j] -= v;
        allocation[p][j] += v;
    });

    calculateNeed();

    alert(`✔ Request của P${p} ĐƯỢC CHẤP NHẬN\nChuỗi an toàn: ${check.seq.join(" → ")}`);
    runBankersAlgorithm();
}

/* ====================== SAFETY CHECK ====================== */

function checkSafety(avail, alloc, needMat) {
    let work = [...avail];
    let finish = Array(n).fill(false);
    let seq = [];

    while (seq.length < n) {
        let found = false;

        for (let i = 0; i < n; i++) {
            if (!finish[i] && needMat[i].every((v, j) => v <= work[j])) {
                work = work.map((v, j) => v + alloc[i][j]);
                finish[i] = true;
                seq.push(`P${i}`);
                found = true;
            }
        }
        if (!found) break;
    }

    return {
        isSafe: finish.every(v => v),
        seq
    };
}

/* ====================== STEP VIEW ====================== */

function renderStep(step, p, wb, needP, allocP, wa) {
    const row = a => a.map(v => `<td>${v}</td>`).join("");
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
    statusHeader.innerText = isSafe
        ? "HỆ THỐNG AN TOÀN"
        : "HỆ THỐNG KHÔNG AN TOÀN";

    safeSequence.innerText = isSafe
        ? "Chuỗi an toàn: " + seq.join(" → ")
        : "";

    stepsContainer.innerHTML = steps.join("");
}
