import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { toggleMobileChatSidebar, infoToggle, sendMessage } from "./store";
import useWidth from "@/hooks/useWidth";
import Icon from "@/components/ui/Icon";
import Dropdown from "@/components/ui/Dropdown";

const chatAction = [
  {
    label: "Remove",
    link: "#",
  },
  {
    label: "Forward",
    link: "#",
  },
];

const time = () => {
  const date = new Date();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  const hours12 = hours % 12 || 12;
  const minutesStr = minutes < 10 ? "0" + minutes : minutes;
  return hours12 + ":" + minutesStr + " " + ampm;
};

const Chat = () => {
  const { activechat, openinfo, mobileChatSidebar, messFeed, user } =
    useSelector((state) => state.chat);
  const { width, breakpoints } = useWidth();
  const dispatch = useDispatch();
  const [message, setMessage] = useState("");
  const [selectedAI, setSelectedAI] = useState("gemini"); // State untuk memilih AI

  const aiOptions = [
    { value: "gemini", label: "Gemini", endpoint: "/api/ai/gemini/v6" },
    { value: "meta", label: "Meta", endpoint: "/api/ai/meta" },
    { value: "deepseek", label: "Deepseek", endpoint: "/api/ai/deepseek/v2" },
    { value: "brave", label: "Brave", endpoint: "/api/ai/brave" },
    { value: "copilot", label: "Copilot", endpoint: "/api/ai/copilot" }
  ];

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    // Tambahkan pesan dari user
    dispatch(
      sendMessage({
        content: trimmedMessage,
        sender: "me",
        img: "/assets/images/users/user-1.jpg",
      })
    );

    setMessage("");

    try {
      const selectedEndpoint = aiOptions.find(ai => ai.value === selectedAI)?.endpoint;
      
      const res = await fetch(selectedEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmedMessage }),
      });

      const data = await res.json();
      const aiReply = data.result || "Maaf, tidak ada respons.";

      dispatch(
        sendMessage({
          content: aiReply,
          sender: "them",
          img: "/assets/images/users/user-0.jpg",
        })
      );
    } catch (error) {
      dispatch(
        sendMessage({
          content: "Terjadi kesalahan saat menghubungi AI.",
          sender: "them",
          img: "/assets/images/users/user-0.jpg",
        })
      );
    }
  };

  const chatheight = useRef(null);
  useEffect(() => {
    chatheight.current.scrollTop = chatheight.current.scrollHeight;
  }, [messFeed]);

  return (
    <div className="h-full">
      <header className="border-b border-slate-100 dark:border-slate-700">
        <div className="flex py-6 md:px-6 px-3 items-center">
          <div className="flex-1">
            <div className="flex space-x-3 rtl:space-x-reverse">
              {width <= breakpoints.lg && (
                <span
                  onClick={() => dispatch(toggleMobileChatSidebar(true))}
                  className="text-slate-900 dark:text-white cursor-pointer text-xl self-center ltr:mr-3 rtl:ml-3"
                >
                  <Icon icon="heroicons-outline:menu-alt-1" />
                </span>
              )}
              <div className="flex-none">
                <div className="h-10 w-10 rounded-full relative">
                  <span
                    className={` status ring-1 ring-white inline-block h-[10px] w-[10px] rounded-full absolute -right-0 top-0
                  ${
                    user.status === "active"
                      ? "bg-success-500"
                      : "bg-secondary-500"
                  }
                  `}
                  ></span>
                  <img
                    src={user.avatar}
                    alt=""
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
              <div className="flex-1 text-start">
                <span className="block text-slate-800 dark:text-slate-300 text-sm font-medium mb-[2px] truncate">
                  {user.fullName}
                </span>
                <span className="block text-slate-500 dark:text-slate-300 text-xs font-normal">
                  Active now
                </span>
              </div>
            </div>
          </div>
          <div className="flex-none flex md:space-x-3 space-x-1 items-center rtl:space-x-reverse">
            {/* AI Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">AI:</span>
              <select
                value={selectedAI}
                onChange={(e) => setSelectedAI(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-300 px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {aiOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="msg-action-btn">
              <Icon icon="heroicons-outline:phone" />
            </div>
            <div className="msg-action-btn">
              <Icon icon="heroicons-outline:video-camera" />
            </div>
            <div
              onClick={() => dispatch(infoToggle(!openinfo))}
              className="msg-action-btn"
            >
              <Icon icon="heroicons-outline:dots-horizontal" />
            </div>
          </div>
        </div>
      </header>
      <div className="chat-content parent-height">
        <div
          className="msgs overflow-y-auto msg-height pt-6 space-y-6"
          ref={chatheight}
        >
          {messFeed.map((item, i) => (
            <div className="block md:px-6 px-4" key={i}>
              {item.sender === "them" && (
                <div className="flex space-x-2 items-start group rtl:space-x-reverse">
                  <div className="flex-none">
                    <div className="h-8 w-8 rounded-full">
                      <img
                        src={item.sender === "me" ? "/assets/images/users/user-1.jpg" : "/assets/images/users/user-0.jpg"}
                        alt={item.sender === "me" ? "User" : "Bot"}
                        className="block w-full h-full object-cover rounded-full"
                      />
                    </div>
                  </div>
                  <div className="flex-1 flex space-x-4 rtl:space-x-reverse">
                    <div>
                      <div className="text-contrent p-3 bg-slate-100 dark:bg-slate-600 dark:text-slate-300 text-slate-600 text-sm font-normal mb-1 rounded-md flex-1 whitespace-pre-wrap break-all">
                        {item.content}
                      </div>
                      <span className="font-normal text-xs text-slate-400 dark:text-slate-400">
                        {time()}
                      </span>
                    </div>
                    <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible">
                      <Dropdown
                        classMenuItems=" w-[100px] top-0"
                        items={chatAction}
                        label={
                          <div className="h-8 w-8 bg-slate-100 dark:bg-slate-600 dark:text-slate-300 text-slate-900 flex flex-col justify-center items-center text-xl rounded-full">
                            <Icon icon="heroicons-outline:dots-horizontal" />
                          </div>
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
              {/* sender */}
              {item.sender === "me" && (
                <div className="flex space-x-2 items-start justify-end group w-full rtl:space-x-reverse">
                  <div className="no flex space-x-4 rtl:space-x-reverse">
                    <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible">
                      <Dropdown
                        classMenuItems=" w-[100px] left-0 top-0  "
                        items={chatAction}
                        label={
                          <div className="h-8 w-8 bg-slate-300 dark:bg-slate-900 dark:text-slate-400 flex flex-col justify-center items-center text-xl rounded-full text-slate-900">
                            <Icon icon="heroicons-outline:dots-horizontal" />
                          </div>
                        }
                      />
                    </div>

                    <div className="whitespace-pre-wrap break-all">
                      <div className="text-contrent p-3 bg-slate-300 dark:bg-slate-900 dark:text-slate-300 text-slate-800 text-sm font-normal rounded-md flex-1 mb-1">
                        {item.content}
                      </div>
                      <span className="font-normal text-xs text-slate-400">
                        {time()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-none">
                    <div className="h-8 w-8 rounded-full">
                      <img
                        src={item.sender === "me" ? "/assets/images/users/user-1.jpg" : "/assets/images/users/user-0.jpg"}
                        alt={item.sender === "me" ? "User" : "Bot"}
                        className="block w-full h-full object-cover rounded-full"
                      />
                    </div>
                  </div>
                </div>
              )}
              {/* me */}
            </div>
          ))}
        </div>
      </div>
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
          className="flex-1 relative flex space-x-3 rtl:space-x-reverse"
          onSubmit={handleSendMessage}
        >
          <div className="flex-1">
            <textarea
              type="text"
              value={message}
              placeholder={`Type your message for ${aiOptions.find(ai => ai.value === selectedAI)?.label}...`}
              className="focus:ring-0 focus:outline-0 block w-full bg-transparent dark:text-white resize-none"
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
          </div>
          <div className="flex-none md:pr-0 pr-3">
            <button className="h-8 w-8 bg-slate-900 text-white flex flex-col justify-center items-center text-lg rounded-full">
              <Icon
                icon="heroicons-outline:paper-airplane"
                className="transform rotate-[60deg]"
              />
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
};

export default Chat;