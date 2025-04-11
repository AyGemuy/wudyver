"use client";

import React, { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SimpleBar from "simplebar-react";
import Badge from "@/components/ui/Badge";
import { ToastContainer, toast } from "react-toastify";
import ListLoading from "@/components/skeleton/ListLoading";

const ITEMS_PER_PAGE = 5;

const APIExplorerPage = () => {
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("method");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadSpec = async () => {
      try {
        const res = await fetch("/api/openapi");
        if (!res.ok) throw new Error("Failed to fetch OpenAPI spec");

        const data = await res.json();
        const paths = data?.paths || {};
        const apiList = [];

        for (const path in paths) {
          for (const method in paths[path]) {
            apiList.push({
              path,
              method: method.toUpperCase(),
              ...paths[path][method],
            });
          }
        }

        setApis(apiList);
      } catch (err) {
        console.error("Error loading OpenAPI:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSpec();
  }, []);

  const handleExecute = async (api) => {
    try {
      const res = await fetch(api.path, {
        method: api.method,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await res.json();
      toast.success(`Executed ${api.method} ${api.path}`);
      console.log("Execution result:", result);
    } catch (error) {
      toast.error(`Failed to execute ${api.method} ${api.path}`);
      console.error("Execution failed:", error);
    }
  };

  const sortedApis = [...apis].sort((a, b) => {
    if (sortBy === "method") return a.method.localeCompare(b.method);
    if (sortBy === "path") return a.path.localeCompare(b.path);
    return 0;
  });

  const totalPages = Math.ceil(sortedApis.length / ITEMS_PER_PAGE);
  const paginatedApis = sortedApis.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <>
      <ToastContainer />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Card
      bodyClass="relative p-4 h-full overflow-hidden"
      className="h-full w-full sm:w-auto bg-white shadow-md"
    >
          <SimpleBar className="h-full">
            <div className="p-4 border-b flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h4 className="text-xl font-bold">API Explorer</h4>
                <p className="text-sm text-slate-500">OpenAPI endpoint executor</p>
              </div>
              <div>
                <select
                  className="p-2 rounded border text-sm"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="method">Sort by Method</option>
                  <option value="path">Sort by Path</option>
                </select>
              </div>
            </div>

            {loading ? (
              <ListLoading count={5} />
            ) : (
              <>
                <ul className="divide-y divide-slate-100">
                  {paginatedApis.length > 0 ? (
                    paginatedApis.map((api) => (
                      <li key={`${api.method}-${api.path}`} className="p-4">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                          <div>
                            <Badge
                              label={api.method}
                              className={`inline-block text-xs font-bold uppercase ${
                                api.method === "GET"
                                  ? "bg-success-100 text-success-600"
                                  : api.method === "POST"
                                  ? "bg-primary-100 text-primary-600"
                                  : api.method === "PUT"
                                  ? "bg-warning-100 text-warning-600"
                                  : "bg-danger-100 text-danger-600"
                              }`}
                            />
                            <span className="ml-2 text-sm font-mono">{api.path}</span>
                            <div className="text-xs text-slate-500 mt-1">
                              {api.summary || api.description || "No description"}
                            </div>
                          </div>
                          <div className="mt-2 md:mt-0">
                            <Button
                              text="Execute"
                              className="btn-outline-primary text-xs"
                              onClick={() => handleExecute(api)}
                            />
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="p-4">
                      <Badge
                        label="No API Endpoints Found"
                        className="bg-danger-500 text-white"
                      />
                    </li>
                  )}
                </ul>

                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 p-4 border-t">
                    <Button
                      text="Prev"
                      className="btn-dark w-full"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    />
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      text="Next"
                      className="btn-dark w-full"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    />
                  </div>
                )}
              </>
            )}
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default APIExplorerPage;
