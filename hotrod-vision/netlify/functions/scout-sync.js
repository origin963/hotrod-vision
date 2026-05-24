exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { query } = JSON.parse(event.body);
    
    const TAVILY_KEY = process.env.TAVILY_KEY;
    const GROQ_KEY = process.env.GROQ_KEY;

    // ── 1. FINDER: Tavily grabs raw website text ──
    const tavilyRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        api_key: TAVILY_KEY, 
        query: query, 
        search_depth: 'advanced', 
        max_results: 8,
        include_answer: false 
      })
    });
    
    const tavilyData = await tavilyRes.json();
    if (!tavilyData.results || tavilyData.results.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ events: [], clubs: [] }) };
    }

    // Combine text from all websites into one string
    const combinedWebText = tavilyData.results
      .map(r => `SOURCE URL: ${r.url}\nCONTENT:\n${r.content}`)
      .join('\n\n==========\n\n');

    // ── 2. BRAIN: Groq extracts EVERY date as separate events ──
    const systemPrompt = `You are a high-precision automotive event data extractor for a car culture app called REV.

Read the raw website text provided. Extract EVERY car show, cruise-in, cars & coffee, swap meet, track day, or automotive meet mentioned.

CRITICAL RULES:
1. If a site lists a SCHEDULE with multiple dates (like a monthly Cars & Coffee listing Jan, Feb, Mar etc.), create a SEPARATE event object for EACH date. Never combine them.
2. Only include FUTURE events (today is ${new Date().toISOString().split('T')[0]}).
3. If a year is missing from a date, use 2026 or 2027 based on context.
4. Extract the real venue name and city/state for location — never leave it blank.
5. Never include past events, generic article titles, or blog posts as events.
6. For clubs (not events), add them to the clubs array instead.

Return ONLY valid JSON in this exact format — no markdown, no backticks:
{
  "events": [
    {
      "name": "Event name",
      "date": "YYYY-MM-DD",
      "time": "HH:MM or null",
      "location": "Venue name, City, State",
      "type": "Car Show | Cruise-In | Cars & Coffee | Swap Meet | Track Day | Meet",
      "description": "Brief description under 150 chars",
      "source_url": "The SOURCE URL from above"
    }
  ],
  "clubs": [
    {
      "name": "Club name",
      "city": "City",
      "state": "State abbreviation",
      "short_desc": "Brief description",
      "website_url": "The SOURCE URL"
    }
  ]
}`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${GROQ_KEY}` 
      },
      body: JSON.stringify({ 
        model: 'llama3-8b-8192',
        response_format: { type: "json_object" },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract all events and clubs from this text:\n\n${combinedWebText.substring(0, 12000)}` }
        ], 
        temperature: 0.1,
        max_tokens: 4000
      })
    });

    const groqData = await groqRes.json();
    
    if (!groqData.choices?.[0]?.message?.content) {
      console.error('Groq returned no content:', JSON.stringify(groqData));
      return { statusCode: 200, body: JSON.stringify({ events: [], clubs: [] }) };
    }

    const rawAiText = groqData.choices[0].message.content;
    
    let parsedData;
    try {
      parsedData = JSON.parse(rawAiText);
    } catch(e) {
      // Try to extract JSON if it's wrapped in markdown
      const match = rawAiText.match(/\{[\s\S]*\}/);
      parsedData = match ? JSON.parse(match[0]) : { events: [], clubs: [] };
    }

    // Filter out past events one more time
    const today = new Date().toISOString().split('T')[0];
    if (parsedData.events) {
      parsedData.events = parsedData.events.filter(e => !e.date || e.date >= today);
    }

    console.log(`Scout found: ${parsedData.events?.length || 0} events, ${parsedData.clubs?.length || 0} clubs for query: ${query}`);

    return { 
      statusCode: 200, 
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(parsedData) 
    };

  } catch (error) {
    console.error("Scout Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message, events: [], clubs: [] }) };
  }
};