#!/usr/bin/env node
const fs = require('fs');

const ETFS_FILE = './data/etfs.json';
const CONTINENTS_FILE = './data/country-by-continent.json';
const MARKET_STATUS_FILE = './data/country-by-status.json';

const assetsFile = process.argv[2];

if (!assetsFile) {
	console.error("Usage: node allocations.js <path_to_assets.json>");
	process.exit(1);
}

function main() {
	const assets = loadJson(assetsFile);
	const etfs = loadJson(ETFS_FILE);
	const continentList = loadJson(CONTINENTS_FILE);
	const marketList = loadJson(MARKET_STATUS_FILE);

	const countryToContinent = Object.fromEntries(continentList.map(i => [i.country, i.continent]));
	const countryToStatus = Object.fromEntries(marketList.map(i => [i.country, i.status]));

	const etfIndex = {};
	etfs.forEach(etf => {
		if (etf.isin)   etfIndex[etf.isin] = etf;
		if (etf.ticker) etfIndex[etf.ticker] = etf;
	});

	let totalPortfolioValue = 0;
	const aggregations = {
		country: {},
		continent: {},
		sector: {},
		marketStatus: {}
	};

	assets.forEach(asset => {
		const positionValue = asset.shares * asset.price;
		totalPortfolioValue += positionValue;

		const etfDetails = etfIndex[asset.isin] || etfIndex[asset.ticker];

		if (!etfDetails) {
			console.warn(`Warning: ETF details not found for ${asset.isin || asset.ticker}`);
			['country', 'continent', 'sector', 'marketStatus'].forEach(k => 
				addToAgg(aggregations[k], 'Unknown', positionValue)
			);
			return;
		}

		// Geography
		for (const [country, pct] of Object.entries(etfDetails.countries)) {
			const val = positionValue * (pct / 100);
			addToAgg(aggregations.country, country, val);

			const cont = country === 'Other' ? 'Other/Unclassified' : (countryToContinent[country] || 'Unknown Continent');
			addToAgg(aggregations.continent, cont, val);

			const status = country === 'Other' ? 'Other/Unclassified' : (countryToStatus[country] || 'Unclassified Status');
			addToAgg(aggregations.marketStatus, status, val);
		}

		// Sectors
		for (const [sector, pct] of Object.entries(etfDetails.sectors)) {
			addToAgg(aggregations.sector, sector, positionValue * (pct / 100));
		}
	});

	printReport(assets.length, totalPortfolioValue, aggregations);
}

function addToAgg(obj, key, val) {
	obj[key] = (obj[key] || 0) + val;
}

function loadJson(filename) {
	try {
		let raw = fs.readFileSync(filename, 'utf8');
		raw = raw.replace(/,\s*\]$/, ']'); // Fix trailing commas
		return JSON.parse(raw);
	} catch (e) {
		if (e.code === 'ENOENT') {
			if (filename !== assetsFile) {
				console.warn(`Warning: Metadata file "${filename}" not found.`);
				return [];
			}
			console.error(`Error: File "${filename}" not found.`);
		} else {
			console.error(`Error parsing "${filename}":`, e.message);
		}
		process.exit(1);
	}
}

function printReport(assetCount, totalValue, aggs) {
	console.log(`\n========================================`);
	console.log(` PORTFOLIO ANALYSIS`);
	console.log(`========================================`);
	console.log(`Total Value:  ${formatCurrency(totalValue)}`);
	console.log(`Asset Count:  ${assetCount}`);
	console.log(`========================================\n`);

	printTable("MARKET STATUS", aggs.marketStatus, totalValue);
	console.log("");
	printTable("CONTINENT ALLOCATION", aggs.continent, totalValue);
	console.log("");
	printTable("SECTOR ALLOCATION", aggs.sector, totalValue);
	console.log("");
	printTable("COUNTRY ALLOCATION (Top 20)", aggs.country, totalValue, 20);
}

function printTable(title, dataMap, totalValue, limit = null) {
	console.log(`--- ${title} ---`);
	console.log(`| ${pad("Category", 25)} | ${pad("% Port", 8)} | ${pad("Value", 12)} |`);
	console.log(`|${"-".repeat(27)}|${"-".repeat(10)}|${"-".repeat(14)}|`);

	let sorted = Object.entries(dataMap).sort(([, a], [, b]) => b - a);

	if (limit && sorted.length > limit) {
		const others = sorted.slice(limit);
		sorted = sorted.slice(0, limit);
		const otherVal = others.reduce((acc, [, v]) => acc + v, 0);
		sorted.push([`... ${others.length} others ...`, otherVal]);
	}

	let sumPct = 0;
	sorted.forEach(([key, value]) => {
		const pct = (value / totalValue) * 100;
		sumPct += pct;
		console.log(`| ${pad(key, 25)} | ${pad(pct.toFixed(2) + '%', 8)} | ${pad(formatCurrency(value), 12)} |`);
	});

	console.log(`|${"-".repeat(27)}|${"-".repeat(10)}|${"-".repeat(14)}|`);
}

function formatCurrency(num) {
	return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(num);
}

function pad(str, len) {
	return (str || "").toString().padEnd(len);
}

main();