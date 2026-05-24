import React, { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ImageInput({ onImageSelected, isLoading }) {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // 1. Handle File Upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) onImageSelected(file);
  };

  // 2. Start Live Camera
  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      // Small delay to ensure video element is ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      alert("Camera Error. Please use Upload instead.");
      setIsCameraOpen(false);
    }
  };

  // 3. Capture Photo
  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    // Force canvas to match video dimensions
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current frame
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Stop Camera Stream
    const stream = video.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
    setIsCameraOpen(false);

    // Convert to Blob and Send
    canvas.toBlob((blob) => {
      if (blob) {
        onImageSelected(blob);
      } else {
        alert("Camera capture failed. Try again.");
      }
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* LIVE CAMERA OVERLAY */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center"
          >
            {/* The Video Feed */}
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            
            {/* Controls Layer */}
            <div className="absolute bottom-12 w-full flex items-center justify-center gap-10">
              {/* Cancel Button */}
              <button 
                onClick={() => setIsCameraOpen(false)} 
                className="p-4 bg-gray-800/80 backdrop-blur rounded-full text-white hover:bg-gray-700"
              >
                <X size={28} />
              </button>

              {/* THE REAL SHUTTER BUTTON */}
              <button 
                onClick={takePhoto} 
                className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
              >
                <div className="w-16 h-16 bg-hotrod-red rounded-full border-2 border-white" />
              </button>
              
              {/* Spacer to balance layout */}
              <div className="w-14"></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Screen Buttons */}
      <div className="flex gap-4 w-full justify-center my-6">
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        
        <motion.button whileTap={{ scale: 0.95 }} disabled={isLoading} onClick={startCamera}
          className="flex flex-col items-center justify-center w-32 h-32 bg-hotrod-card border-2 border-hotrod-red rounded-xl shadow-lg active:bg-red-900/10 cursor-pointer">
          <Camera size={32} className="text-white mb-2" />
          <span className="text-sm font-bold text-gray-300">Live Cam</span>
        </motion.button>

        <motion.button whileTap={{ scale: 0.95 }} disabled={isLoading} onClick={() => fileInputRef.current.click()}
          className="flex flex-col items-center justify-center w-32 h-32 bg-hotrod-card border border-gray-600 rounded-xl active:bg-gray-800 cursor-pointer">
          <Upload size={32} className="text-gray-400 mb-2" />
          <span className="text-sm font-bold text-gray-400">Upload</span>
        </motion.button>
      </div>
    </div>
  );
}