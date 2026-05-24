// AI, Geocoding, and Math Services Logic
const GEOCODING_API_URL = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=";
const MAX_RETRIES = 3;
const RETRY_DELAY = 1500;

const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY;

function deg2rad(degrees) { return degrees * (Math.PI / 180); }

export function getDistance(lat1, lon1, lat2, lon2) {
    const R = 3958.8;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, i)));
        }
    }
}

export async function geocodeAddress(locationText) {
    try {
        const response = await fetchWithRetry(`${GEOCODING_API_URL}${encodeURIComponent(locationText)}`);
        const data = await response.json();
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                displayName: data[0].display_name.split(',').slice(0, 3).join(',').trim()
            };
        }
        return null;
    } catch (error) {
        console.error('Geocoding Error:', error);
        return null;
    }
}

export async function generateEventImage(prompt) {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const finalPrompt = `A high-quality, realistic photo of a ${prompt} at a car show. Focus on the car, bright daylight, detailed background.`;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    
    try {
        const response = await fetchWithRetry(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instances: { prompt: finalPrompt }, parameters: { sampleCount: 1, aspectRatio: "4:3" }})
        });
        const result = await response.json();
        if (result.predictions?.[0]?.bytesBase64Encoded) {
            return `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
        }
        return null;
    } catch (error) {
        console.error('Imagen Error:', error);
        return null;
    }
}

export async function fetchEventsFromGemini(locationText, radius) {
    const apiKey = getApiKey();

    const addConfidence = (events) =>
        events.map(event => ({
            ...event,
            confidence_score: 50
        }));

    if (!apiKey) {
        return addConfidence(getMockEvents());
    }

    const systemPrompt =
        "You are an expert car show event aggregator. Use Google Search Grounding. Return result as a single JSON array matching the schema.";

    const userQuery = `Find current/upcoming car shows within ${radius} miles of ${locationText}. Provide name, date, location, lat, lng, url, description, and a vivid carType description for image generation.`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    try {
        const response = await fetchWithRetry(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userQuery }] }],
                tools: [{ google_search: {} }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const result = await response.json();
        const candidate = result.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;

        if (text) {
            const events = JSON.parse(text);
            return addConfidence(events);
        }

        return addConfidence(getMockEvents());
    } catch (error) {
        console.error('Gemini Error:', error);
        return addConfidence(getMockEvents());
    }
}
function getMockEvents() {
    return [
        { name: "Ocala Classic Car Cruise", date: "Saturday Evening", location: "Ocala, FL", lat: 29.1852, lng: -82.1396, url: "#", description: "Weekly gathering of pre-1980 classics.", carType: "Red 1957 Chevrolet Bel Air" },
        { name: "Orlando Exotic Meetup", date: "2nd Saturday", location: "Orlando, FL", lat: 28.5383, lng: -81.3792, url: "#", description: "Exclusive show for supercars.", carType: "Bright yellow Lamborghini Huracan Evo" }
    ];
}