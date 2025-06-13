"use client";

import SimpleBar from "simplebar-react";
import { useDispatch, useSelector } from "react-redux";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import { ToastContainer, toast } from "react-toastify";
import { setUrl, beautifyZip } from "@/components/partials/app/beauty-js/store";
import { Icon } from '@iconify/react';
import { useEffect, useState } from "react";

const BeautyPage = () => {
  const dispatch = useDispatch();
  const { url, loading, beautifiedFileUrl, error } = useSelector((state) => state.beauty);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    if (beautifiedFileUrl && !loading && !error) {
      const link = document.createElement('a');
      link.href = beautifiedFileUrl;
      link.setAttribute('download', 'beautified_files.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("File berhasil di-beautify dan diunduh!");
      setShowResultModal(false);
    } else if (error && !loading) {
      toast.error(error);
    }
  }, [beautifiedFileUrl, loading, error]);

  const handleUrlChange = (e) => {
    dispatch(setUrl(e.target.value));
  };

  const handleBeautify = (e) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.warn("Mohon masukkan URL ZIP!");
      return;
    }
    dispatch(beautifyZip(url));
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
              options?.type === 'warn' ? 'bg-yellow-500 text-white' :
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
                <Icon icon="material-symbols:folder-zip-outline" className="text-2xl sm:text-3xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                Beautify ZIP File
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Format dan rapikan struktur file ZIP dari URL.
            </p>
          </div>

          <SimpleBar className="max-h-[calc(100vh-230px)]">
            <div className="p-4 sm:p-6 space-y-6">
              <form onSubmit={handleBeautify} className="space-y-4 sm:space-y-5">
                <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <label htmlFor="zipUrl" className="block text-sm sm:text-base font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                    <Icon icon="ph:link-duotone" className="mr-2 text-xl" />
                    Masukkan URL ZIP
                  </label>
                  <Textinput
                    id="zipUrl"
                    type="text"
                    placeholder="https://example.com/file.zip"
                    value={url}
                    onChange={handleUrlChange}
                    required
                    disabled={loading}
                    className="w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    inputClassName="text-sm bg-transparent placeholder-slate-400 dark:placeholder-slate-500 p-3"
                  />
                </div>

                <Button
                  text={
                    loading ? (
                      <span className="flex items-center justify-center">
                        <Icon icon="svg-spinners:ring-resize" className="animate-spin mr-2 text-lg" /> Processing...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <Icon icon="ph:magic-wand-duotone" className="mr-1.5 text-lg" />
                        Beautify & Download
                      </span>
                    )
                  }
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center disabled:opacity-70"
                  disabled={loading}
                  type="submit"
                />
              </form>

              {loading && (
                <div className="mt-6 flex flex-col items-center justify-center p-6 bg-slate-100/70 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow">
                  <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl text-teal-500 mb-3" />
                  <p className="text-sm text-slate-600 dark:text-teal-300">Sedang memproses file ZIP...</p>
                </div>
              )}

              {error && !loading && (
                <div className="mt-6 p-3 sm:p-4 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 rounded-lg border border-red-300 dark:border-red-500/50 flex items-start text-sm sm:text-base shadow">
                  <Icon icon="ph:warning-octagon-duotone" className="text-xl mr-2.5 mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="flex items-start p-3 bg-teal-50 dark:bg-teal-800/30 rounded-lg border border-teal-200 dark:border-teal-700/50">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-100 dark:bg-teal-700/50 text-teal-600 dark:text-teal-300 mr-3 flex-shrink-0">
                  <Icon icon="ph:info-duotone" className="text-lg" />
                </div>
                <span className="text-sm text-teal-700 dark:text-teal-300 pt-0.5">
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