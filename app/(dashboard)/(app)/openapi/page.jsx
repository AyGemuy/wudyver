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

const OPENAPI_SPEC_URL = "/api/openapi";

const ITEMS_PER_PAGE = 15;

const processOpenApiPaths = (openApiSpec) => {
  const root = { name: 'root', type: 'dir', path: '', children: [] };

  if (!openApiSpec || !openApiSpec.paths) {
    return root;
  }

  for (const path in openApiSpec.paths) {
    const pathParts = path.split('/').filter(Boolean);
    let currentDir = root;
    let currentPath = '';

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      currentPath += `/${part}`;

      if (i === pathParts.length - 1) {
        const pathItem = openApiSpec.paths[path];
        for (const method in pathItem) {
          if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method.toLowerCase())) {
            const operation = pathItem[method];
            currentDir.children.push({
              id: `${path}-${method}`,
              name: `${method.toUpperCase()} ${part}`,
              type: 'file',
              path: path,
              method: method.toUpperCase(),
              summary: operation.summary || `No summary`,
              description: operation.description || '',
            });
          }
        }
      } else {
        let nextDir = currentDir.children.find(
          (child) => child.name === part && child.type === 'dir'
        );
        if (!nextDir) {
          nextDir = { name: part, type: 'dir', path: currentPath, children: [] };
          currentDir.children.push(nextDir);
        }
        currentDir = nextDir;
      }
    }
  }

  const sortChildren = (node) => {
    node.children.sort((a, b) => {
      if (a.type === 'dir' && b.type !== 'dir') return -1;
      if (a.type !== 'dir' && b.type === 'dir') return 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(child => {
      if (child.type === 'dir') {
        sortChildren(child);
      }
    });
  };
  sortChildren(root);
  return root;
};

const ApiTesterPage = () => {
  const [apiDirectoryTree, setApiDirectoryTree] = useState(null);
  const [currentBrowseNode, setCurrentBrowseNode] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [pathHistory, setPathHistory] = useState([]);

  const [selectedApiEndpoint, setSelectedApiEndpoint] = useState(null);

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

  const fetchOpenApiSpec = async () => {
    setLoadingList(true);
    setError(null);
    setFileList([]);
    setCurrentPage(1);

    try {
      const res = await fetch(OPENAPI_SPEC_URL);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to load OpenAPI spec (${res.status}): ${errorText.substring(0, 100)}...`);
      }
      const data = await res.json();
      const tree = processOpenApiPaths(data);
      setApiDirectoryTree(tree);
      setCurrentBrowseNode(tree);
      setPathHistory([tree]);
      setFileList(tree.children);
    } catch (err) {
      console.error("Failed to fetch/process OpenAPI spec:", err);
      setError(err.message);
      toast.error(`Error loading API list: ${err.message}`);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchOpenApiSpec();
  }, []);

  useEffect(() => {
    if (currentBrowseNode) {
      setFileList(currentBrowseNode.children);
    }
  }, [currentBrowseNode]);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
      }
    };
  }, [objectUrl]);

  const handleFileOrDirClick = (item) => {
    if (item.type === "dir") {
      setPathHistory(prev => [...prev, item]);
      setCurrentBrowseNode(item);
      setSelectedApiEndpoint(null);
      setSearchTerm("");
    } else if (item.type === "file") {
      setSelectedApiEndpoint(item);
      setApiPathToTest(item.path);
      setApiRequestMethod(item.method);

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
      const escapedBody = apiRequestBody.replace(/'/g, "'\\''");
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
        JSON.parse(apiRequestBody);
        options.body = apiRequestBody;
      } catch (e) {
        toast.error("Invalid JSON body.");
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
          const textData = await res.text();
          setApiResponse(textData);
          toast.warn(`Content type not fully supported for preview: ${contentType}. Displayed as text.`);
        }
      } else {
        const textData = await res.text();
        setApiResponse(textData);
        if (textData) {
            toast.info("Response has no Content-Type header. Displayed as text.");
        } else if (res.status !== 204 ) {
            toast.warn("Empty response and no Content-Type header.");
        }
      }
    } catch (err) {
      console.error("API request error:", err);
      toast.error(`API Request Error: ${err.message}`);
      setApiResponse({ error: err.message });
      setApiResponseContentType("application/json");
    } finally {
      setLoadingApiResponse(false);
      generateCurl();
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        if (type === 'curl') {
          setCopiedCurl(true);
          toast.success("cURL command copied!");
          setTimeout(() => setCopiedCurl(false), 2000);
        } else if (type === 'response') {
          setCopiedResponse(true);
          toast.success("Response copied!");
          setTimeout(() => setCopiedResponse(false), 2000);
        }
      })
      .catch(err => {
        toast.error(`Failed to copy ${type}.`);
        console.error("Failed to copy:", err);
      });
  };

  const handleCopyCurl = () => {
    if (generatedCurlCommand) {
      copyToClipboard(generatedCurlCommand, 'curl');
    }
  };

  const handleCopyResponse = () => {
    if (apiResponse === null && apiResponseStatus !== 204) {
        toast.warn("No response to copy.");
        return;
    }
    if (apiResponseStatus === 204) {
        toast.info("Response is 204 No Content, no body to copy.");
        return;
    }
    let responseToCopy;
    if (apiResponse instanceof Blob) {
        toast.info("Copying media content as text is not supported. You can download it.");
        return;
    } else if (typeof apiResponse === 'object') {
        responseToCopy = JSON.stringify(apiResponse, null, 2);
    } else {
        responseToCopy = String(apiResponse);
    }
    copyToClipboard(responseToCopy, 'response');
  };

  const filteredFiles = fileList.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.type === 'file' && item.path.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.type === 'file' && item.summary.toLowerCase().includes(searchTerm.toLowerCase()))
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
      const previousNode = newPathHistory[newPathHistory.length - 1];
      setPathHistory(newPathHistory);
      setCurrentBrowseNode(previousNode);
      setSelectedApiEndpoint(null);
      setSearchTerm("");
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
          <Icon icon="svg-spinners:ring-resize" className="text-3xl mr-3 text-teal-500" /> Sending request...
        </div>
      );
    }
    if (apiResponseStatus === 204) return <p className="text-slate-500 dark:text-slate-400 p-4 text-sm">Response received: 204 No Content.</p>;
    if (!apiResponse && !apiResponseContentType) return <p className="text-slate-500 dark:text-slate-400 p-4 text-sm">No response yet.</p>;

    if (apiResponse instanceof Blob) {
        const blobType = apiResponseContentType || apiResponse.type;
        if (objectUrl) {
            if (blobType.startsWith("image/")) {
                return <img src={objectUrl} alt="API Response" className="max-w-full h-auto rounded p-2"/>;
            } else if (blobType.startsWith("video/")) {
                return <video src={objectUrl} controls className="max-w-full rounded p-2"/>;
            } else if (blobType.startsWith("audio/")) {
                return <audio src={objectUrl} controls className="w-full p-2"/>;
            } else if (blobType === "application/pdf") {
                return (
                    <div className="p-4">
                        <a href={objectUrl} download={"download.pdf"} className={`${buttonPrimaryClass} inline-flex items-center`}>
                            <Icon icon="ph:file-pdf-duotone" className="inline mr-1 text-base"/> Download PDF ({formatFileSize(apiResponse.size)})
                        </a>
                        <iframe src={objectUrl} className="w-full h-64 mt-2 border-slate-300 dark:border-slate-600" title="PDF Preview"></iframe>
                        <p className="text-xs text-slate-400 mt-2">PDF preview may be limited. Download for full view.</p>
                    </div>
                );
            } else {
                return (
                    <div className="p-4">
                        <a href={objectUrl} download={"downloaded_file"} className={`${buttonPrimaryClass} inline-flex items-center`}>
                            <Icon icon="ph:download-simple-duotone" className="inline mr-1 text-base"/> Download File ({formatFileSize(apiResponse.size)})
                        </a>
                        <p className="text-xs text-slate-400 mt-2">File type: {blobType}</p>
                    </div>
                );
            }
        } else {
            return <p className="text-slate-500 dark:text-slate-400 p-4 text-sm">Processing media preview...</p>;
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
    
    if (apiResponse) {
        return (
            <pre className="whitespace-pre-wrap p-3 sm:p-4 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/50 rounded-none max-h-[40vh] overflow-y-auto simple-scrollbar">
                {typeof apiResponse === 'object' ? JSON.stringify(apiResponse, null, 2) : String(apiResponse)}
            </pre>
        );
    }

    return <p className="text-slate-500 dark:text-slate-400 p-4 text-sm">Unknown or unrenderable response format.</p>;
  };

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
                <Icon icon="ph:plugs-connected-duotone" className="text-xl sm:text-2xl" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
                API Path Tester
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 sm:mt-0 sm:ml-4">
              Test API endpoints from your OpenAPI specification.
            </p>
          </div>

          {pathHistory.length > 1 && (
            <Button
              onClick={handleGoBack}
              text="Back"
              icon="ph:arrow-left-duotone"
              className={`${buttonSecondaryClass} mt-3 sm:mt-4 mx-auto sm:mx-0 self-start sm:self-center`}
              iconClassName="mr-1"
            />
          )}

          <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400 text-center sm:text-left sm:ml-16">
            Current Path: <code className="bg-slate-100 dark:bg-slate-700 p-1 rounded text-teal-600 dark:text-teal-300 break-all">{currentBrowseNode?.path || '/'}</code>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left sm:ml-16">
            Browse through directories and select an API endpoint to test.
          </p>
        </div>

        {loadingList && !error && ( <div className="flex flex-col items-center justify-center p-10 min-h-[250px] sm:min-h-[300px]"><Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl sm:text-5xl text-teal-500 mb-4" /><p className="text-base sm:text-lg font-medium text-slate-600 dark:text-slate-300">Loading API List...</p></div>)}
        {error && !loadingList && (<div className="flex flex-col items-center justify-center p-6 sm:p-10 min-h-[250px] sm:min-h-[300px] bg-red-50 dark:bg-red-900/20 rounded-b-xl"><Icon icon="ph:warning-octagon-duotone" className="text-4xl sm:text-5xl text-red-500 mb-4" /><p className="text-base sm:text-lg font-semibold text-red-700 dark:text-red-300">Failed to Load</p><p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-2 text-center max-w-md sm:max-w-xl">{error}</p></div>)}

        {!loadingList && !error && (
          <div className="flex-grow md:flex md:min-h-0">
            <div className="w-full md:w-2/5 lg:w-1/3 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700/60 flex flex-col">
              <div className="p-4 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700/60">
                <label htmlFor="apiSearch" className="block text-sm font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                    <Icon icon="ph:magnifying-glass-duotone" className="mr-2 text-lg" />
                    Search API Endpoint
                </label>
                <input
                  id="apiSearch"
                  type="text"
                  placeholder="Type to search..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className={inputBaseClass}
                />
              </div>
              <SimpleBar className="flex-grow h-64 md:h-auto md:max-h-[calc(100%-140px)]">
                <div className="p-2 sm:p-3 space-y-0.5">
                  {paginatedFiles.length > 0 ? paginatedFiles.map((item) => {
                    return (
                      <button
                        key={item.id || item.path}
                        onClick={() => handleFileOrDirClick(item)}
                        title={`Name: ${item.name}\nType: ${item.type}${item.type === 'file' ? `\nPath: ${item.path}\nMethod: ${item.method}\nSummary: ${item.summary}` : ''}`}
                        className={`w-full text-left flex items-center px-2 py-1.5 sm:px-2.5 sm:py-2 my-0.5 rounded-md transition-colors duration-150 group hover:bg-teal-50 dark:hover:bg-teal-700/30 ${selectedApiEndpoint?.id === item.id ? "bg-teal-100 dark:bg-teal-600/40 ring-1 ring-teal-400 dark:ring-teal-500" : ""}`}
                      >
                        <Icon
                          icon={item.type === 'dir' ? "ph:folder-notch-open-duotone" : "ph:file-code-duotone"}
                          className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-2.5 flex-shrink-0 ${
                            item.type === 'dir' ? "text-yellow-500 dark:text-yellow-400" :
                            (selectedApiEndpoint?.id === item.id ? "text-teal-600 dark:text-teal-300" : "text-slate-400 dark:text-slate-500 group-hover:text-teal-500 dark:group-hover:text-teal-400")
                          }`}
                        />
                        <span className={`truncate text-xs sm:text-sm ${selectedApiEndpoint?.id === item.id ? "text-teal-700 dark:text-teal-200 font-medium" : "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100"}`}>
                          {item.name}
                        </span>
                        {item.type === 'file' && item.method && (
                          <span className="ml-auto text-[10px] sm:text-xs font-mono px-1 py-0.5 rounded-sm pl-2
                            bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">
                            {item.method}
                          </span>
                        )}
                      </button>
                    )
                  }) : (
                    <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                      <Icon icon="ph:files-thin" className="mx-auto text-3xl sm:text-4xl opacity-70 mb-2"/>
                      <p className="text-xs sm:text-sm">{searchTerm ? "No matches found." : "Folder is empty or no API files."}</p>
                    </div>
                  )}
                </div>
              </SimpleBar>
              {totalPages > 1 && (
                <div className="p-2.5 sm:p-3 border-t border-slate-200 dark:border-slate-700/60 flex flex-col items-center gap-2 sm:flex-row sm:justify-between text-xs bg-slate-100/70 dark:bg-slate-800/40">
                  <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} text="Previous" icon="ph:caret-left-bold" className={`${buttonSecondaryClass} w-full sm:w-auto px-2.5 py-1 text-[11px] sm:text-xs`} />
                  <span className="text-slate-600 dark:text-slate-300">Page {currentPage} of {totalPages}</span>
                  <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} text="Next" icon="ph:caret-right-bold" iconPosition="right" className={`${buttonSecondaryClass} w-full sm:w-auto px-2.5 py-1 text-[11px] sm:text-xs`} />
                </div>
              )}
            </div>

            <div className="hidden md:flex md:w-3/5 lg:w-2/3 bg-slate-50 dark:bg-slate-800/30 items-center justify-center p-6 rounded-br-xl md:rounded-bl-none flex-grow">
                <div className="text-center text-slate-500 dark:text-slate-400">
                    <Icon icon="ph:paper-plane-tilt-duotone" className="text-6xl sm:text-7xl mb-4 opacity-60 text-teal-500" />
                    <p className="text-base sm:text-lg">Select an API endpoint from the left panel.</p>
                    <p className="text-xs sm:text-sm mt-1">Configure and send the request in the modal that appears.</p>
                </div>
            </div>
          </div>
        )}
      </Card>

      {showApiTryOutModal && selectedApiEndpoint && (
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
          className="max-w-2xl md:max-w-3xl lg:max-w-4xl"
          footerContent={
            <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-2 sm:gap-3 p-2 sm:p-3">
                <div>
                    {selectedApiEndpoint.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block truncate max-w-xs" title={selectedApiEndpoint.description}>
                            {selectedApiEndpoint.description}
                        </p>
                    )}
                </div>
                <div className="flex w-full sm:w-auto gap-2">
                    <Button text="Close" onClick={() => {
                        setShowApiTryOutModal(false);
                        if (objectUrl) URL.revokeObjectURL(objectUrl);
                        setObjectUrl(null);
                    }} className={`${buttonSecondaryClass} flex-1 sm:flex-none px-3 py-1.5`} />
                    <Button
                        onClick={handleSendApiRequest}
                        text={loadingApiResponse ? "Sending..." : "Send Request"}
                        icon={loadingApiResponse ? "svg-spinners:ring-resize" : "ph:paper-plane-tilt-fill"}
                        className={`${buttonPrimaryClass} flex-1 sm:flex-none px-3 py-1.5 min-w-[120px] sm:min-w-[130px]`}
                        disabled={loadingApiResponse}
                    />
                </div>
            </div>
          }
        >
          <SimpleBar style={{ maxHeight: 'calc(80vh - 120px)' }} className="p-0">
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 items-end">
                <div className="md:col-span-1">
                  <label htmlFor="apiMethod" className="block text-xs font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                    <Icon icon="ph:function-duotone" className="mr-1 text-base"/> HTTP Method
                  </label>
                  <select
                    id="apiMethod"
                    value={apiRequestMethod}
                    onChange={(e) => setApiRequestMethod(e.target.value)}
                    className={inputBaseClass}
                  >
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="apiPath" className="block text-xs font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                    <Icon icon="ph:link-duotone" className="mr-1 text-base"/> API Endpoint Path
                  </label>
                  <input
                    id="apiPath"
                    type="text"
                    value={apiPathToTest}
                    onChange={(e) => setApiPathToTest(e.target.value)}
                    className={inputBaseClass}
                    readOnly
                    title="The endpoint path is derived from the OpenAPI specification and cannot be directly edited."
                  />
                </div>
              </div>

              {(apiRequestMethod === "GET" || apiRequestMethod === "HEAD") && (
                <div className="space-y-2 border border-slate-200 dark:border-slate-700/60 p-3 rounded-md bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-teal-700 dark:text-teal-300 flex items-center">
                      <Icon icon="ph:question-duotone" className="mr-1 text-base"/> Query Parameters
                    </label>
                    <Button onClick={handleAddQueryParam} text="Add" icon="ph:plus-circle-duotone" className={`${buttonSecondaryClass} text-[11px] px-2 py-1`}/>
                  </div>
                  {apiQueryParams.map((param, index) => (
                    <div key={param.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Key"
                        value={param.key}
                        onChange={(e) => handleQueryParamChange(param.id, 'key', e.target.value)}
                        className={`${inputBaseClass} flex-1`}
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={param.value}
                        onChange={(e) => handleQueryParamChange(param.id, 'value', e.target.value)}
                        className={`${inputBaseClass} flex-1`}
                      />
                      <Button onClick={() => handleRemoveQueryParam(param.id)} icon="ph:x-circle-duotone" className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200" />
                    </div>
                  ))}
                  {apiQueryParams.length === 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">No query parameters added. Click "Add" to add some.</p>
                  )}
                </div>
              )}

              {(apiRequestMethod === "POST" || apiRequestMethod === "PUT" || apiRequestMethod === "PATCH") && (
                <div className="space-y-2 border border-slate-200 dark:border-slate-700/60 p-3 rounded-md bg-slate-50 dark:bg-slate-800/50">
                  <label htmlFor="requestBody" className="block text-xs font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                    <Icon icon="ph:braces-duotone" className="mr-1 text-base"/> Request Body (JSON)
                  </label>
                  <textarea
                    id="requestBody"
                    value={apiRequestBody}
                    onChange={(e) => setApiRequestBody(e.target.value)}
                    rows="6"
                    className={`${inputBaseClass} font-mono`}
                    placeholder="Enter JSON request body here..."
                  ></textarea>
                </div>
              )}
              
              <div className="border border-slate-200 dark:border-slate-700/60 p-3 rounded-md bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-teal-700 dark:text-teal-300 flex items-center">
                          <Icon icon="ph:terminal-window-duotone" className="mr-1 text-base"/> cURL Command
                      </label>
                      <Button onClick={handleCopyCurl} className={`${copiedCurl ? 'bg-green-500 hover:bg-green-600' : 'bg-teal-500 hover:bg-teal-600'} text-white text-[11px] py-1 px-2 rounded-md shadow transition-colors`} disabled={!generatedCurlCommand}>
                          <Icon icon={copiedCurl ? "ph:check-circle-duotone" : "ph:copy-duotone"} className="mr-1 text-xs" />
                          {copiedCurl ? "Copied" : "Copy"}
                      </Button>
                  </div>
                  <SyntaxHighlighter
                      language="bash"
                      style={syntaxHighlighterTheme}
                      customStyle={{ margin: 0, padding: '0.75rem 1rem', borderRadius: '0px', maxHeight: '150px', fontSize: '12px' }}
                      wrapLines={true}
                      className="simple-scrollbar"
                  >
                      {generatedCurlCommand || "Click 'Send Request' to generate cURL command."}
                  </SyntaxHighlighter>
              </div>

              <div className="border border-slate-200 dark:border-slate-700/60 p-3 rounded-md bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-teal-700 dark:text-teal-300 flex items-center">
                        <Icon icon="ph:monitor-play-duotone" className="mr-1 text-base"/> API Response
                        {apiResponseStatus && (
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold
                                ${apiResponseStatus >= 200 && apiResponseStatus < 300 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-700/30 dark:text-emerald-300' :
                                apiResponseStatus >= 400 && apiResponseStatus < 500 ? 'bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300' :
                                apiResponseStatus >= 500 ? 'bg-purple-100 text-purple-700 dark:bg-purple-700/30 dark:text-purple-300' :
                                'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300'}`}>
                                Status: {apiResponseStatus}
                            </span>
                        )}
                    </label>
                    <Button onClick={handleCopyResponse} className={`${copiedResponse ? 'bg-green-500 hover:bg-green-600' : 'bg-teal-500 hover:bg-teal-600'} text-white text-[11px] py-1 px-2 rounded-md shadow transition-colors`} disabled={loadingApiResponse || apiResponseStatus === null || apiResponseStatus === 204 || apiResponse instanceof Blob}>
                        <Icon icon={copiedResponse ? "ph:check-circle-duotone" : "ph:copy-duotone"} className="mr-1 text-xs" />
                        {copiedResponse ? "Copied" : "Copy"}
                    </Button>
                </div>
                <div className="bg-slate-100 dark:bg-slate-900/60 rounded-md overflow-hidden min-h-[100px] flex items-center justify-center">
                    {renderApiResponse()}
                </div>
                {apiResponseHeaders && (
                  <div className="mt-3">
                    <h3 className="text-xs font-medium text-teal-700 dark:text-teal-300 mb-1 flex items-center">
                        <Icon icon="ph:info-duotone" className="mr-1 text-base"/> Response Headers
                    </h3>
                    <div className="bg-slate-100 dark:bg-slate-900/60 p-2 rounded-md overflow-x-auto text-[10px] sm:text-[11px] font-mono text-slate-700 dark:text-slate-300">
                        {Object.entries(apiResponseHeaders).length > 0 ? (
                            Object.entries(apiResponseHeaders).map(([key, value]) => (
                                <p key={key} className="truncate"><strong className="text-teal-600 dark:text-teal-400">{key}:</strong> {value}</p>
                            ))
                        ) : (
                            <p className="text-center text-slate-500 dark:text-slate-400">No headers received.</p>
                        )}
                    </div>
                  </div>
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