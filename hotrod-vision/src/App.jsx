import { useState } from 'react'
import Dashboard from './views/Dashboard'
import CarClubFinder from './views/CarClubFinder'
import './App.css'

export default function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [location, setLocation] = useState('34472')
  const [radius, setRadius] = useState(50)
  const [userLat, setUserLat] = useState(null)
  const [userLon, setUserLon] = useState(null)

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex gap-2 p-4 border-b border-white/10">
        <button
          onClick={() => setActiveView('dashboard')}
          className={`px-4 py-2 rounded-lg font-bold ${activeView === 'dashboard' ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-300'}`}
        >
          Events
        </button>

        <button
          onClick={() => setActiveView('clubs')}
          className={`px-4 py-2 rounded-lg font-bold ${activeView === 'clubs' ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-300'}`}
        >
          Clubs
        </button>
      </div>

      {activeView === 'dashboard' && (
        <Dashboard
          location={location}
          setLocation={setLocation}
          radius={radius}
          setRadius={setRadius}
          userLat={userLat}
          setUserLat={setUserLat}
          userLon={userLon}
          setUserLon={setUserLon}
        />
      )}

      {activeView === 'clubs' && (
        <CarClubFinder
          userLat={userLat}
          userLon={userLon}
          radius={radius}
        />
      )}
    </div>
  )
}