const lowerTitle = 'sunkist orange zero (diet) soda 20 oz bottles (pack of 10, total of 200 fl oz)';
const value = 200;

const regexStr = `total(?:\\s+of)?\\s+${value}|${value}\\s*[a-z\\s.]*\\s*total`;
const rx = new RegExp(regexStr, 'i');

console.log('regexStr:', regexStr);
console.log('Result:', rx.test(lowerTitle));

// Simulate parseUnit exactly
const match = lowerTitle.match(/(\d+(?:\.\d+)?)\s?(?:fl\.?\s?oz\.?|fluid\s?ounces?|fl\.?\s?ounces?)\b/i);
console.log("Match:", match);

const isExplicitTotal = new RegExp(`total(?:\\s+of)?\\s+${match[1]}|${match[1]}\\s*[a-z\\s.]*\\s*total`, 'i').test(lowerTitle);
console.log("isExplicitTotal:", isExplicitTotal);
