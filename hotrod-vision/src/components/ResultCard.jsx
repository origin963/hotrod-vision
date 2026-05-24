import React from 'react';
import { motion } from 'framer-motion';
import { Save, Search, AlertTriangle } from 'lucide-react';

export default function ResultCard({ data, imagePreview, onSave }) {
  // 1. Handle Missing Data
  if (!data) return null;

  // 2. Handle Error State (Show the error, don't hide!)
  if (data.error) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-red-900/20 border border-red-500 rounded-xl p-6 text-center mt-6"
      >
        <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Scan Failed</h3>
        <p className="text-gray-300 text-sm mb-4">{data.error}</p>
        <p className="text-xs text-gray-500">Try getting closer or using better lighting.</p>
      </motion.div>
    );
  }

  // 3. Success State
  const googleSearchUrl = `https://www.google.com/search?tbm=isch&q=${data.year}+${data.make}+${data.model}`;

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="w-full max-w-md bg-hotrod-card rounded-2xl overflow-hidden shadow-2xl border border-gray-700 mt-6"
    >
      <div className="relative h-64 w-full">
        <img src={imagePreview} alt="Car" className="w-full h-full object-cover" />
      </div>

      <div className="p-6">
        <h2 className="text-3xl font-extrabold text-white uppercase italic tracking-wide leading-none">
          {data.make} <span className="text-hotrod-red block">{data.model}</span>
        </h2>
        <p className="text-xl text-gray-400 font-semibold mt-2">{data.year}</p>

        <div className="mt-4 p-4 bg-black/30 rounded-lg border-l-4 border-hotrod-red">
          <h4 className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">HotRod Fact</h4>
          <p className="text-gray-300 text-sm leading-relaxed">{data.fun_fact}</p>
        </div>

        <div className="flex gap-3 mt-6">
          <button 
            onClick={() => onSave(data)}
            className="flex-1 flex items-center justify-center gap-2 bg-hotrod-red text-white py-3 rounded-lg font-bold hover:bg-red-700 transition cursor-pointer"
          >
            <Save size={18} /> Garage
          </button>
          <a 
            href={googleSearchUrl} 
            target="_blank" 
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-gray-700 text-white py-3 rounded-lg font-bold hover:bg-gray-600 transition cursor-pointer"
          >
            <Search size={18} /> Compare
          </a>
        </div>
      </div>
    </motion.div>
  );
}