"use client";
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from "react-redux";
import SimpleBar from "simplebar-react";
import useWidth from "@/hooks/useWidth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';
import axios from 'axios'; // Import axios

const OpenAPIManager = () => {
  const dispatch = useDispatch();
  const { width, breakpoints } = useWidth();

  // State for OpenAPI specification
  const [openAPISpec, setOpenAPISpec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [endpoints, setEndpoints] = useState([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [status, setStatus] = useState("loading");

  // Try It playground states
  const [paramValues, setParamValues] = useState({});
  const [requestBody, setRequestBody] = useState("");
  const [responseData, setResponseData] = useState(null);
  const [responseStatus, setResponseStatus] = useState(null);
  const [responseHeaders, setResponseHeaders] = useState(null);
  const [responseTime, setResponseTime] = useState(null);
  const [executingRequest, setExecutingRequest] = useState(false);
  const [curlCommand, setCurlCommand] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("params"); // params, body, response

  // Fetch OpenAPI specification on component mount
  useEffect(() => {
    const fetchOpenAPISpec = async () => {
      try {
        setStatus("loading");
        // Load from local API instead of requiring URL input
        const response = await fetch('/api/openapi');
        if (!response.ok) {
          throw new Error(`Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setOpenAPISpec(data);

        // Extract endpoints from the spec
        if (data.paths) {
          const extractedEndpoints = [];
          Object.entries(data.paths).forEach(([path, methods]) => {
            Object.entries(methods).forEach(([method, details]) => {
              extractedEndpoints.push({
                path,
                method: method.toUpperCase(),
                summary: details.summary || path,
                operationId: details.operationId,
                parameters: details.parameters || [],
                requestBody: details.requestBody,
                responses: details.responses
              });
            });
          });
          setEndpoints(extractedEndpoints);
        }

        setLoading(false);
        setStatus("succeeded");
      } catch (err) {
        setError(err.message || 'An error occurred while fetching the OpenAPI specification.');
        setLoading(false);
        setStatus("failed");
        toast.error('Failed to load OpenAPI specification');
      }
    };
    fetchOpenAPISpec();
  }, []);

  const handleSelectEndpoint = (endpoint) => {
    setSelectedEndpoint(endpoint);
    // Reset playground states when selecting a new endpoint
    setParamValues({});
    setRequestBody("");
    setResponseData(null);
    setResponseStatus(null);
    setResponseHeaders(null);
    setResponseTime(null);
    setCurlCommand("");
    setActiveTab("params");

    // Initialize parameter values
    const initialParams = {};
    endpoint.parameters?.forEach(param => {
      initialParams[param.name] = "";
    });
    setParamValues(initialParams);

    // Initialize request body if any
    if (endpoint.requestBody?.content?.["application/json"]?.schema) {
      setRequestBody(JSON.stringify({}, null, 2));
    } else {
      setRequestBody("");
    }
  };

  const handleParamChange = (name, value) => {
    setParamValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRequestBodyChange = (e) => {
    setRequestBody(e.target.value);
  };

  const buildRequestUrl = () => {
    if (!selectedEndpoint) return "";

    const { path } = selectedEndpoint;
    let baseUrl = openAPISpec.servers?.[0]?.url || "https://api.example.com";
    
    // Remove trailing slash from baseUrl if present
    baseUrl = baseUrl.replace(/\/$/, '');

    // Replace path parameters
    let endpointPath = path;
    Object.entries(paramValues).forEach(([name, value]) => {
      if (selectedEndpoint.parameters?.find(p => p.name === name && p.in === "path")) {
        endpointPath = endpointPath.replace(`{${name}}`, encodeURIComponent(value));
      }
    });

    return `${baseUrl}${endpointPath}`;
  };

  const buildQueryParams = () => {
    const queryParams = {};
    Object.entries(paramValues).forEach(([name, value]) => {
      if (selectedEndpoint.parameters?.find(p => p.name === name && p.in === "query") && value) {
        queryParams[name] = value;
      }
    });
    return queryParams;
  };

  const buildHeaders = () => {
    const headers = {
      "Content-Type": "application/json"
    };

    // Add header parameters
    Object.entries(paramValues).forEach(([name, value]) => {
      if (selectedEndpoint.parameters?.find(p => p.name === name && p.in === "header") && value) {
        headers[name] = value;
      }
    });

    return headers;
  };

  const generateCurlCommand = () => {
    if (!selectedEndpoint) return "";

    const { method } = selectedEndpoint;
    const url = buildRequestUrl();
    const queryParams = buildQueryParams();
    const headers = buildHeaders();

    // Build the URL with query parameters
    let fullUrl = url;
    const queryString = new URLSearchParams(queryParams).toString();
    if (queryString) {
      fullUrl += `?${queryString}`;
    }

    // Start building the cURL command
    let curl = `curl -X ${method} "${fullUrl}"`;

    // Add headers
    Object.entries(headers).forEach(([key, value]) => {
      curl += ` -H "${key}: ${value}"`;
    });

    // Add request body if applicable
    if (["POST", "PUT", "PATCH"].includes(method) && requestBody.trim()) {
      try {
        // Format the JSON properly for cURL
        const formattedBody = JSON.stringify(JSON.parse(requestBody));
        curl += ` -d '${formattedBody}'`;
      } catch (e) {
        // If the JSON is invalid, just use the raw input
        curl += ` -d '${requestBody}'`;
      }
    }

    return curl;
  };

  const copyToClipboard = () => {
    const curl = generateCurlCommand();
    navigator.clipboard.writeText(curl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("cURL command copied to clipboard");
    });
  };

  const executeRequest = async () => {
    if (!selectedEndpoint) return;

    setExecutingRequest(true);
    setResponseData(null);
    setResponseStatus(null);
    setResponseHeaders(null);
    setResponseTime(null);

    const startTime = Date.now();

    try {
      const { method } = selectedEndpoint;
      const url = buildRequestUrl();
      const queryParams = buildQueryParams();
      const headers = buildHeaders();

      // Prepare axios config
      const axiosConfig = {
        method: method.toLowerCase(),
        url: url,
        headers: headers,
        params: queryParams,
        timeout: 30000, // 30 second timeout
        validateStatus: function (status) {
          // Don't throw errors for any status code - we want to see all responses
          return true;
        }
      };

      // Add request body if applicable
      if (["POST", "PUT", "PATCH"].includes(method) && requestBody.trim()) {
        try {
          axiosConfig.data = JSON.parse(requestBody);
        } catch (e) {
          toast.error("Invalid JSON in request body");
          setExecutingRequest(false);
          return;
        }
      }

      // Make the actual request
      const response = await axios(axiosConfig);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Set response data
      setResponseData(response.data);
      setResponseStatus(response.status);
      setResponseHeaders(response.headers);
      setResponseTime(responseTime);
      setCurlCommand(generateCurlCommand());
      setActiveTab("response");

      // Show success/error toast based on status
      if (response.status >= 200 && response.status < 300) {
        toast.success(`Request successful (${response.status})`);
      } else if (response.status >= 400 && response.status < 500) {
        toast.warn(`Client error (${response.status})`);
      } else if (response.status >= 500) {
        toast.error(`Server error (${response.status})`);
      } else {
        toast.info(`Response received (${response.status})`);
      }

    } catch (err) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      setResponseTime(responseTime);
      
      if (err.code === 'ECONNABORTED') {
        toast.error('Request timeout - the server took too long to respond');
        setResponseData({ error: 'Request timeout', message: 'The server took too long to respond' });
        setResponseStatus('TIMEOUT');
      } else if (err.response) {
        // Server responded with error status
        setResponseData(err.response.data || { error: 'Server Error', message: err.message });
        setResponseStatus(err.response.status);
        setResponseHeaders(err.response.headers);
        toast.error(`Request failed (${err.response.status}): ${err.response.statusText}`);
      } else if (err.request) {
        // Network error
        setResponseData({ 
          error: 'Network Error', 
          message: 'Unable to reach the server. Please check your connection and CORS settings.',
          details: err.message
        });
        setResponseStatus('NETWORK_ERROR');
        toast.error('Network error - unable to reach the server');
      } else {
        // Other error
        setResponseData({ error: 'Request Error', message: err.message });
        setResponseStatus('ERROR');
        toast.error(`Request failed: ${err.message}`);
      }
      
      setCurlCommand(generateCurlCommand());
      setActiveTab("response");
    } finally {
      setExecutingRequest(false);
    }
  };

  // Method color mapping for futuristic design
  const getMethodColor = (method) => {
    switch (method) {
      case "GET":
        return "bg-cyan-600"
      case "POST":
        return "bg-emerald-600"
      case "PUT":
        return "bg-amber-600"
      case "DELETE":
        return "bg-rose-600"
      default:
        return "bg-slate-600"
    }
  }

  const renderMethodBadge = (method) => {
    return (
      <span className={`${getMethodColor(method)} text-white text-xs font-bold px-2 py-1 rounded-lg`}>
        {method}
      </span>
    );
  };

  const getStatusColor = (status) => {
    if (typeof status === 'string') {
      return 'bg-rose-900/30 text-rose-400'; // Error states
    }
    
    if (status >= 200 && status < 300) {
      return 'bg-emerald-900/30 text-emerald-400';
    } else if (status >= 300 && status < 400) {
      return 'bg-blue-900/30 text-blue-400';
    } else if (status >= 400 && status < 500) {
      return 'bg-amber-900/30 text-amber-400';
    } else {
      return 'bg-rose-900/30 text-rose-400';
    }
  };

  const getStatusText = (status) => {
    if (typeof status === 'string') {
      return status.replace('_', ' ');
    }
    
    if (status >= 200 && status < 300) {
      return 'Success';
    } else if (status >= 300 && status < 400) {
      return 'Redirect';
    } else if (status >= 400 && status < 500) {
      return 'Client Error';
    } else {
      return 'Server Error';
    }
  };

  return (
    <div className="w-full px-2 py-6">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        toastClassName="bg-slate-800 text-slate-200 border border-slate-700"
      />
      <Card
        bodyClass="relative p-6 h-full overflow-hidden"
        className="w-full border border-indigo-700 rounded-3xl shadow-lg bg-white text-slate-900"
      >
        <SimpleBar className="h-full">
          <div className="flex items-center justify-center mb-6 space-x-2">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg">
            <Icon icon="material-symbols:bolt" className="text-xl" />
          </div>
          <h1 className="ml-3 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            APIS
          </h1>
          </div>

          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/20 to-blue-500/20 blur-xl animate-pulse"></div>
              <div className="relative animate-spin rounded-full h-20 w-20 border-4 border-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-border">
                <div className="absolute inset-1 rounded-full bg-white dark:bg-gray-900"></div>
              </div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-pulse"></div>
            </div>
            <div className="mt-8 text-center space-y-2">
              <h3 className="text-lg font-semibold bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 bg-clip-text text-transparent animate-pulse">
                Loading API Specifications
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                Please wait while we fetch the latest data...
              </p>
              <div className="flex justify-center space-x-1 mt-4">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          </div>
          )}

          {status === "failed" && (
            <div className="p-4 rounded-xl bg-rose-900 bg-opacity-30 border border-rose-700 text-rose-300">
              <div className="flex items-center">
                <span className="text-xl mr-2">⚠️</span>
                <p>Gagal: {error}</p>
              </div>
            </div>
          )}

          {status === "succeeded" && openAPISpec && (
            <div className="space-y-6">
              <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                <h3 className="text-lg font-medium text-cyan-300 mb-3 flex items-center">
                  <Icon icon="mdi:information-outline" className="mr-2 text-xl" />
                  API Information
                </h3>
                <div className="bg-slate-900 p-4 rounded-xl text-slate-300">
                  <div className="mb-2">
                    <span className="text-cyan-400 font-medium">Title:</span> {openAPISpec.info?.title || "Untitled API"}
                  </div>
                  <div className="mb-2">
                    <span className="text-cyan-400 font-medium">Version:</span> {openAPISpec.info?.version || "Unknown"}
                  </div>
                  <div className="mb-2">
                    <span className="text-cyan-400 font-medium">Base URL:</span> {openAPISpec.servers?.[0]?.url || "Not specified"}
                  </div>
                  {openAPISpec.info?.description && (
                    <div>
                      <span className="text-cyan-400 font-medium">Description:</span> {openAPISpec.info.description}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4">
                  <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 h-full">
                    <h3 className="text-lg font-medium text-cyan-300 mb-3 flex items-center">
                      <Icon icon="mdi:routes" className="mr-2 text-xl" />
                      Endpoints
                    </h3>

                    {endpoints.length === 0 ? (
                      <div className="bg-slate-900 p-4 rounded-xl text-slate-400">
                        No endpoints found in the specification.
                      </div>
                    ) : (
                      <div className="bg-slate-900 rounded-xl overflow-hidden">
                        <SimpleBar style={{ maxHeight: '400px' }}>
                          <div className="divide-y divide-slate-700">
                            {endpoints.map((endpoint, index) => (
                              <div
                                key={index}
                                className={`p-3 cursor-pointer hover:bg-slate-800 transition-colors ${selectedEndpoint === endpoint ? 'bg-cyan-900/30 border-l-4 border-cyan-500' : ''}`}
                                onClick={() => handleSelectEndpoint(endpoint)}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  {renderMethodBadge(endpoint.method)}
                                  <span className="text-xs text-slate-400">{endpoint.operationId || '—'}</span>
                                </div>
                                <div className="text-sm font-mono text-slate-300 truncate">{endpoint.path}</div>
                                {endpoint.summary && (
                                  <div className="text-xs text-slate-400 mt-1 truncate">{endpoint.summary}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </SimpleBar>
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-8">
                  {!selectedEndpoint ? (
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 h-full flex items-center justify-center">
                      <div className="text-center p-8">
                        <div className="w-16 h-16 bg-cyan-900/30 text-cyan-400 flex items-center justify-center rounded-full mx-auto mb-4">
                          <Icon icon="mdi:arrow-left" className="text-2xl" />
                        </div>
                        <p className="text-slate-400">Select an endpoint from the list to view details and try it out</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                        <div className="flex items-center gap-2 mb-2">
                          {renderMethodBadge(selectedEndpoint.method)}
                          <h3 className="text-lg font-medium text-cyan-300 font-mono">{selectedEndpoint.path}</h3>
                        </div>

                        {selectedEndpoint.summary && (
                          <div className="bg-slate-900/50 p-3 rounded-xl text-slate-300 mb-4">
                            {selectedEndpoint.summary}
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                        <h3 className="text-lg font-medium text-cyan-300 mb-4 flex items-center">
                          <Icon icon="mdi:flask-outline" className="mr-2 text-xl" />
                          Try It
                        </h3>

                        <div className="bg-slate-900 rounded-xl overflow-hidden">
                          <div className="flex border-b border-slate-700">
                            <button
                              className={`px-4 py-2 text-sm font-medium ${activeTab === 'params' ? 'bg-cyan-900/30 text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-400 hover:text-slate-300'}`}
                              onClick={() => setActiveTab('params')}
                            >
                              Parameters
                            </button>
                            <button
                              className={`px-4 py-2 text-sm font-medium ${activeTab === 'body' ? 'bg-cyan-900/30 text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-400 hover:text-slate-300'} ${!["POST", "PUT", "PATCH"].includes(selectedEndpoint.method) ? 'opacity-50 cursor-not-allowed' : ''}`}
                              onClick={() => setActiveTab('body')}
                              disabled={!["POST", "PUT", "PATCH"].includes(selectedEndpoint.method)}
                            >
                              Request Body
                            </button>
                            <button
                              className={`px-4 py-2 text-sm font-medium ${activeTab === 'response' ? 'bg-cyan-900/30 text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-400 hover:text-slate-300'}`}
                              onClick={() => setActiveTab('response')}
                            >
                              Response
                            </button>
                          </div>

                          {/* Parameters Tab */}
                          {activeTab === 'params' && (
                            <div className="p-4">
                              {(!selectedEndpoint.parameters || selectedEndpoint.parameters.length === 0) ? (
                                <div className="text-slate-400 text-center py-4">
                                  No parameters required for this endpoint
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {selectedEndpoint.parameters.map((param, idx) => (
                                    <div key={idx} className="border border-slate-700 rounded-lg p-3">
                                      <div className="flex justify-between items-center mb-2">
                                        <div>
                                          <span className="font-mono text-cyan-400">{param.name}</span>
                                          <span className="text-xs ml-2 px-2 py-1 rounded bg-slate-800 text-slate-400">
                                            {param.in || "query"}
                                          </span>
                                          {param.required && (
                                            <span className="text-xs ml-2 px-2 py-1 rounded bg-rose-900/30 text-rose-400">
                                              required
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                          {param.schema?.type || "string"}
                                        </div>
                                      </div>
                                      {param.description && (
                                        <div className="text-xs text-slate-400 mb-2">{param.description}</div>
                                      )}
                                      <Textinput
                                        id={`param-${param.name}`}
                                        value={paramValues[param.name] || ""}
                                        onChange={(e) => handleParamChange(param.name, e.target.value)}
                                        placeholder={`Enter ${param.name}...`}
                                        className="bg-slate-800 border-slate-700 text-slate-200 rounded-lg text-sm"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Request Body Tab */}
                          {activeTab === 'body' && (
                            <div className="p-4">
                              {!["POST", "PUT", "PATCH"].includes(selectedEndpoint.method) ? (
                                <div className="text-slate-400 text-center py-4">
                                  Request body not applicable for {selectedEndpoint.method} requests
                                </div>
                              ) : !selectedEndpoint.requestBody ? (
                                <div className="text-slate-400 text-center py-4">
                                  No request body schema defined for this endpoint
                                </div>
                              ) : (
                                <div>
                                  <div className="mb-2 text-xs text-slate-400">
                                    <span className="text-cyan-400 font-medium">Content Type:</span> application/json
                                  </div>
                                  <Textarea
                                    value={requestBody}
                                    onChange={handleRequestBodyChange}
                                    className="bg-slate-800 border-slate-700 text-slate-200 font-mono text-sm rounded-lg h-64"
                                    placeholder="{}"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Response Tab */}
                          {activeTab === 'response' && (
                            <div className="p-4">
                              {!responseData ? (
                                <div className="text-slate-400 text-center py-4">
                                  Execute the request to see the response
                                </div>
                              ) : (
                                <div>
                                  <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center space-x-3">
                                      <span className={`px-2 py-1 rounded-lg text-xs font-mono ${getStatusColor(responseStatus)}`}>
                                        {responseStatus}
                                      </span>
                                      <span className="text-slate-300">
                                        {getStatusText(responseStatus)}
                                      </span>
                                      {responseTime && (
                                        <span className="text-xs text-slate-400">
                                          {responseTime}ms
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {responseHeaders && (
                                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 mb-4">
                                      <div className="text-xs text-slate-400 mb-2">Response Headers</div>
                                      <pre className="bg-slate-900 p-3 rounded text-slate-300 font-mono text-xs overflow-x-auto">
                                        {JSON.stringify(responseHeaders, null, 2)}
                                      </pre>
                                    </div>
                                  )}

                                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                      <div className="text-xs text-slate-400">Response Body</div>
                                    </div>
                                    <pre className="bg-slate-900 p-3 rounded text-slate-300 font-mono text-sm overflow-x-auto max-h-96">
                                      {typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2)}
                                    </pre>
                                  </div>

                                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                    <div className="flex justify-between items-center mb-2">
                                      <div className="text-xs text-slate-400">cURL Command</div>
                                      <button
                                        onClick={copyToClipboard}
                                        className="text-cyan-400 hover:text-cyan-300 flex items-center text-xs"
                                      >
                                        {copied ? <Icon icon="mdi:check" className="mr-1 text-base" /> : <Icon icon="mdi:content-copy" className="mr-1 text-base" />}
                                        {copied ? "Copied!" : "Copy"}
                                      </button>
                                    </div>
                                    <pre className="bg-slate-900 p-3 rounded text-slate-300 font-mono text-sm overflow-x-auto">
                                      {curlCommand}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="p-4 border-t border-slate-700">
                            <Button
                              onClick={executeRequest}
                              disabled={executingRequest}
                              className={`w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 ${executingRequest ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-lg'}`}
                            >
                              {executingRequest ? (
                                <span className="flex items-center justify-center">
                                  <Icon icon="mdi:loading" className="animate-spin mr-2 text-xl" /> Executing...
                                </span>
                              ) : (
                                <span className="flex items-center justify-center">
                                  <Icon icon="mdi:rocket-launch-outline" className="mr-2 text-xl" /> Execute Request
                                </span>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </SimpleBar>
      </Card>
    </div>
  );
};

export default OpenAPIManager;