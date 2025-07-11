"use client";

import { useEffect, useState, Fragment } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Icon } from "@iconify/react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark, atomOneLight } from "react-syntax-highlighter/dist/cjs/styles/hljs";
import { toast, ToastContainer } from "react-toastify";
import SimpleBar from "simplebar-react";

const GITHUB_USER = "AyGemuy";
const GITHUB_REPO = "wudyver";
const GITHUB_BRANCH = "master";

const GITHUB_API_BASE_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/`;
const GITHUB_RAW_BASE_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/`;
const GITHUB_BLOB_BASE_URL = `https://github.com/${GITHUB_USER}/${GITHUB_REPO}/blob/${GITHUB_BRANCH}/`;

const ITEMS_PER_PAGE = 15;

const GitHubFileScraperPage = ({ initialPath = "pages/api" }) => {
  const [fileList, setFileList] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentBrowsePath, setCurrentBrowsePath] = useState(initialPath);
  const [pathHistory, setPathHistory] = useState([initialPath]);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState(null);
  const [copiedRawCode, setCopiedRawCode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewContent, setPreviewContent] = useState({ content: "", language: "plaintext", name: "" });

  const fetchFilesFromPath = async (path) => {
    setLoadingList(true);
    setError(null);
    setFileList([]);
    setCurrentPage(1);

    try {
      const res = await fetch(`${GITHUB_API_BASE_URL}${path}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`GitHub API Error (${res.status}): ${errorData.message || 'Gagal mengambil daftar file.'}`);
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("Format respons API GitHub tidak valid.");
      }

      const processedFiles = data.map(item => ({
        ...item,
        raw_url: `${GITHUB_RAW_BASE_URL}${item.path}`,
        github_link: item.type === 'file' ? `${GITHUB_BLOB_BASE_URL}${item.path}` : `https://github.com/${GITHUB_USER}/${GITHUB_REPO}/tree/${GITHUB_BRANCH}/${item.path}`
      })).sort((a,b) => {
        if (a.type === 'dir' && b.type !== 'dir') return -1;
        if (a.type !== 'dir' && b.type === 'dir') return 1;
        return a.name.localeCompare(b.name);
      });

      setFileList(processedFiles);
      setCurrentBrowsePath(path);

    } catch (err) {
      console.error("Gagal mengambil/memproses daftar file:", err);
      setError(err.message);
      toast.error(`Error memuat daftar file: ${err.message.substring(0, 100)}`);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchFilesFromPath(currentBrowsePath);
  }, [currentBrowsePath]);

  const handleFileOrDirClick = async (item) => {
    if (item.type === "dir") {
      setPathHistory(prev => [...prev, item.path]);
      setCurrentBrowsePath(item.path);
      setSearchTerm("");
    } else if (item.type === "file") {
      setSelectedFile({ name: item.name, path: item.path, raw_url: item.raw_url, size: item.size, github_link: item.github_link, content: null, language: null });
      setCopiedRawCode(false);
      setLoadingContent(true);
      setShowPreviewModal(true);
      setPreviewContent({ content: "Memuat konten...", language: "text", name: item.name });

      try {
        const res = await fetch(item.raw_url);
        if (!res.ok) {
          throw new Error(`Gagal mengambil konten file (${res.status})`);
        }
        const textContent = await res.text();
        const language = getLanguageFromFileName(item.name);

        setSelectedFile(prev => ({ ...prev, content: textContent, language }));
        setPreviewContent({ content: textContent, language, name: item.name });

      } catch (err) {
        console.error("Gagal memuat konten file:", err);
        const errorMsg = `Error memuat konten ${item.name}: ${err.message}`;
        toast.error(errorMsg);
        setSelectedFile(prev => ({ ...prev, content: errorMsg, language: 'text' }));
        setPreviewContent({ content: errorMsg, language: 'text', name: item.name });
      } finally {
        setLoadingContent(false);
      }
    }
  };

  const getLanguageFromFileName = (fileName) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const langMap = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      json: 'json', html: 'html', htm: 'html', css: 'css', scss: 'scss', less: 'less',
      py: 'python', rb: 'ruby', java: 'java', cs: 'csharp', cpp: 'cpp', c: 'c',
      php: 'php', go: 'go', rs: 'rust', swift: 'swift', kt: 'kotlin',
      md: 'markdown', yaml: 'yaml', yml: 'yaml', xml: 'xml', sh: 'shell',
      log: 'text', txt: 'plaintext', ini: 'ini', properties: 'properties',
      java: 'java',
      dart: 'dart',
      vue: 'vue',
      svelte: 'svelte',
      sql: 'sql'
    };
    return langMap[extension] || 'plaintext';
  };

  const copyRawCodeToClipboard = () => {
    if (previewContent.content && !previewContent.content.startsWith("Error") && !previewContent.content.startsWith("Memuat")) {
      navigator.clipboard.writeText(previewContent.content)
        .then(() => {
          setCopiedRawCode(true);
          toast.success("Kode raw disalin!");
          setTimeout(() => setCopiedRawCode(false), 2000);
        })
        .catch(err => {
          toast.error("Gagal menyalin kode raw.");
          console.error("Gagal menyalin:", err);
        });
    } else {
      toast.warn("Tidak ada konten valid untuk disalin.");
    }
  };

  const downloadRawFile = () => {
    if (selectedFile && selectedFile.raw_url && previewContent.content && !previewContent.content.startsWith("Error") && !previewContent.content.startsWith("Memuat")) {
        fetch(selectedFile.raw_url)
          .then(response => response.blob())
          .then(blob => {
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.style.display = 'none';
              a.href = url;
              a.download = selectedFile.name;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              a.remove();
              toast.success(`Mengunduh ${selectedFile.name}...`);
          })
          .catch(err => {
              toast.error(`Gagal mengunduh file: ${err.message}`);
              console.error("Gagal mengunduh:", err);
          });
    } else {
        toast.warn("Tidak ada file valid untuk diunduh.");
    }
  };

  const filteredFiles = fileList.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedFiles = filteredFiles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil(filteredFiles.length / ITEMS_PER_PAGE);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleGoBack = () => {
    if (pathHistory.length > 1) {
      const newPathHistory = [...pathHistory];
      newPathHistory.pop();
      const previousPath = newPathHistory[newPathHistory.length - 1];
      setPathHistory(newPathHistory);
      setCurrentBrowsePath(previousPath);
      setSearchTerm("");
    }
  };

  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);
    const handler = (e) => setIsDarkMode(e.matches);
    darkModeMediaQuery.addEventListener('change', handler);
    return () => darkModeMediaQuery.removeEventListener('change', handler);
  }, []);
  const syntaxHighlighterTheme = isDarkMode ? atomOneDark : atomOneLight;

  const inputBaseClass = "w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md shadow-sm text-sm px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const buttonSecondaryClass = "bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-3 py-1.5 rounded-md dark:bg-slate-600/80 dark:hover:bg-slate-600 dark:text-slate-200 transition-colors duration-150 disabled:opacity-50";

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  return (
    <div className="w-full px-2 sm:px-4 py-6">
      <ToastContainer position="top-right" autoClose={3000} newestOnTop theme="colored"
        toastClassName={(o) => `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : o?.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-teal-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`}/>
      
      <Card
        bodyClass="relative p-0 h-full overflow-hidden flex flex-col"
        className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
      >
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
          <div className="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-3">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mr-3 sm:mr-4 shrink-0">
                <Icon icon="ph:folder-open-duotone" className="text-xl sm:text-2xl" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
                GitHub File Explorer
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 sm:mt-0 sm:ml-4">
              Jelajahi repositori GitHub dengan mudah.
            </p>
          </div>

          {pathHistory.length > 1 && (
            <Button
              onClick={handleGoBack}
              text="Kembali"
              icon="ph:arrow-left-duotone"
              className={`${buttonSecondaryClass} mt-3 sm:mt-4 mx-auto sm:mx-0 self-start sm:self-center`}
              iconClassName="mr-1"
            />
          )}

          <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400 text-center sm:text-left sm:ml-16">
            Path: <code className="bg-slate-100 dark:bg-slate-700 p-1 rounded text-teal-600 dark:text-teal-300 break-all">{currentBrowsePath || "/"}</code>
          </div>
        </div>

        {loadingList && !error && ( <div className="flex flex-col items-center justify-center p-10 min-h-[250px] sm:min-h-[300px]"><Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl sm:text-5xl text-teal-500 mb-4" /><p className="text-base sm:text-lg font-medium text-slate-600 dark:text-slate-300">Memuat Daftar...</p></div>)}
        {error && !loadingList && (<div className="flex flex-col items-center justify-center p-6 sm:p-10 min-h-[250px] sm:min-h-[300px] bg-red-50 dark:bg-red-900/20 rounded-b-xl"><Icon icon="ph:warning-octagon-duotone" className="text-4xl sm:text-5xl text-red-500 mb-4" /><p className="text-base sm:text-lg font-semibold text-red-700 dark:text-red-300">Gagal Memuat</p><p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-2 text-center max-w-md sm:max-w-xl">{error}</p></div>)}

        {!loadingList && !error && (
          <div className="flex-grow md:flex md:min-h-0">
            <div className="w-full md:w-2/5 lg:w-1/3 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700/60 flex flex-col">
              <div className="p-4 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700/60">
                <label htmlFor="githubSearch" className="block text-sm font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                  <Icon icon="ph:magnifying-glass-duotone" className="mr-2 text-lg" />
                  Cari File/Folder
                </label>
                <input
                  id="githubSearch"
                  type="text"
                  placeholder="Ketik untuk mencari..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className={inputBaseClass}
                />
              </div>
              <SimpleBar className="flex-grow h-64 md:h-auto md:max-h-[calc(100%-140px)]">
                <div className="p-2 sm:p-3 space-y-0.5">
                  {paginatedFiles.length > 0 ? paginatedFiles.map((item) => (
                    <button
                      key={item.sha || item.name}
                      onClick={() => handleFileOrDirClick(item)}
                      title={`Nama: ${item.name}\nTipe: ${item.type}${item.type === 'file' && item.size ? `\nUkuran: ${formatFileSize(item.size)}` : ''}`}
                      className={`w-full text-left flex items-center px-2 py-1.5 sm:px-2.5 sm:py-2 my-0.5 rounded-md hover:bg-teal-50 dark:hover:bg-teal-700/30 transition-colors duration-150 group ${selectedFile?.path === item.path && item.type === 'file' ? "bg-teal-100 dark:bg-teal-600/40 ring-1 ring-teal-400 dark:ring-teal-500" : ""}`}
                    >
                      <Icon
                        icon={item.type === 'dir' ? "ph:folder-notch-open-duotone" : (getLanguageFromFileName(item.name) === 'javascript' || item.name.match(/\.(js|jsx|ts|tsx)$/i) ? "ph:file-js-duotone" : getLanguageFromFileName(item.name) === 'json' ? "ph:file-json-duotone" : getLanguageFromFileName(item.name) === 'html' || getLanguageFromFileName(item.name) === 'xml' || getLanguageFromFileName(item.name) === 'css' ? "ph:file-code-duotone" : item.name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i) ? "ph:file-image-duotone" : "ph:file-duotone")}
                        className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-2.5 flex-shrink-0 ${
                            item.type === 'dir' ? "text-yellow-500 dark:text-yellow-400" :
                            (selectedFile?.path === item.path ? "text-teal-600 dark:text-teal-300" : "text-slate-400 dark:text-slate-500 group-hover:text-teal-500 dark:group-hover:text-teal-400")
                        }`}
                      />
                      <span className={`truncate text-xs sm:text-sm ${selectedFile?.path === item.path && item.type === 'file' ? "text-teal-700 dark:text-teal-200 font-medium" : "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100"}`}>
                        {item.name}
                      </span>
                      {item.type === 'file' && typeof item.size === 'number' && (
                        <span className="ml-auto text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 pl-2 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                          {formatFileSize(item.size)}
                        </span>
                      )}
                    </button>
                  )) : (
                    <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                      <Icon icon="ph:files-thin" className="mx-auto text-3xl sm:text-4xl opacity-70 mb-2"/>
                      <p className="text-xs sm:text-sm">{searchTerm ? "Tidak ada yang cocok." : "Folder kosong atau tidak ditemukan."}</p>
                    </div>
                  )}
                </div>
              </SimpleBar>
              {totalPages > 1 && (
                <div className="p-2.5 sm:p-3 border-t border-slate-200 dark:border-slate-700/60 flex flex-col items-center gap-2 sm:flex-row sm:justify-between text-xs bg-slate-100/70 dark:bg-slate-800/40">
                  <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} text="Sebelumnya" icon="ph:caret-left-bold" className={`${buttonSecondaryClass} w-full sm:w-auto px-2.5 py-1 text-[11px] sm:text-xs`} />
                  <span className="text-slate-600 dark:text-slate-300">Hal {currentPage} dari {totalPages}</span>
                  <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} text="Berikutnya" icon="ph:caret-right-bold" iconPosition="right" className={`${buttonSecondaryClass} w-full sm:w-auto px-2.5 py-1 text-[11px] sm:text-xs`} />
                </div>
              )}
            </div>

            <div className="hidden md:flex md:w-3/5 lg:w-2/3 bg-slate-50 dark:bg-slate-800/30 items-center justify-center p-6 rounded-br-xl md:rounded-bl-none flex-grow">
              <div className="text-center text-slate-500 dark:text-slate-400">
                <Icon icon="ph:code-block-thin" className="text-6xl sm:text-7xl mb-4 opacity-60" />
                <p className="text-base sm:text-lg">Pilih file untuk preview.</p>
                <p className="text-xs sm:text-sm mt-1">Konten file akan ditampilkan dalam modal.</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {showPreviewModal && selectedFile && (
        <Modal
          title={
            <div className="flex items-center min-w-0">
              <Icon
                icon={
                    getLanguageFromFileName(previewContent.name) === 'javascript' ? "ph:file-js-duotone" :
                    getLanguageFromFileName(previewContent.name) === 'typescript' ? "ph:file-ts-duotone" :
                    getLanguageFromFileName(previewContent.name) === 'json' ? "ph:file-json-duotone" :
                    getLanguageFromFileName(previewContent.name) === 'html' || getLanguageFromFileName(previewContent.name) === 'xml' ? "ph:file-code-duotone" :
                    getLanguageFromFileName(previewContent.name) === 'css' || getLanguageFromFileName(previewContent.name) === 'scss' || getLanguageFromFileName(previewContent.name) === 'less' ? "ph:file-css-duotone" :
                    getLanguageFromFileName(previewContent.name) === 'markdown' ? "ph:markdown-logo-duotone" :
                    getLanguageFromFileName(previewContent.name) === 'python' ? "ph:file-py-duotone" :
                    "ph:file-text-duotone"
                }
                className="mr-2 text-teal-500 text-lg sm:text-xl shrink-0"
              />
              <span className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100 truncate" title={previewContent.name}>
                {previewContent.name}
              </span>
            </div>
          }
          activeModal={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          className="max-w-xl md:max-w-2xl lg:max-w-3xl"
          footerContent={
            <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-2 sm:gap-3 p-2">
                <a href={selectedFile.github_link} target="_blank" rel="noopener noreferrer" className={`${buttonSecondaryClass} inline-flex items-center text-[11px] sm:text-xs px-2 py-1 w-full sm:w-auto justify-center`} title="Lihat di GitHub">
                    <Icon icon="ph:github-logo-fill" className="mr-1 text-sm sm:text-base"/> Lihat di GitHub
                </a>
                <div className="flex w-full sm:w-auto gap-2">
                    <Button text="Tutup" onClick={() => setShowPreviewModal(false)} className={`${buttonSecondaryClass} flex-1 sm:flex-none px-3 py-1.5`} />
                    <Button onClick={copyRawCodeToClipboard} className={`${copiedRawCode ? 'bg-green-500 hover:bg-green-600' : 'bg-teal-500 hover:bg-teal-600'} text-white text-[11px] sm:text-xs py-1.5 px-3 rounded-md shadow transition-colors flex-1 sm:flex-none`} disabled={loadingContent || previewContent.content.startsWith("Error") || previewContent.content.startsWith("Memuat")}>
                        <Icon icon={copiedRawCode ? "ph:check-circle-duotone" : "ph:copy-duotone"} className="mr-1 text-xs sm:text-sm" />
                        {copiedRawCode ? "Disalin" : "Salin"}
                    </Button>
                    <Button onClick={downloadRawFile} className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] sm:text-xs py-1.5 px-3 rounded-md shadow transition-colors flex-1 sm:flex-none" disabled={loadingContent || previewContent.content.startsWith("Error") || previewContent.content.startsWith("Memuat")}>
                        <Icon icon="ph:download-simple-duotone" className="mr-1 text-xs sm:text-sm"/>
                        Unduh
                    </Button>
                </div>
            </div>
          }
        >
          <SimpleBar style={{ maxHeight: 'calc(80vh - 120px)' }} className="p-0.5">
            {loadingContent && (
              <div className="flex items-center justify-center p-8 sm:p-10 text-slate-600 dark:text-slate-400 min-h-[150px] sm:min-h-[200px]">
                <Icon icon="svg-spinners:ring-resize" className="text-2xl sm:text-3xl mr-2 sm:mr-3" /> Memuat konten...
              </div>
            )}
            {!loadingContent && previewContent.content && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-md overflow-hidden text-[11px] sm:text-[13px]">
                <SyntaxHighlighter
                  language={previewContent.language}
                  style={syntaxHighlighterTheme}
                  customStyle={{ margin: 0, padding: '0.75rem 1rem', borderRadius: '0px', fontSize: 'inherit' }}
                  showLineNumbers
                  wrapLines={true}
                  lineNumberStyle={{ color: '#9ca3af', fontSize: '0.7rem', userSelect: 'none', marginRight: '0.75em' }}
                  className="simple-scrollbar max-h-[calc(80vh - 160px)]"
                >
                  {previewContent.content}
                </SyntaxHighlighter>
              </div>
            )}
          </SimpleBar>
        </Modal>
      )}
    </div>
  );
};

export default GitHubFileScraperPage;