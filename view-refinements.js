const fs = require('fs');
const data = JSON.parse(fs.readFileSync('sample.json'));
console.log(Object.keys(data));
if (data.search_results) {
    console.log("Number of results:", data.search_results.length);
}
if (data.refinements) {
    console.log("Refinements:", Object.keys(data.refinements));
}
