exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { query } = JSON.parse(event.body);

    if (!query || query.length < 2) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ clubs: [], events: [] })
      };
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_KEY) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'GEMINI_API_KEY not set in environment' })
      };
    }

    const prompt = `You are a car culture search engine for REV by HotRod Happenings.

The user is searching for: "${query}"

Find REAL, ACCURATE car clubs and/or automotive events that match this search.
Use your knowledge to return actual clubs and events — real names, real cities, real websites when you know them.

IMPORTANT: Respond with ONLY a valid JSON object. No markdown, no explanation, no backticks. Just raw JSON.

Format:
{
  "clubs": [
    {
      "name": "Actual Club Name",
      "city": "City",
      "state": "State or Country",
      "description": "Brief real description of this club",
      "website": "https://actual-website.com or null",
      "type": "Corvette/Muscle/JDM/Classic/etc"
    }
  ],
  "events": [
    {
      "name": "Actual Event Name",
      "location": "City, State",
      "date": "Month Year or specific date if known",
      "type": "Car Show/Cruise/Race/Meet/etc",
      "description": "Brief real description",
      "website": "https://actual-website.com or null"
    }
  ]
}

Rules:
- Return up to 5 clubs and 5 events
- Only return what actually matches the query
- If searching for clubs, focus on clubs. If searching for events, focus on events.
- Use empty arrays [] if nothing matches
- All data must be REAL — no made-up names or websites
- If you don't know the website, use null`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1500
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', errText);
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: `Gemini error: ${response.status}`, clubs: [], events: [] })
      };
    }

    const geminiData = await response.json();

    // Extract text from Gemini response
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean and parse JSON
    let parsed = { clubs: [], events: [] };
    try {
      // Strip markdown code blocks if present
      const cleaned = rawText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      // Find JSON object
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, 'Raw text:', rawText);
    }

    // Ensure arrays exist
    if (!Array.isArray(parsed.clubs))  parsed.clubs  = [];
    if (!Array.isArray(parsed.events)) parsed.events = [];

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(parsed)
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message, clubs: [], events: [] })
    };
  }
};