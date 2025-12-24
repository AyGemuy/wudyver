"use client";

import { useEffect, useState, Fragment } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icon } from "@iconify/react";
import { toast, ToastContainer } from "react-toastify";
import Tooltip from "@/components/ui/Tooltip"; // Asumsi ada komponen Tooltip

const TEBAK_GAMBAR_API_URL = "/api/game/tebak-gambar";

const TebakGambarPage = () => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);  
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [error, setError] = useState(null);
  const [score, setScore] = useState(0);

  const fetchNewQuestion = async () => {
    setLoadingQuestion(true);
    setError(null);
    setUserAnswer("");
    setIsAnswered(false);
    setIsCorrect(false);
    setShowHint(false);
    setShowAnswer(false);
    setCurrentQuestion(null);

    try {
      const res = await fetch(TEBAK_GAMBAR_API_URL);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Gagal memuat soal baru (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (!data || !data.img || !data.jawaban) {
          throw new Error("Format data soal tidak valid.");
      }
      setCurrentQuestion(data);
    } catch (err) {
      console.error("Error fetching new question:", err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoadingQuestion(false);
    }
  };

  useEffect(() => {
    fetchNewQuestion();
  }, []);

  const handleSubmitAnswer = (e) => {
    e.preventDefault();
    if (!currentQuestion || !userAnswer.trim() || isAnswered) return;

    const submittedAnswer = userAnswer.trim().toUpperCase();
    const correctAnswer = currentQuestion.jawaban.toUpperCase();

    setIsAnswered(true);
    if (submittedAnswer === correctAnswer) {
      setIsCorrect(true);
      setScore(prevScore => prevScore + 10);
      toast.success("🎉 Jawaban Benar! +10 Poin");
    } else {
      setIsCorrect(false);
      toast.error("😔 Jawaban Salah. Coba soal berikutnya!");
    }
  };

  const handleNextQuestion = () => {
    fetchNewQuestion();
  };

  const handleShowHint = () => {
    if (!showHint && currentQuestion?.deskripsi) {
        setShowHint(true);
        toast.info("Petunjuk ditampilkan!");
    }
  };

  const handleShowAnswer = () => {
    if(!showAnswer && currentQuestion?.jawaban) {
        setShowAnswer(true);
        setIsAnswered(true); 
        setIsCorrect(false); 
        toast.warn("Jawaban ditampilkan.");
    }
  };

  const inputBaseClass = "w-full bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-md shadow-sm text-sm px-3 py-2.5 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-slate-700";
  const buttonPrimaryClass = "bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold py-2.5 px-5 rounded-md shadow-md hover:shadow-lg transition duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-sm";
  const buttonSecondaryClass = "bg-slate-200 hover:bg-slate-300 text-slate-700 py-2.5 px-5 rounded-md dark:bg-slate-600/80 dark:hover:bg-slate-600 dark:text-slate-200 transition-colors duration-150 disabled:opacity-50 flex items-center justify-center text-sm";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="w-full px-2 sm:px-4 md:px-6 py-6">
      <ToastContainer position="top-right" autoClose={3000} newestOnTop theme="colored"
        toastClassName={(o) => `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : o?.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-teal-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`}
      />

      <Card
        bodyClass="relative p-0 h-full overflow-hidden"
        className="w-full max-w-2xl mx-auto border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
      >
        {/* Header Baru */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            {/* Kontainer untuk Ikon, Judul, dan Subjudul */}
            <div className="flex-grow mb-3 sm:mb-0">
              <div className="flex flex-col sm:flex-row items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                  <Icon icon="ph:image-square-duotone" className="text-2xl sm:text-3xl" />
                </div>
                <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                  Tebak Gambar
                </h1>
              </div>
              <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
                Uji wawasanmu dengan menebak gambar yang ditampilkan!
              </p>
            </div>

            {/* Tampilan Skor */}
            <div className="text-lg font-semibold text-teal-600 dark:text-teal-300 self-end sm:self-center mt-2 sm:mt-0">
              Skor: <span className="font-bold">{score}</span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-6 text-center">
          {/* Loading State Baru */}
          {loadingQuestion && (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <Icon icon="svg-spinners:blocks-shuffle-3" className="text-5xl sm:text-6xl text-teal-500 mb-4" />
              <p className="text-lg font-medium text-slate-600 dark:text-slate-300">Memuat soal baru...</p>
            </div>
          )}

          {error && !loadingQuestion && (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
              <Icon icon="ph:warning-octagon-duotone" className="text-6xl mb-4" />
              <p className="text-lg font-semibold">Oops, terjadi kesalahan!</p>
              <p className="text-sm mt-1">{error}</p>
              <Button text="Coba Lagi" onClick={fetchNewQuestion} icon="ph:arrow-clockwise-duotone" className={`${buttonPrimaryClass} mt-6`} />
            </div>
          )}

          {currentQuestion && !loadingQuestion && !error && (
            <div className="space-y-6">
              <p className="text-sm text-slate-500 dark:text-slate-400">Soal #{currentQuestion.index}</p>
              
              {/* Gambar */}
              <div className="bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg shadow-md max-w-md mx-auto aspect-[4/3] overflow-hidden">
                <img  
                    src={currentQuestion.img}  
                    alt="Tebak Gambar Ini"  
                    className="w-full h-full object-contain rounded"  
                    onError={(e) => {  
                        e.target.alt="Gagal memuat gambar";  
                        e.target.src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbD0iI2QxZDVいだCI+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMjEuNTIgMiAxMiAyem0wIDE4Yy00LjQxIDAtOC0zLjU5LTgtOHMzLjU5LTggOC04IDggMy41OSA4IDgtMy41OSA4LTggOHptLTFIN2MtLjU1IDAtMS0uNDUtMS0xczAuNDUtMSAxLTFoMnYtMmMwLS41NS40NS0xIDEtMXMxIC40NSAxIDEvMmgwdjJoMmMuNTUgMCAxIC40NSAxIDFzLS40NSAxLTEgMWgtMnYyYzAgLjU1LS40NSAxLTEgMXMtMS0uNDUtMS0xdi0ySDl6bTMtNWMwLS41NS40NS0xIDEtMXMxIC40NSAxIDF2M2MwIC41NS0uNDUgMS0xIDFzLTEtLjQ1LTEtMXYtM3oiLz48L3N2Zz4="; // Fallback SVG yang lebih netral
                    }}/>
              </div>

              {/* Form Jawaban */}
              {!isAnswered && !showAnswer && (
                <form onSubmit={handleSubmitAnswer} className="space-y-4 max-w-md mx-auto">
                  <div>
                    <label htmlFor="userAnswer" className={labelClass}>Jawaban Anda:</label>
                    <input
                      type="text"
                      id="userAnswer"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Ketik jawabanmu di sini..."
                      className={inputBaseClass}
                      disabled={isAnswered || showAnswer}
                      autoFocus
                    />
                  </div>
                  <Button  
                    type="submit"  
                    text="Tebak!"  
                    icon="ph:paper-plane-tilt-duotone"  
                    className={`${buttonPrimaryClass} w-full`}  
                    disabled={!userAnswer.trim() || isAnswered || showAnswer}
                  />
                </form>
              )}

              {/* Feedback Jawaban */}
              {isAnswered && (
                <div className={`p-3 rounded-md text-sm font-medium ${isCorrect ? 'bg-green-100 dark:bg-green-700/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-700/30 text-red-700 dark:text-red-300'}`}>
                  {isCorrect ? `Benar! Jawabannya adalah "${currentQuestion.jawaban}".` : `Salah! Coba lagi di soal berikutnya.`}
                </div>
              )}

              {/* Petunjuk */}
              {showHint && !showAnswer && currentQuestion.deskripsi && (
                  <div className="mt-4 p-3 bg-sky-50 dark:bg-sky-700/30 text-sky-700 dark:text-sky-300 rounded-md text-sm text-left max-w-md mx-auto">
                    <p className="font-semibold flex items-center"><Icon icon="ph:lightbulb-duotone" className="mr-1.5 text-lg"/>Petunjuk:</p>  
                    <p>{currentQuestion.deskripsi}</p>
                </div>
              )}

              {/* Jawaban Terlihat */}
              {showAnswer && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-700/30 text-amber-700 dark:text-amber-300 rounded-md text-sm font-medium max-w-md mx-auto">
                    <p className="font-semibold">Jawaban:</p>  
                    <p className="text-lg">{currentQuestion.jawaban}</p>
                </div>
              )}


              {/* Tombol Kontrol Game */}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Tooltip content="Lihat petunjuk gambar">
                    <Button  
                        text="Petunjuk"  
                        icon="ph:lightbulb-filament-duotone"  
                        onClick={handleShowHint}  
                        className={buttonSecondaryClass}  
                        disabled={showHint || showAnswer || !currentQuestion?.deskripsi}
                    />
                </Tooltip>
                <Tooltip content="Lihat jawaban (tidak dapat poin)">
                    <Button  
                        text="Lihat Jawaban"  
                        icon="ph:eye-duotone"  
                        onClick={handleShowAnswer}  
                        className={buttonSecondaryClass}
                        disabled={showAnswer}
                    />
                </Tooltip>
                <Button  
                    text="Soal Berikutnya"  
                    icon="ph:arrow-fat-line-right-duotone"  
                    onClick={handleNextQuestion}  
                    className={buttonPrimaryClass}  
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default TebakGambarPage;