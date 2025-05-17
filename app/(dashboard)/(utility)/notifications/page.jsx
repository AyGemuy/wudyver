"use client";

import React, { useEffect, useState, Fragment } from "react";
import { Menu } from "@headlessui/react";
import Card from "@/components/ui/Card";
import { ToastContainer, toast } from "react-toastify";
import SimpleBar from "simplebar-react";
import axios from "axios";
import Icon from "@/components/ui/Icon";

const NotificationPage = () => {
  const [comments, setComments] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [newComment, setNewComment] = useState({ name: "", message: "" });
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    try {
      const res = await axios.get("/api/comments");
      if (res.data.success) {
        setComments(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  const { name, message } = newComment;

  if (!name.trim() || !message.trim()) {
    toast.error("Name and message cannot be empty!");
    return;
  }

  try {
    setLoading(true);
    await axios.post("/api/comments", {
      ...newComment,
      parentId: replyTo || "",
    });
    setNewComment({ ...newComment, message: "" });
    setReplyTo(null);
    toast.success("Comment posted!");
    fetchComments();
  } catch (err) {
    toast.error("Failed to post comment.");
    console.error("Error posting comment:", err);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchComments();
  }, []);

  return (
    <div className="w-full px-2 py-6">
      <ToastContainer />
  <Card
    bodyClass="relative p-4 h-full overflow-hidden"
    className="w-full p-6 border rounded-2xl shadow-lg bg-card text-card-foreground"
  >
        <div className="flex justify-between px-0 py-0 border-b border-slate-100 dark:border-slate-600">
          <div className="text-sm text-slate-800 dark:text-slate-200 font-medium leading-6">
            All Notifications
          </div>
        </div>

        <div className="flex flex-col h-[500px]">
          <SimpleBar className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            <Menu as={Fragment}>
              {comments.map((item) => (
                <Menu.Item key={item._id}>
                  {({ active }) => (
                    <div
                      className={`${
                        active
                          ? "bg-slate-100 dark:bg-slate-700 dark:bg-opacity-70 text-slate-800"
                          : "text-slate-600 dark:text-slate-300"
                      } block w-full px-4 py-3 text-sm cursor-pointer`}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src="/assets/images/all-img/notify.jpg"
                          alt="avatar"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="font-semibold">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.message}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(item.timestamp).toLocaleString()}
                          </div>
                          <button
                            onClick={() => setReplyTo(item._id)}
                            className="text-xs text-primary-500 hover:underline mt-1 self-start"
                          >
                            Reply
                          </button>
                          {item.replies?.length > 0 && (
                            <div className="mt-2 ml-4 border-l pl-2 border-slate-300 dark:border-slate-600">
                              {item.replies.map((reply, idx) => (
                                <div key={idx} className="text-xs text-slate-400 mb-1">
                                  <span className="font-medium">{reply.name}: </span>
                                  {reply.message}
                                  <div className="text-[10px] text-slate-400">
                                    {new Date(reply.timestamp).toLocaleString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Menu.Item>
              ))}
            </Menu>
          </SimpleBar>

          <footer className="md:px-6 px-4 sm:flex md:space-x-4 sm:space-x-2 rtl:space-x-reverse border-t md:pt-6 pt-4 border-slate-100 dark:border-slate-700">
            <div className="flex-none sm:flex hidden md:space-x-3 space-x-1 rtl:space-x-reverse">
              <div className="h-8 w-8 cursor-pointer bg-slate-100 dark:bg-slate-900 dark:text-slate-400 flex flex-col justify-center items-center text-xl rounded-full">
                <Icon icon="heroicons-outline:link" />
              </div>
              <div className="h-8 w-8 cursor-pointer bg-slate-100 dark:bg-slate-900 dark:text-slate-400 flex flex-col justify-center items-center text-xl rounded-full">
                <Icon icon="heroicons-outline:emoji-happy" />
              </div>
            </div>
            <form
              className="flex-1 relative flex flex-col space-y-2"
              onSubmit={handleSubmit}
            >
              <div>
                {replyTo && (
                  <div className="text-xs text-slate-500 mb-1">
                    Replying to <code>{replyTo}</code>{" "}
                    <button
                      type="button"
                      className="text-red-500 ml-2 hover:underline"
                      onClick={() => setReplyTo(null)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Your name"
                  value={newComment.name}
                  className="focus:ring-0 focus:outline-0 block w-full bg-transparent dark:text-white resize-none"
                  onChange={(e) =>
                    setNewComment({ ...newComment, name: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center space-x-3">
                <textarea
                  placeholder="Type your message..."
                  value={newComment.message}
                  className="focus:ring-0 focus:outline-0 block w-full bg-transparent dark:text-white resize-none"
                  onChange={(e) =>
                    setNewComment({ ...newComment, message: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <div className="flex-none md:pr-0 pr-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-8 w-8 bg-slate-900 text-white flex flex-col justify-center items-center text-lg rounded-full"
                  >
                    <Icon
                      icon="heroicons-outline:paper-airplane"
                      className="transform rotate-[60deg]"
                    />
                  </button>
                </div>
              </div>
            </form>
          </footer>
        </div>
      </Card>
    </div>
  );
};

export default NotificationPage;
