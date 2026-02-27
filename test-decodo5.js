require('dotenv').config({ path: '.env.local' });
const cheerio = require('cheerio');

async function testQuery(query, desc) {
    let apiSearchTerm = query;
    if (!apiSearchTerm.startsWith('"') && !apiSearchTerm.endsWith('"')) {
        apiSearchTerm = `"${apiSearchTerm}"`;
    }

    const encodedSearchTerm = encodeURIComponent(apiSearchTerm);
    const url = `https://www.amazon.com/s?k=${encodedSearchTerm}`;

    const decodoUrl = `https://scraper-api.decodo.com/v2/scrape`;
    const res = await fetch(decodoUrl, {
        method: 'POST',
        headers: {
            'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Basic ${process.env.DECODO_AUTH_TOKEN}`
        },
        body: JSON.stringify({ url })
    });
    const json = await res.json();
    let html = json.results?.[0]?.content || '';
    const $ = cheerio.load(html);
    console.log(`\n[${desc}] URL: ${url} -> size: ${html.length}, products: ${$('div[data-component-type="s-search-result"]').length}`);
}

(async () => {
    await testQuery('book', 'Universal Exact Match Test');
})();
