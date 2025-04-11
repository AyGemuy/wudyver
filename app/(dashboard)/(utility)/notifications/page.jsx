"use client";

import React, { useEffect, useState, Fragment } from "react";
import { Menu } from "@headlessui/react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import { ToastContainer, toast } from "react-toastify";
import SimpleBar from "simplebar-react";
import axios from "axios";

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
    if (!newComment.name || !newComment.message) return;
    try {
      setLoading(true);
      await axios.post("/api/comments", {
        ...newComment,
        parentId: replyTo || "",
      });
      setNewComment({ name: "", message: "" });
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
    <div className="p-4 max-w-2xl mx-auto">
      <ToastContainer />
      <Card bodyClass="relative p-0 h-full overflow-hidden" className="h-full bg-white shadow-sm">
        <div className="flex justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-600">
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
                          src="/assets/images/users/user-1.jpg"
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

          <form
            onSubmit={handleSubmit}
            className="p-4 flex flex-col gap-2 border-t border-slate-200 dark:border-slate-700"
          >
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
            <Textinput
              placeholder="Name"
              value={newComment.name}
              onChange={(e) => setNewComment({ ...newComment, name: e.target.value })}
            />
            <Textarea
              placeholder="Message"
              value={newComment.message}
              onChange={(e) => setNewComment({ ...newComment, message: e.target.value })}
            />
            <Button
              type="submit"
              isLoading={loading}
              className="btn-dark w-full"
              text={loading ? "Sending..." : "Post Comment"}
            />
          </form>
        </div>
      </Card>
    </div>
  );
};

export default NotificationPage;
