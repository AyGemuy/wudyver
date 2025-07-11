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
import { v4 as uuidv4 } from 'uuid';

const GITHUB_USER = "AyGemuy";
const GITHUB_REPO = "wudyver";
const GITHUB_BRANCH = "master";

const GITHUB_API_BASE_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/`;
// const GITHUB_RAW_BASE_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/`; // Tidak digunakan di page ini
const GITHUB_BLOB_BASE_URL = `https://github.com/${GITHUB_USER}/${GITHUB_REPO}/blob/${GITHUB_BRANCH}/`;


const ITEMS_PER_PAGE = 15;

const transformToApiPath = (filePath) => {
  if (!filePath) return "";
  let apiPath = filePath
    .replace(/^pages\//, "/")
    .replace(/\.(js|ts|jsx|tsx)$/, "");

  if (apiPath.endsWith("/index")) {
    apiPath = apiPath.substring(0, apiPath.length - "/index".length);
  }
  return apiPath === "" ? "/" : apiPath;
};


const ApiTesterPage = ({ initialPath = "pages/api" }) => {
  const [fileList, setFileList] = useState([]);
  const [selectedApiFile, setSelectedApiFile] = useState(null);
  const [currentBrowsePath, setCurrentBrowsePath] = useState(initialPath);
  const [pathHistory, setPathHistory] = useState([initialPath]);

  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [showApiTryOutModal, setShowApiTryOutModal] = useState(false);
  const [apiPathToTest, setApiPathToTest] = useState("");
  const [apiRequestMethod, setApiRequestMethod] = useState("GET");
  const [apiQueryParams, setApiQueryParams] = useState([{ id: uuidv4(), key: "", value: "" }]);
  const [apiRequestBody, setApiRequestBody] = useState("{\n  \"key\": \"value\"\n}");

  const [apiResponse, setApiResponse] = useState(null);
  const [apiResponseContentType, setApiResponseContentType] = useState(null);
  const [apiResponseStatus, setApiResponseStatus] = useState(null);
  const [apiResponseHeaders, setApiResponseHeaders] = useState(null);
  const [objectUrl, setObjectUrl] = useState(null);

  const [loadingApiResponse, setLoadingApiResponse] = useState(false);
  const [generatedCurlCommand, setGeneratedCurlCommand] = useState("");

  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);
    const handler = (e) => setIsDarkMode(e.matches);
    darkModeMediaQuery.addEventListener('change', handler);
    return () => darkModeMediaQuery.removeEventListener('change', handler);
  }, []);


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
      toast.error(`Error memuat daftar file: ${err.message}`);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchFilesFromPath(currentBrowsePath);
  }, [currentBrowsePath]);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
      }
    };
  }, [objectUrl]);


  const handleFileOrDirClick = async (item) => {
    if (item.type === "dir") {
      setPathHistory(prev => [...prev, item.path]);
      setCurrentBrowsePath(item.path);
      setSelectedApiFile(null); // Reset selected file when navigating to a directory
      setSearchTerm(""); // Clear search term when navigating directories
    } else if (item.type === "file") {
      // Only proceed if it's a file type that can be an API endpoint (e.g., js, ts)
      const fileExtension = item.name.split('.').pop()?.toLowerCase();
      if (!['js', 'ts', 'jsx', 'tsx'].includes(fileExtension)) {
          toast.info(`File '${item.name}' bukan tipe file API yang didukung (js, ts, jsx, tsx).`);
          // Optionally, don't select it or don't open the modal
          // setSelectedApiFile(null);
          return;
      }

      setSelectedApiFile(item);
      const actualApiPath = transformToApiPath(item.path);
      setApiPathToTest(actualApiPath);

      setApiRequestMethod("GET");
      setApiQueryParams([{ id: uuidv4(), key: "", value: "" }]);
      setApiRequestBody("{\n  \"key\": \"value\"\n}");
      setApiResponse(null);
      setApiResponseContentType(null);
      setApiResponseStatus(null);
      setApiResponseHeaders(null);
      setGeneratedCurlCommand("");
      setLoadingApiResponse(false);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);

      setShowApiTryOutModal(true);
    }
  };

  // getLanguageFromFileName is not directly used for list icons here, but kept for SyntaxHighlighter in modal
  const getLanguageFromFileName = (fileName) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const langMap = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      json: 'json', html: 'html', htm: 'html', css: 'css', scss: 'scss', less: 'less',
      py: 'python', rb: 'ruby', java: 'java', cs: 'csharp', cpp: 'cpp', c: 'c',
      php: 'php', go: 'go', rs: 'rust', swift: 'swift', kt: 'kotlin',
      md: 'markdown', yaml: 'yaml', yml: 'yaml', xml: 'xml', sh: 'shell',
      log: 'text'
    };
    return langMap[extension] || 'plaintext';
  };

  const handleAddQueryParam = () => {
    setApiQueryParams([...apiQueryParams, { id: uuidv4(), key: "", value: "" }]);
  };

  const handleRemoveQueryParam = (id) => {
    setApiQueryParams(apiQueryParams.filter(p => p.id !== id));
  };

  const handleQueryParamChange = (id, field, value) => {
    setApiQueryParams(apiQueryParams.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const constructApiUrl = () => {
    let url = apiPathToTest;
    if (apiRequestMethod === "GET" && apiQueryParams.some(p => p.key)) {
      const params = new URLSearchParams();
      apiQueryParams.filter(p => p.key).forEach(p => params.append(p.key, p.value));
      url += `?${params.toString()}`;
    }
    return url;
  };

  const generateCurl = () => {
    let curl = `curl -X ${apiRequestMethod} "${window.location.origin}${constructApiUrl()}"`;

    if (apiRequestMethod === "POST" || apiRequestMethod === "PUT" || apiRequestMethod === "PATCH") {
      curl += ` \\\n  -H "Content-Type: application/json"`;
      const escapedBody = apiRequestBody.replace(/'/g, "'\\''"); // More robust escaping for single quotes
      curl += ` \\\n  -d '${escapedBody}'`;
    }
    setGeneratedCurlCommand(curl);
  };

  useEffect(() => {
    if(showApiTryOutModal) {
        generateCurl();
    }
  }, [apiPathToTest, apiRequestMethod, apiQueryParams, apiRequestBody, showApiTryOutModal]);


  const handleSendApiRequest = async () => {
    setLoadingApiResponse(true);
    setApiResponse(null);
    setApiResponseContentType(null);
    setApiResponseStatus(null);
    setApiResponseHeaders(null);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(null);
    setCopiedResponse(false);

    const url = constructApiUrl();
    const options = {
      method: apiRequestMethod,
      headers: {},
    };

    if (apiRequestMethod === "POST" || apiRequestMethod === "PUT" || apiRequestMethod === "PATCH") {
      options.headers["Content-Type"] = "application/json";
      try {
        JSON.parse(apiRequestBody); // Validate JSON
        options.body = apiRequestBody;
      } catch (e) {
        toast.error("JSON body tidak valid.");
        setLoadingApiResponse(false);
        return;
      }
    }

    try {
      const res = await fetch(url, options);
      setApiResponseStatus(res.status);

      const headers = {};
      res.headers.forEach((value, key) => {
        headers[key] = value;
      });
      setApiResponseHeaders(headers);

      const contentType = res.headers.get("content-type");
      setApiResponseContentType(contentType);

      if (contentType) {
        if (contentType.includes("application/json")) {
          const jsonData = await res.json();
          setApiResponse(jsonData);
        } else if (contentType.startsWith("text/")) {
          const textData = await res.text();
          setApiResponse(textData);
        } else if (contentType.startsWith("image/") || contentType.startsWith("video/") || contentType.startsWith("audio/") || contentType === "application/pdf" || contentType === "application/octet-stream") {
          const blobData = await res.blob();
          setApiResponse(blobData);
          const newObjectUrl = URL.createObjectURL(blobData);
          setObjectUrl(newObjectUrl);
        } else {
          // Fallback for other content types to display as text if possible
          const textData = await res.text(); // Attempt to read as text
          setApiResponse(textData);
          toast.warn(`Tipe konten tidak sepenuhnya didukung untuk preview: ${contentType}. Ditampilkan sebagai teks.`);
        }
      } else { // No content-type header
        const textData = await res.text(); // Attempt to read as text
        setApiResponse(textData);
        if (textData) { // If there's some text content
            toast.info("Respons tidak memiliki header Content-Type. Ditampilkan sebagai teks.");
        } else if (res.status !== 204 ) { // If no text and not a 204 No Content
            toast.warn("Respons kosong dan tidak memiliki header Content-Type.");
        }
        // For 204 No Content, apiResponse remains null, which is handled by renderApiResponse
      }
    } catch (err) {
      console.error("API request error:", err);
      toast.error(`API Request Error: ${err.message}`);
      setApiResponse({ error: err.message }); // Show error in response area
      setApiResponseContentType("application/json"); // Assume error object is JSON-like
    } finally {
      setLoadingApiResponse(false);
      generateCurl(); // Re-generate cURL in case something changed or for initial display
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        if (type === 'curl') {
          setCopiedCurl(true);
          toast.success("cURL command disalin!");
          setTimeout(() => setCopiedCurl(false), 2000);
        } else if (type === 'response') {
          setCopiedResponse(true);
          toast.success("Respons disalin!");
          setTimeout(() => setCopiedResponse(false), 2000);
        }
      })
      .catch(err => {
        toast.error(`Gagal menyalin ${type}.`);
        console.error("Gagal menyalin:", err);
      });
  };

  const handleCopyCurl = () => {
    if (generatedCurlCommand) {
      copyToClipboard(generatedCurlCommand, 'curl');
    }
  };

  const handleCopyResponse = () => {
    if (apiResponse === null && apiResponseStatus !== 204) { // Check for 204 as well
        toast.warn("Tidak ada respons untuk disalin.");
        return;
    }
    if (apiResponseStatus === 204) {
        toast.info("Respons adalah 204 No Content, tidak ada body untuk disalin.");
        return;
    }
    let responseToCopy;
    if (apiResponse instanceof Blob) {
        toast.info("Menyalin konten media sebagai teks tidak didukung. Anda bisa mengunduhnya.");
        return;
    } else if (typeof apiResponse === 'object') {
        responseToCopy = JSON.stringify(apiResponse, null, 2);
    } else {
        responseToCopy = String(apiResponse);
    }
    copyToClipboard(responseToCopy, 'response');
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
      setSelectedApiFile(null);
      setSearchTerm(""); // Clear search term when going back
    }
  };

  const syntaxHighlighterTheme = isDarkMode ? atomOneDark : atomOneLight;
  const inputBaseClass = "w-full bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-md shadow-sm text-sm px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const buttonSecondaryClass = "bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-3 py-1.5 rounded-md dark:bg-slate-600/80 dark:hover:bg-slate-600 dark:text-slate-200 transition-colors duration-150 disabled:opacity-50";
  const buttonPrimaryClass = "bg-teal-500 hover:bg-teal-600 text-white text-xs py-1.5 px-3 rounded-md shadow transition-colors disabled:opacity-50";

  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  const renderApiResponse = () => {
    if (loadingApiResponse) {
      return (
        <div className="flex items-center justify-center p-10 text-slate-600 dark:text-slate-400 min-h-[150px]">
          <Icon icon="svg-spinners:ring-resize" className="text-3xl mr-3 text-teal-500" /> Mengirim request...
        </div>
      );
    }
    if (apiResponseStatus === 204) return <p className="text-slate-500 dark:text-slate-400 p-4 text-sm">Respons diterima: 204 No Content.</p>;
    if (!apiResponse && !apiResponseContentType) return <p className="text-slate-500 dark:text-slate-400 p-4 text-sm">Belum ada respons.</p>;


    if (apiResponse instanceof Blob) {
        const blobType = apiResponseContentType || apiResponse.type; // Prefer header contentType
        if (objectUrl) { // Ensure objectUrl is created
            if (blobType.startsWith("image/")) {
                return <img src={objectUrl} alt="API Response" className="max-w-full h-auto rounded p-2"/>;
            } else if (blobType.startsWith("video/")) {
                return <video src={objectUrl} controls className="max-w-full rounded p-2"/>;
            } else if (blobType.startsWith("audio/")) {
                return <audio src={objectUrl} controls className="w-full p-2"/>;
            } else if (blobType === "application/pdf") {
                return (
                    <div className="p-4">
                        <a href={objectUrl} download={selectedApiFile?.name?.replace(/\.[^/.]+$/, '.pdf') || "download.pdf"} className={`${buttonPrimaryClass} inline-flex items-center`}>
                            <Icon icon="ph:file-pdf-duotone" className="inline mr-1 text-base"/> Download PDF ({formatFileSize(apiResponse.size)})
                        </a>
                        <iframe src={objectUrl} className="w-full h-64 mt-2 border-slate-300 dark:border-slate-600" title="PDF Preview"></iframe>
                        <p className="text-xs text-slate-400 mt-2">Preview PDF mungkin terbatas. Unduh untuk tampilan penuh.</p>
                    </div>
                );
            } else { // Other blob types
                return (
                    <div className="p-4">
                        <a href={objectUrl} download={selectedApiFile?.name || "downloaded_file"} className={`${buttonPrimaryClass} inline-flex items-center`}>
                            <Icon icon="ph:download-simple-duotone" className="inline mr-1 text-base"/> Download File ({formatFileSize(apiResponse.size)})
                        </a>
                        <p className="text-xs text-slate-400 mt-2">Tipe file: {blobType}</p>
                    </div>
                );
            }
        } else {
               return <p className="text-slate-500 dark:text-slate-400 p-4 text-sm">Memproses preview media...</p>;
        }
    }

    if (apiResponseContentType && apiResponseContentType.includes("application/json")) {
      return (
        <SyntaxHighlighter
          language="json"
          style={syntaxHighlighterTheme}
          customStyle={{ margin: 0, padding: '0.75rem 1rem', borderRadius: '0px', maxHeight: '40vh', fontSize: '13px' }}
          showLineNumbers
          wrapLines={true}
          lineNumberStyle={{ color: '#9ca3af', fontSize: '0.7rem', userSelect: 'none', marginRight: '0.75em' }}
          className="simple-scrollbar"
        >
          {typeof apiResponse === 'string' ? apiResponse : JSON.stringify(apiResponse, null, 2)}
        </SyntaxHighlighter>
      );
    }

    if (apiResponseContentType && apiResponseContentType.startsWith("text/")) {
      return (
        <pre className="whitespace-pre-wrap p-3 sm:p-4 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/50 rounded-none max-h-[40vh] overflow-y-auto simple-scrollbar">
          {String(apiResponse)}
        </pre>
      );
    }
    
    // Fallback for unknown or missing content type with some response body
    if (apiResponse) {
        return (
            <pre className="whitespace-pre-wrap p-3 sm:p-4 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/50 rounded-none max-h-[40vh] overflow-y-auto simple-scrollbar">
                {typeof apiResponse === 'object' ? JSON.stringify(apiResponse, null, 2) : String(apiResponse)}
            </pre>
        );
    }

    return <p className="text-slate-500 dark:text-slate-400 p-4 text-sm">Format respons tidak diketahui atau tidak dapat ditampilkan.</p>;
  };


  return (
    <div className="w-full px-2 sm:px-4 py-6"> {/* Matched CekResiPage & GitHubFileScraperPage */}
      <ToastContainer position="top-right" autoClose={3000} newestOnTop theme="colored"
        toastClassName={(o) => `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : o?.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-teal-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`}/>
      
      <Card
        bodyClass="relative p-0 h-full overflow-hidden flex flex-col"
        className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80" // Matched
      >
        {/* Header Card - Adapted from CekResiPage style */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
          <div className="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-3"> {/* Centered content */}
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mr-3 sm:mr-4 shrink-0">
                <Icon icon="ph:plugs-connected-duotone" className="text-xl sm:text-2xl" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
                API Path Tester
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 sm:mt-0 sm:ml-4"> {/* Adjusted margin */}
              Uji endpoint API dari file di repositori GitHub Anda.
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

          <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400 text-center sm:text-left sm:ml-16"> {/* Adjusted margin and text alignment */}
            Lokasi File GitHub: <code className="bg-slate-100 dark:bg-slate-700 p-1 rounded text-teal-600 dark:text-teal-300 break-all">{currentBrowsePath}</code>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left sm:ml-16"> {/* Adjusted margin and text alignment */}
            Pilih file <code className="text-xs">.js / .ts / .jsx / .tsx</code>; path API yang sesuai akan otomatis dibuat untuk diuji.
          </p>
        </div>

        {loadingList && !error && ( <div className="flex flex-col items-center justify-center p-10 min-h-[250px] sm:min-h-[300px]"><Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl sm:text-5xl text-teal-500 mb-4" /><p className="text-base sm:text-lg font-medium text-slate-600 dark:text-slate-300">Memuat Daftar API...</p></div>)}
        {error && !loadingList && (<div className="flex flex-col items-center justify-center p-6 sm:p-10 min-h-[250px] sm:min-h-[300px] bg-red-50 dark:bg-red-900/20 rounded-b-xl"><Icon icon="ph:warning-octagon-duotone" className="text-4xl sm:text-5xl text-red-500 mb-4" /><p className="text-base sm:text-lg font-semibold text-red-700 dark:text-red-300">Gagal Memuat</p><p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-2 text-center max-w-md sm:max-w-xl">{error}</p></div>)}

        {!loadingList && !error && (
          <div className="flex-grow md:flex md:min-h-0"> {/* Consistent with GitHubFileScraperPage */}
            <div className="w-full md:w-2/5 lg:w-1/3 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700/60 flex flex-col">
              <div className="p-4 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700/60">
                <label htmlFor="apiSearch" className="block text-sm font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                    <Icon icon="ph:magnifying-glass-duotone" className="mr-2 text-lg" />
                    Cari File API
                </label>
                <input
                  id="apiSearch"
                  type="text"
                  placeholder="Ketik untuk mencari..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className={inputBaseClass}
                />
              </div>
              <SimpleBar className="flex-grow h-64 md:h-auto md:max-h-[calc(100%-140px)]"> {/* Adjusted max-h slightly */}
                <div className="p-2 sm:p-3 space-y-0.5">
                  {paginatedFiles.length > 0 ? paginatedFiles.map((item) => {
                    const isApiFile = item.type === 'file' && item.name.match(/\.(js|jsx|ts|tsx)$/i);
                    return (
                    <button
                      key={item.sha || item.name}
                      onClick={() => handleFileOrDirClick(item)}
                      title={`Nama: ${item.name}\nTipe: ${item.type}${item.type === 'file' && item.size ? `\nUkuran: ${formatFileSize(item.size)}` : ''}${isApiFile ? `\nPath API: ${transformToApiPath(item.path)}` : (item.type === 'dir' ? '\nMasuk folder' : '\nBukan file API')}`}
                      className={`w-full text-left flex items-center px-2 py-1.5 sm:px-2.5 sm:py-2 my-0.5 rounded-md transition-colors duration-150 group ${!isApiFile && item.type === 'file' ? 'opacity-60 cursor-not-allowed' : 'hover:bg-teal-50 dark:hover:bg-teal-700/30'} ${selectedApiFile?.path === item.path && item.type === 'file' ? "bg-teal-100 dark:bg-teal-600/40 ring-1 ring-teal-400 dark:ring-teal-500" : ""}`}
                      disabled={!isApiFile && item.type === 'file'}
                    >
                      <Icon
                        icon={item.type === 'dir' ? "ph:folder-notch-open-duotone" : (isApiFile ? "ph:file-code-duotone" : "ph:file-text-duotone")} // Simpler icon logic
                        className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-2.5 flex-shrink-0 ${
                            item.type === 'dir' ? "text-yellow-500 dark:text-yellow-400" :
                            (selectedApiFile?.path === item.path && isApiFile ? "text-teal-600 dark:text-teal-300" : "text-slate-400 dark:text-slate-500 group-hover:text-teal-500 dark:group-hover:text-teal-400")
                        }`}
                      />
                      <span className={`truncate text-xs sm:text-sm ${selectedApiFile?.path === item.path && isApiFile ? "text-teal-700 dark:text-teal-200 font-medium" : "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100"}`}>
                        {item.name}
                      </span>
                      {item.type === 'file' && typeof item.size === 'number' && (
                        <span className="ml-auto text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 pl-2 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                          {formatFileSize(item.size)}
                        </span>
                      )}
                    </button>
                    )
                  }) : (
                    <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                      <Icon icon="ph:files-thin" className="mx-auto text-3xl sm:text-4xl opacity-70 mb-2"/>
                      <p className="text-xs sm:text-sm">{searchTerm ? "Tidak ada yang cocok." : "Folder kosong atau tidak ada file API."}</p>
                    </div>
                  )}
                </div>
              </SimpleBar>
              {totalPages > 1 && (
                <div className="p-2.5 sm:p-3 border-t border-slate-200 dark:border-slate-700/60 flex flex-col items-center gap-2 sm:flex-row sm:justify-between text-xs bg-slate-100/70 dark:bg-slate-800/40"> {/* Styled */}
                  <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} text="Sebelumnya" icon="ph:caret-left-bold" className={`${buttonSecondaryClass} w-full sm:w-auto px-2.5 py-1 text-[11px] sm:text-xs`} />
                  <span className="text-slate-600 dark:text-slate-300">Hal {currentPage} dari {totalPages}</span>
                  <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} text="Berikutnya" icon="ph:caret-right-bold" iconPosition="right" className={`${buttonSecondaryClass} w-full sm:w-auto px-2.5 py-1 text-[11px] sm:text-xs`} />
                </div>
              )}
            </div>

            <div className="hidden md:flex md:w-3/5 lg:w-2/3 bg-slate-50 dark:bg-slate-800/30 items-center justify-center p-6 rounded-br-xl md:rounded-bl-none flex-grow"> {/* Consistent */}
                <div className="text-center text-slate-500 dark:text-slate-400">
                    <Icon icon="ph:paper-plane-tilt-duotone" className="text-6xl sm:text-7xl mb-4 opacity-60 text-teal-500" />
                    <p className="text-base sm:text-lg">Pilih sebuah file API dari panel kiri.</p>
                    <p className="text-xs sm:text-sm mt-1">Konfigurasi dan kirim request di modal yang akan muncul.</p>
                </div>
            </div>
          </div>
        )}
      </Card>

      {/* Modal - API Try Out - Styling is self-contained and complex, kept as is */}
      {showApiTryOutModal && selectedApiFile && (
        <Modal
          title={
            <div className="flex items-center min-w-0">
              <Icon icon="ph:rocket-launch-duotone" className="mr-2 text-teal-500 text-xl sm:text-2xl shrink-0"/>
              <span className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100 truncate" title={`Test API: ${apiPathToTest}`}>
                Test API: <code className="text-teal-600 dark:text-teal-300">{apiPathToTest}</code>
              </span>
            </div>
          }
          activeModal={showApiTryOutModal}
          onClose={() => {
            setShowApiTryOutModal(false);
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            setObjectUrl(null);
          }}
          className="max-w-2xl md:max-w-3xl lg:max-w-4xl" // Modal size
          footerContent={
            <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-2 sm:gap-3 p-2 sm:p-3">
                <div>
                    {selectedApiFile.github_link && (
                        <a href={selectedApiFile.github_link} target="_blank" rel="noopener noreferrer" className={`${buttonSecondaryClass} inline-flex items-center text-[11px] sm:text-xs px-2 py-1`} title="Lihat source code di GitHub">
                            <Icon icon="ph:github-logo-fill" className="mr-1 text-sm sm:text-base"/> Lihat Source
                        </a>
                    )}
                </div>
                <div className="flex w-full sm:w-auto gap-2">
                    <Button text="Tutup" onClick={() => {
                        setShowApiTryOutModal(false);
                        if (objectUrl) URL.revokeObjectURL(objectUrl);
                        setObjectUrl(null);
                    }} className={`${buttonSecondaryClass} flex-1 sm:flex-none px-3 py-1.5`} />
                    <Button
                        onClick={handleSendApiRequest}
                        text={loadingApiResponse ? "Mengirim..." : "Kirim Request"}
                        icon={loadingApiResponse ? "svg-spinners:ring-resize" : "ph:paper-plane-tilt-fill"}
                        className={`${buttonPrimaryClass} flex-1 sm:flex-none px-3 py-1.5 min-w-[120px] sm:min-w-[130px]`} // Adjusted min-width
                        disabled={loadingApiResponse}
                    />
                </div>
            </div>
          }
        >
          <SimpleBar style={{ maxHeight: 'calc(80vh - 120px)' }} className="p-0"> {/* Modal content scroll */}
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              {/* Request Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 items-end"> {/* items-end for alignment */}
                <div className="md:col-span-1">
                  <label htmlFor="apiMethod" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Method</label>
                  <select
                    id="apiMethod"
                    value={apiRequestMethod}
                    onChange={(e) => setApiRequestMethod(e.target.value)}
                    className={inputBaseClass}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full API URL</label>
                  <input type="text" readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}${constructApiUrl()}`} className={`${inputBaseClass} bg-slate-100 dark:bg-slate-700 cursor-not-allowed text-xs sm:text-sm`} />
                </div>
              </div>

              {/* Query Parameters for GET */}
              {apiRequestMethod === "GET" && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-700/60">
                  <h3 className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Query Parameters</h3>
                  {apiQueryParams.map((param, index) => (
                    <div key={param.id} className="flex items-center gap-2 mb-2 last:mb-0">
                      <input
                        type="text"
                        placeholder="Key"
                        value={param.key}
                        onChange={(e) => handleQueryParamChange(param.id, 'key', e.target.value)}
                        className={`${inputBaseClass} flex-1 text-xs sm:text-sm`}
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={param.value}
                        onChange={(e) => handleQueryParamChange(param.id, 'value', e.target.value)}
                        className={`${inputBaseClass} flex-1 text-xs sm:text-sm`}
                      />
                      <Button
                        icon="ph:trash-simple-duotone"
                        onClick={() => handleRemoveQueryParam(param.id)}
                        className={`${buttonSecondaryClass} !p-1.5 sm:!p-2 text-red-500 hover:!bg-red-100 dark:hover:!bg-red-700/50`}
                        disabled={apiQueryParams.length === 1 && index === 0 && !param.key && !param.value} // Keep one empty row
                      />
                    </div>
                  ))}
                  <Button text="Tambah Parameter" icon="ph:plus-circle-duotone" onClick={handleAddQueryParam} className={`${buttonSecondaryClass} text-[11px] sm:text-xs mt-2`} />
                </div>
              )}

              {/* Request Body for POST, PUT, PATCH */}
              {(apiRequestMethod === "POST" || apiRequestMethod === "PUT" || apiRequestMethod === "PATCH") && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-700/60">
                  <label htmlFor="apiBody" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Request Body (JSON)</label>
                  <textarea
                    id="apiBody"
                    rows="5"
                    value={apiRequestBody}
                    onChange={(e) => setApiRequestBody(e.target.value)}
                    className={`${inputBaseClass} font-mono text-[11px] sm:text-xs !leading-relaxed simple-scrollbar`} // Added leading-relaxed
                    placeholder='{ "key": "value" }'
                  />
                </div>
              )}

              {/* cURL Command */}
              {generatedCurlCommand && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-700/60">
                    <div className="flex justify-between items-center mb-1">
                        <h3 className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">cURL Command</h3>
                        <Button
                            onClick={handleCopyCurl}
                            text={copiedCurl ? "Disalin!" : "Salin cURL"}
                            icon={copiedCurl ? "ph:check-circle-duotone" : "ph:copy-duotone"}
                            className={`${buttonSecondaryClass} text-[11px] sm:text-xs`}
                            disabled={!generatedCurlCommand}
                        />
                    </div>
                    <pre className="p-2 sm:p-3 bg-slate-900 dark:bg-black/80 text-slate-100 rounded-md text-[10px] sm:text-xs overflow-x-auto simple-scrollbar whitespace-pre-wrap">
                        {generatedCurlCommand}
                    </pre>
                </div>
              )}

              {/* API Response Section */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-700/60">
                <div className="flex justify-between items-center mb-1">
                    <h3 className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                        Respons
                        {apiResponseStatus && (
                            <span className={`ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${
                                apiResponseStatus >= 200 && apiResponseStatus < 300 ? 'bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300' :
                                apiResponseStatus >= 400 ? 'bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300' :
                                apiResponseStatus >= 300 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300' :
                                'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300'
                            }`}>
                                Status: {apiResponseStatus}
                            </span>
                        )}
                    </h3>
                    <Button
                        onClick={handleCopyResponse}
                        text={copiedResponse ? "Disalin!" : "Salin Respons"}
                        icon={copiedResponse ? "ph:check-circle-duotone" : "ph:copy-duotone"}
                        className={`${buttonSecondaryClass} text-[11px] sm:text-xs`}
                        disabled={(apiResponse === null && apiResponseStatus !== 204) || loadingApiResponse || apiResponse instanceof Blob}
                    />
                </div>
                <div className="border border-slate-200 dark:border-slate-600 rounded-md min-h-[80px] sm:min-h-[100px] bg-white dark:bg-slate-800 overflow-hidden"> {/* Ensure bg for response area */}
                    {renderApiResponse()}
                </div>
                {apiResponseHeaders && (
                    <details className="mt-2 text-[11px] sm:text-xs">
                        <summary className="cursor-pointer text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400">Lihat Headers Respons</summary>
                        <pre className="mt-1 p-2 bg-slate-100 dark:bg-slate-700/50 rounded text-slate-600 dark:text-slate-300 max-h-32 sm:max-h-40 overflow-y-auto simple-scrollbar text-[10px] sm:text-[11px]">
                            {JSON.stringify(apiResponseHeaders, null, 2)}
                        </pre>
                    </details>
                )}
              </div>
            </div>
          </SimpleBar>
        </Modal>
      )}
    </div>
  );
};

export default ApiTesterPage;