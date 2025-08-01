const fs = require('fs');
const path = require('path');

function modInverse(n, mod) {
    let m0 = mod;
    let y = 0n;
    let x = 1n;

    if (mod === 1n) return 0n;

    while (n > 1n) {
        let q = n / mod;
        let t = mod;

        mod = n % mod;
        n = t;
        t = y;

        y = x - q * y;
        x = t;
    }

    if (x < 0n) {
        x += m0;
    }

    return x;
}

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

function lagrangeInterpolationAtZero(xs, ys, p) {
    const k = xs.length;
    let secret = 0n;
    const bigP = BigInt(p);

    for (let i = 0; i < k; i++) {
        let xi = xs[i];
        let yi = ys[i];
        let numerator = 1n;
        let denominator = 1n;

        for (let j = 0; j < k; j++) {
            if (j === i) continue;
            let xj = xs[j];
            numerator = (numerator * (bigP - xj)) % bigP;
            denominator = (denominator * (xi - xj + bigP)) % bigP;
        }

        if (denominator === 0n) {
            throw new Error('Denominator is zero. This happens if x-coordinates are not unique.');
        }

        const inv_denominator = modInverse(denominator, bigP);
        const term = (yi * numerator * inv_denominator) % bigP;
        secret = (secret + term + bigP) % bigP;
    }

    return (secret + bigP) % bigP;
}

function processTestCaseFile(filePath) {
    const outputDir = 'output';
    const resultFilePath = path.join(outputDir, 'result.txt');

    // This block ensures the output directory exists before any file writing.
    try {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
            console.log(`Created output directory at: ${outputDir}`);
        }
    } catch (e) {
        console.error(`ERROR: Could not create output directory at ${outputDir}. Check permissions.`);
        return; // Exit if we can't even create the directory.
    }

    try {
        const rawData = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(rawData);

        if (!data.keys || !data.keys.p) {
            throw new Error(`Missing required 'p' (prime modulus) in the 'keys' object. Please add a prime number larger than all share values.`);
        }
        if (!data.keys || !data.keys.k) {
            throw new Error(`Missing required 'k' (threshold) in the 'keys' object.`);
        }

        const k = data.keys.k;
        const p = BigInt(data.keys.p);

        let points = [];
        const sortedKeys = Object.keys(data)
            .filter(key => key !== 'keys' && key.match(/^\d+$/))
            .sort((a, b) => parseInt(a) - parseInt(b));

        for (const key of sortedKeys) {
            const x = BigInt(key);
            const base = parseInt(data[key].base);
            const val = data[key].value;

            const y = baseToBigInt(val, base) % p;
            points.push({ x, y });
        }

        const xCoordinates = points.map(point => point.x.toString());
        const uniqueXCoordinates = new Set(xCoordinates);
        if (uniqueXCoordinates.size !== xCoordinates.length) {
            throw new Error(`Duplicate 'x' coordinates found in input file. Each share must have a unique x-coordinate.`);
        }

        if (points.length < k) {
            throw new Error(`Not enough shares. Required: ${k}, Found: ${points.length}`);
        }

        points = points.slice(0, k);

        const xs = points.map(point => point.x);
        const ys = points.map(point => point.y);

        const secret = lagrangeInterpolationAtZero(xs, ys, p);
        const output = `Secret (constant term) from ${path.basename(filePath)} = ${secret.toString()}\n`;

        // The file write operation
        console.log(`Writing result for ${path.basename(filePath)} to ${resultFilePath}`);
        fs.writeFileSync(resultFilePath, output, { flag: 'a' });
        console.log(`Successfully processed ${path.basename(filePath)}`);

    } catch (e) {
        const error = `Failed to process ${filePath}: ${e.message}\n`;
        console.error(error); // Log the error to the console
        try {
            fs.writeFileSync(resultFilePath, error, { flag: 'a' }); // Attempt to write the error to the file
        } catch (fileErr) {
            console.error(`ERROR: Could not write to ${resultFilePath}. Check file permissions.`);
        }
    }
}

// Entry point of the script
const inputDir = 'input';
const resultFilePath = path.join('output', 'result.txt');

// Ensure output directory exists before clearing the file
try {
    if (!fs.existsSync('output')) {
        fs.mkdirSync('output');
    }
    // Clear previous results at the start of the script
    fs.writeFileSync(resultFilePath, '');
    console.log(`Cleared previous results in ${resultFilePath}`);

    const files = fs.readdirSync(inputDir).filter(file => file.endsWith('.json'));

    if (files.length === 0) {
        console.log(`No JSON test case files found in '${inputDir}'.`);
        fs.writeFileSync(resultFilePath, 'No JSON test case files found.\n', { flag: 'a' });
    } else {
        for (const file of files) {
            const filePath = path.join(inputDir, file);
            console.log(`Processing ${filePath}...`);
            processTestCaseFile(filePath);
        }
        console.log('All processing complete. Final results are in output/result.txt');
    }
} catch (e) {
    const error = `Error accessing input directory '${inputDir}': ${e.message}`;
    console.error(error);
    fs.writeFileSync(resultFilePath, error + '\n', { flag: 'a' });
}