"use client";

import SimpleBar from "simplebar-react";
import { useState, useCallback, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import Fileinput from "@/components/ui/Fileinput";
import Textarea from "@/components/ui/Textarea";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';

const ObfuscatePage = () => {
  const [inputMode, setInputMode] = useState('text');
  const [jsCode, setJsCode] = useState('');
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [obfuscatedFileUrl, setObfuscatedFileUrl] = useState(null);

  useEffect(() => {
    if (obfuscatedFileUrl && !loading && !error) {
      const link = document.createElement('a');
      link.href = obfuscatedFileUrl;
      
      let downloadName = 'obfuscated_code.js';
      
      if (inputMode === 'file' && selectedFileName) {
        downloadName = `obfuscated_${selectedFileName}`;
      } else if (inputMode === 'url' && url) {
        const urlFileName = url.split('/').pop() || 'file.js';
        downloadName = `obfuscated_${urlFileName}`;
      } else if (inputMode === 'text') {
        downloadName = 'obfuscated_code.js';
      }
      
      link.setAttribute('download', downloadName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(obfuscatedFileUrl);
      setObfuscatedFileUrl(null);

      toast.success("Kode berhasil di-obfuscate dan diunduh!");
    } else if (error && !loading) {
      toast.error(error);
    }
  }, [obfuscatedFileUrl, loading, error, selectedFileName, inputMode, url]);

  const handleJsCodeChange = (e) => {
    setJsCode(e.target.value);
  };

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
  };

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      const fileName = file.name;
      const fileExtension = fileName.toLowerCase().split('.').pop();

      if (fileExtension !== 'js') {
        toast.error("Mohon pilih file JS yang valid!");
        setSelectedFile(null);
        setSelectedFileName('');
        return;
      }
      setSelectedFile(file);
      setSelectedFileName(fileName);
    } else {
      setSelectedFile(null);
      setSelectedFileName('');
    }
  }, []);

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (event) => reject(event.target.error);
      reader.readAsText(file);
    });
  };

  const fetchCodeFromUrl = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const code = await response.text();
      return code;
    } catch (error) {
      throw new Error(`Gagal mengambil file dari URL: ${error.message}`);
    }
  };

  const handleObfuscate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let codeToObfuscate = '';

    try {
      if (inputMode === 'text') {
        codeToObfuscate = jsCode;
        if (!codeToObfuscate.trim()) {
          toast.warn("Mohon masukkan kode JavaScript!");
          setLoading(false);
          return;
        }
      } else if (inputMode === 'url') {
        if (!url.trim()) {
          toast.warn("Mohon masukkan URL file JS!");
          setLoading(false);
          return;
        }
        try {
          codeToObfuscate = await fetchCodeFromUrl(url);
        } catch (urlError) {
          toast.error(urlError.message);
          setError(urlError.message);
          setLoading(false);
          return;
        }
      } else {
        if (!selectedFile) {
          toast.warn("Mohon pilih file JS!");
          setLoading(false);
          return;
        }
        try {
          codeToObfuscate = await readFileAsText(selectedFile);
        } catch (fileReadError) {
          toast.error("Gagal membaca file: " + fileReadError.message);
          setError("Gagal membaca file: " + fileReadError.message);
          setLoading(false);
          return;
        }
      }

      const response = await fetch('/api/tools/js-confuser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: codeToObfuscate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal meng-obfuscate kode JavaScript.');
      }

      const data = await response.json();
      const obfuscatedCode = data.result;

      const blob = new Blob([obfuscatedCode], { type: 'application/javascript' });
      const fileUrl = URL.createObjectURL(blob);
      setObfuscatedFileUrl(fileUrl);

    } catch (apiError) {
      setError(apiError.message);
      toast.error(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setSelectedFileName('');
  };

  const clearText = () => {
    setJsCode('');
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
                <Icon icon="ph:lock-key-duotone" className="text-2xl sm:text-3xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                Obfuscate JavaScript
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Sembunyikan dan lindungi kode JavaScript dari teks langsung, URL, atau upload file.
            </p>
          </div>

          <SimpleBar className="max-h-[calc(100vh-230px)]">
            <div className="p-4 sm:p-6 space-y-6">
              <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <label className="block text-sm sm:text-base font-medium text-teal-700 dark:text-teal-300 mb-3 flex items-center">
                  <Icon icon="ph:radio-button-duotone" className="mr-2 text-xl" />
                  Pilih Metode Input
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('text');
                      clearFile();
                      setUrl('');
                    }}
                    disabled={loading}
                    className={`p-3 rounded-md text-sm font-medium transition duration-200 flex items-center justify-center ${
                      inputMode === 'text'
                        ? 'bg-teal-500 text-white shadow-md'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                    }`}
                  >
                    <Icon icon="ph:code-duotone" className="mr-2 text-lg" />
                    Input Kode
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('url');
                      setJsCode('');
                      clearFile();
                    }}
                    disabled={loading}
                    className={`p-3 rounded-md text-sm font-medium transition duration-200 flex items-center justify-center ${
                      inputMode === 'url'
                        ? 'bg-teal-500 text-white shadow-md'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                    }`}
                  >
                    <Icon icon="ph:link-duotone" className="mr-2 text-lg" />
                    URL File JS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('file');
                      setJsCode('');
                      setUrl('');
                    }}
                    disabled={loading}
                    className={`p-3 rounded-md text-sm font-medium transition duration-200 flex items-center justify-center ${
                      inputMode === 'file'
                        ? 'bg-teal-500 text-white shadow-md'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                    }`}
                  >
                    <Icon icon="ph:upload-duotone" className="mr-2 text-lg" />
                    Upload File JS
                  </button>
                </div>
              </div>

              <form onSubmit={handleObfuscate} className="space-y-4 sm:space-y-5">
                {inputMode === 'text' && (
                  <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="jsCodeInput" className="block text-sm sm:text-base font-medium text-teal-700 dark:text-teal-300 flex items-center">
                        <Icon icon="ph:terminal-window-duotone" className="mr-2 text-xl" />
                        Masukkan Kode JavaScript
                      </label>
                      {jsCode && (
                        <Button
                          text="Hapus Teks"
                          className="text-xs px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded flex items-center"
                          onClick={clearText}
                          disabled={loading}
                          type="button"
                        />
                      )}
                    </div>
                    <Textarea
                      id="jsCodeInput"
                      placeholder="Paste kode JavaScript Anda di sini..."
                      value={jsCode}
                      onChange={handleJsCodeChange}
                      required={inputMode === 'text'}
                      disabled={loading}
                      className="w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm font-mono"
                      rows="12"
                      inputClassName="text-sm bg-transparent placeholder-slate-400 dark:placeholder-slate-500 p-3"
                    />
                    {jsCode && (
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span className="flex items-center">
                          <Icon icon="ph:text-aa-duotone" className="mr-1" />
                          {jsCode.length} karakter
                        </span>
                        <span className="flex items-center">
                          <Icon icon="ph:rows-duotone" className="mr-1" />
                          {jsCode.split('\n').length} baris
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {inputMode === 'url' && (
                  <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <label htmlFor="fileUrl" className="block text-sm sm:text-base font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                      <Icon icon="ph:link-duotone" className="mr-2 text-xl" />
                      Masukkan URL File JavaScript
                    </label>
                    <Textinput
                      id="fileUrl"
                      type="text"
                      placeholder="https://example.com/script.js"
                      value={url}
                      onChange={handleUrlChange}
                      required={inputMode === 'url'}
                      disabled={loading}
                      className="w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      inputClassName="text-sm bg-transparent placeholder-slate-400 dark:placeholder-slate-500 p-3"
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Masukkan URL langsung ke file JavaScript (.js)
                    </p>
                  </div>
                )}

                {inputMode === 'file' && (
                  <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <label htmlFor="jsFile" className="block text-sm sm:text-base font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                      <Icon icon="ph:folder-fill" className="mr-2 text-xl" />
                      Pilih File JavaScript (.js)
                    </label>
                    <Fileinput
                      id="jsFile"
                      name="fileUpload"
                      accept=".js"
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
                            <Icon icon="ph:file-js-bold" className="mr-1 text-base" />
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
                            <Icon icon="ph:file-js-bold" className="mr-2 text-slate-500 flex-shrink-0" />
                            <span className="truncate text-slate-700 dark:text-slate-300">{selectedFile.name}</span>
                          </div>
                          <span className="text-slate-500 dark:text-slate-400 ml-2 flex-shrink-0">
                            {formatFileSize(selectedFile.size)}
                          </span>
                        </div>
                      </div>
                    )}
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Hanya file dengan ekstensi .js yang dapat diupload
                    </p>
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
                        <Icon icon="ph:lock-key-fill" className="mr-1.5 text-lg" />
                        Obfuscate & Download
                      </span>
                    )
                  }
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center disabled:opacity-70"
                  disabled={
                    loading || 
                    (inputMode === 'text' && !jsCode.trim()) || 
                    (inputMode === 'url' && !url.trim()) || 
                    (inputMode === 'file' && !selectedFile)
                  }
                  type="submit"
                />
              </form>

              {loading && (
                <div className="mt-6 flex flex-col items-center justify-center p-6 bg-slate-100/70 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow">
                  <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl text-teal-500 mb-3" />
                  <p className="text-sm text-slate-600 dark:text-teal-300">
                    Sedang meng-obfuscate {
                      inputMode === 'text' ? 'kode yang diinput' :
                      inputMode === 'file' ? 'file yang diupload' : 
                      'file dari URL'
                    }...
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
                  <p>• <strong>Input Kode:</strong> Paste kode JavaScript langsung ke dalam textarea</p>
                  <p>• <strong>URL File JS:</strong> Masukkan URL langsung ke file JavaScript</p>
                  <p>• <strong>Upload File JS:</strong> Upload file JavaScript dari komputer Anda</p>
                  <p>• Kode yang di-obfuscate akan otomatis terdownload</p>
                  <p>• Proses obfuscation akan membuat kode sulit dibaca dan dianalisis</p>
                </div>
              </div>
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default ObfuscatePage;