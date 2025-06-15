"use client";

import SimpleBar from "simplebar-react";
import { useState, useEffect, useRef } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';

const NOTE_STRINGS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const A4_FREQUENCY = 440;

const STANDARD_TUNING = {
  E2: { name: "E", octave: 2, frequency: 82.41 },
  A2: { name: "A", octave: 2, frequency: 110.00 },
  D3: { name: "D", octave: 3, frequency: 146.83 },
  G3: { name: "G", octave: 3, frequency: 196.00 },
  B3: { name: "B", octave: 3, frequency: 246.94 },
  E4: { name: "E", octave: 4, frequency: 329.63 },
};

const frequencyToNoteDetails = (frequency) => {
  if (frequency <= 0) return { name: '-', octave: 0, cents: 0, frequency: 0, closestStandardNote: null };
  const noteNum = 12 * (Math.log2(frequency / A4_FREQUENCY));
  const roundedNoteNum = Math.round(noteNum);
  const noteIndex = (roundedNoteNum % 12 + 12) % 12;
  const noteName = NOTE_STRINGS[noteIndex];
  const octave = Math.floor(roundedNoteNum / 12) + 4;

  const exactFrequencyForNote = A4_FREQUENCY * Math.pow(2, roundedNoteNum / 12);
  const cents = Math.floor(1200 * Math.log2(frequency / exactFrequencyForNote));

  let closestStandardNote = null;
  let minDiff = Infinity;

  for (const key in STANDARD_TUNING) {
      const stdNote = STANDARD_TUNING[key];
      const diff = Math.abs(stdNote.frequency - frequency);
      if (diff < minDiff && Math.abs(1200 * Math.log2(frequency / stdNote.frequency)) < 100) { // within 100 cents
          minDiff = diff;
          closestStandardNote = stdNote;
      }
  }


  return { name: noteName, octave, cents, frequency: parseFloat(frequency.toFixed(2)), closestStandardNote };
};

const detectPitch = (analyser, sampleRate) => {
  const bufferLength = analyser.fftSize;
  const buffer = new Float32Array(bufferLength);
  analyser.getFloatTimeDomainData(buffer);

  let bestCorrelation = 0;
  let bestLag = -1;
  const minSamples = 10; // Increased for stability
  const maxSamples = bufferLength / 2; // Avoid very high frequencies beyond typical guitar range

  for (let lag = minSamples; lag < maxSamples; lag++) {
    let correlation = 0;
    for (let i = 0; i < bufferLength - lag; i++) {
      correlation += buffer[i] * buffer[i + lag];
    }
    // Normalize correlation
    let sumOfSquares1 = 0;
    let sumOfSquares2 = 0;
    for (let i = 0; i < bufferLength - lag; i++) {
        sumOfSquares1 += buffer[i] * buffer[i];
        sumOfSquares2 += buffer[i+lag] * buffer[i+lag];
    }
    if (sumOfSquares1 === 0 || sumOfSquares2 === 0) continue;

    correlation /= Math.sqrt(sumOfSquares1 * sumOfSquares2);


    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }
  // Threshold based on observations for basic autocorrelation
  if (bestCorrelation > 0.6 && bestLag > 0) { // Adjusted threshold
    return sampleRate / bestLag;
  }
  return 0;
};


const TunerGitarPage = () => {
  const [isTuning, setIsTuning] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [analyserNode, setAnalyserNode] = useState(null);
  const [mediaStreamSource, setMediaStreamSource] = useState(null);
  const [microphoneStream, setMicrophoneStream] = useState(null);
  const [isDarkTheme, setIsDarkTheme] = useState(false);


  const [detectedPitchInfo, setDetectedPitchInfo] = useState({ name: '-', octave: 0, cents: 0, frequency: 0, closestStandardNote: null });
  const [permissionError, setPermissionError] = useState(null);
  const [targetNote, setTargetNote] = useState(null);

  const animationFrameId = useRef(null);
  const waveformCanvasRef = useRef(null);
  const animationFrameIdDrawWave = useRef(null);


  useEffect(() => {
    setIsDarkTheme(document.documentElement.classList.contains('dark'));
    if (!audioContext) {
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(context);
      } catch (e) {
        toast.error("Web Audio API tidak didukung di browser ini.");
        setPermissionError("Web Audio API tidak didukung.");
      }
    }
    return () => {
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(e => console.warn("Error closing AudioContext:", e));
      }
      stopTuningProcess();
    };
  }, []); // audioContext dependency removed to avoid re-creation issues

  const requestMicrophonePermission = async () => {
    if (!audioContext) {
        toast.error("Audio context belum siap.");
        setPermissionError("Audio context gagal diinisialisasi.");
        return false;
    }
    if (audioContext.state === 'suspended') {
        await audioContext.resume().catch(e => {
            console.error("Error resuming audio context:", e);
            toast.error("Gagal melanjutkan audio context.");
            setPermissionError("Audio context tidak dapat dilanjutkan.");
            return false;
        });
    }
    setPermissionError(null);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setMicrophoneStream(stream);
        const source = audioContext.createMediaStreamSource(stream);
        setMediaStreamSource(source);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 4096; // Increased for potentially better low-frequency resolution
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        analyser.smoothingTimeConstant = 0.85;
        source.connect(analyser);
        setAnalyserNode(analyser);
        return true;
    } catch (err) {
        console.error("Error accessing microphone:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            setPermissionError("Izin mikrofon ditolak. Mohon izinkan akses melalui pengaturan browser Anda.");
            toast.error("Izin mikrofon ditolak.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            setPermissionError("Tidak ada mikrofon yang ditemukan.");
            toast.error("Mikrofon tidak ditemukan.");
        } else {
            setPermissionError("Tidak dapat mengakses mikrofon karena kesalahan teknis.");
            toast.error("Gagal mengakses mikrofon.");
        }
        return false;
    }
  };


  const startTuningProcess = async () => {
    const hasPermission = await requestMicrophonePermission();
    if (hasPermission) {
      setIsTuning(true);
      toast.success("Tuner dimulai. Mainkan satu senar gitar Anda.");
    } else {
      setIsTuning(false);
    }
  };

  const stopTuningProcess = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (animationFrameIdDrawWave.current) {
        cancelAnimationFrame(animationFrameIdDrawWave.current);
        animationFrameIdDrawWave.current = null;
    }
    if (mediaStreamSource) {
      mediaStreamSource.disconnect();
      setMediaStreamSource(null);
    }
    if (microphoneStream) {
      microphoneStream.getTracks().forEach(track => track.stop());
      setMicrophoneStream(null);
    }
    // Do not disconnect analyserNode immediately if waveform is still desired
    // setAnalyserNode(null);
    setIsTuning(false);
    // setDetectedPitchInfo({ name: '-', octave: 0, cents: 0, frequency: 0, closestStandardNote: null });
  };

  useEffect(() => {
    if (isTuning && analyserNode && audioContext) {
      const updatePitch = () => {
        const frequency = detectPitch(analyserNode, audioContext.sampleRate);
        if (frequency > 0) {
          setDetectedPitchInfo(frequencyToNoteDetails(frequency));
        }
        animationFrameId.current = requestAnimationFrame(updatePitch);
      };
      animationFrameId.current = requestAnimationFrame(updatePitch);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    }
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isTuning, analyserNode, audioContext]);


  useEffect(() => {
    if (isTuning && analyserNode && waveformCanvasRef.current) {
        const canvas = waveformCanvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        // Set canvas resolution based on its display size
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvasCtx.scale(dpr, dpr);


        const bufferLength = analyserNode.fftSize;
        const dataArray = new Uint8Array(bufferLength);

        const drawWave = () => {
            if (!isTuning || !analyserNode || !waveformCanvasRef.current) { // Check again in case it stopped
                 if(animationFrameIdDrawWave.current) cancelAnimationFrame(animationFrameIdDrawWave.current);
                 return;
            }
            animationFrameIdDrawWave.current = requestAnimationFrame(drawWave);
            analyserNode.getByteTimeDomainData(dataArray);

            canvasCtx.clearRect(0, 0, canvas.width/dpr, canvas.height/dpr); // Use scaled width/height for clearing
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = isDarkTheme ? 'rgb(94, 234, 212)' : 'rgb(20, 184, 166)'; // Teal-300 dark, Teal-500 light

            canvasCtx.beginPath();
            const sliceWidth = (canvas.width/dpr) / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * (canvas.height/dpr) / 2;
                if (i === 0) canvasCtx.moveTo(x, y);
                else canvasCtx.lineTo(x, y);
                x += sliceWidth;
            }
            canvasCtx.lineTo(canvas.width/dpr, (canvas.height/dpr) / 2);
            canvasCtx.stroke();
        };
        drawWave();

        return () => {
            if (animationFrameIdDrawWave.current) {
                cancelAnimationFrame(animationFrameIdDrawWave.current);
            }
             if (canvasCtx && waveformCanvasRef.current) { // Clear canvas on stop
                canvasCtx.clearRect(0, 0, waveformCanvasRef.current.width, waveformCanvasRef.current.height);
            }
        };
    } else {
         if (waveformCanvasRef.current) { // Clear if not tuning
            const canvas = waveformCanvasRef.current;
            const canvasCtx = canvas.getContext('2d');
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
  }, [isTuning, analyserNode, isDarkTheme]); // Added isDarkTheme

  const handleToggleTuning = () => {
    if (isTuning) stopTuningProcess();
    else startTuningProcess();
  };

  const playReferenceTone = (frequency) => {
    if (!audioContext) {
      toast.warn("Audio context belum siap.");
      return;
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.7); // 0.7 detik

    const noteDetails = frequencyToNoteDetails(frequency);
    setTargetNote(noteDetails);
    toast.info(`Nada referensi: ${noteDetails.name}${noteDetails.octave} (${frequency.toFixed(1)} Hz)`);
  };

  const centsToRotation = (cents) => {
    const clampedCents = Math.max(-50, Math.min(50, cents));
    // Max rotation e.g. -45 to 45 degrees for -50 to +50 cents
    return (clampedCents / 50) * 45;
  };

  const getHintTextAndColor = (cents) => {
    if (detectedPitchInfo.name === '-' && detectedPitchInfo.octave === 0) {
        return { text: "Mainkan senar...", colorClass: "text-slate-500 dark:text-slate-400", icon: "ph:music-notes-simple-duotone"};
    }
    const absCents = Math.abs(cents);
    if (absCents <= 3) return { text: "✔ Tepat!", colorClass: "text-emerald-500 dark:text-emerald-400", icon: "ph:check-circle-duotone" };
    if (cents > 3 && cents < 15) return { text: "Sedikit Ketinggian", colorClass: "text-yellow-500 dark:text-yellow-400", icon: "ph:arrow-line-down-duotone" };
    if (cents >= 15) return { text: "Terlalu Tinggi", colorClass: "text-red-500 dark:text-red-400", icon: "ph:arrow-fat-lines-down-duotone"};
    if (cents < -3 && cents > -15) return { text: "Sedikit Kerendahan", colorClass: "text-yellow-500 dark:text-yellow-400", icon: "ph:arrow-line-up-duotone" };
    if (cents <= -15) return { text: "Terlalu Rendah", colorClass: "text-red-500 dark:text-red-400", icon: "ph:arrow-fat-lines-up-duotone" };
    return { text: "...", colorClass: "text-slate-500 dark:text-slate-400", icon: "ph:question-duotone"};
  };
  const hint = getHintTextAndColor(detectedPitchInfo.cents);

  return (
    <>
      <ToastContainer
        position="top-right" autoClose={3000} newestOnTop theme="colored"
        toastClassName={(o) => `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : o?.type === 'info' ? 'bg-teal-500 text-white' : 'bg-yellow-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`}
      />
      <div className="w-full px-2 sm:px-4 py-6">
        <Card
        bodyClass="relative p-0 h-full overflow-hidden"
        className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
      >
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:guitars-duotone" className="text-2xl sm:text-3xl" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
                  Tuner Gitar Akustik
                </h1>
                 <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
                    Tune gitar standar (EADGBe) dengan mikrofon Anda.
                </p>
              </div>
            </div>
          </div>

          <SimpleBar className="h-full max-h-[calc(100vh-230px)]"> {/* Adjusted max-h */}
            <div className="p-4 sm:p-6 space-y-6 text-center">
              {!microphoneStream && permissionError && ( // Tampilkan hanya jika stream belum ada & ada error
                <div className={`p-4 my-4 text-sm rounded-lg border flex flex-col items-center shadow ${isDarkTheme ? 'bg-red-900/30 text-red-300 border-red-500/50' : 'bg-red-100 text-red-700 border-red-300'}`} role="alert">
                  <Icon icon="ph:microphone-slash-fill" className="text-3xl mb-2" />
                  <span className="font-semibold mb-1">Akses Mikrofon Diperlukan</span>
                  <p className="text-xs">{permissionError}</p>
                  { (permissionError.includes("ditolak") || permissionError.includes("Tidak dapat mengakses mikrofon")) &&
                    !permissionError.includes("tidak didukung") && !permissionError.includes("tidak ditemukan") && (
                    <Button
                      onClick={startTuningProcess}
                      text="Coba Izinkan Lagi"
                      className="mt-3 bg-yellow-500 hover:bg-yellow-600 text-white text-xs py-1.5 px-3 rounded-md shadow-sm"
                      icon="ph:arrow-counter-clockwise-duotone"
                    />
                  )}
                </div>
              )}

              <Button
                onClick={handleToggleTuning}
                className={`w-full sm:w-auto px-8 py-3 text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition duration-300 flex items-center justify-center mx-auto focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800
                  ${isTuning ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white focus:ring-red-500'
                              : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white focus:ring-teal-500'}`}
              >
                <Icon icon={isTuning ? "ph:microphone-slash-duotone" : "ph:microphone-duotone"} className="mr-2 text-xl" />
                {isTuning ? "Stop Tuning" : "Mulai Tuning"}
              </Button>

              {isTuning && !permissionError && (
                <div className="mt-6 p-4 sm:p-6 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/70 shadow-inner space-y-4">
                    <canvas ref={waveformCanvasRef} className="w-full max-w-lg mx-auto h-20 sm:h-24 rounded-md border border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-700/30 shadow-sm"></canvas>
                    
                    <div className="text-6xl sm:text-7xl font-bold text-teal-500 dark:text-teal-300 tracking-tight">
                        {detectedPitchInfo.name}
                        <span className="text-3xl sm:text-4xl align-super opacity-80 ml-1">{detectedPitchInfo.octave > 0 ? detectedPitchInfo.octave : ''}</span>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 -mt-2 mb-2">
                        {detectedPitchInfo.frequency > 0 ? `${detectedPitchInfo.frequency} Hz` : "--- Hz"}
                         {detectedPitchInfo.closestStandardNote && ` (Dekat ${detectedPitchInfo.closestStandardNote.name}${detectedPitchInfo.closestStandardNote.octave})`}
                    </div>
                    
                    {/* Analog Meter */}
                    <div className="relative w-full max-w-[280px] sm:max-w-xs mx-auto h-36 sm:h-40 my-2">
                        <svg viewBox="0 0 200 115" className="w-full h-full overflow-visible"> {/* Increased height for text */}
                            <defs>
                                <linearGradient id="meterGradientRed" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={isDarkTheme ? "#f87171" : "#ef4444"} /> {/* red-400 dark, red-500 light */}
                                    <stop offset="100%" stopColor={isDarkTheme ? "#fca5a5" : "#fecaca"} />{/* red-300 dark, red-200 light */}
                                </linearGradient>
                                 <linearGradient id="meterGradientYellow" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={isDarkTheme ? "#facc15" : "#eab308"} /> {/* yellow-400 dark, yellow-500 light */}
                                    <stop offset="100%" stopColor={isDarkTheme ? "#fde047" : "#fef08a"} /> {/* yellow-300 dark, yellow-200 light */}
                                </linearGradient>
                                <linearGradient id="meterGradientGreen" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={isDarkTheme ? "#4ade80" : "#22c55e"} /> {/* green-400 dark, green-500 light */}
                                    <stop offset="100%" stopColor={isDarkTheme ? "#86efac" : "#bbf7d0"} /> {/* green-300 dark, green-200 light */}
                                </linearGradient>
                            </defs>
                            {/* Background Arc sections */}
                            <path d="M30 100 A 70 70 0 0 1 65 42" stroke="url(#meterGradientRed)" strokeWidth="12" fill="none" strokeLinecap="round"/> {/* -50 to -15 cents */}
                            <path d="M65 42 A 70 70 0 0 1 92 30.3" stroke="url(#meterGradientYellow)" strokeWidth="12" fill="none" strokeLinecap="round"/> {/* -15 to -3 cents */}
                            <path d="M92 30.3 A 70 70 0 0 1 108 30.3" stroke="url(#meterGradientGreen)" strokeWidth="16" fill="none" strokeLinecap="round"/> {/* -3 to +3 cents (thicker) */}
                            <path d="M108 30.3 A 70 70 0 0 1 135 42" stroke="url(#meterGradientYellow)" strokeWidth="12" fill="none" strokeLinecap="round"/> {/* +3 to +15 cents */}
                            <path d="M135 42 A 70 70 0 0 1 170 100" stroke="url(#meterGradientRed)" strokeWidth="12" fill="none" strokeLinecap="round"/> {/* +15 to +50 cents */}
                            
                            {/* Tick marks */}
                            {[-50, -25, 0, 25, 50].map(tick => {
                                const angle = (tick / 50) * 45; // Map to -45 to 45 range
                                const x2 = 100 + 78 * Math.sin(angle * Math.PI / 180);
                                const y2 = 100 - 78 * Math.cos(angle * Math.PI / 180);
                                const x1 = 100 + (tick === 0 ? 65 : 70) * Math.sin(angle * Math.PI / 180);
                                const y1 = 100 - (tick === 0 ? 65 : 70) * Math.cos(angle * Math.PI / 180);
                                return <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isDarkTheme ? "#64748b" : "#94a3b8"} strokeWidth="1" />;
                            })}
                             <text x="25" y="115" fontSize="10" fill={isDarkTheme ? "#94a3b8" : "#64748b"} textAnchor="middle">-50</text>
                             <text x="100" y="15" fontSize="10" fill={isDarkTheme ? "#94a3b8" : "#64748b"} textAnchor="middle">0</text>
                             <text x="175" y="115" fontSize="10" fill={isDarkTheme ? "#94a3b8" : "#64748b"} textAnchor="middle">+50</text>

                            {/* Needle */}
                            <line
                                x1="100" y1="100" x2="100" y2="30" // Needle length
                                stroke={isDarkTheme ? "#e2e8f0" : "#1e293b"} strokeWidth="2.5" strokeLinecap="round"
                                style={{
                                    transformOrigin: '100px 100px',
                                    transform: `rotate(${centsToRotation(detectedPitchInfo.cents)}deg)`,
                                    transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)' // Smooth transition
                                }}
                            />
                             {/* Needle pivot */}
                            <circle cx="100" cy="100" r="4" fill={isDarkTheme ? "#cbd5e1" : "#334155"} />
                        </svg>
                    </div>
                    
                    <div className={`text-lg sm:text-xl font-semibold flex items-center justify-center ${hint.colorClass}`}>
                        <Icon icon={hint.icon} className="mr-1.5 text-xl sm:text-2xl" />
                        {hint.text}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 -mt-1">
                        Deviasi: {detectedPitchInfo.cents > 0 ? `+${detectedPitchInfo.cents}` : detectedPitchInfo.cents} cents
                    </div>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700/60">
                <h3 className="text-base sm:text-lg font-semibold text-teal-700 dark:text-teal-300 mb-4 flex items-center justify-center">
                  <Icon icon="ph:speaker-high-duotone" className="mr-2 text-xl" /> Nada Referensi (Standard EADGBe)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {Object.entries(STANDARD_TUNING).map(([key, note]) => (
                    <Button
                      key={key}
                      onClick={() => playReferenceTone(note.frequency)}
                      className={`w-full text-sm sm:text-base font-medium rounded-lg py-2.5 sm:py-3 shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2  focus:ring-offset-2 dark:focus:ring-offset-slate-800/60
                        ${isDarkTheme 
                            ? 'bg-slate-700 hover:bg-slate-600/80 text-teal-300 focus:ring-teal-400' 
                            : 'bg-slate-200 hover:bg-slate-300/80 text-teal-700 focus:ring-teal-500'
                        }`}
                      disabled={isTuning || !audioContext}
                    >
                      {note.name}{note.octave}
                      <span className="block text-xs opacity-80">({note.frequency.toFixed(1)} Hz)</span>
                    </Button>
                  ))}
                </div>
                {targetNote && (
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        <Icon icon="ph:target-duotone" className="inline mr-1 -mt-0.5"/>
                        Target terakhir: {targetNote.name}{targetNote.octave} ({targetNote.frequency} Hz)
                    </p>
                )}
              </div>
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default TunerGitarPage;