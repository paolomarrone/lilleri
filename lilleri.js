const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.24;

function compound_return(startDate, endDate, amount, rateFactor) {
	const years = (endDate - startDate) / MS_PER_YEAR;
	return amount * Math.pow(rateFactor, years);
}

function deposits_compound_return(deposits, targetDate, rateFactor) {
	return deposits.reduce((total, deposit) => {
		return total + compound_return(deposit.date, targetDate, deposit.amount, rateFactor);
	}, 0);
}

// Money-Weighted Rate of Return, a.k.a. XIRR
function MWRR(deposits, valuationDate, currentValuation) {
	const threshold = 0.000001;
	let minRate = 0.001;
	let maxRate = 10.0;

	let iterations = 0;
	const maxIterations = 1000;

	while (iterations++ < maxIterations) {
		const midRate = (maxRate + minRate) * 0.5;
		
		if ((maxRate - minRate) < threshold) {
			return midRate;
		}

		const calculatedValue = deposits_compound_return(deposits, valuationDate, midRate);

		if (calculatedValue > currentValuation) {
			maxRate = midRate;
		} else {
			minRate = midRate;
		}
	}

	return (maxRate + minRate) / 2;
}

module.exports = {
	MWRR
};