const fs = require('fs');
const path = require('path');


function baseToBigInt(str, base) {
    const digits = '0123456789abcdef';
    str = str.toLowerCase();
    let result = 0n;
    let bigBase = BigInt(base);
    for (const ch of str) {
        const val = digits.indexOf(ch);
        if (val === -1 || val >= base) {
            throw new Error(`Invalid digit '${ch}' for base ${base}`);
        }
        result = result * bigBase + BigInt(val);
    }
    return result;
}

function lagrangeInterpolationAtZero(xs, ys) {
    const k = xs.length;
    let secret = 0n;

    for (let i = 0; i < k; i++) {
        let xi = BigInt(xs[i]);
        let yi = ys[i];
        let numerator = 1n;
        let denominator = 1n;

        for (let j = 0; j < k; j++) {
            if (j === i) continue;
            let xj = BigInt(xs[j]);
            numerator *= (-xj);
            denominator *= (xi - xj);
        }

        secret += (yi * numerator) / denominator;
    }

    return secret;
}

function processTestCaseFile(filePath) {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(rawData);

    const n = data.keys.n;
    const k = data.keys.k;

    let points = [];
    for (const key in data) {
        if (key === 'keys') continue;

        const base = parseInt(data[key].base);
        const val = data[key].value;

        try {
            const y = baseToBigInt(val, base);
            points.push({ x: BigInt(key), y });
        } catch (e) {
            const error = `Failed to decode value ${val} in base ${base} for x = ${key}: ${e.message}`;
            fs.writeFileSync('output/result.txt', error + '\n', { flag: 'a' });
            return;
        }
    }

    points.sort((a, b) => (a.x < b.x ? -1 : 1));
    points = points.slice(0, k);

    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);

    const secret = lagrangeInterpolationAtZero(xs, ys);
    const output = `Secret (constant term) from ${path.basename(filePath)} = ${secret.toString()}\n`;

    fs.writeFileSync('output/result.txt', output, { flag: 'a' });
}

// Entry point
const inputFile = process.argv[2] || 'input/testcase1.json';
processTestCaseFile(inputFile);
