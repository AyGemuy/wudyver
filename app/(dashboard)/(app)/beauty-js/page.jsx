"use client";

import SimpleBar from "simplebar-react";
import { useDispatch, useSelector } from "react-redux";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import { ToastContainer, toast } from "react-toastify";
import { setUrl, beautifyZip } from "@/components/partials/app/beauty-js/store"; // Pastikan path ini benar
import { Icon } from '@iconify/react';

const BeautyPage = () => {
  const dispatch = useDispatch();
  const { url, loading } = useSelector((state) => state.beauty);

  const handleUrlChange = (e) => {
    dispatch(setUrl(e.target.value));
  };

  const handleBeautify = () => {
    if (!url.trim()) {
      toast.warn("Mohon masukkan URL ZIP");
      return;
    }
    dispatch(beautifyZip(url)); 
  };

  return (
    <>
      <div className="w-full px-2 sm:px-4 py-6">
        <ToastContainer
          position="top-right"
          autoClose={3500}
          newestOnTop
          theme="colored"
          toastClassName={(options) => 
            `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer 
            ${options?.type === 'success' ? 'bg-emerald-500 text-white' : 
            options?.type === 'error' ? 'bg-red-500 text-white' :
            'bg-teal-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md` // Warna default/info disesuaikan ke teal
          }
        />
        <Card
          bodyClass="relative p-0 h-full overflow-hidden" // Konsisten dengan CekResiPage & DbDataPage
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80" // Tema teal/cyan seperti CekResiPage
        >
          {/* Header Section */}
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center"> {/* Menyamakan dengan CekResiPage */}
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0"> {/* Warna ikon header disesuaikan */}
                <Icon icon="material-symbols:folder-zip-outline" className="text-2xl" />
              </div>
              <div className="ml-0 sm:ml-4 text-center sm:text-left"> {/* Penyesuaian alignment teks */}
                <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500"> {/* Warna judul disesuaikan */}
                  Beautify ZIP File
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Format dan rapikan struktur file ZIP dari URL.
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <SimpleBar className="max-h-[calc(100vh-220px)]"> {/* Ketinggian SimpleBar disesuaikan dengan CekResiPage */}
            <div className="p-4 sm:p-6 space-y-6"> {/* Menambah space-y untuk jarak antar elemen */}
              
              <div className="bg-slate-100/70 dark:bg-slate-800/40 p-5 rounded-lg border border-slate-200 dark:border-slate-700/60"> {/* Gaya input field container seperti CekResiPage */}
                <label htmlFor="zipUrl" className="block text-sm font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center"> {/* Warna label disesuaikan */}
                  <Icon icon="material-symbols:link" className="mr-2 text-lg" />
                  Masukkan URL ZIP
                </label>
                <Textinput
                  id="zipUrl"
                  type="text"
                  placeholder="https://example.com/file.zip"
                  value={url}
                  onChange={handleUrlChange}
                  className="w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm" // Warna focus dan style input disesuaikan
                  disabled={loading}
                />
              </div>

              <Button
                text={
                  loading ? (
                    <span className="flex items-center justify-center">
                      <Icon icon="svg-spinners:ring-resize" className="text-xl mr-2" /> {/* Icon loading disamakan dengan CekResiPage */}
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <Icon icon="ph:magic-wand-duotone" className="text-xl mr-2" /> {/* Mengganti icon beautify agar lebih tematik */}
                      Beautify & Download
                    </span>
                  )
                }
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center" // Style button disamakan dengan CekResiPage
                isLoading={loading}
                disabled={loading}
                onClick={handleBeautify}
              />

              <div className="flex items-center p-3 bg-teal-50 dark:bg-teal-800/30 rounded-lg border border-teal-200 dark:border-teal-700/50"> {/* Warna info box disesuaikan ke teal */}
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-100 dark:bg-teal-700/50 text-teal-600 dark:text-teal-300 mr-3 flex-shrink-0"> {/* Warna icon container info box disesuaikan */}
                  <Icon icon="ph:info-duotone" className="text-lg" />
                </div>
                <span className="text-sm text-teal-700 dark:text-teal-300"> {/* Warna teks info box disesuaikan */}
                  File akan otomatis terdownload setelah proses beautify selesai.
                </span>
              </div>
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default BeautyPage;