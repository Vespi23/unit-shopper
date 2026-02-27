const http = require('http');

http.get('http://localhost:3000/api/search?q=book', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            console.log('Results count:', parsed.length || (parsed.products ? parsed.products.length : 'Unknown'));
            if (parsed.length === 0 || (parsed.products && parsed.products.length === 0)) {
                console.log('Response:', data);
            }
        } catch (e) {
            console.log('Error parsing JSON:', e.message);
            console.log('Raw response:', data.substring(0, 500));
        }
    });
}).on('error', (err) => {
    console.log('Error:', err.message);
});
