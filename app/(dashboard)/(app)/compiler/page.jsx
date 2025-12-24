"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { Icon } from '@iconify/react';

const languageMapping = {
  C: "c",
  CPP: "cpp",
  PYTHON: "python",
  JAVA: "java",
  JAVASCRIPT: "javascript",
  TYPESCRIPT: "typescript",
  CSHARP: "csharp",
  GOLANG: "golang",
  RUST: "rust",
  R: "r",
  PHP: "php",
  SWIFT: "swift",
  KOTLIN: "kotlin",
  BASH: "bash",
  RUBY: "ruby",
  DART: "dart",
  SCALA: "scala"
};

const syntaxMapping = {
  c: "c_cpp",
  cpp: "c_cpp",
  python: "python",
  java: "java",
  javascript: "javascript",
  typescript: "typescript",
  csharp: "csharp",
  golang: "go",
  rust: "rust",
  r: "r",
  php: "php",
  swift: "swift",
  kotlin: "kotlin",
  bash: "bash",
  ruby: "ruby",
  dart: "dart",
  scala: "scala"
};

const CompilerPage = () => {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState(languageMapping.JAVASCRIPT);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showOutputModal, setShowOutputModal] = useState(false);
  const [inputMode, setInputMode] = useState('text');
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('');
  const [fetchingFile, setFetchingFile] = useState(false);
  const [toast, setToast] = useState(null);

  const availableLanguages = Object.keys(languageMapping).map(key => ({
    value: languageMapping[key],
    label: key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()
  }));

  // Simple toast system
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (output && !error && !loading) {
      setShowOutputModal(true);
    }
  }, [output, error, loading]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      const fileName = file.name;
      const fileExtension = fileName.toLowerCase().split('.').pop();
      
      // Check if file type is supported for code
      const supportedExtensions = ['js', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'r', 'php', 'swift', 'kt', 'sh', 'rb', 'dart', 'scala', 'ts', 'html', 'css', 'json', 'xml', 'txt'];
      
      if (!supportedExtensions.includes(fileExtension)) {
        showToast("Mohon pilih file kode yang valid!", 'error');
        setSelectedFile(null);
        setSelectedFileName('');
        setSelectedFileType('');
        return;
      }
      
      setSelectedFile(file);
      setSelectedFileName(fileName);
      setSelectedFileType(fileExtension);
      
      // Auto-detect language based on file extension
      const extensionToLanguage = {
        'js': 'javascript',
        'py': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'cs': 'csharp',
        'go': 'golang',
        'rs': 'rust',
        'r': 'r',
        'php': 'php',
        'swift': 'swift',
        'kt': 'kotlin',
        'sh': 'bash',
        'rb': 'ruby',
        'dart': 'dart',
        'scala': 'scala',
        'ts': 'typescript'
      };
      
      if (extensionToLanguage[fileExtension]) {
        setLanguage(extensionToLanguage[fileExtension]);
      }
      
      // Read file content
      const reader = new FileReader();
      reader.onload = (e) => {
        setCode(e.target.result);
      };
      reader.readAsText(file);
    } else {
      setSelectedFile(null);
      setSelectedFileName('');
      setSelectedFileType('');
    }
  }, []);

  const fetchFromUrl = async () => {
    if (!url.trim()) {
      showToast("Mohon masukkan URL yang valid!", 'error');
      return;
    }

    setFetchingFile(true);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const content = await response.text();
      setCode(content);
      
      // Try to detect language from URL
      const urlLower = url.toLowerCase();
      const urlExtension = urlLower.split('.').pop();
      const extensionToLanguage = {
        'js': 'javascript',
        'py': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'cs': 'csharp',
        'go': 'golang',
        'rs': 'rust',
        'r': 'r',
        'php': 'php',
        'swift': 'swift',
        'kt': 'kotlin',
        'sh': 'bash',
        'rb': 'ruby',
        'dart': 'dart',
        'scala': 'scala',
        'ts': 'typescript'
      };
      
      if (extensionToLanguage[urlExtension]) {
        setLanguage(extensionToLanguage[urlExtension]);
      }
      
      showToast("Kode berhasil dimuat dari URL!", 'success');
    } catch (err) {
      console.error("Error fetching from URL:", err);
      showToast("Gagal memuat kode dari URL: " + err.message, 'error');
    } finally {
      setFetchingFile(false);
    }
  };

  const handleCompile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOutput("");

    if (!code.trim()) {
      showToast("Harap masukkan kode untuk dikompilasi/dieksekusi.", 'warn');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/tools/compiler/v4", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, lang: language }),
      });

      const data = await response.json();

      if (response.ok) {
        setOutput(data.result || "Tidak ada output.");
        showToast("Kode berhasil dieksekusi!", 'success');
      } else {
        setError(data.error || "Terjadi kesalahan saat mengompilasi kode.");
        showToast(data.error || "Gagal mengompilasi kode.", 'error');
      }
    } catch (err) {
      console.error("Kesalahan API compiler:", err);
      setError("Tidak dapat terhubung ke server compiler.");
      showToast("Tidak dapat terhubung ke server compiler.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyOutputToClipboard = async () => {
    if (!output) {
      showToast("Tidak ada output untuk disalin.", 'info');
      return;
    }
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      showToast("Output berhasil disalin!", 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Gagal menyalin output:", err);
      showToast("Gagal menyalin output.", 'error');
    }
  };

  const clearCode = () => {
    setCode('');
    setSelectedFile(null);
    setSelectedFileName('');
    setSelectedFileType('');
    setUrl('');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white max-w-sm ${
          toast.type === 'success' ? 'bg-emerald-500' :
          toast.type === 'error' ? 'bg-red-500' :
          toast.type === 'warn' ? 'bg-yellow-500' :
          'bg-blue-500'
        }`}>
          <div className="flex items-center">
            <Icon icon={
              toast.type === 'success' ? 'ph:check-circle-duotone' :
              toast.type === 'error' ? 'ph:x-circle-duotone' :
              toast.type === 'warn' ? 'ph:warning-duotone' :
              'ph:info-duotone'
            } className="text-xl mr-2" />
            <p className="text-sm">{toast.message}</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700">
          <div className="flex items-center">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md">
              <Icon icon="ph:terminal-window-duotone" className="text-2xl" />
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                Online Code Compiler
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Kompilasi dan jalankan kode dari berbagai sumber dengan mudah
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Input Mode Selection */}
          <div className="bg-slate-50 dark:bg-slate-700/50 p-5 rounded-lg border border-slate-200 dark:border-slate-600">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center">
              <Icon icon="ph:radio-button-duotone" className="mr-2 text-lg" />
              Pilih Metode Input
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'text', icon: 'ph:code-duotone', label: 'Input Teks' },
                { key: 'url', icon: 'ph:link-duotone', label: 'URL File' },
                { key: 'file', icon: 'ph:upload-duotone', label: 'Upload File' }
              ].map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setInputMode(mode.key)}
                  disabled={loading || fetchingFile}
                  className={`p-3 rounded-md text-sm font-medium transition duration-200 flex items-center justify-center ${
                    inputMode === mode.key
                      ? 'bg-teal-500 text-white shadow-md'
                      : 'bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-500'
                  }`}
                >
                  <Icon icon={mode.icon} className="mr-2 text-lg" />
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Methods */}
          {inputMode === 'text' && (
            <div className="bg-slate-50 dark:bg-slate-700/50 p-5 rounded-lg border border-slate-200 dark:border-slate-600">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">
                  <Icon icon="ph:code-duotone" className="mr-2 text-lg" />
                  Kode Anda
                </label>
                {code && (
                  <button
                    onClick={clearCode}
                    disabled={loading}
                    className="text-xs px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-300 rounded flex items-center"
                  >
                    <Icon icon="ph:trash-duotone" className="mr-1" />
                    Hapus
                  </button>
                )}
              </div>
              <textarea
                placeholder="Tulis kode Anda di sini..."
                // Removed 'rows="15"' and added dynamic height or max-height
                className="w-full bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 text-slate-900 dark:text-slate-200 rounded-md font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm p-3 resize-y min-h-[150px] max-h-[400px]" // Added min-h and max-h for responsiveness
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              {code && (
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span className="flex items-center">
                    <Icon icon="ph:text-aa-duotone" className="mr-1" />
                    {code.length} karakter
                  </span>
                  <span className="flex items-center">
                    <Icon icon="ph:rows-duotone" className="mr-1" />
                    {code.split('\n').length} baris
                  </span>
                </div>
              )}
            </div>
          )}

          {inputMode === 'url' && (
            <div className="bg-slate-50 dark:bg-slate-700/50 p-5 rounded-lg border border-slate-200 dark:border-slate-600">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                <Icon icon="ph:link-duotone" className="mr-2 text-lg" />
                URL File Kode
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/code.js"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 text-slate-900 dark:text-slate-200 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm p-3"
                />
                <button
                  onClick={fetchFromUrl}
                  disabled={fetchingFile || !url.trim()}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium flex items-center"
                >
                  {fetchingFile ? (
                    <>
                      <Icon icon="svg-spinners:ring-resize" className="mr-1 animate-spin" />
                      Memuat...
                    </>
                  ) : (
                    <>
                      <Icon icon="ph:download-duotone" className="mr-1" />
                      Muat
                    </>
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Mendukung URL langsung ke file kode (js, py, java, cpp, dll.)
              </p>
            </div>
          )}

          {inputMode === 'file' && (
            <div className="bg-slate-50 dark:bg-slate-700/50 p-5 rounded-lg border border-slate-200 dark:border-slate-600">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                <Icon icon="ph:upload-duotone" className="mr-2 text-lg" />
                Upload File Kode
              </label>
              <input
                type="file"
                accept=".js,.py,.java,.cpp,.c,.cs,.go,.rs,.r,.php,.swift,.kt,.sh,.rb,.dart,.scala,.ts,.html,.css,.json,.xml,.txt"
                onChange={handleFileChange}
                disabled={loading}
                className="w-full bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 text-slate-900 dark:text-slate-200 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm p-3 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
              />
              {selectedFile && (
                <div className="mt-3 p-3 bg-white dark:bg-slate-600 rounded border border-slate-200 dark:border-slate-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Icon icon="ph:file-code-duotone" className="mr-2 text-slate-500" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{selectedFile.name}</span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatFileSize(selectedFile.size)}
                    </span>
                  </div>
                </div>
              )}
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Mendukung berbagai format file kode
              </p>
            </div>
          )}

          {/* Language Selection */}
          <div className="bg-slate-50 dark:bg-slate-700/50 p-5 rounded-lg border border-slate-200 dark:border-slate-600">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center">
              <Icon icon="ph:globe-hemisphere-east-duotone" className="mr-2 text-lg" />
              Pilih Bahasa
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={loading}
              className="w-full bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 text-slate-900 dark:text-slate-200 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm p-3"
            >
              {availableLanguages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Compile Button */}
          <button
            onClick={handleCompile}
            disabled={loading || !code.trim()}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-3 font-medium transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center justify-center"
          >
            {loading ? (
              <>
                <Icon icon="svg-spinners:ring-resize" className="mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Icon icon="ph:play-circle-duotone" className="mr-2 text-xl" />
                Jalankan Kode
              </>
            )}
          </button>

          {/* Error Display */}
          {error && !loading && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800 flex items-start">
              <Icon icon="ph:warning-octagon-duotone" className="text-xl mr-3 mt-0.5 flex-shrink-0" />
              <p className="whitespace-pre-wrap break-words text-sm">{error}</p>
            </div>
          )}

          {/* Info Panel */}
          <div className="flex items-start p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-100 dark:bg-teal-800 text-teal-600 dark:text-teal-300 mr-3 flex-shrink-0">
              <Icon icon="ph:info-duotone" className="text-lg" />
            </div>
            <div className="text-sm text-teal-700 dark:text-teal-300 space-y-1">
              <p>• <strong>Input Teks:</strong> Tulis kode langsung di editor</p>
              <p>• <strong>URL File:</strong> Muat kode dari URL online</p>
              <p>• <strong>Upload File:</strong> Upload file kode dari komputer</p>
              <p>• Bahasa akan otomatis terdeteksi berdasarkan file extension</p>
              <p>• Output akan ditampilkan dalam modal setelah eksekusi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Output Modal */}
      {showOutputModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center">
                <Icon icon="ph:terminal-window-duotone" className="mr-3 text-xl text-teal-500" />
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  Output Kompiler
                </h2>
              </div>
              <button
                onClick={() => setShowOutputModal(false)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <Icon icon="ph:x-duotone" className="text-xl" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-auto">
              {output ? (
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
                  <SyntaxHighlighter
                    language={syntaxMapping[language] || "plaintext"}
                    style={atomOneLight}
                    customStyle={{
                      margin: 0,
                      padding: '1rem',
                      fontSize: '0.875rem',
                      backgroundColor: 'transparent',
                    }}
                    showLineNumbers={true}
                    wrapLines={true}
                    lineNumberStyle={{ color: 'rgb(100 116 139)', fontSize: '0.75rem' }}
                  >
                    {output}
                  </SyntaxHighlighter>
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                  Tidak ada output untuk ditampilkan.
                </p>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowOutputModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
              >
                Tutup
              </button>
              <button
                onClick={copyOutputToClipboard}
                disabled={!output}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center"
              >
                <Icon icon={copied ? "ph:check-circle-duotone" : "ph:copy-duotone"} className="mr-2" />
                {copied ? "Tersalin!" : "Salin Output"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompilerPage;