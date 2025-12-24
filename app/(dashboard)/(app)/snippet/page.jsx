"use client";

import SimpleBar from "simplebar-react";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';

const SnippetPage = () => {
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [sourceCode, setSourceCode] = useState('');
  const [baseLink, setBaseLink] = useState('');
  const [password, setPassword] = useState('');
  const [communityLinks, setCommunityLinks] = useState('');
  const [outputSnippet, setOutputSnippet] = useState('');

  const handleGenerateSnippet = (e) => {
    e.preventDefault();
    if (!templateName || !templateContent) {
      toast.warn("Nama template dan konten pesan tidak boleh kosong!");
      return;
    }

    let snippet = `✨ *${templateName}*\n\n`;

    if (templateContent) {
      snippet += `${templateContent}\n\n`;
    }
    
    if (baseLink) {
      snippet += `🔗 Base: ${baseLink}\n\n`;
    }
    
    if (authorName) {
      snippet += `🧑🏻‍💻 Author: ${authorName}\n\n`;
    }
    
    if (sourceCode) {
      snippet += `💻 Source Code: ${sourceCode}\n\n`;
    }
    
    // Add the warning if it's there
    snippet += `⚠️ Jangan di spam yak, takut Authorizationnya diganti ama yang punya 🗿 (Private API)\n\n`;

    if (password) {
      snippet += `🔑 Password: ${password}\n\n`;
    }

    if (communityLinks) {
      snippet += `🫂 Community\n${communityLinks.split('\n').map(link => `- ${link}`).join('\n')}\n\n`;
    }
    
    snippet += `Enjoy coding! 🧑🏻‍💻✨`;

    setOutputSnippet(snippet);
    toast.success("Snippet pesan berhasil dibuat!");
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(outputSnippet);
    toast.info("Snippet pesan berhasil disalin!");
  };

  return (
    <>
      <div className="w-full px-2 sm:px-4 py-6">
        <ToastContainer
          position="top-right"
          autoClose={3000}
          newestOnTop
          theme="colored"
          toastClassName={(options) =>
            `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer
            ${options?.type === 'success' ? 'bg-emerald-500 text-white' :
              options?.type === 'error' ? 'bg-red-500 text-white' :
              options?.type === 'warn' ? 'bg-yellow-500 text-white' :
              options?.type === 'info' ? 'bg-sky-500 text-white' :
              'bg-sky-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`
          }
        />
        <Card
          bodyClass="relative p-0 h-full overflow-hidden"
          className="w-full border border-purple-500/50 dark:border-purple-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        >
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:magic-wand-duotone" className="text-2xl sm:text-3xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-500 text-center sm:text-left">
                Pembuat Template Pesan
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Buat template pesan yang rapi dan terstruktur dengan mudah.
            </p>
          </div>

          <SimpleBar className="max-h-[calc(100vh-230px)]">
            <div className="p-4 sm:p-6 space-y-6">
              <form onSubmit={handleGenerateSnippet} className="space-y-4 sm:space-y-5">
                <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <label htmlFor="templateName" className="block text-sm sm:text-base font-medium text-purple-700 dark:text-purple-300 mb-2 flex items-center">
                    <Icon icon="ph:text-t-duotone" className="mr-2 text-xl" />
                    Nama Template <span className="text-red-500 ml-1">*</span>
                  </label>
                  <Textinput
                    id="templateName"
                    type="text"
                    placeholder="Contoh: GHIBLI AI STYLE"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    inputClassName="text-sm bg-transparent placeholder-slate-400 dark:placeholder-slate-500 p-3"
                  />
                </div>

                <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="templateContent" className="block text-sm sm:text-base font-medium text-purple-700 dark:text-purple-300 flex items-center">
                      <Icon icon="ph:note-duotone" className="mr-2 text-xl" />
                      Konten Pesan <span className="text-red-500 ml-1">*</span>
                    </label>
                  </div>
                  <Textarea
                    id="templateContent"
                    placeholder="Masukkan konten pesan di sini. Gunakan markdown seperti *italic* dan **bold**."
                    value={templateContent}
                    onChange={(e) => setTemplateContent(e.target.value)}
                    required
                    rows={8}
                    className="w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm"
                  />
                </div>
                
                <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <label htmlFor="authorName" className="block text-sm sm:text-base font-medium text-purple-700 dark:text-purple-300 mb-2 flex items-center">
                    <Icon icon="ph:user-duotone" className="mr-2 text-xl" />
                    Nama Author
                  </label>
                  <Textinput
                    id="authorName"
                    type="text"
                    placeholder="Contoh: Daffa ~"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    inputClassName="text-sm bg-transparent placeholder-slate-400 dark:placeholder-slate-500 p-3"
                  />
                  <label htmlFor="baseLink" className="block text-sm sm:text-base font-medium text-purple-700 dark:text-purple-300 mt-4 mb-2 flex items-center">
                    <Icon icon="ph:link-duotone" className="mr-2 text-xl" />
                    Link Base
                  </label>
                  <Textinput
                    id="baseLink"
                    type="text"
                    placeholder="Contoh: https://ghibli-gpt.net"
                    value={baseLink}
                    onChange={(e) => setBaseLink(e.target.value)}
                    className="w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    inputClassName="text-sm bg-transparent placeholder-slate-400 dark:placeholder-slate-500 p-3"
                  />
                  <label htmlFor="sourceCode" className="block text-sm sm:text-base font-medium text-purple-700 dark:text-purple-300 mt-4 mb-2 flex items-center">
                    <Icon icon="ph:code-duotone" className="mr-2 text-xl" />
                    Link Source Code
                  </label>
                  <Textinput
                    id="sourceCode"
                    type="text"
                    placeholder="Contoh: https://pastes.io/image-to-ghibli-ai"
                    value={sourceCode}
                    onChange={(e) => setSourceCode(e.target.value)}
                    className="w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    inputClassName="text-sm bg-transparent placeholder-slate-400 dark:placeholder-slate-500 p-3"
                  />
                  <label htmlFor="password" className="block text-sm sm:text-base font-medium text-purple-700 dark:text-purple-300 mt-4 mb-2 flex items-center">
                    <Icon icon="ph:key-duotone" className="mr-2 text-xl" />
                    Password API
                  </label>
                  <Textinput
                    id="password"
                    type="text"
                    placeholder="Contoh: ghibai"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    inputClassName="text-sm bg-transparent placeholder-slate-400 dark:placeholder-slate-500 p-3"
                  />
                  <label htmlFor="communityLinks" className="block text-sm sm:text-base font-medium text-purple-700 dark:text-purple-300 mt-4 mb-2 flex items-center">
                    <Icon icon="ph:users-duotone" className="mr-2 text-xl" />
                    Link Komunitas (satu link per baris)
                  </label>
                  <Textarea
                    id="communityLinks"
                    placeholder="https://t.me/+yjGBCBjzsB80NmU1&#10;https://t.me/+O9j3P1nHs0piZTU1"
                    value={communityLinks}
                    onChange={(e) => setCommunityLinks(e.target.value)}
                    rows={4}
                    className="w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm"
                  />
                </div>

                <Button
                  text={
                    <span className="flex items-center justify-center">
                      <Icon icon="ph:magic-wand-duotone" className="mr-1.5 text-lg" />
                      Buat Snippet Pesan
                    </span>
                  }
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center"
                  type="submit"
                />
              </form>

              {outputSnippet && (
                <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60 mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center">
                      <Icon icon="ph:code-duotone" className="mr-2 text-xl" />
                      Hasil Snippet
                    </h3>
                    <Button
                      text="Salin"
                      className="text-xs px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded flex items-center"
                      onClick={handleCopySnippet}
                      type="button"
                    />
                  </div>
                  <Textarea
                    readOnly
                    value={outputSnippet}
                    rows={15}
                    className="w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md font-mono text-xs md:text-sm"
                  />
                </div>
              )}
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default SnippetPage;