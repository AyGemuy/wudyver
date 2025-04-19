"use client";

import React, { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { Disclosure } from "@headlessui/react";
import ListLoading from "@/components/skeleton/ListLoading";
import Pagination from "@/components/ui/Pagination";

const APIExplorerPage = () => {
  const [apis, setApis] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(10);
  const [sortedTagKeys, setSortedTagKeys] = useState([]);

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
      } catch (err) {
        console.error("Failed to fetch spec:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSpec();
  }, []);

  const methodColors = {
    GET: "bg-green-100 text-green-600",
    POST: "bg-blue-100 text-blue-600",
    PUT: "bg-yellow-100 text-yellow-600",
    DELETE: "bg-red-100 text-red-600",
  };

  const paginate = (data) => {
    const start = (currentPage - 1) * perPage;
    return data.slice(start, start + perPage);
  };

  return (
    <div className="w-full px-2 py-6">
  <Card
    bodyClass="relative p-4 h-full overflow-hidden"
    className="w-full p-6 border rounded-2xl shadow-lg bg-card text-card-foreground"
  >
          <div className="mt-6 space-y-5">
            {loading ? (
              <ListLoading count={5} />
            ) : sortedTagKeys.length === 0 ? (
              <p className="text-sm text-slate-500">No API Endpoints Found.</p>
            ) : (
              sortedTagKeys.map((tag, tagIdx) => (
                <div key={tagIdx} className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">{tag}</h3>
                  {paginate(apis[tag]).map((api, idx) => (
                    <Disclosure key={idx}>
                      {({ open }) => (
                        <>
                          <Disclosure.Button className="bg-slate-50 dark:bg-slate-700 dark:bg-opacity-60 rounded-t-md flex justify-between cursor-pointer transition duration-150 font-medium w-full text-start text-sm text-slate-600 dark:text-slate-300 px-6 py-3">
                            <span className="font-mono">{api.path}</span>
                            <span
                              className={`$${open ? "rotate-180" : ""} transition-all duration-150 text-xl`}
                            >
                              <Icon icon="heroicons:chevron-down-solid" />
                            </span>
                          </Disclosure.Button>
                          <Disclosure.Panel>
                            <div className="bg-white dark:bg-slate-900 dark:text-slate-300 text-sm rounded-b-md border dark:border-slate-700 border-slate-200 border-t-0">
                              <div className="px-6 py-4">
                                <div className="flex items-center space-x-3 mb-2">
                                  <span
                                    className={`px-2 py-1 text-xs font-semibold rounded ${methodColors[api.method.toUpperCase()] || "bg-gray-200 text-gray-700"}`}
                                  >
                                    {api.method.toUpperCase()}
                                  </span>
                                  <span>
                                    {api.details.summary || api.details.description || "No description"}
                                  </span>
                                </div>
                                {api.method.toUpperCase() === "GET" ? (
                                  <a
                                    href={api.path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs px-3 py-1 border rounded text-primary-600 hover:bg-primary-50 transition"
                                  >
                                    Execute
                                  </a>
                                ) : (
                                  <span className="text-xs italic text-slate-400">
                                    Not clickable
                                  </span>
                                )}
                              </div>
                            </div>
                          </Disclosure.Panel>
                        </>
                      )}
                    </Disclosure>
                  ))}
                  <div className="mt-4">
                    <Pagination
                      totalItems={apis[tag].length}
                      itemsPerPage={perPage}
                      currentPage={currentPage}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
  );
};

export default APIExplorerPage;
