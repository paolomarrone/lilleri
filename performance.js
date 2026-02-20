#!/usr/bin/env node

const fs = require('fs');
const { MWRR } = require('./lilleri');

function loadData(filePath) {
	try {
		const rawData = fs.readFileSync(filePath, 'utf8');
		return JSON.parse(rawData);
	} catch (err) {
		throw new Error(`Error reading ${filePath}: ${err.message}`);
	}
}

function analyzePerformance(data) {
	if (!data.transactions || !data.values || data.values.length === 0) {
		throw new Error("Invalid JSON structure.");
	}

	if (!Array.isArray(data.transactions) || data.transactions.length === 0) {
		throw new Error("transactions must be a non-empty array.");
	}

	const deposits = data.transactions.map(t => ({
		date: new Date(t.date),
		amount: t.amount
	}));

	const currentStatus = data.values[data.values.length - 1];
	const lastValue = currentStatus.value;
	const lastDate = new Date(currentStatus.date);

	if (Number.isNaN(lastDate.getTime())) {
		throw new Error("Invalid valuation date.");
	}
	if (typeof lastValue !== 'number' || !Number.isFinite(lastValue)) {
		throw new Error("Invalid valuation value.");
	}
	if (deposits.some(d => Number.isNaN(d.date.getTime()) || typeof d.amount !== 'number' || !Number.isFinite(d.amount))) {
		throw new Error("transactions contain invalid date or amount.");
	}

	const invested = deposits.reduce((sum, d) => sum + d.amount, 0);
	const rateFactor = MWRR(deposits, lastDate, lastValue);
	const percentage = (rateFactor - 1) * 100;
	const bruteYield = invested === 0 ? 'n/a (invested = 0)' : (lastValue / invested).toFixed(4);

	return {
		lastDate,
		invested,
		lastValue,
		earned: lastValue - invested,
		bruteYield,
		rateFactor,
		percentage
	};
}

function printAnalysis(analysis) {
	console.log("last Date:      " + analysis.lastDate.toISOString().split('T')[0]);
	console.log("Invested:       " + analysis.invested.toFixed(2));
	console.log("last value:     " + analysis.lastValue.toFixed(2));
	console.log("Earned:         " + analysis.earned.toFixed(2));
	console.log("brute yield:    " + analysis.bruteYield);
	console.log("--------------------------");
	console.log("MWRR (Factor):  " + analysis.rateFactor.toFixed(4));
	console.log("MWRR (%):       " + analysis.percentage.toFixed(2) + "%");
}

function main() {
	const filePath = process.argv[2];

	if (!filePath) {
		console.error("Usage: node performance.js <path_to_data.json>");
		process.exit(1);
	}

	try {
		const data = loadData(filePath);
		const analysis = analyzePerformance(data);
		printAnalysis(analysis);
	} catch (err) {
		console.error(`Error: ${err.message}`);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}

module.exports = {
	analyzePerformance,
	loadData,
	printAnalysis
};
