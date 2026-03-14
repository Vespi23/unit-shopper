async function testDecodo() {
    const url = "https://www.amazon.com/s?k=paper+towels";
    const decodoUrl = "https://scraper-api.decodo.com/v2/scrape";
    const token = process.env.DECODO_AUTH_TOKEN;

    if (!token) {
        console.error("No DECODO_AUTH_TOKEN found in environment.");
        return;
    }

    try {
        console.log("Testing Decodo POST with JSON payload...");
        const res = await fetch(decodoUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${token}`
            },
            body: JSON.stringify({ url: url })
        });
        
        console.log(`Status: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log(`Snippet of Response: ${text.substring(0, 500)}`);
        
        // Also test a simple GET proxy if POST fails
    } catch (err) {
        console.error("Fetch failed:", err);
    }
}
testDecodo();
