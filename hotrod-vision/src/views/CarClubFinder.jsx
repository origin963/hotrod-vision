import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function CarClubFinder({ userLat, userLon, radius = 50 }) {
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 3959
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  useEffect(() => {
    async function loadClubs() {
      try {
        setLoading(true)
        setError('')

        const { data, error } = await supabase
          .from('clubs')
          .select('*')

        if (error) throw error

        let enriched = data.map(club => {
          let dist = null

          if (
            userLat !== null &&
            userLon !== null &&
            club.lat !== null &&
            club.lng !== null
          ) {
            dist = getDistance(userLat, userLon, Number(club.lat), Number(club.lng))
          }

          return { ...club, dist }
        })

        if (radius !== 999999) {
          enriched = enriched.filter(c => c.dist === null || c.dist <= radius)
        }

        enriched.sort((a, b) => {
          if ((b.boost_level || 0) !== (a.boost_level || 0)) {
            return (b.boost_level || 0) - (a.boost_level || 0)
          }

          if ((b.is_rev_plus ? 1 : 0) !== (a.is_rev_plus ? 1 : 0)) {
            return (b.is_rev_plus ? 1 : 0) - (a.is_rev_plus ? 1 : 0)
          }

          if (a.dist === null) return 1
          if (b.dist === null) return -1
          if (a.dist !== b.dist) return a.dist - b.dist

          return (a.name || '').localeCompare(b.name || '')
        })

        setClubs(enriched)
      } catch (err) {
        setError(err.message || 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    loadClubs()
  }, [userLat, userLon, radius])

  return (
    <div className="text-white pb-24 p-4">
      <h2 className="text-2xl font-black text-red-500 mb-4">Car Club Finder</h2>
      <p className="text-gray-400 mb-6">
        Discover clubs near you and see which ones are REV+ boosted.
      </p>

      {loading && (
        <div className="text-center text-gray-400 mt-10 font-bold">
          Scanning nearby clubs...
        </div>
      )}

      {error && (
        <div className="text-center text-red-400 mt-10 font-bold">
          {error}
        </div>
      )}

      {!loading && !error && clubs.length === 0 && (
        <div className="text-center text-gray-500 mt-10 font-bold">
          No clubs found.
        </div>
      )}

      <div className="space-y-4">
        {clubs.map((club) => (
          <div
            key={club.id}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-lg"
          >
            <div className="flex justify-between items-start gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">{club.name}</h3>
                <p className="text-sm text-gray-400">
                  {club.city}, {club.state} {club.zip || ''}
                </p>
              </div>

              {club.is_rev_plus && (
                <span className="bg-red-500/20 border border-red-500 text-red-400 text-[10px] font-bold px-2 py-1 rounded-full">
                  REV+ CLUB
                </span>
              )}
            </div>

            {club.short_desc && (
              <p className="text-sm text-gray-300 mt-3">{club.short_desc}</p>
            )}

            {club.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {club.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {club.dist !== null && (
              <div className="text-xs text-cyan-400 mt-3">
                📍 {club.dist.toFixed(1)} miles away
              </div>
            )}

            <div className="mt-4 flex justify-between items-center text-xs text-gray-400">
              <span>Status: {club.claimed_status || 'unclaimed'}</span>
              <span>Boost: {club.boost_level || 0}</span>
            </div>

            <div className="mt-3 flex gap-2 flex-wrap">
              {club.website && (
                <a
                  href={club.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-3 py-2 rounded-lg bg-white/10 border border-white/10"
                >
                  Website
                </a>
              )}

              {club.instagram && (
                <a
                  href={club.instagram.startsWith('http') ? club.instagram : `https://instagram.com/${club.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-3 py-2 rounded-lg bg-white/10 border border-white/10"
                >
                  Instagram
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}