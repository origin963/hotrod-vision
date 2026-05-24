exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }
    };
  }

  try {
    const { lat, lon, radiusKm, keyword } = event.queryStringParameters || {};
    const TOKEN = process.env.EVENTBRITE_TOKEN;

    const url = `https://www.eventbriteapi.com/v3/events/search/?token=${TOKEN}&location.latitude=${lat}&location.longitude=${lon}&location.within=${radiusKm}km&q=${encodeURIComponent(keyword)}&expand=venue&sort_by=date&time_filter=current_future&page_size=50`;

    const response = await fetch(url);
    const data = await response.json();

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};