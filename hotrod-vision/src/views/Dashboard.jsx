import { useState } from 'react'
import { fetchEventsFromGemini, geocodeAddress } from '../lib/ai-services'

export default function Dashboard({
  location,
  setLocation,
  radius,
  setRadius,
  userLat,
  setUserLat,
  userLon,
  setUserLon
}) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    setLoading(true)

    try {
      const geo = await geocodeAddress(location)

      if (geo) {
        setUserLat(geo.lat)
        setUserLon(geo.lng)
      }

      const aiResults = await fetchEventsFromGemini(location, String(radius))
      setEvents(aiResults || [])
    } catch (error) {
      console.error('Search error:', error)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 min-h-screen bg-black">
      <div className="relative h-44 rounded-2xl border border-gray-800 p-4">
        <h2 className="text-2xl font-black text-white italic">WEEKEND RUMBLE</h2>
        <p className="text-cyan-400 text-xs font-bold uppercase">Live AI Scanner</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full bg-black border border-gray-700 rounded-lg px-4 py-4 text-white mb-3"
          placeholder="Zip Code or City..."
        />

        <select
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-full bg-black border border-gray-700 rounded-lg px-4 py-4 text-white mb-3"
        >
          <option value={10}>10 miles</option>
          <option value={25}>25 miles</option>
          <option value={50}>50 miles</option>
          <option value={100}>100 miles</option>
          <option value={999999}>Unlimited</option>
        </select>

        <button
          onClick={handleSearch}
          className="w-full bg-red-600 text-white font-black py-4 rounded-lg uppercase"
        >
          {loading ? 'SCANNING...' : 'INITIALIZE AI SEARCH'}
        </button>

        {(userLat && userLon) && (
          <div className="text-xs text-cyan-400 mt-3">
            Location locked: {userLat.toFixed(4)}, {userLon.toFixed(4)}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {events
          .filter(evt => evt.confidence_score >= 50)
          .map((evt, idx) => (
            <div
              key={idx}
              className="bg-gray-900 border border-gray-800 p-4 rounded-xl text-white"
            >
              <div className="font-bold text-lg">{evt.name}</div>
              <div className="text-sm text-gray-400">{evt.date}</div>
              <div className="text-sm text-gray-400">{evt.location}</div>

              <div className="text-xs text-cyan-400 mt-2">
                Confidence: {evt.confidence_score}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
} 