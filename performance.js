#!/usr/bin/env node

const fs = require('fs');
const { MWRR } = require('./lilleri');

const filePath = process.argv[2];

if (!filePath) {
	console.error("Usage: node performance.js <path_to_data.json>");
	process.exit(1);
}

let data;
try {
	const rawData = fs.readFileSync(filePath, 'utf8');
	data = JSON.parse(rawData);
} catch (err) {
	console.error(`Error reading ${filePath}:`, err.message);
	process.exit(1);
}

if (!data.transactions || !data.values || data.values.length === 0) {
	console.error("Error: Invalid JSON structure.");
	process.exit(1);
}

const deposits = data.transactions.map(t => ({
	date: new Date(t.date),
	amount: t.amount
}));

const currentStatus = data.values[data.values.length - 1];
const lastValue = currentStatus.value;
const lastDate = new Date(currentStatus.date);

const invested = deposits.reduce((sum, d) => sum + d.amount, 0);
const rateFactor = MWRR(deposits, lastDate, lastValue);
const percentage = (rateFactor - 1) * 100;

console.log("last Date:      " + lastDate.toISOString().split('T')[0]);
console.log("Invested:       " + invested.toFixed(2));
console.log("last value:     " + lastValue.toFixed(2));
console.log("Earned:         " + (lastValue - invested).toFixed(2));
console.log("brute yield:    " + (lastValue / invested).toFixed(4));
console.log("--------------------------");
console.log("MWRR (Factor):  " + rateFactor.toFixed(4));