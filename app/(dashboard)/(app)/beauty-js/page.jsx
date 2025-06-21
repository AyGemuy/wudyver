"use client";

import SimpleBar from "simplebar-react";
import { useDispatch, useSelector } from "react-redux";
import { useState, useCallback, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import Fileinput from "@/components/ui/Fileinput";
import { ToastContainer, toast } from "react-toastify";
import { setUrl, beautifyZip } from "@/components/partials/app/beauty-js/store";
import { Icon } from '@iconify/react';

const BeautyPage = () => {
  const dispatch = useDispatch();
  const { url, loading, beautifiedFileUrl, error } = useSelector((state) => state.beauty);
  const [inputMode, setInputMode] = useState('url');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('');

  useEffect(() => {
    if (beautifiedFileUrl && !loading && !error) {
      const link = document.createElement('a');
      link.href = beautifiedFileUrl;
      const downloadName = selectedFileName ? `beautified_${selectedFileName}` : 'beautified_file';
      link.setAttribute('download', downloadName);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("File berhasil di-beautify dan diunduh!");
    } else if (error && !loading) {
      toast.error(error);
    }
  }, [beautifiedFileUrl, loading, error, selectedFileName]);

  const handleUrlChange = (e) => {
    dispatch(setUrl(e.target.value));
  };

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      const fileName = file.name;
      const fileExtension = fileName.toLowerCase().split('.').pop();

      if (!['zip', 'js'].includes(fileExtension)) {
        toast.error("Mohon pilih file ZIP atau JS yang valid!");
        setSelectedFile(null);
        setSelectedFileName('');
        setSelectedFileType('');
        return;
      }
      setSelectedFile(file);
      setSelectedFileName(fileName);
      setSelectedFileType(fileExtension);
    } else {
      setSelectedFile(null);
      setSelectedFileName('');
      setSelectedFileType('');
    }
  }, []);

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleBeautify = async (e) => {
    e.preventDefault();
    
    if (inputMode === 'url') {
      if (!url.trim()) {
        toast.warn("Mohon masukkan URL ZIP!");
        return;
      }
      dispatch(beautifyZip(url));
    } else {
      if (!selectedFile) {
        toast.warn("Mohon pilih file ZIP atau JS!");
        return;
      }
      
      try {
        const base64File = await convertFileToBase64(selectedFile);
        dispatch(beautifyZip(base64File));
      } catch (error) {
        toast.error("Gagal membaca file: " + error.message);
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setSelectedFileName('');
    setSelectedFileType('');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
                Beautify ZIP/JS File
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Format dan rapikan struktur file ZIP atau JS dari URL atau upload file.
            </p>
          </div>

          <SimpleBar className="max-h-[calc(100vh-230px)]">
            <div className="p-4 sm:p-6 space-y-6">
              <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <label className="block text-sm sm:text-base font-medium text-teal-700 dark:text-teal-300 mb-3 flex items-center">
                  <Icon icon="ph:radio-button-duotone" className="mr-2 text-xl" />
                  Pilih Metode Input
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setInputMode('url')}
                    disabled={loading}
                    className={`flex-1 p-3 rounded-md text-sm font-medium transition duration-200 flex items-center justify-center ${
                      inputMode === 'url'
                        ? 'bg-teal-500 text-white shadow-md'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                    }`}
                  >
                    <Icon icon="ph:link-duotone" className="mr-2 text-lg" />
                    URL ZIP
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('file')}
                    disabled={loading}
                    className={`flex-1 p-3 rounded-md text-sm font-medium transition duration-200 flex items-center justify-center ${
                      inputMode === 'file'
                        ? 'bg-teal-500 text-white shadow-md'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                    }`}
                  >
                    <Icon icon="ph:upload-duotone" className="mr-2 text-lg" />
                    Upload File
                  </button>
                </div>
              </div>

              <form onSubmit={handleBeautify} className="space-y-4 sm:space-y-5">
                {inputMode === 'url' && (
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
                      required={inputMode === 'url'}
                      disabled={loading}
                      className="w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      inputClassName="text-sm bg-transparent placeholder-slate-400 dark:placeholder-slate-500 p-3"
                    />
                  </div>
                )}

                {inputMode === 'file' && (
                  <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <label htmlFor="zipFile" className="block text-sm sm:text-base font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                      <Icon icon="ph:folder-fill" className="mr-2 text-xl" />
                      Pilih File ZIP atau JS
                    </label>
                    <Fileinput
                      id="zipFile"
                      name="fileUpload"
                      accept=".zip,.js"
                      selectedFiles={selectedFile ? [selectedFile] : []}
                      onChange={handleFileChange}
                      disabled={loading}
                      preview
                      className="w-full"
                    />
                    {selectedFile && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center">
                            <Icon icon={selectedFileType === 'zip' ? "ph:file-zip-bold" : "ph:file-js-bold"} className="mr-1 text-base" />
                            File dipilih
                          </span>
                          <Button
                            text="Hapus File"
                            className="text-xs px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded flex items-center"
                            onClick={clearFile}
                            disabled={loading}
                            type="button"
                          />
                        </div>
                        
                        <div className="mt-2 flex items-center justify-between text-xs bg-white dark:bg-slate-700/50 p-3 rounded border">
                          <div className="flex items-center min-w-0 flex-1">
                            <Icon icon={selectedFileType === 'zip' ? "ph:file-zip-bold" : "ph:file-js-bold"} className="mr-2 text-slate-500 flex-shrink-0" />
                            <span className="truncate text-slate-700 dark:text-slate-300">{selectedFile.name}</span>
                          </div>
                          <span className="text-slate-500 dark:text-slate-400 ml-2 flex-shrink-0">
                            {formatFileSize(selectedFile.size)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
                  disabled={loading || (inputMode === 'url' && !url.trim()) || (inputMode === 'file' && !selectedFile)}
                  type="submit"
                />
              </form>

              {loading && (
                <div className="mt-6 flex flex-col items-center justify-center p-6 bg-slate-100/70 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow">
                  <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl text-teal-500 mb-3" />
                  <p className="text-sm text-slate-600 dark:text-teal-300">
                    Sedang memproses file {inputMode === 'file' ? 'yang diupload' : 'dari URL'}...
                  </p>
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
                <div className="text-sm text-teal-700 dark:text-teal-300 pt-0.5 space-y-1">
                  <p>• Pilih antara URL ZIP atau upload file ZIP/JS langsung</p>
                  <p>• File akan otomatis terdownload setelah proses beautify selesai</p>
                  <p>• Hanya file dengan ekstensi .zip atau .js yang dapat diupload</p>
                  <p>• Proses beautify akan memformat dan merapikan struktur file</p>
                </div>
              </div>
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default BeautyPage;
