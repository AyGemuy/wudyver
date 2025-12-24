"use client";

import React, { useEffect, useState, Fragment } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { ToastContainer, toast } from "react-toastify";
import SimpleBar from "simplebar-react";
import axios from "axios";
import Icon from "@/components/ui/Icon";

const NotificationPage = () => {
  const [comments, setComments] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [replyingToName, setReplyingToName] = useState("");
  const [newComment, setNewComment] = useState({ name: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const fetchComments = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await axios.get("/api/comments");
      if (res.data.success) {
        const sortedComments = res.data.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setComments(sortedComments);
      } else {
        throw new Error(res.data.message || "Failed to fetch comments");
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
      setFetchError(err.message || "Could not load notifications.");
      toast.error(`Error fetching comments: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, message } = newComment;

    if (!name.trim() || !message.trim()) {
      toast.error("Name and message cannot be empty!");
      return;
    }

    setLoading(true);
    try {
      await axios.post("/api/comments", {
        name: name.trim(),
        message: message.trim(),
        parentId: replyTo || null,
      });
      setNewComment({ name, message: "" });
      setReplyTo(null);
      setReplyingToName("");
      toast.success("Comment posted successfully!");
      fetchComments();
    } catch (err) {
      toast.error("Failed to post comment. Please try again.");
      console.error("Error posting comment:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handleReplyClick = (comment) => {
    setReplyTo(comment._id);
    setReplyingToName(comment.name);
    const messageInput = document.getElementById("commentMessageInput");
    if (messageInput) {
        messageInput.focus();
    }
  };

  return (
    <div className="w-full px-2 sm:px-4 py-6">
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
              : "bg-sky-500 text-white"
          } dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`
        }
      />
      <Card
        bodyClass="relative p-0 md:p-0 h-full overflow-hidden"
        className="w-full border border-emerald-500/50 dark:border-emerald-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
      >
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
          <div className="flex flex-col sm:flex-row items-center">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md mb-2 sm:mb-0">
              <Icon icon="ph:bell-duotone" className="text-2xl" />
            </div>
            <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-emerald-500">
              All Notifications
            </h1>
          </div>
        </div>

        {loading && comments.length === 0 && (
          <div className="flex flex-col items-center justify-center p-10 min-h-[300px]">
            <Icon icon="svg-spinners:blocks-shuffle-3" className="text-5xl text-emerald-500 mb-4" />
            <p className="text-lg font-medium text-slate-600 dark:text-slate-300">Loading Notifications...</p>
          </div>
        )}
        {fetchError && !loading && (
          <div className="flex flex-col items-center justify-center p-10 min-h-[300px] bg-red-50 dark:bg-red-900/20 rounded-b-xl">
            <Icon icon="ph:warning-octagon-duotone" className="text-5xl text-red-500 mb-4" />
            <p className="text-lg font-semibold text-red-700 dark:text-red-300">Failed to Load Notifications</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{fetchError}</p>
          </div>
        )}

        {!loading || comments.length > 0 ? (
          <div className="flex flex-col md:h-[calc(100vh-280px)]">
            <SimpleBar className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {comments.map((item) => (
                <div
                  key={item._id}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors duration-150"
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      icon="mdi:account-circle"
                      className="w-10 h-10 text-slate-500 dark:text-slate-400"
                    />
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">{item.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{item.message}</p>
                      <button
                        onClick={() => handleReplyClick(item)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline mt-1 self-start flex items-center"
                      >
                        <Icon icon="ph:arrow-bend-up-left-duotone" className="mr-1" /> Reply
                      </button>

                      {item.replies?.length > 0 && (
                        <div className="mt-3 ml-6 pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-3">
                          {item.replies.map((reply) => (
                            <div key={reply._id || reply.timestamp} className="flex items-start gap-2.5">
                                <Icon
                                  icon="mdi:account-circle"
                                  className="w-7 h-7 text-slate-500 dark:text-slate-400"
                                />
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <span className="font-medium text-xs text-slate-700 dark:text-slate-200">{reply.name}</span>
                                    <span className="text-[9px] text-slate-400 dark:text-slate-500">
                                      {new Date(reply.timestamp).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{reply.message}</p>
                                </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
                {comments.length === 0 && !loading && !fetchError && (
                   <div className="p-10 text-center text-slate-500 dark:text-slate-400">
                     <Icon icon="ph:chat-circle-dots-duotone" className="mx-auto text-5xl mb-3 opacity-70" />
                     <p className="text-lg">No notifications yet.</p>
                     <p className="text-sm mt-1">Be the first to post a comment!</p>
                   </div>
                )}
            </SimpleBar>

            <footer className="p-4 border-t border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/50">
              <form className="flex flex-col space-y-3" onSubmit={handleSubmit}>
                {replyTo && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-700 rounded-md">
                    <span>
                      Replying to: <strong className="text-emerald-600 dark:text-emerald-400">{replyingToName || replyTo}</strong>
                    </span>
                    <button
                      type="button"
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs flex items-center"
                      onClick={() => { setReplyTo(null); setReplyingToName("");}}
                    >
                      <Icon icon="ph:x-circle-duotone" className="mr-1" /> Cancel
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-3">
                        <label htmlFor="commentNameInput" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Your Name:</label>
                        <input
                        id="commentNameInput"
                        type="text"
                        placeholder="Enter your name"
                        value={newComment.name}
                        className="w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        onChange={(e) => setNewComment({ ...newComment, name: e.target.value })}
                        />
                    </div>
                    <div className="sm:col-span-7">
                        <label htmlFor="commentMessageInput" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                            {replyTo ? `Your Reply:` : `Your Message:`}
                        </label>
                        <textarea
                        id="commentMessageInput"
                        placeholder="Type your message..."
                        value={newComment.message}
                        rows="1"
                        className="w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                        onChange={(e) => setNewComment({ ...newComment, message: e.target.value })}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                            }
                        }}
                        />
                    </div>
                    <div className="sm:col-span-2 flex justify-end">
                        <Button
                        type="submit"
                        disabled={loading}
                        text={loading ? <span className="flex items-center justify-center"><Icon icon="svg-spinners:ring-resize" className="mr-1 text-sm" /> Posting...</span> : <span className="flex items-center justify-center"><Icon icon="ph:paper-plane-tilt-fill" className="mr-1 text-sm" /> Post</span>}
                        className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 text-white py-2 px-4 rounded-md shadow-sm hover:shadow-md text-sm font-medium"
                        />
                    </div>
                </div>
              </form>
            </footer>
          </div>
        ) : null}
      </Card>
    </div>
  );
};

export default NotificationPage;