// netlify/functions/scout-sync.js
exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing environment variables" })
      };
    }
    const body = JSON.parse(event.body || "{}");
    const club = body.club || null;
    const prompt = `Find ALL upcoming events for this car club: ${club?.name || ""}.
Return ONLY a JSON array with:
name, date (YYYY-MM-DD), location, lat, lon, type, website.`;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );
    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    let events = [];
    try {
      events = JSON.parse(text);
    } catch (e) {
      events = [];
    }
    let inserted = 0;
    for (const e of events) {
      await fetch(`${SUPABASE_URL}/rest/v1/events`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: e.name,
          date: e.date,
          location: e.location,
          lat: e.lat,
          lon: e.lon,
          type: e.type,
          website: e.website,
          club_id: club?.id || null
        })
      });
      inserted++;
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ inserted })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
//# sourceMappingURL=scout-sync.js.map
