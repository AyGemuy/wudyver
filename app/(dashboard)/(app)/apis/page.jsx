"use client";
import React, { useState, useEffect, useCallback, Fragment } from 'react';
import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal"; // Impor Modal
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';
import axios from 'axios';
import { Disclosure } from "@headlessui/react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneLight, atomOneDark } from "react-syntax-highlighter/dist/cjs/styles/hljs";

const OpenAPIManager = () => {
  const [openAPISpec, setOpenAPISpec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [endpoints, setEndpoints] = useState([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [status, setStatus] = useState("loading");

  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState("all");
  const [filteredEndpoints, setFilteredEndpoints] = useState([]);

  const [paramValues, setParamValues] = useState({});
  const [customParams, setCustomParams] = useState([]);
  const [requestBody, setRequestBody] = useState("");
  const [responseData, setResponseData] = useState(null);
  const [responseStatus, setResponseStatus] = useState(null);
  const [responseHeaders, setResponseHeaders] = useState(null);
  const [responseTime, setResponseTime] = useState(null);
  const [executingRequest, setExecutingRequest] = useState(false);
  const [curlCommand, setCurlCommand] = useState("");
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [activeTab, setActiveTab] = useState("params");
  const [methodOverride, setMethodOverride] = useState("");

  const [isEndpointModalOpen, setIsEndpointModalOpen] = useState(false);
  const [objectUrl, setObjectUrl] = useState(null); // Untuk URL Blob media

  // Cleanup Object URL
  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  useEffect(() => {
    const fetchOpenAPISpec = async () => {
      try {
        setStatus("loading");
        setLoading(true);
        const response = await fetch('/api/openapi');
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gagal mengambil spesifikasi OpenAPI: ${response.status} ${response.statusText}. ${errorText.substring(0,200)}`);
        }
        const data = await response.json();
        if (!data || typeof data.paths !== 'object') {
            throw new Error("Format spesifikasi API tidak valid atau tidak ditemukan.");
        }
        setOpenAPISpec(data);

        if (data.paths) {
          const extractedEndpoints = [];
          const extractedTags = new Set();
          const tagsFromSpec = data.tags || [];
          const tagOrder = tagsFromSpec.map(tag => tag.name);

          Object.entries(data.paths).forEach(([path, methods]) => {
            Object.entries(methods).forEach(([method, details]) => {
              if (typeof details === 'object' && details !== null && !Array.isArray(details) && method.toLowerCase() !== 'parameters' && method.toLowerCase() !== '$ref' && method.toLowerCase() !== 'servers' && method.toLowerCase() !== 'summary' && method.toLowerCase() !== 'description') {
                (details.tags || ['Lain-lain']).forEach(tag => extractedTags.add(tag));
                extractedEndpoints.push({
                  path,
                  method: method.toUpperCase(),
                  summary: details.summary || path,
                  operationId: details.operationId,
                  parameters: details.parameters || [],
                  requestBody: details.requestBody,
                  responses: details.responses,
                  tags: details.tags || ['Lain-lain']
                });
              }
            });
          });
          setEndpoints(extractedEndpoints);
          
          const sortedUniqueTags = Array.from(extractedTags).sort((a, b) => {
            const indexA = tagOrder.indexOf(a);
            const indexB = tagOrder.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            if (a === "Lain-lain") return 1;
            if (b === "Lain-lain") return -1;
            return a.localeCompare(b);
          });
          setTags(["all", ...sortedUniqueTags]);
        }
        setStatus("succeeded");
      } catch (err) {
        setError(err.message || 'Terjadi kesalahan saat mengambil spesifikasi OpenAPI.');
        setStatus("failed");
        toast.error('Gagal memuat spesifikasi OpenAPI');
      } finally {
        setLoading(false);
      }
    };
    fetchOpenAPISpec();
  }, []);

  useEffect(() => {
    if (selectedTag === "all") {
      setFilteredEndpoints(endpoints);
    } else {
      setFilteredEndpoints(endpoints.filter(endpoint => endpoint.tags.includes(selectedTag)));
    }
    // Jangan set setSelectedEndpoint(null) di sini agar modal tidak tertutup saat filter tag
  }, [endpoints, selectedTag]);

  const handleSelectEndpoint = (endpoint) => {
    setSelectedEndpoint(endpoint);
    setParamValues({});
    setCustomParams([]);
    const exampleBody = endpoint.requestBody?.content?.["application/json"]?.example;
    let initialRequestBody = "";
    if (exampleBody) {
        try {
            initialRequestBody = JSON.stringify(exampleBody, null, 2);
        } catch (e) {
            initialRequestBody = typeof exampleBody === 'string' ? exampleBody : "{\n  \"error\": \"Could not parse example body\"\n}";
        }
    } else if (endpoint.requestBody?.content?.["application/json"]?.schema) {
        initialRequestBody = "{\n  \n}";
    }
    setRequestBody(initialRequestBody);
    setResponseData(null); setResponseStatus(null); setResponseHeaders(null); setResponseTime(null);
    setCurlCommand(""); setCopiedCurl(false); setCopiedResponse(false);
    setActiveTab("params");
    setMethodOverride(endpoint.method);

    const initialParams = {};
    endpoint.parameters?.forEach(param => { initialParams[param.name] = param.example ?? param.schema?.default ?? ""; });
    setParamValues(initialParams);

    if (objectUrl) { // Revoke URL blob sebelumnya jika ada
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
    }
    setIsEndpointModalOpen(true); // Buka modal
  };

  const closeEndpointModal = () => {
    setIsEndpointModalOpen(false);
    // selectedEndpoint biarkan agar jika dibuka lagi masih sama, atau set null jika ingin reset
    // setSelectedEndpoint(null); 
    if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
    }
  };

  const handleParamChange = (name, value) => { setParamValues(prev => ({ ...prev, [name]: value })); };
  const handleAddCustomParam = () => { setCustomParams(prev => [...prev, { name: '', value: '', in: 'query' }]); };
  const handleRemoveCustomParam = (index) => { setCustomParams(prev => prev.filter((_, i) => i !== index)); };
  const handleCustomParamChange = (index, field, value) => { setCustomParams(prev => prev.map((param, i) => i === index ? { ...param, [field]: value } : param)); };
  const handleRequestBodyChange = (e) => { setRequestBody(e.target.value); };

  const buildRequestUrl = useCallback(() => {
    if (!selectedEndpoint || !openAPISpec) return "";
    let baseUrl = openAPISpec.servers?.[0]?.url || "";
    baseUrl = baseUrl.replace(/\/$/, '');
    let endpointPath = selectedEndpoint.path;
    const allParams = { ...paramValues };
    customParams.forEach(p => { if (p.in === 'path' && p.name) allParams[p.name] = p.value; });
    
    Object.entries(allParams).forEach(([name, value]) => {
      if (selectedEndpoint.parameters?.find(p => p.name === name && p.in === "path")) {
        endpointPath = endpointPath.replace(`{${name}}`, encodeURIComponent(value ?? ""));
      }
    });
    return `${baseUrl}${endpointPath}`;
  }, [selectedEndpoint, paramValues, customParams, openAPISpec]);

  const buildQueryParams = useCallback(() => {
    const queryParams = {};
    Object.entries(paramValues).forEach(([name, value]) => {
      if (selectedEndpoint.parameters?.find(p => p.name === name && p.in === "query") && value) {
        queryParams[name] = value;
      }
    });
    customParams.forEach(param => {
      if (param.in === 'query' && param.name && param.value) {
        queryParams[param.name] = param.value;
      }
    });
    return queryParams;
  }, [selectedEndpoint, paramValues, customParams]);

  const buildHeaders = useCallback(() => {
    const headers = {}; 
    Object.entries(paramValues).forEach(([name, value]) => {
      if (selectedEndpoint.parameters?.find(p => p.name === name && p.in === "header") && value) {
        headers[name] = value;
      }
    });
    customParams.forEach(param => {
      if (param.in === 'header' && param.name && param.value) {
        headers[param.name] = param.value;
      }
    });
    return headers;
  }, [selectedEndpoint, paramValues, customParams]);

  const generateCurlCommand = useCallback(() => {
    if (!selectedEndpoint) return "";
    const method = methodOverride || selectedEndpoint.method;
    const url = buildRequestUrl();
    const queryParams = buildQueryParams();
    const headers = buildHeaders();  
    let fullUrl = url;
    const queryString = new URLSearchParams(queryParams).toString();
    if (queryString) fullUrl += `?${queryString}`;
    let curl = `curl -X ${method} "${fullUrl}"`;
    
    let tempHeaders = {...headers};
    if (["POST", "PUT", "PATCH"].includes(method) && requestBody.trim() && !tempHeaders['Content-Type'] && !tempHeaders['content-type']) {
        tempHeaders['Content-Type'] = 'application/json';  
    }

    Object.entries(tempHeaders).forEach(([key, value]) => { curl += ` -H "${key}: ${value}"`; });

    if (["POST", "PUT", "PATCH"].includes(method) && requestBody.trim()) {
      try {
        const parsedBody = JSON.parse(requestBody); 
        const formattedBody = JSON.stringify(parsedBody); 
        curl += ` -d '${formattedBody.replace(/'/g, "'\\''")}'`;
      } catch (e) {  
        curl += ` -d '${requestBody.replace(/'/g, "'\\''")}'`; 
      }
    }
    return curl;
  }, [selectedEndpoint, methodOverride, buildRequestUrl, buildQueryParams, buildHeaders, requestBody]);

  useEffect(() => { if (selectedEndpoint) setCurlCommand(generateCurlCommand()); }, [selectedEndpoint, paramValues, customParams, requestBody, methodOverride, generateCurlCommand]);

  const copyCurlToClipboard = () => {
    navigator.clipboard.writeText(curlCommand).then(() => {
      setCopiedCurl(true); setTimeout(() => setCopiedCurl(false), 2000);
      toast.success("Perintah cURL disalin!");
    });
  };

  const copyResponseToClipboard = () => {
    if (responseData instanceof Blob) {
        const contentType = responseHeaders?.['content-type']?.toLowerCase();
        if (contentType?.startsWith('text/') || contentType?.includes('json') || contentType?.includes('xml')) {
            const reader = new FileReader();
            reader.onload = function(event) {
                navigator.clipboard.writeText(event.target.result).then(() => {
                    setCopiedResponse(true); setTimeout(() => setCopiedResponse(false), 2000);
                    toast.success("Data respons (dari Blob) disalin!");
                }).catch(err => toast.error("Gagal menyalin teks dari Blob."));
            };
            reader.onerror = function() {
                toast.error("Gagal membaca Blob sebagai teks.");
            };
            reader.readAsText(responseData);
            return;
        }
        toast.info("Menyalin tidak didukung untuk tipe Blob ini. Gunakan tombol unduh jika tersedia.");
        return;
    }

    const responseText = typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2);
    navigator.clipboard.writeText(responseText).then(() => {
      setCopiedResponse(true); setTimeout(() => setCopiedResponse(false), 2000);
      toast.success("Data respons disalin!");
    }).catch(err => toast.error("Gagal menyalin respons."));
  };

  const executeRequest = async () => {
    if (!selectedEndpoint) return;
    setExecutingRequest(true);
    setResponseData(null); setResponseStatus(null); setResponseHeaders(null); setResponseTime(null); setCopiedResponse(false);
    if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
    }
    const startTime = Date.now();
    try {
      const method = methodOverride || selectedEndpoint.method;
      const url = buildRequestUrl();
      const queryParams = buildQueryParams();
      const headers = buildHeaders(); 
      
      const axiosConfig = {
        method: method.toLowerCase(),
        url: url,
        headers: headers,
        params: queryParams,
        timeout: 30000,
        validateStatus: () => true,
        responseType: 'arraybuffer', // Selalu ambil sebagai arraybuffer
      };

      if (["POST", "PUT", "PATCH"].includes(method) && requestBody.trim()) {
        let bodyToSend = requestBody;
        if (!axiosConfig.headers['Content-Type'] && !axiosConfig.headers['content-type']) {
            axiosConfig.headers['Content-Type'] = 'application/json';
        }
        if (axiosConfig.headers['Content-Type'] === 'application/json' || axiosConfig.headers['content-type'] === 'application/json') {
            try { bodyToSend = JSON.parse(requestBody); } 
            catch (e) { 
                toast.warn("Request body bukan JSON valid meskipun Content-Type adalah application/json. Mengirim sebagai string.");
                // Tetap kirim sebagai string jika parsing gagal
            }
        }
        axiosConfig.data = bodyToSend;
      }

      const response = await axios(axiosConfig);
      const endTime = Date.now();
      
      const actualContentType = response.headers['content-type']?.toLowerCase();
      let finalData;

      if (actualContentType?.includes('application/json')) {
          try {
              finalData = JSON.parse(new TextDecoder("utf-8").decode(new Uint8Array(response.data)));
          } catch (parseError) {
              console.error("Gagal parsing respons JSON:", parseError);
              const rawText = new TextDecoder("utf-8").decode(new Uint8Array(response.data));
              finalData = `Error: Content-Type adalah JSON, tapi parsing gagal. Data mentah (awal): ${rawText.substring(0, 500)}${rawText.length > 500 ? '...' : '' }`;
              toast.error("Respons JSON tidak valid.");
          }
      } else if (actualContentType?.startsWith('text/')) {
          finalData = new TextDecoder("utf-8").decode(new Uint8Array(response.data));
      } else if (actualContentType && (actualContentType.startsWith('image/') || actualContentType.startsWith('video/') || actualContentType === 'application/pdf' || actualContentType.startsWith('application/octet-stream'))) {
          const blob = new Blob([response.data], { type: actualContentType });
          finalData = blob;
          const newObjectUrl = URL.createObjectURL(blob);
          setObjectUrl(newObjectUrl); 
      } else {
          try {
            finalData = new TextDecoder("utf-8").decode(new Uint8Array(response.data));
            if (finalData.length > 2000) finalData = `Data teks terlalu panjang untuk ditampilkan (${finalData.length} karakter), menampilkan 2000 karakter pertama:\n\n` + finalData.substring(0,2000) + "\n... (dipotong)";
            if (!actualContentType && response.data.byteLength > 0) {
                finalData = `Menerima ${response.data.byteLength} byte data biner tanpa Content-Type yang jelas. Menampilkan sebagai teks jika memungkinkan:\n\n${finalData}`;
            }
          } catch (e) {
            finalData = `Menerima data biner tipe ${actualContentType || 'tidak diketahui'}. Ukuran: ${response.data.byteLength} bytes. Tidak dapat ditampilkan langsung.`;
          }
      }

      setResponseData(finalData);
      setResponseStatus(response.status);
      setResponseHeaders(response.headers);
      setResponseTime(endTime - startTime);
      setActiveTab("response");

      if (response.status >= 200 && response.status < 300) toast.success(`Permintaan berhasil (${response.status})`);
      else if (response.status >= 400 && response.status < 500) toast.warn(`Client error (${response.status})`);
      else if (response.status >= 500) toast.error(`Server error (${response.status})`);
      else toast.info(`Respons diterima (${response.status})`);

    } catch (err) {
      const endTime = Date.now(); setResponseTime(endTime - startTime);
      if (objectUrl) { URL.revokeObjectURL(objectUrl); setObjectUrl(null); }
      if (axios.isCancel(err)) { toast.info('Permintaan dibatalkan.'); setResponseData({ error: 'Permintaan Dibatalkan' }); setResponseStatus('DIBATALKAN');}
      else if (err.code === 'ECONNABORTED') { toast.error('Request timeout'); setResponseData({ error: 'Request timeout' }); setResponseStatus('TIMEOUT');}
      else if (err.response) { setResponseData(err.response.data || { error: 'Server Error' }); setResponseStatus(err.response.status); setResponseHeaders(err.response.headers); toast.error(`Gagal (${err.response.status}): ${err.response.statusText}`);}
      else if (err.request) { setResponseData({ error: 'Network Error', message: 'Tidak dapat menjangkau server. Periksa koneksi dan pengaturan CORS.' }); setResponseStatus('NETWORK_ERROR'); toast.error('Network error');}
      else { setResponseData({ error: 'Request Error', message: err.message }); setResponseStatus('ERROR'); toast.error(`Gagal: ${err.message}`);}
      setActiveTab("response");
    } finally { setExecutingRequest(false); }
  };
  
  const inputBaseClass = "w-full bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-md shadow-sm text-sm px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const sectionCardClass = "bg-slate-100 dark:bg-slate-800/60 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm";
  const buttonPrimaryClass = "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 flex items-center justify-center text-sm";
  const buttonSecondaryClass = "bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-600/80 dark:hover:bg-slate-600 dark:text-slate-200 font-medium py-2 px-4 rounded-lg shadow transition-colors text-sm flex items-center justify-center";
  
  const methodColors = {
    GET: "bg-green-100 text-green-700 border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-600/50",
    POST: "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-700/30 dark:text-sky-300 dark:border-sky-600/50",
    PUT: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-600/50",
    DELETE: "bg-red-100 text-red-700 border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-600/50",
    PATCH: "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-700/30 dark:text-indigo-300 dark:border-indigo-600/50",
    OPTIONS: "bg-slate-200 text-slate-700 border-slate-400 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600",
    HEAD: "bg-gray-200 text-gray-700 border-gray-400 dark:bg-gray-700/40 dark:text-gray-300 dark:border-gray-600",
  };
  const syntaxHighlighterStyleLight = { ...atomOneLight, hljs: { ...atomOneLight.hljs, background: 'rgb(248 250 252 / 1)' } };
  const syntaxHighlighterStyleDark = { ...atomOneDark, hljs: { ...atomOneDark.hljs, background: 'rgb(30 41 59 / 0.8)' } };

  const getStatusColorClass = (statusHttp) => {
    if (typeof statusHttp === 'string') return 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-700/30 dark:text-rose-300 dark:border-rose-600/50'; // For custom string statuses
    if (!statusHttp && statusHttp !== 0) return methodColors.OPTIONS; // Default if null/undefined
    if (statusHttp >= 200 && statusHttp < 300) return methodColors.GET; 
    if (statusHttp >= 300 && statusHttp < 400) return methodColors.POST; 
    if (statusHttp >= 400 && statusHttp < 500) return methodColors.PUT; 
    return methodColors.DELETE; 
  };
  const getStatusText = (statusHttp) => {
    if (typeof statusHttp === 'string') return statusHttp.replace('_', ' ');
    if (!statusHttp && statusHttp !== 0) return 'N/A';
    if (statusHttp >= 200 && statusHttp < 300) return 'Sukses';
    if (statusHttp >= 300 && statusHttp < 400) return 'Redirect';
    if (statusHttp >= 400 && statusHttp < 500) return 'Client Error';
    return 'Server Error';
  };

  // Helper untuk ekstensi file dari content type
  function getExtensionFromContentType(contentType) {
    if (!contentType) return '';
    if (contentType.includes('json')) return '.json';
    if (contentType.includes('pdf')) return '.pdf';
    if (contentType.includes('png')) return '.png';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) return '.jpg';
    if (contentType.includes('gif')) return '.gif';
    if (contentType.includes('webp')) return '.webp';
    if (contentType.includes('svg')) return '.svg';
    if (contentType.includes('mp4')) return '.mp4';
    if (contentType.includes('webm')) return '.webm';
    if (contentType.includes('mpeg')) return '.mpeg';
    if (contentType.includes('xml')) return '.xml';
    if (contentType.includes('html')) return '.html';
    if (contentType.includes('text/plain')) return '.txt';
    if (contentType.includes('octet-stream')) return '.bin';
    const parts = contentType.split('/');
    if (parts.length === 2) return `.${parts[1].split('+')[0]}`; // Ambil subtype sebelum + (misal application/problem+json -> .json)
    return '.data';
  }

  const renderResponseContent = () => {
    if (executingRequest) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-sm text-slate-500 dark:text-slate-400">
                <Icon icon="svg-spinners:ring-resize" className="text-3xl mb-3 text-emerald-500" />
                Memuat respons...
            </div>
        );
    }
    if (!responseData && !responseStatus) { // Belum ada request / response
         return <div className="text-slate-400 dark:text-slate-500 text-center py-10 text-xs">Eksekusi permintaan untuk melihat respons.</div>;
    }
    // Jika ada responseStatus tapi responseData null (mungkin dari error handler)
    if (!responseData && responseStatus) {
        return <div className="text-slate-400 dark:text-slate-500 text-center py-10 text-xs">Tidak ada data respons untuk ditampilkan. Status: {responseStatus}</div>;
    }


    const contentType = responseHeaders?.['content-type']?.toLowerCase();

    if (responseData instanceof Blob && objectUrl) {
        const commonMediaStyle = { maxWidth: '100%', maxHeight: '450px', display: 'block', margin: 'auto', border: '1px solid #ccc', borderRadius: '4px' };
        if (contentType?.startsWith('image/')) {
            return <img src={objectUrl} alt="Response Image" style={commonMediaStyle} />;
        } else if (contentType?.startsWith('video/')) {
            return <video controls src={objectUrl} style={commonMediaStyle} />;
        } else if (contentType === 'application/pdf') {
            return <embed src={objectUrl} type="application/pdf" width="100%" height="500px" style={{ border: '1px solid #ccc', borderRadius: '4px', minHeight: '400px' }} />;
        } else {
             const downloadName = `response_file${getExtensionFromContentType(contentType)}`;
            return (
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                    <Icon icon="ph:file-arrow-down-duotone" className="text-4xl text-emerald-500 mb-3 mx-auto" />
                    <p className="mb-3 text-sm text-slate-700 dark:text-slate-200">
                        File diterima: <span className="font-medium">{contentType || 'Tipe tidak diketahui'}</span>
                    </p>
                    <a
                        href={objectUrl}
                        download={downloadName}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                    >
                        <Icon icon="ph:download-simple-duotone" className="mr-2" />
                        Unduh {downloadName}
                    </a>
                </div>
            );
        }
    } else if (typeof responseData === 'object' && !(responseData instanceof Blob)) { 
         return (
            <div className="border border-slate-200 dark:border-slate-600/70 rounded-lg overflow-hidden">
                <SyntaxHighlighter language={'json'} style={typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? syntaxHighlighterStyleDark : syntaxHighlighterStyleLight} customStyle={{ margin: 0, padding: '0.75rem', borderRadius: '0px' }} className="text-xs max-h-[400px] overflow-auto simple-scrollbar">
                    {JSON.stringify(responseData, null, 2)}
                </SyntaxHighlighter>
            </div>
        );
    } else if (typeof responseData === 'string') { 
        const lang = contentType?.includes('xml') ? 'xml' : contentType?.includes('html') ? 'html' : 'plaintext';
         if (contentType?.includes('text/html')) {
            return (
                <iframe
                    sandbox="allow-same-origin"
                    srcDoc={responseData}
                    style={{ width: '100%', height: '400px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white' }}
                    title="HTML Response"
                />
            );
        }
        return (
            <div className="border border-slate-200 dark:border-slate-600/70 rounded-lg overflow-hidden">
                <SyntaxHighlighter language={lang} style={typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? syntaxHighlighterStyleDark : syntaxHighlighterStyleLight} customStyle={{ margin: 0, padding: '0.75rem', borderRadius: '0px' }} className="text-xs max-h-[400px] overflow-auto simple-scrollbar">
                    {responseData}
                </SyntaxHighlighter>
            </div>
        );
    } else if (responseData?.error) { // Handle custom error objects from catch blocks
        return (
            <div className="text-red-500 dark:text-red-400 p-3 text-xs bg-red-50 dark:bg-red-900/20 rounded-md border border-red-300 dark:border-red-600/50">
                <p><strong>Error:</strong> {responseData.error}</p>
                {responseData.message && <p className="mt-1">{responseData.message}</p>}
            </div>
        );
    }

    return <div className="text-slate-400 dark:text-slate-500 text-center py-10 text-xs">Format respons tidak didukung atau tidak ada data untuk ditampilkan.</div>;
  };


  return (
    <div className="w-full px-2 sm:px-4 md:px-6 py-6">
      <ToastContainer position="top-right" autoClose={3000} newestOnTop theme="colored"
        toastClassName={(o) => `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : o?.type === 'warning' ? 'bg-yellow-500 text-black' : 'bg-sky-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`}
      />
      <Card
        bodyClass="relative p-0 h-full overflow-hidden"
        className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
      >
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                    <Icon icon="ph:circuitry-duotone" className="text-2xl sm:text-3xl" />
                </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                Api Manager
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Jelajahi Manajer OpenAPI & Playground!
            </p>
          </div>

        <SimpleBar className="h-full" style={{ maxHeight: 'calc(100vh - 160px)' }}>
            <div className="p-4 sm:p-6">
                {status === "loading" && ( <div className="flex flex-col items-center justify-center p-10 min-h-[300px]"><Icon icon="svg-spinners:blocks-shuffle-3" className="text-5xl text-teal-500 mb-4" /><p className="text-lg font-medium text-slate-600 dark:text-slate-300">Memuat Spesifikasi API...</p></div>)}
                {status === "failed" && (
                    <div className="flex flex-col items-center justify-center p-6 sm:p-10 min-h-[calc(100vh-300px)] bg-red-50 dark:bg-red-800/20 rounded-lg">
                        <Icon icon="ph:warning-octagon-duotone" className="text-5xl sm:text-6xl text-red-500 mb-4" /><p className="text-lg sm:text-xl font-semibold text-red-700 dark:text-red-300">Gagal Memuat Spesifikasi</p><p className="text-sm text-red-600 dark:text-red-400 mt-2 text-center max-w-xl">{error}</p>
                    </div>
                )}

                {status === "succeeded" && openAPISpec && (
                    <div className="space-y-6">
                        <div className={sectionCardClass}>
                            <h3 className="text-md sm:text-lg font-semibold text-emerald-700 dark:text-emerald-300 mb-3 flex items-center">
                                <Icon icon="ph:info-duotone" className="mr-2 text-xl sm:text-2xl" /> Informasi API
                            </h3>
                            <div className="bg-white dark:bg-slate-700/50 p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-600/70 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-1.5">
                                <p><strong className="text-emerald-600 dark:text-emerald-400">Judul:</strong> {openAPISpec.info?.title || "N/A"}</p>
                                <p><strong className="text-emerald-600 dark:text-emerald-400">Versi:</strong> {openAPISpec.info?.version || "N/A"}</p>
                                <p><strong className="text-emerald-600 dark:text-emerald-400">Base URL:</strong> {openAPISpec.servers?.[0]?.url || "N/A"}</p>
                                {openAPISpec.info?.description && <p><strong className="text-emerald-600 dark:text-emerald-400">Deskripsi:</strong> {openAPISpec.info.description}</p>}
                            </div>
                        </div>

                        <div className={`${sectionCardClass}`}>
                            <h3 className="text-md sm:text-lg font-semibold text-emerald-700 dark:text-emerald-300 mb-3 flex items-center">
                                <Icon icon="ph:list-bullets-duotone" className="mr-2 text-xl sm:text-2xl" /> Endpoint
                            </h3>
                            <div className="mb-4">
                                <Select label="" options={tags.map(tag => ({ label: `${tag.charAt(0).toUpperCase() + tag.slice(1)} (${(endpoints.filter(ep => ep.tags.includes(tag)) || []).length || (tag === 'all' ? endpoints.length : 0) })`, value: tag }))} value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} className={`${inputBaseClass} text-sm`} inputClassName="text-sm py-2.5"/>
                            </div>
                            {filteredEndpoints.length === 0 ? (
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-md text-slate-500 dark:text-slate-400 text-center text-sm">Tidak ada endpoint untuk tag ini.</div>
                            ) : (
                                <div className="bg-white dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600/70 overflow-hidden">
                                    <SimpleBar style={{ maxHeight: 'calc(100vh - 550px)' }} className="min-h-[200px]"> {/* Sesuaikan maxheight jika perlu */}
                                        <div className="divide-y divide-slate-200 dark:divide-slate-600/70">
                                        {filteredEndpoints.map((endpoint, index) => (
                                            <div key={index} className={`p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${selectedEndpoint?.path === endpoint.path && selectedEndpoint?.method === endpoint.method && isEndpointModalOpen ? 'bg-emerald-50 dark:bg-emerald-500/10 border-l-4 border-emerald-500' : ''}`} onClick={() => handleSelectEndpoint(endpoint)}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${methodColors[endpoint.method] || methodColors.GET}`}>{endpoint.method}</span>
                                                    <span className="text-xs text-slate-400 dark:text-slate-500 truncate ml-2">{endpoint.operationId || 'N/A'}</span>
                                                </div>
                                                <div className="text-xs sm:text-sm font-mono text-emerald-700 dark:text-emerald-400 truncate">{endpoint.path}</div>
                                                {endpoint.summary && (<div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{endpoint.summary}</div>)}
                                            </div>
                                        ))}
                                        </div>
                                    </SimpleBar>
                                </div>
                            )}
                        </div>
                        {endpoints.length === 0 && (
                            <div className={sectionCardClass}>
                                <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                                    Tidak ada endpoint API yang didefinisikan dalam spesifikasi OpenAPI.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </SimpleBar>
      </Card>

      {/* Modal untuk Detail Endpoint */}
      {selectedEndpoint && isEndpointModalOpen && (
        <Modal
            title={
                <span className="flex items-center text-slate-700 dark:text-slate-200 text-lg">
                    <Icon icon="ph:plugs-connected-duotone" className="mr-2 text-emerald-500 dark:text-emerald-400 text-xl"/>
                     {(methodOverride || selectedEndpoint.method)} <span className="text-slate-400 dark:text-slate-500 mx-1.5 font-normal text-base">|</span> <span className="font-mono">{selectedEndpoint.path}</span>
                </span>
            }
            activeModal={isEndpointModalOpen}
            onClose={closeEndpointModal}
            className="max-w-md border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
            footerContent={
                <div className="flex flex-col sm:flex-row justify-end w-full gap-3">
                    <Button
                        text="Tutup"
                        className="bg-slate-300 hover:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-200 rounded-lg py-2 px-4 font-medium"
                        onClick={closeEndpointModal}
                    />
                </div>
            }
        >
            <SimpleBar style={{ maxHeight: 'calc(80vh - 100px)' }}> {/* Inner scroll for modal content */}
                <div className="p-1 sm:p-2 md:p-4">
                    <div className="space-y-5">
                        {/* Ringkasan dan Override Method */}
                        <div>
                            {selectedEndpoint.summary && <div className="mb-4 bg-slate-100 dark:bg-slate-700/60 p-3 rounded-md text-xs sm:text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600/50">{selectedEndpoint.summary}</div>}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1.5">Ganti Metode (Override):</label>
                                    <Select
                                        options={[{ label: `Original: ${selectedEndpoint.method}`, value: selectedEndpoint.method }, ...Object.keys(methodColors).filter(m => m !== selectedEndpoint.method).map(m => ({label: m, value: m})) ]}
                                        value={methodOverride}
                                        onChange={(e) => setMethodOverride(e.target.value)}
                                        className={inputBaseClass}
                                    />
                                </div>
                                <div className="text-right">
                                     <span className={`px-3 py-1.5 text-sm font-semibold rounded-md ${methodColors[methodOverride || selectedEndpoint.method] || methodColors.GET}`}>{methodOverride || selectedEndpoint.method}</span>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="bg-white dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600/70 shadow-inner">
                            <div className="flex border-b border-slate-200 dark:border-slate-600/70">
                                {['params', 'body', 'response', 'curl'].map(tabName => (
                                    <button key={tabName}
                                        className={`flex-1 sm:flex-none px-3 py-2.5 sm:px-4 text-xs sm:text-sm font-medium focus:outline-none transition-colors duration-150
                                            ${activeTab === tabName ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-700'}
                                            ${tabName === 'body' && !["POST", "PUT", "PATCH"].includes(methodOverride || selectedEndpoint.method) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        onClick={() => setActiveTab(tabName)}
                                        disabled={tabName === 'body' && !["POST", "PUT", "PATCH"].includes(methodOverride || selectedEndpoint.method)}
                                    >
                                        {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
                                    </button>
                                ))}
                            </div>

                            <div className="p-3 sm:p-4 min-h-[250px]">
                                {activeTab === 'params' && (
                                    <div className="space-y-4">
                                        {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Parameter Terdefinisi</h4>
                                                {selectedEndpoint.parameters.map((param, idx) => (
                                                    <div key={`defined-${idx}`} className="mb-3 p-3 border border-slate-200 dark:border-slate-600/80 rounded-md bg-slate-50 dark:bg-slate-700/30">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <div>
                                                                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">{param.name}</span>
                                                                <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300">{param.in}</span>
                                                                {param.required && <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-500/30 text-red-600 dark:text-red-300">wajib</span>}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 dark:text-slate-500">{param.schema?.type || "string"}</div>
                                                        </div>
                                                        {param.description && <div className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 italic">{param.description}</div>}
                                                        <Textinput id={`param-${param.name}`} value={paramValues[param.name] || ""} onChange={(e) => handleParamChange(param.name, e.target.value)} placeholder={`Masukkan ${param.name}...`} className={`${inputBaseClass} text-xs`} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Parameter Kustom</h4>
                                            {customParams.length === 0 && <div className="text-slate-400 dark:text-slate-500 text-center py-2 text-xs">Tidak ada parameter kustom.</div>}
                                            <div className="space-y-3">
                                            {customParams.map((param, idx) => (
                                                <div key={`custom-${idx}`} className="p-3 border border-slate-200 dark:border-slate-600/80 rounded-md bg-slate-50 dark:bg-slate-700/30 flex flex-col sm:flex-row items-start gap-2">
                                                    <Textinput value={param.name} onChange={(e) => handleCustomParamChange(idx, 'name', e.target.value)} placeholder="Nama" className={`${inputBaseClass} text-xs flex-1`} />
                                                    <Textinput value={param.value} onChange={(e) => handleCustomParamChange(idx, 'value', e.target.value)} placeholder="Value" className={`${inputBaseClass} text-xs flex-1`} />
                                                    <Select options={[{ label: "Query", value: "query" }, { label: "Header", value: "header" }, { label: "Path", value: "path" }]} value={param.in} onChange={(e) => handleCustomParamChange(idx, 'in', e.target.value)} className={`${inputBaseClass} text-xs sm:w-auto`} />
                                                    <Button onClick={() => handleRemoveCustomParam(idx)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-md self-start sm:self-center mt-1 sm:mt-0" icon="ph:x-circle-duotone" iconClassName="text-lg" />
                                                </div>
                                            ))}
                                            </div>
                                            <Button onClick={handleAddCustomParam} className={`${buttonSecondaryClass} mt-3 text-xs`} text="Tambah Parameter Kustom" icon="ph:plus-circle-duotone" iconClassName="mr-1"/>
                                        </div>
                                        {(!selectedEndpoint.parameters || selectedEndpoint.parameters.length === 0) && customParams.length === 0 && (<div className="text-slate-400 dark:text-slate-500 text-center py-4 text-xs">Tidak ada parameter.</div>)}
                                    </div>
                                )}
                                {activeTab === 'body' && (
                                    <div className="space-y-3">
                                        {!["POST", "PUT", "PATCH"].includes(methodOverride || selectedEndpoint.method) ? (
                                            <div className="text-slate-400 dark:text-slate-500 text-center py-4 text-xs">Request body tidak berlaku untuk metode {(methodOverride || selectedEndpoint.method)}.</div>
                                        ) : (
                                        <div>
                                            <div className="mb-1.5 text-xs text-slate-500 dark:text-slate-400"><strong className="text-slate-600 dark:text-slate-300">Content Type:</strong> (Default: application/json jika header tidak di-set manual)</div>
                                            <Textarea value={requestBody} onChange={handleRequestBodyChange} className={`${inputBaseClass} font-mono text-xs min-h-[150px] sm:min-h-[200px]`} placeholder="{ }" />
                                        </div>
                                        )}
                                    </div>
                                )}
                                {activeTab === 'response' && (
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
                                            <div className="flex items-center space-x-2">
                                                <span className={`px-2 py-1 rounded-md text-[10px] sm:text-xs font-mono border ${getStatusColorClass(responseStatus)}`}>
                                                    {responseStatus || (executingRequest ? 'LOADING' : '')}
                                                </span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400">{getStatusText(responseStatus) || (executingRequest ? 'Loading...' : '')}</span>
                                                {responseTime != null && (<span className="text-xs text-slate-400 dark:text-slate-500">{responseTime}ms</span>)}
                                            </div>
                                            {responseData && !(responseData instanceof Blob && !objectUrl /* jangan tampilkan copy jika blob belum bisa di-preview/download */) && (
                                              <Button onClick={copyResponseToClipboard} text={<><Icon icon={copiedResponse ? "ph:check-circle-duotone" : "ph:copy-duotone"} className="mr-1 text-sm" /> {copiedResponse ? "Disalin!" : "Salin"}</>} className={`${copiedResponse ? (buttonPrimaryClass + ' bg-green-500 hover:bg-green-600') : buttonSecondaryClass} py-1 px-2 text-[10px]`} />
                                            )}
                                        </div>
                                        {responseHeaders && (
                                            <div className="mb-3">
                                                <Disclosure>
                                                {({open}) => (<>
                                                <Disclosure.Button className="flex items-center justify-between w-full text-left text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 py-1">
                                                    <span>Header Respons</span> <Icon icon="ph:caret-down-bold" className={`${open ? 'rotate-180' : ''} transform transition-transform`} />
                                                </Disclosure.Button>
                                                <Disclosure.Panel>
                                                    <pre className="mt-1 bg-slate-100 dark:bg-slate-800/50 p-2.5 rounded text-slate-600 dark:text-slate-300 font-mono text-[10px] overflow-x-auto max-h-40 border border-slate-200 dark:border-slate-600/70 simple-scrollbar">{JSON.stringify(responseHeaders, null, 2)}</pre>
                                                </Disclosure.Panel>
                                                </>)}
                                                </Disclosure>
                                            </div>
                                        )}
                                        {renderResponseContent()}
                                    </div>
                                )}
                                {activeTab === 'curl' && (
                                    <div className="space-y-3">
                                        {curlCommand ? (
                                            <>
                                                <div className="flex justify-end">
                                                <Button onClick={copyCurlToClipboard} text={<><Icon icon={copiedCurl ? "ph:check-circle-duotone" : "ph:copy-duotone"} className="mr-1" /> {copiedCurl ? "Disalin!" : "Salin cURL"}</>} className={`${copiedCurl ? (buttonPrimaryClass + ' bg-green-500 hover:bg-green-600') : buttonSecondaryClass } text-xs py-1 px-2`} />
                                                </div>
                                                <pre className="p-3 bg-slate-100 dark:bg-slate-800/50 rounded text-slate-600 dark:text-slate-300 font-mono text-xs overflow-x-auto border border-slate-200 dark:border-slate-600/70 simple-scrollbar max-h-[300px]">{curlCommand}</pre>
                                            </>
                                        ) : (
                                            <div className="text-slate-400 dark:text-slate-500 text-center py-4 text-xs">Perintah cURL akan muncul di sini.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Tombol Eksekusi */}
                        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700/60">
                            <Button onClick={executeRequest} disabled={executingRequest || !selectedEndpoint} className={`${buttonPrimaryClass} w-full text-base py-3`}
                                icon={executingRequest ? "svg-spinners:ring-resize" : "ph:rocket-launch-duotone"}
                                text={executingRequest ? "Mengeksekusi..." : "Eksekusi Permintaan"}
                                iconPosition="left" iconClassName="mr-2 text-lg"
                            />
                        </div>
                    </div>
                </div>
            </SimpleBar>
        </Modal>
      )}
    </div>
  );
};

export default OpenAPIManager;