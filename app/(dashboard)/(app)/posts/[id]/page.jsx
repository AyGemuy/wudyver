// app/posts/[id]/page.jsx
"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import Card from "@/components/ui/Card";
import SimpleBar from "simplebar-react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

const ViewPostPage = () => {
  const { id } = useParams(); // Get the dynamic 'id' from the URL
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiUrl = "/api/posts"; // Your API URL for posts

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("No post ID provided in the URL.");
      return;
    }

    const fetchPost = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch a single post by ID
        const response = await axios.get(`${apiUrl}?id=${id}`);
        if (response.data.success && response.data.data) {
          setPost(response.data.data);
        } else {
          setError(response.data.message || "Post not found.");
        }
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || "Failed to fetch post.";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]); // Re-fetch if the ID changes

  const sectionCardClass =
    "bg-white dark:bg-slate-700/30 p-4 sm:p-5 rounded-lg shadow border border-slate-200 dark:border-slate-700/60";
  const sectionTitleClass =
    "text-xl md:text-2xl font-bold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center";
  const labelClass =
    "block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1";

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="colored"
        toastClassName={(o) =>
          `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${
            o?.type === "success"
              ? "bg-emerald-500 text-white"
              : o?.type === "error"
              ? "bg-red-500 text-white"
              : o?.type === "warning"
              ? "bg-yellow-500 text-white"
              : "bg-sky-500 text-white"
          } text-sm p-3 m-2 rounded-lg shadow-md`
        }
      />
      <div className="w-full px-2 sm:px-4 py-6">
        <Card
          bodyClass="relative p-0 h-full overflow-hidden"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        >
          {/* Header section */}
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:article-duotone" className="text-2xl" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-center sm:text-left bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-emerald-500">
                  View Post
                </h1>
                <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-1">
                  Menampilkan detail artikel blog.
                </p>
              </div>
            </div>
          </div>

          {/* Content section */}
          <SimpleBar className="flex-grow overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-6">
              <div className={sectionCardClass}>
                {loading && (
                  <div className="text-center py-10">
                    <Icon
                      icon="svg-spinners:blocks-shuffle-3"
                      className="text-4xl text-emerald-500 mb-2 mx-auto"
                    />
                    <p className="text-slate-500 dark:text-slate-400">
                      Loading post content...
                    </p>
                  </div>
                )}

                {error && !loading && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700/50 rounded-md text-center">
                    <Icon
                      icon="ph:x-circle-duotone"
                      className="text-2xl text-red-500 mx-auto mb-1"
                    />
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Error: {error}
                    </p>
                  </div>
                )}

                {!loading && post && (
                  <div>
                    <h2 className={sectionTitleClass}>
                      <Icon icon="ph:book-open-duotone" className="mr-2 text-xl" />
                      {post.title}
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 mb-4">
                      {post.authorAvatar && (
                        <img
                          src={post.authorAvatar}
                          alt={post.author}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src =
                              "https://placehold.co/32x32/cccccc/000000?text=NA";
                          }} // Fallback image
                        />
                      )}
                      <p>
                        By{" "}
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {post.author}
                        </span>
                      </p>
                      <span className="text-slate-400 dark:text-slate-500">|</span>
                      <p>
                        Published:{" "}
                        {new Date(post.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      {post.updatedAt && post.createdAt !== post.updatedAt && (
                        <>
                          <span className="text-slate-400 dark:text-slate-500">
                            |
                          </span>
                          <p>
                            Last Updated:{" "}
                            {new Date(post.updatedAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-100">
                      {/* Assuming post.content can be rendered directly as HTML/Markdown.
                          If it's Markdown, you might need a Markdown renderer library.
                          For simplicity, rendering as raw HTML for now. */}
                      <p>{post.content}</p>
                    </div>
                  </div>
                )}
                {!loading && !post && !error && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700/50 rounded-md text-center">
                    <Icon
                      icon="ph:info-duotone"
                      className="text-2xl text-yellow-500 mx-auto mb-1"
                    />
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      No post found for ID "{id}".
                    </p>
                  </div>
                )}
              </div>
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default ViewPostPage;