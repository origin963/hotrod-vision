#!/usr/bin/env python3
"""
REV HotRod Happenings — Sound System Patch
Run: python3 rev_audio_patch.py < index.html > index_patched.html
Then rename index_patched.html to index.html
Also copy crowd-ambience.mp3 to your project root.
"""
import sys

src = sys.stdin.read()

OLD_SOUND = src[src.index("  // ── SOUND"):src.index("  function startEngineIdle()")]

NEW_SOUND = """  // ── SOUND ──────────────────────────────────────────
  let masterVolume = 0.7, isMuted = false, engineFading = false;
  const engineIdleAudio = document.getElementById('engine-idle');
  let ambientCtx = null, ambientGain = null, ambientRunning = false;
  let crowdAudio = null;

  function initAmbientSound() { /* real audio file used instead */ }

  function startCrowdAmbient() {
    if (isMuted) return;
    if (!crowdAudio) {
      crowdAudio = new Audio('crowd-ambience.mp3');
      crowdAudio.loop = true;
      crowdAudio.volume = 0;
    }
    crowdAudio.play().catch(() => {});
    let vol = 0;
    const fade = setInterval(() => {
      vol = Math.min(vol + 0.02, masterVolume * 0.75);
      crowdAudio.volume = vol;
      if (vol >= masterVolume * 0.75) clearInterval(fade);
    }, 80);
  }

  function stopCrowdAmbient() {
    if (!crowdAudio) return;
    let vol = crowdAudio.volume;
    const fade = setInterval(() => {
      vol = Math.max(0, vol - 0.03);
      crowdAudio.volume = vol;
      if (vol <= 0) { clearInterval(fade); crowdAudio.pause(); crowdAudio.currentTime = 0; }
    }, 60);
  }
  """

src = src.replace(OLD_SOUND, NEW_SOUND, 1)

OLD_MUTE_LINE = "      if (ambientGain && ambientCtx) { try { ambientGain.gain.cancelScheduledValues(ambientCtx.currentTime); ambientGain.gain.setValueAtTime(0, ambientCtx.currentTime); } catch(e) {} }"
NEW_MUTE_LINE = "      if (crowdAudio) crowdAudio.volume = 0;"
src = src.replace(OLD_MUTE_LINE, NEW_MUTE_LINE, 1)

OLD_UNMUTE_LINE = "      if (ambientGain && ambientCtx) { try { ambientGain.gain.cancelScheduledValues(ambientCtx.currentTime); ambientGain.gain.setValueAtTime(masterVolume * 0.85, ambientCtx.currentTime); } catch(e) {} }"
NEW_UNMUTE_LINE = "      if (crowdAudio && !crowdAudio.paused) crowdAudio.volume = masterVolume * 0.75;"
# Replace both occurrences (toggleMute + onVolumeChange)
src = src.replace(OLD_UNMUTE_LINE, NEW_UNMUTE_LINE)

print(src, end='')
sys.stderr.write("Patch applied successfully.\n")
