"use client";

import { useDispatch, useSelector } from "react-redux";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import Modal from "@/components/ui/Modal";
import { setNama, setCopied, fetchArtiNama } from "@/components/partials/app/arti-nama/store";
import { ToastContainer, toast } from "react-toastify";
import SimpleBar from "simplebar-react";
import { Icon } from '@iconify/react';
import { useState, useEffect } from "react";

const PageArtinama = () => {
  const dispatch = useDispatch();
  const { nama, artinama, catatan, loading, error, copied } = useSelector((state) => state.artinama);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    if (artinama && !loading && !error) {
      setShowResultModal(true);
    }
  }, [artinama, loading, error]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nama.trim()) {
      toast.warn("Nama tidak boleh kosong!");
      return;
    }
    dispatch(fetchArtiNama(nama));
  };

  const handleCopy = () => {
    if (!artinama) {
      toast.info("Tidak ada arti nama untuk disalin.");
      return;
    }
    const textToCopy = catatan ? `${artinama}\n\nCatatan:\n${catatan}` : artinama;
    navigator.clipboard.writeText(textToCopy).then(() => {
      toast.success("Berhasil disalin!");
      dispatch(setCopied(true));
      setTimeout(() => dispatch(setCopied(false)), 2000);
    }).catch(() => {
      toast.error("Gagal menyalin teks.");
    });
  };

  return (
    <>
      <div className="w-full px-2 sm:px-4 py-6">
        <ToastContainer
          position="top-right"
          autoClose={3000}
          newestOnTop
          theme="colored"
          toastClassName={(options) =>
            `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer
            ${options?.type === 'success' ? 'bg-emerald-500 text-white' :
              options?.type === 'error' ? 'bg-red-500 text-white' :
              options?.type === 'warn' ? 'bg-yellow-500 text-white' : // Changed text-black to text-white for consistency
              'bg-sky-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`
          }
        />
        <Card
          bodyClass="relative p-0 h-full overflow-hidden"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        >
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:chats-circle-duotone" className="text-2xl sm:text-3xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                Cek Arti Nama
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Temukan makna dan asal usul nama Anda atau orang terkasih.
            </p>
          </div>

          <SimpleBar className="max-h-[calc(100vh-230px)]"> {/* Adjusted SimpleBar height to match others */}
            <div className="p-4 sm:p-6 space-y-6"> {/* Added space-y for consistency */}
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60"> {/* Matched container styling */}
                  <label htmlFor="namaInput" className="block text-sm sm:text-base font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center"> {/* Matched label color and icon alignment */}
                    <Icon icon="ph:user-circle-duotone" className="mr-2 text-xl" /> {/* Icon size adjusted */}
                    Masukkan Nama
                  </label>
                  <Textinput
                    id="namaInput"
                    type="text"
                    placeholder="Contoh: Budi Hermawan"
                    value={nama}
                    onChange={(e) => dispatch(setNama(e.target.value))}
                    required
                    disabled={loading}
                    className="w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm" // Matched input styling
                    inputClassName="text-sm bg-transparent placeholder-slate-400 dark:placeholder-slate-500 p-3" // Matched input padding and placeholder style
                  />
                </div>

                <Button
                  text={
                    loading ? (
                      <span className="flex items-center justify-center">
                        <Icon icon="svg-spinners:ring-resize" className="animate-spin mr-2 text-lg" /> Mencari... {/* Matched loading icon and animation */}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <Icon icon="ph:magnifying-glass-duotone" className="mr-1.5 text-lg" /> {/* Matched icon size */}
                        Cari Arti
                      </span>
                    )
                  }
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center disabled:opacity-70" // Matched button styling and disabled opacity
                  disabled={loading}
                  type="submit"
                />
              </form>

              {loading && (
                <div className="mt-6 flex flex-col items-center justify-center p-6 bg-slate-100/70 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow"> {/* Matched loading indicator container styling */}
                  <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl text-teal-500 mb-3" /> {/* Matched loading icon size and color */}
                  <p className="text-sm text-slate-600 dark:text-teal-300">Sedang mencari arti nama...</p> {/* Matched text styling */}
                </div>
              )}

              {error && !loading && (
                <div className="mt-6 p-3 sm:p-4 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 rounded-lg border border-red-300 dark:border-red-500/50 flex items-start text-sm sm:text-base shadow"> {/* Matched error box styling */}
                  <Icon icon="ph:warning-octagon-duotone" className="text-xl mr-2.5 mt-0.5 flex-shrink-0" /> {/* Matched icon size and margin */}
                  <p>{error}</p>
                </div>
              )}
            </div>
          </SimpleBar>
        </Card>
      </div>

      {artinama && !loading && !error && (
        <Modal
          title={
            <div className="flex items-center text-slate-900 dark:text-slate-50">
              <Icon icon="ph:text-aa-duotone" className="mr-2 h-5 w-5 flex-shrink-0 text-teal-500 dark:text-teal-400 sm:h-6 sm:w-6"/>
              <span className="text-sm font-medium sm:text-base">
                Arti Nama: <span className="font-semibold">{nama}</span>
              </span>
            </div>
          }
          activeModal={showResultModal}
          onClose={() => setShowResultModal(false)}
          className="max-w-md border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
          footerContent={
            <div className="flex flex-col sm:flex-row justify-end w-full gap-3">
              <Button
                text="Tutup"
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-200 rounded-md py-2 px-4 text-sm" // Changed to rounded-md
                onClick={() => setShowResultModal(false)}
              />
              <Button
                text={
                  <span className="flex items-center justify-center">
                    <Icon icon={copied ? "ph:check-circle-duotone" : "ph:copy-duotone"} className="mr-2 text-lg" />
                    {copied ? "Tersalin!" : "Salin Arti"}
                  </span>
                }
                className={`${copied ? "bg-emerald-500 hover:bg-emerald-600" : "bg-sky-500 hover:bg-sky-600"} text-white rounded-md py-2 px-4 text-sm font-medium`} // Changed to rounded-md
                onClick={handleCopy}
                disabled={!artinama}
              />
            </div>
          }
        >
          <SimpleBar style={{ maxHeight: '60vh' }} className="p-1">
            <div className="space-y-4 sm:space-y-5">
                <div className="bg-slate-100/70 dark:bg-slate-700/50 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-600/70 "> {/* Matched container styling */}
                    <div className="flex items-center mb-2 sm:mb-3">
                        <span className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-teal-100 dark:bg-teal-500/30 text-teal-600 dark:text-teal-300 mr-2.5 flex-shrink-0">
                        <Icon icon="ph:text-align-left-duotone" className="text-lg sm:text-xl" />
                        </span>
                        <h5 className="text-md sm:text-lg font-semibold text-slate-700 dark:text-teal-300">Arti Nama</h5>
                    </div>
                    <div className="bg-white dark:bg-slate-700/80 p-3 sm:p-4 rounded-lg border border-slate-300 dark:border-slate-600">
                        <SimpleBar style={{ maxHeight: 200 }}>
                            <pre className="text-sm sm:text-base whitespace-pre-wrap break-words text-slate-700 dark:text-slate-200 font-sans leading-relaxed">
                                {artinama}
                            </pre>
                        </SimpleBar>
                    </div>
                </div>

                {catatan && (
                    <div className="bg-slate-100/70 dark:bg-slate-700/50 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-600/70 "> {/* Matched container styling */}
                        <div className="flex items-center mb-2 sm:mb-3">
                            <span className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-sky-100 dark:bg-sky-500/30 text-sky-600 dark:text-sky-300 mr-2.5 flex-shrink-0">
                                <Icon icon="ph:note-pencil-duotone" className="text-lg sm:text-xl" />
                            </span>
                            <h5 className="text-md sm:text-lg font-semibold text-slate-700 dark:text-sky-300">Catatan</h5>
                        </div>
                        <div className="bg-white dark:bg-slate-700/80 p-3 sm:p-4 rounded-lg border border-slate-300 dark:border-slate-600">
                             <SimpleBar style={{ maxHeight: 150 }}>
                                 <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                                     {catatan}
                                 </p>
                            </SimpleBar>
                        </div>
                    </div>
                )}
            </div>
          </SimpleBar>
        </Modal>
      )}
    </>
  );
};

export default PageArtinama;