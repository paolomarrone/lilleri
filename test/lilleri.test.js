const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { MWRR } = require('../lilleri');
const { analyzePerformance, loadData } = require('../performance');

const ROOT = path.join(__dirname, '..');

test('sample performance analysis computes the expected MWRR', () => {
	const analysis = analyzePerformance(loadData(path.join(ROOT, 'test/deposits.json')));

	assert.equal(analysis.invested, 35000);
	assert.equal(analysis.lastValue, 40000);
	assert.equal(analysis.earned, 5000);
	assert.equal(analysis.bruteYield, '1.1429');
	assert.ok(Math.abs(analysis.rateFactor - 1.04958789357543) < 0.000001);
});

test('MWRR handles a simple one-year return', () => {
	const deposits = [{ date: new Date('2023-01-01'), amount: 1000 }];
	const valuationDate = new Date('2024-01-01');

	assert.ok(Math.abs(MWRR(deposits, valuationDate, 1100) - 1.1) < 0.001);
});

test('performance analysis rejects invalid transaction input', () => {
	assert.throws(() => analyzePerformance({
		transactions: [{ date: 'not-a-date', amount: 100 }],
		values: [{ date: '2024-01-01', value: 100 }]
	}), /transactions contain invalid date or amount/);
});

test('data files parse as strict JSON', () => {
	for (const file of [
		'data/etfs.json',
		'data/country-by-continent.json',
		'data/country-by-status.json',
		'test/assets.json',
		'test/deposits.json'
	]) {
		JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
	}
});

test('allocation report runs without unclassified status gaps', () => {
	const result = spawnSync(process.execPath, ['allocations.js', './test/assets.json'], {
		cwd: ROOT,
		encoding: 'utf8'
	});

	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /PORTFOLIO ANALYSIS/);
	assert.match(result.stdout, /Total Value:/);
	assert.doesNotMatch(result.stdout, /Unclassified Status/);
	assert.match(result.stdout, /Other\/Unclassified/);
});
