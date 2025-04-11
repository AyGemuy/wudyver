"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchSearch,
  fetchLatest,
  fetchRelease,
  fetchDetail,
  fetchDownload,
} from "@/components/partials/app/samehadaku/store";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SimpleBar from "simplebar-react";
import Badge from "@/components/ui/Badge";
import { ToastContainer, toast } from "react-toastify";

const SamehadakuPage = () => {
  const dispatch = useDispatch();
  const {
    searchResults,
    latest,
    release,
    detail,
    download,
    loading,
    error,
  } = useSelector((state) => state.samehadaku);

  const [query, setQuery] = useState("");
  const [detailUrl, setDetailUrl] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  useEffect(() => {
    dispatch(fetchLatest());
    dispatch(fetchRelease());
  }, [dispatch]);

  const notifyError = (msg) => toast.error(msg);

  const handleSearch = () => query && dispatch(fetchSearch(query));
  const handleDetail = () => detailUrl && dispatch(fetchDetail(detailUrl));
  const handleDownload = () => downloadUrl && dispatch(fetchDownload(downloadUrl));

  useEffect(() => {
    if (error) notifyError(error);
  }, [error]);

  return (
    <div className="p-4 space-y-6">
      <ToastContainer />

      <h1 className="text-3xl font-bold">Samehadaku Page</h1>

      <Card
      bodyClass="relative p-4 h-full overflow-hidden"
      className="h-full w-full sm:w-auto bg-white shadow-md"
    >
        <h2 className="text-xl font-semibold">Search</h2>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search anime..."
          className="w-full border p-2 rounded"
        />
        <Button onClick={handleSearch} variant="primary">
          Search
        </Button>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="text-xl font-semibold">Detail</h2>
        <input
          type="text"
          value={detailUrl}
          onChange={(e) => setDetailUrl(e.target.value)}
          placeholder="Enter detail URL..."
          className="w-full border p-2 rounded"
        />
        <Button onClick={handleDetail} variant="secondary">
          Get Detail
        </Button>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="text-xl font-semibold">Download</h2>
        <input
          type="text"
          value={downloadUrl}
          onChange={(e) => setDownloadUrl(e.target.value)}
          placeholder="Enter download URL..."
          className="w-full border p-2 rounded"
        />
        <Button onClick={handleDownload} variant="success">
          Get Download
        </Button>
      </Card>

      {loading && <p className="text-gray-500">Loading...</p>}

      {searchResults?.length > 0 && (
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-2">Search Results</h2>
          <SimpleBar style={{ maxHeight: 300 }}>
            <div className="space-y-4">
              {searchResults.map((item) => (
                <div key={item.id} className="flex space-x-4 border p-2 rounded">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-24 h-auto object-cover rounded"
                  />
                  <div>
                    <h3 className="font-bold">{item.title}</h3>
                    <p>{item.description}</p>
                    <Badge>{item.url}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </SimpleBar>
        </Card>
      )}

      {latest?.length > 0 && (
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-2">Latest</h2>
          <ul className="space-y-2">
            {latest.map((item) => (
              <li key={item.id}>
                <Badge>{item.title}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {release?.length > 0 && (
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-2">Release</h2>
          <ul className="space-y-2">
            {release.map((item) => (
              <li key={item.id}>
                <Badge>{item.title}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {detail && (
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-2">Detail</h2>
          <p><strong>Title:</strong> {detail.title}</p>
          <p><strong>Synopsis:</strong> {detail.synopsis}</p>
        </Card>
      )}

      {download && (
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-2">Download Links</h2>
          <ul className="space-y-1">
            {download.links?.map((link, idx) => (
              <li key={idx}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};

export default SamehadakuPage;
