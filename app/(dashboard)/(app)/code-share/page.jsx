"use client";

import { useState, useEffect } from "react";
import SimpleBar from "simplebar-react";
import useWidth from "@/hooks/useWidth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';

const CodeSharePage = () => {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedCodes, setExpandedCodes] = useState({}); // State untuk melacak kode mana yang diperluas
  const [newCode, setNewCode] = useState({
    author: "",
    fileName: "",
    code: "",
    tag: ""
  });
  const { width, breakpoints } = useWidth();

  // Fetch codes from API
  const fetchCodes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedTag) params.append('tag', selectedTag);
      if (sortBy) params.append('sortBy', sortBy);

      const response = await fetch(`/api/code-share?${params.toString()}`);
      const data = await response.json();
      setCodes(data);
    } catch (error) {
      toast.error("Failed to fetch codes");
      console.error("Error fetching codes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add new code
  const handleAddCode = async () => {
    if (!newCode.author || !newCode.fileName || !newCode.code) {
      toast.warn("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/code-share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCode),
      });

      if (response.ok) {
        toast.success("Code shared successfully!");
        setNewCode({ author: "", fileName: "", code: "", tag: "" });
        setShowAddForm(false);
        fetchCodes();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to share code");
      }
    } catch (error) {
      toast.error("Failed to share code");
      console.error("Error adding code:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk update like/dislike/view
  const updateCodeInteraction = async (id, actionType) => {
    try {
      const response = await fetch('/api/code-share', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, action: actionType }),
      });

      if (response.ok) {
        const updatedData = await response.json();
        setCodes(prevCodes =>
          prevCodes.map(code =>
            code._id === id ? { ...code, ...updatedData.code } : code
          )
        );
        if (actionType === 'like') {
          toast.success("Code liked!");
        } else if (actionType === 'dislike') {
          toast.info("Code disliked.");
        }
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to ${actionType} code`);
      }
    } catch (error) {
      toast.error(`Error ${actionType}ing code.`);
      console.error(`Error ${actionType}ing code:`, error);
    }
  };

  const handleLike = (id) => updateCodeInteraction(id, 'like');
  const handleDislike = (id) => updateCodeInteraction(id, 'dislike');
  const handleView = (id) => updateCodeInteraction(id, 'view');

  // Delete code
  const handleDeleteCode = async (id) => {
    if (!confirm("Are you sure you want to delete this code?")) return;

    setLoading(true);
    try {
      const response = await fetch('/api/code-share', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        toast.success("Code deleted successfully!");
        fetchCodes();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete code");
      }
    } catch (error) {
      toast.error("Failed to delete code");
      console.error("Error deleting code:", error);
    } finally {
      setLoading(false);
    }
  };

  // Clear all codes
  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to delete ALL codes? This action cannot be undone.")) return;

    setLoading(true);
    try {
      const response = await fetch('/api/code-share', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        toast.success("All codes cleared successfully!");
        setCodes([]);
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to clear codes");
      }
    } catch (error) {
      toast.error("Failed to clear codes");
      console.error("Error clearing codes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle "Show More" for a specific code
  const toggleShowMore = (id) => {
    setExpandedCodes(prevState => ({
      ...prevState,
      [id]: !prevState[id]
    }));
  };

  useEffect(() => {
    fetchCodes();
  }, [searchTerm, selectedTag, sortBy]);

  const uniqueTags = [...new Set(codes.map(code => code.tag).filter(Boolean))];

  // Batas tinggi untuk cuplikan kode
  const CODE_PREVIEW_HEIGHT = '200px'; // Bisa disesuaikan

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        toastClassName="bg-slate-800 text-slate-200 border border-slate-700"
      />
      <div className="w-full px-2 py-6">
        <Card
          bodyClass="relative p-6 h-full overflow-hidden"
          className="w-full border border-indigo-700 rounded-3xl shadow-lg bg-white text-slate-900"
        >
          <SimpleBar className="h-full">
            {/* Header */}
            <div className="p-6 border-b border-purple-800 bg-gradient-to-r from-slate-800 to-purple-900 rounded-t-3xl">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-lg">
                  <Icon icon="material-symbols:code" className="text-2xl" />
                </div>
              </div>
              <h4 className="text-xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-fuchsia-500">
                Code Share Manager
              </h4>
              <p className="text-sm text-center text-slate-400 mt-2">Manage and share your code snippets</p>
            </div>

            {/* Controls */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Search */}
                <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                  <label className="block text-sm font-medium text-purple-300 mb-2 flex items-center">
                    <Icon icon="material-symbols:search" className="mr-2" />
                    Search Files
                  </label>
                  <Textinput
                    type="text"
                    placeholder="Search by filename..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-slate-200 rounded-xl"
                  />
                </div>

                {/* Tag Filter */}
                <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                  <label className="block text-sm font-medium text-purple-300 mb-2 flex items-center">
                    <Icon icon="material-symbols:tag" className="mr-2" />
                    Filter by Tag
                  </label>
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl p-2"
                  >
                    <option value="">All Tags</option>
                    {uniqueTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>

                {/* Sort */}
                <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                  <label className="block text-sm font-medium text-purple-300 mb-2 flex items-center">
                    <Icon icon="material-symbols:sort" className="mr-2" />
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl p-2"
                  >
                    <option value="createdAt">Date Created</option>
                    <option value="fileName">File Name</option>
                    <option value="author">Author</option>
                    <option value="likes">Likes</option>
                    <option value="views">Views</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mb-6">
                <Button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700 text-white font-medium py-2 px-4 rounded-xl"
                  disabled={loading}
                >
                  <Icon icon="material-symbols:add" className="mr-2" />
                  Add New Code
                </Button>
                <Button
                  onClick={fetchCodes}
                  className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-medium py-2 px-4 rounded-xl"
                  disabled={loading}
                >
                  <Icon icon="material-symbols:refresh" className="mr-2" />
                  Refresh
                </Button>
                <Button
                  onClick={handleClearAll}
                  className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-medium py-2 px-4 rounded-xl"
                  disabled={loading || codes.length === 0}
                >
                  <Icon icon="material-symbols:delete-sweep" className="mr-2" />
                  Clear All
                </Button>
              </div>

              {/* Add Code Form */}
              {showAddForm && (
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-6">
                  <h5 className="text-lg font-semibold text-purple-300 mb-4 flex items-center">
                    <Icon icon="material-symbols:add-circle" className="mr-2" />
                    Add New Code
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <Textinput
                      placeholder="Author name"
                      value={newCode.author}
                      onChange={(e) => setNewCode({...newCode, author: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-slate-200 rounded-xl"
                    />
                    <Textinput
                      placeholder="File name"
                      value={newCode.fileName}
                      onChange={(e) => setNewCode({...newCode, fileName: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="mb-4">
                    <Textinput
                      placeholder="Tag (optional)"
                      value={newCode.tag}
                      onChange={(e) => setNewCode({...newCode, tag: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="mb-4">
                    <textarea
                      placeholder="Paste your code here..."
                      value={newCode.code}
                      onChange={(e) => setNewCode({...newCode, code: e.target.value})}
                      rows={8}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl p-3 font-mono text-sm"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleAddCode}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium py-2 px-4 rounded-xl"
                      disabled={loading}
                    >
                      <Icon icon="material-symbols:save" className="mr-2" />
                      Save Code
                    </Button>
                    <Button
                      onClick={() => setShowAddForm(false)}
                      className="bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700 text-white font-medium py-2 px-4 rounded-xl"
                    >
                      <Icon icon="material-symbols:cancel" className="mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center text-purple-400">
                    <Icon icon="material-symbols:progress-activity" className="animate-spin mr-2 text-2xl" />
                    Loading...
                  </div>
                </div>
              )}

              {/* Code List */}
              {!loading && (
                <div className="space-y-4">
                  {codes.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800 rounded-2xl border border-slate-700">
                      <Icon icon="material-symbols:code-off" className="mx-auto text-4xl text-slate-500 mb-4" />
                      <p className="text-slate-400">No code snippets found</p>
                    </div>
                  ) : (
                    codes.map((code) => (
                      <div key={code._id} className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-grow">
                            <h6 className="text-lg font-semibold text-purple-300 flex items-center">
                              <Icon icon="material-symbols:code-blocks" className="mr-2" />
                              {code.fileName}
                            </h6>
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-400">
                              <span className="flex items-center">
                                <Icon icon="material-symbols:person" className="mr-1" />
                                {code.author}
                              </span>
                              <span className="flex items-center">
                                <Icon icon="material-symbols:tag" className="mr-1" />
                                {code.tag || 'Unknown'}
                              </span>
                              <span
                                className="flex items-center cursor-pointer hover:text-purple-300 transition-colors"
                                onClick={() => handleView(code._id)}
                                title="Click to view code and increment view count"
                              >
                                <Icon icon="material-symbols:visibility" className="mr-1" />
                                {code.views || 0} views
                              </span>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleDeleteCode(code._id)}
                            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg ml-4 flex-shrink-0"
                            disabled={loading}
                          >
                            <Icon icon="material-symbols:delete" />
                          </Button>
                        </div>
                        <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 relative"> {/* Tambahkan relative */}
                          <pre
                            className="text-slate-200 text-sm overflow-x-auto transition-max-height duration-300 ease-in-out"
                            style={{
                              maxHeight: expandedCodes[code._id] ? 'none' : CODE_PREVIEW_HEIGHT,
                              overflowY: expandedCodes[code._id] ? 'visible' : 'hidden', // Ganti 'scroll' menjadi 'hidden'
                            }}
                          >
                            <code>{code.code}</code>
                          </pre>
                          {/* Overlay gradient untuk "fade out" efek */}
                          {!expandedCodes[code._id] && (
                            <div className="absolute bottom-4 left-0 right-0 h-16 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none rounded-b-xl"></div>
                          )}
                          {code.code.split('\n').length * 16 > parseInt(CODE_PREVIEW_HEIGHT) && ( // Tampilkan tombol hanya jika kode lebih panjang dari tinggi pratinjau
                            <Button
                              onClick={() => toggleShowMore(code._id)}
                              className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-medium py-2 px-4 rounded-xl"
                            >
                              {expandedCodes[code._id] ? (
                                <>
                                  <Icon icon="material-symbols:keyboard-arrow-up" className="mr-2" />
                                  Show Less
                                </>
                              ) : (
                                <>
                                  <Icon icon="material-symbols:keyboard-arrow-down" className="mr-2" />
                                  Show More
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-4 text-sm text-slate-400">
                          <span className="flex items-center">
                            <Icon icon="material-symbols:calendar-today" className="mr-1" />
                            {new Date(code.createdAt).toLocaleDateString()}
                          </span>
                          <div className="flex items-center gap-3">
                            <Button
                              onClick={() => handleLike(code._id)}
                              className="flex items-center gap-1 text-green-400 hover:text-green-500 transition-colors"
                              disabled={loading}
                            >
                              <Icon icon="material-symbols:thumb-up" className="text-xl" />
                              <span className="font-semibold">{code.likes || 0}</span>
                            </Button>
                            <Button
                              onClick={() => handleDislike(code._id)}
                              className="flex items-center gap-1 text-red-400 hover:text-red-500 transition-colors"
                              disabled={loading}
                            >
                              <Icon icon="material-symbols:thumb-down" className="text-xl" />
                              <span className="font-semibold">{code.dislikes || 0}</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default CodeSharePage;