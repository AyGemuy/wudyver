"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { Icon } from "@iconify/react"; // Menggunakan Iconify React
import { Disclosure } from "@headlessui/react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter"; // Import Light untuk bundle lebih kecil
import { atomOneDark } from "react-syntax-highlighter/dist/cjs/styles/hljs"; // Import style
import { useForm } from "react-hook-form"; // Untuk Try It playground

const APIExplorerPage = () => {
  const [apis, setApis] = useState({});
  const [loading, setLoading] = useState(true);
  const [sortedTagKeys, setSortedTagKeys] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [tryItResponse, setTryItResponse] = useState(null);
  const [tryItLoading, setTryItLoading] = useState(false);
  const [tryItError, setTryItError] = useState(null);

  // Fungsi untuk Try It Playground
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    const fetchSpec = async () => {
      try {
        const res = await fetch("/api/openapi");
        const data = await res.json();
        const paths = data?.paths || {};
        const grouped = {};

        Object.entries(paths).forEach(([path, methods]) => {
          Object.entries(methods).forEach(([method, details]) => {
            const tag = details.tags?.[0] || "Others";
            if (!grouped[tag]) grouped[tag] = [];
            grouped[tag].push({ path, method, details });
          });
        });

        const sortedKeys = Object.keys(grouped).sort();
        setSortedTagKeys(sortedKeys);
        setApis(grouped);

        // Set the first tag as selected by default
        if (sortedKeys.length > 0) {
          setSelectedTag(sortedKeys[0]);
        }
      } catch (err) {
        console.error("Failed to fetch spec:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSpec();
  }, []);

  const methodColors = {
    GET: "bg-emerald-900 text-emerald-300 border border-emerald-700",
    POST: "bg-blue-900 text-blue-300 border border-blue-700",
    PUT: "bg-amber-900 text-amber-300 border border-amber-700",
    DELETE: "bg-rose-900 text-rose-300 border border-rose-700",
    PATCH: "bg-purple-900 text-purple-300 border border-purple-700",
  };

  const handleTagChange = (tag) => {
    setSelectedTag(tag);
  };

  const executeTryIt = async (api, formData) => {
    setTryItLoading(true);
    setTryItResponse(null);
    setTryItError(null);

    let url = api.path;
    let requestBody = null;
    const headers = {
      "Content-Type": "application/json",
    };

    // Handle path parameters
    if (api.details.parameters) {
      api.details.parameters.forEach((param) => {
        if (param.in === "path" && formData[param.name]) {
          url = url.replace(`{${param.name}}`, formData[param.name]);
        }
      });
    }

    // Handle query parameters
    const queryParams = new URLSearchParams();
    if (api.details.parameters) {
      api.details.parameters.forEach((param) => {
        if (param.in === "query" && formData[param.name]) {
          queryParams.append(param.name, formData[param.name]);
        }
      });
    }
    if (queryParams.toString()) {
      url = `${url}?${queryParams.toString()}`;
    }

    // Handle request body for POST/PUT/PATCH
    if (
      (api.method === "post" || api.method === "put" || api.method === "patch") &&
      formData.requestBody
    ) {
      try {
        requestBody = JSON.parse(formData.requestBody);
      } catch (e) {
        setTryItError("Invalid JSON in request body.");
        setTryItLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(url, {
        method: api.method.toUpperCase(),
        headers: headers,
        body: requestBody ? JSON.stringify(requestBody) : undefined,
      });

      const data = await res.json();
      setTryItResponse(data);
    } catch (err) {
      console.error("Failed to execute API:", err);
      setTryItError(err.message || "An error occurred during API execution.");
    } finally {
      setTryItLoading(false);
    }
  };

  const renderParametersForm = (parameters, apiMethod) => {
    if (!parameters || parameters.length === 0) {
      return <p className="text-slate-500 italic;">No parameters required for this endpoint.</p>;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {parameters.map((param, pIdx) => (
          <div key={pIdx} className="flex flex-col">
            <label className="text-xs text-slate-400 mb-1">
              {param.name} {param.required && <span className="text-rose-500">*</span>} ({param.in})
            </label>
            <input
              type="text"
              {...register(param.name, { required: param.required })}
              placeholder={param.description || `Enter ${param.name}`}
              className="bg-slate-700 text-slate-200 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        ))}
        {(apiMethod === "post" || apiMethod === "put" || apiMethod === "patch") && (
          <div className="col-span-full flex flex-col">
            <label className="text-xs text-slate-400 mb-1">Request Body (JSON)</label>
            <textarea
              {...register("requestBody")}
              placeholder="Enter JSON request body here..."
              rows="6"
              className="bg-slate-700 text-slate-200 border border-slate-600 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
            ></textarea>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full px-2 py-6">
      <Card
        bodyClass="relative p-6 h-full overflow-hidden"
        className="w-full border border-indigo-700 rounded-3xl shadow-lg bg-white text-slate-900"
      >
        <div className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg">
            <Icon icon="material-symbols:bolt" className="text-xl" />
          </div>
          <h1 className="ml-3 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            Explorer
          </h1>
        </div>

        {loading ? (
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
        ) : sortedTagKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-slate-800 rounded-2xl border border-slate-700">
            <Icon icon="mdi:magnify" className="text-5xl mb-4 text-slate-400" /> {/* Iconify icon */}
            <p className="text-slate-400">No API Endpoints Found.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {/* Tag Selection */}
            <div className="flex flex-wrap gap-2 mb-6">
              {sortedTagKeys.map((tag, index) => (
                <button
                  key={index}
                  onClick={() => handleTagChange(tag)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedTag === tag
                      ? "bg-cyan-600 text-white shadow-md"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {tag} ({apis[tag].length})
                </button>
              ))}
            </div>

            {/* Selected Tag Content */}
            {selectedTag && (
              <div className="mb-8 bg-slate-800 p-6 rounded-2xl border border-slate-700">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-cyan-800 text-white mr-3">
                    <Icon icon="mdi:tag" className="text-lg" /> {/* Iconify icon */}
                  </div>
                  <h3 className="text-lg font-semibold text-cyan-300">{selectedTag}</h3>
                </div>

                <div className="space-y-3">
                  {apis[selectedTag].map((api, idx) => (
                    <Disclosure key={idx}>
                      {({ open }) => (
                        <>
                          <Disclosure.Button className="bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl flex justify-between cursor-pointer transition-all duration-200 font-medium w-full text-start text-sm text-slate-300 px-6 py-4">
                            <div className="flex items-center">
                              <span
                                className={`px-3 py-1 text-xs font-semibold rounded-lg mr-3 ${
                                  methodColors[api.method.toUpperCase()] || "bg-slate-700 text-slate-300"
                                }`}
                              >
                                {api.method.toUpperCase()}
                              </span>
                              <span className="font-mono text-cyan-300">{api.path}</span>
                            </div>
                            <span
                              className={`${
                                open ? "rotate-180" : ""
                              } transition-all duration-200 text-xl text-cyan-400`}
                            >
                              <Icon icon="heroicons:chevron-down-solid" />
                            </span>
                          </Disclosure.Button>
                          <Disclosure.Panel>
                            <div className="bg-slate-900 text-sm rounded-b-xl border border-slate-700 border-t-0 px-6 py-5 -mt-1">
                              <div className="space-y-4">
                                <div className="flex flex-col space-y-2">
                                  <span className="text-xs text-slate-400">Description:</span>
                                  <p className="text-slate-300">
                                    {api.details.summary || api.details.description || "No description available."}
                                  </p>
                                </div>

                                {api.details.parameters && api.details.parameters.length > 0 && (
                                  <div className="flex flex-col space-y-2">
                                    <span className="text-xs text-slate-400">Parameters:</span>
                                    <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                                      {api.details.parameters.map((param, pIdx) => (
                                        <div key={pIdx} className="flex items-start mb-2 last:mb-0">
                                          <span className="text-xs font-mono bg-slate-700 text-slate-300 px-2 py-1 rounded mr-2">
                                            {param.name}
                                          </span>
                                          <span className="text-xs text-slate-400">
                                            {param.required ? "(required)" : "(optional)"} -{" "}
                                            {param.description || "No description."}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Try It Playground */}
                                <div className="mt-6 border-t border-slate-700 pt-4">
                                  <h4 className="text-md font-semibold text-cyan-400 mb-3 flex items-center">
                                    <Icon icon="mdi:play-box-outline" className="mr-2 text-xl" /> Try It!
                                  </h4>
                                  <form onSubmit={handleSubmit((data) => executeTryIt(api, data))} className="space-y-4">
                                    {renderParametersForm(api.details.parameters, api.method)}
                                    <button
                                      type="submit"
                                      className="flex items-center bg-cyan-600 hover:bg-cyan-700 text-white text-sm px-5 py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
                                      disabled={tryItLoading}
                                    >
                                      {tryItLoading ? (
                                        <Icon icon="mdi:loading" className="animate-spin mr-2 text-xl" />
                                      ) : (
                                        <Icon icon="mdi:send" className="mr-2 text-xl" />
                                      )}
                                      Send Request
                                    </button>
                                  </form>

                                  {tryItLoading && (
                                    <div className="mt-4 text-center text-slate-400 flex items-center justify-center">
                                      <Icon icon="mdi:loading" className="animate-spin mr-2 text-xl" />
                                      Executing request...
                                    </div>
                                  )}

                                  {tryItError && (
                                    <div className="mt-4 p-3 bg-rose-900 border border-rose-700 text-rose-300 rounded-lg">
                                      <h5 className="font-semibold mb-1 flex items-center">
                                        <Icon icon="mdi:alert-circle-outline" className="mr-2 text-xl" />
                                        Error:
                                      </h5>
                                      <p>{tryItError}</p>
                                    </div>
                                  )}

                                  {tryItResponse && (
                                    <div className="mt-4">
                                      <h5 className="text-sm text-slate-400 mb-2">Response:</h5>
                                      <SyntaxHighlighter language="json" style={atomOneDark} className="rounded-lg p-3 text-xs overflow-auto max-h-60">
                                        {JSON.stringify(tryItResponse, null, 2)}
                                      </SyntaxHighlighter>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Disclosure.Panel>
                        </>
                      )}
                    </Disclosure>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default APIExplorerPage;