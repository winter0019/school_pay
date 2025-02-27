const fetch = require('node-fetch');

exports.handler = async (event) => {
    try {
        const endpoint = event.queryStringParameters.endpoint;
        const apiUrl = `https://api.themoviedb.org/3/${endpoint}?api_key=${process.env.TMDB_API_KEY}`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const data = await response.json();
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        };
        
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to fetch data',
                details: error.message
            })
        };
    }
};