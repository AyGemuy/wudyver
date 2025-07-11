"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import Card from "@/components/ui/Card";
import SimpleBar from "simplebar-react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

const ViewPastePage = () => {
  const { key } = useParams();
  const router = useRouter();
  const [paste, setPaste] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [copying, setCopying] = useState(false);

  const apiUrl = "/api/tools/paste/v1";

  useEffect(() => {
    if (!key) {
      setLoading(false);
      setError("No paste key provided in the URL.");
      return;
    }

    const fetchPaste = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${apiUrl}?action=get&key=${key}`);
        setPaste(response.data);
      } catch (err) {
        const errorMessage =
          err.response?.data?.error ||
          "Failed to fetch paste. It might not exist or has expired.";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchPaste();
  }, [key]);

  const copyToClipboard = async () => {
    if (!paste?.content) return;
    
    setCopying(true);
    try {
      await navigator.clipboard.writeText(paste.content);
      toast.success("Content copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy content");
    } finally {
      setCopying(false);
    }
  };

  const downloadRaw = () => {
    if (!paste?.content) return;
    
    const blob = new Blob([paste.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paste-${paste.key}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("File downloaded!");
  };

  const sectionCardClass =
    "bg-white dark:bg-slate-700/30 p-4 sm:p-5 rounded-lg shadow border border-slate-200 dark:border-slate-700/60";
  const sectionTitleClass =
    "text-base sm:text-lg font-medium text-emerald-700 dark:text-emerald-400 mb-3 flex items-center";
  const labelClass = "block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1";

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="colored"
        toastClassName={(o) =>
          `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${
            o?.type === "success"
              ? "bg-emerald-500 text-white"
              : o?.type === "error"
              ? "bg-red-500 text-white"
              : o?.type === "warning"
              ? "bg-yellow-500 text-white"
              : "bg-sky-500 text-white"
          } text-sm p-3 m-2 rounded-lg shadow-md`
        }
      />
      <div className="w-full px-2 sm:px-4 py-6">
        <Card
          bodyClass="relative p-0 h-full overflow-hidden"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        >
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-center justify-between">
              <div className="flex items-center mb-2 sm:mb-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mr-3">
                  <Icon icon="ph:clipboard-text-duotone" className="text-2xl" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-center sm:text-left bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-emerald-500">
                    View Paste
                  </h1>
                  <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-1">
                    Menampilkan konten paste yang dipilih.
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors duration-200"
              >
                <Icon icon="ph:arrow-left-duotone" />
                Back
              </button>
            </div>
          </div>

          <SimpleBar className="flex-grow overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-6">
              <div className={sectionCardClass}>
                {loading && (
                  <div className="text-center py-10">
                    <Icon
                      icon="svg-spinners:blocks-shuffle-3"
                      className="text-4xl text-emerald-500 mb-2 mx-auto"
                    />
                    <p className="text-slate-500 dark:text-slate-400">
                      Loading paste content...
                    </p>
                  </div>
                )}

                {error && !loading && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700/50 rounded-md text-center">
                    <Icon
                      icon="ph:x-circle-duotone"
                      className="text-2xl text-red-500 mx-auto mb-1"
                    />
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Error: {error}
                    </p>
                  </div>
                )}

                {!loading && paste && (
                  <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                      <h2 className={sectionTitleClass}>
                        <Icon icon="ph:file-text-duotone" className="mr-2 text-xl" />
                        {paste.title || "(Untitled Paste)"}
                      </h2>
                      
                      <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <button
                          onClick={() => setShowRaw(!showRaw)}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors duration-200 ${
                            showRaw 
                              ? 'bg-emerald-500 text-white' 
                              : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <Icon icon="ph:code-duotone" />
                          {showRaw ? 'Syntax' : 'Raw'}
                        </button>
                        <button
                          onClick={copyToClipboard}
                          disabled={copying}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors duration-200"
                        >
                          <Icon icon={copying ? "svg-spinners:ring-resize" : "ph:copy-duotone"} />
                          {copying ? 'Copying...' : 'Copy'}
                        </button>
                        <button
                          onClick={downloadRaw}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200"
                        >
                          <Icon icon="ph:download-duotone" />
                          Download
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 mb-3">
                      <p>
                        <strong>Key:</strong>{" "}
                        <code className="bg-slate-200 dark:bg-slate-600 px-1 rounded text-sky-700 dark:text-sky-300">
                          {paste.key}
                        </code>
                      </p>
                      <p>
                        <strong>Syntax:</strong> {paste.syntax}
                      </p>
                      {paste.expiresAt && (
                        <p>
                          <strong>Expires:</strong>{" "}
                          {new Date(paste.expiresAt).toLocaleString()}
                        </p>
                      )}
                      <p>
                        <strong>Created:</strong>{" "}
                        {new Date(paste.createdAt).toLocaleString()}
                      </p>
                      <p>
                        <strong>Last Updated:</strong>{" "}
                        {new Date(paste.updatedAt).toLocaleString()}
                      </p>
                    </div>

                    <p className={`${labelClass} mt-2 mb-0`}>Content:</p>
                    <SimpleBar className="max-h-[calc(100vh-350px)]">
                      {showRaw ? (
                        <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg border border-slate-700 text-sm whitespace-pre-wrap overflow-auto">
                          {paste.content}
                        </pre>
                      ) : (
                        <SyntaxHighlighter
                          language={paste.syntax === "text" ? "plaintext" : paste.syntax}
                          style={atomOneDark}
                          showLineNumbers
                          wrapLines
                          customStyle={{
                            borderRadius: "0.5rem",
                            padding: "1rem",
                            fontSize: "0.875rem",
                            backgroundColor: 'var(--slate-800)',
                            color: 'var(--slate-100)',
                            border: '1px solid var(--slate-700)',
                          }}
                        >
                          {paste.content}
                        </SyntaxHighlighter>
                      )}
                    </SimpleBar>

                    <div className="mt-4 text-sm text-center text-slate-500 dark:text-slate-400">
                      <a
                        href={`${apiUrl}?action=get&key=${paste.key}&raw=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 flex items-center justify-center gap-1 transition-colors duration-200"
                      >
                        <Icon icon="ph:arrow-square-out-duotone" />
                        View Raw Content in New Tab
                      </a>
                    </div>
                  </div>
                )}

                {!loading && !paste && !error && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700/50 rounded-md text-center">
                    <Icon
                      icon="ph:info-duotone"
                      className="text-2xl text-yellow-500 mx-auto mb-1"
                    />
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      No paste found for key "{key}".
                    </p>
                  </div>
                )}
              </div>
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default ViewPastePage;