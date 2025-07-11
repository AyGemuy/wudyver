"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import Card from "@/components/ui/Card";
import SimpleBar from "simplebar-react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

const ViewCodePage = () => {
  const { id } = useParams();
  const [codeSnippet, setCodeSnippet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiUrl = "/api/code-share";

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("No code ID provided in the URL.");
      return;
    }

    const fetchCodeSnippet = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${apiUrl}?id=${id}`);
        const snippet = response.data[0];
        if (snippet) {
          setCodeSnippet(snippet);
          await axios.put(apiUrl, { id: snippet._id, action: "view" });
        } else {
          setError("Code snippet not found.");
        }
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || "Failed to fetch code snippet.";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchCodeSnippet();
  }, [id]);

  const handleAction = async (action) => {
    try {
      const response = await axios.put(apiUrl, { id: codeSnippet._id, action });
      setCodeSnippet(response.data.code);
      toast.success(response.data.message);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || `Failed to ${action} code.`;
      toast.error(errorMessage);
    }
  };

  const handleCopyCode = () => {
    if (codeSnippet?.code) {
      navigator.clipboard
        .writeText(codeSnippet.code)
        .then(() => {
          toast.success("Code copied to clipboard!");
        })
        .catch((err) => {
          toast.error("Failed to copy code.");
        });
    }
  };

  const sectionCardClass =
    "bg-white dark:bg-slate-700/30 p-4 sm:p-5 rounded-lg shadow border border-slate-200 dark:border-slate-700/60";
  const sectionTitleClass =
    "text-lg font-medium text-emerald-700 dark:text-emerald-400 mb-3 flex items-center";
  const labelClass =
    "block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1";

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
              <div className="flex items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0 mr-3">
                  <Icon icon="ph:code-duotone" className="text-2xl" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-center sm:text-left bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-emerald-500">
                    Code Snippet
                  </h1>
                  <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-1">
                    Menampilkan kode yang dipilih.
                  </p>
                </div>
              </div>
              {codeSnippet && (
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-2 sm:mt-0">
                  ID: <span className="font-medium">{codeSnippet._id}</span>
                </div>
              )}
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
                      Loading code snippet...
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

                {!loading && codeSnippet && (
                  <div>
                    <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                      <div>
                        <h2 className={sectionTitleClass}>
                          <Icon icon="ph:file-duotone" className="mr-2 text-xl" />
                          {codeSnippet.title || "(Untitled Title)"}
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                          {codeSnippet.fileName || "(Untitled File)"}
                        </p>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          <p>
                            By:{" "}
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {codeSnippet.author}
                            </span>
                          </p>
                          <p>
                            Tag:{" "}
                            <span className="font-medium bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 rounded-sm">
                              {codeSnippet.tag}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 items-center">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <button
                            onClick={() => handleAction("like")}
                            className="flex items-center gap-1 text-green-500 hover:text-green-600 transition-colors"
                          >
                            <Icon icon="ph:thumbs-up-duotone" className="text-lg" />
                            {codeSnippet.likes}
                          </button>
                          <button
                            onClick={() => handleAction("dislike")}
                            className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors"
                          >
                            <Icon icon="ph:thumbs-down-duotone" className="text-lg" />
                            {codeSnippet.dislikes}
                          </button>
                          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 ml-2">
                            <Icon icon="ph:eye-duotone" className="text-lg" />
                            {codeSnippet.views}
                          </span>
                        </div>
                        <button
                          onClick={handleCopyCode}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-500 text-white hover:bg-sky-600 transition-colors text-sm font-medium"
                        >
                          <Icon icon="ph:copy-duotone" className="text-lg" />
                          Copy
                        </button>
                      </div>
                    </div>

                    <p className={`${labelClass} mt-2 mb-0`}>Code:</p>
                    <SimpleBar className="max-h-[calc(100vh-350px)]">
                      <SyntaxHighlighter
                        language={codeSnippet.tag.toLowerCase()}
                        style={atomOneDark}
                        showLineNumbers
                        wrapLines
                        customStyle={{
                          borderRadius: "0.5rem",
                          padding: "1rem",
                          fontSize: "0.875rem",
                          backgroundColor: "var(--slate-800)",
                          color: "var(--slate-100)",
                          border: "1px solid var(--slate-700)",
                        }}
                      >
                        {codeSnippet.code}
                      </SyntaxHighlighter>
                    </SimpleBar>
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

export default ViewCodePage;