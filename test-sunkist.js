const lowerTitle = 'sunkist orange zero (diet) soda 20 oz bottles (pack of 10, total of 200 fl oz)';
const value = 200;
const regexStr = \	otal(?:\\\\s+of)?\\\\s+\|\\\\\s*[a-z\\\\s.]*\\\\s*total\;
const rx = new RegExp(regexStr, 'i');
console.log('regexStr:', regexStr);
console.log('Result:', rx.test(lowerTitle));
