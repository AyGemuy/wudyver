'use client';

import React, { useState, useEffect } from 'react';
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Icon } from "@iconify/react";
import apiConfig from "@/configs/apiConfig";
import { toast } from "react-toastify";

const Social = () => {
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const guestEmail = apiConfig.EMAIL;
  const guestPassword = apiConfig.PASSWORD;

  const handleCloseModal = () => {
    setShowGuestModal(false);
    setEmailCopied(false);
    setPasswordCopied(false);
    setShowPassword(false);
  };

  const toggleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  const copyToClipboard = async (text, type) => {
    if (!text) {
      console.warn(`Peringatan: Nilai ${type} tidak tersedia atau undefined.`);
      toast.error(`Gagal menyalin ${type}. Nilai tidak ditemukan.`);
      return;
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);

      if (type === 'email') {
        setEmailCopied(true);
        setPasswordCopied(false);
        setTimeout(() => setEmailCopied(false), 2500);
      } else if (type === 'password') {
        setPasswordCopied(true);
        setEmailCopied(false);
        setTimeout(() => setPasswordCopied(false), 2500);
      }
      toast.success(`${type === 'email' ? 'Email' : 'Password'} disalin!`);
    } catch (err) {
      console.error(`Gagal menyalin ${type}: `, err);
      toast.error('Gagal menyalin. Pastikan browser Anda mendukung fitur ini atau coba lagi.');
    }
  };

  const modalTitle = (
    <div className="flex items-center space-x-3">
      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md">
        <Icon icon="solar:user-circle-gear-duotone" className="text-xl" />
      </div>
      <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
        Informasi Login Guest
      </span>
    </div>
  );

  return (
    <>
      <div className="w-full text-center">
        <Button
          onClick={() => setShowGuestModal(true)}
          className="w-auto text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 shadow-md hover:shadow-lg transition duration-300 py-2.5 px-6 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2"
          type="button"
        >
          <Icon icon="solar:eye-duotone" className="text-xl" />
          <span>Tampilkan Modal Info Guest</span>
        </Button>
      </div>

      <Modal
        title={modalTitle}
        activeModal={showGuestModal}
        onClose={handleCloseModal}
        className="max-w-md border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
      >
        <div className="border-t border-slate-200 dark:border-slate-700/60 mt-4 pt-4 md:mt-5 md:pt-5">
          <div className="space-y-5 px-4 pb-4 md:px-6 md:pb-6 text-sm text-slate-700 dark:text-slate-300">
            <p className="text-center text-base text-slate-700 dark:text-slate-200">
              Silakan gunakan kredensial berikut untuk login manual:
            </p>

            <div className="space-y-4 pt-2">
              <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <label htmlFor="guestEmailInput" className="block text-sm font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                  <Icon icon="solar:envelope-duotone" className="mr-2 text-lg" />
                  Email
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    id="guestEmailInput"
                    type="text"
                    value={guestEmail || ''}
                    readOnly
                    className="flex-grow p-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 font-mono text-xs sm:text-sm focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(guestEmail, 'email')}
                    className="p-2.5 border border-slate-300 dark:border-slate-600 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600/50 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-colors duration-150"
                    title="Salin Email"
                  >
                    <Icon icon={emailCopied ? 'ph:check-circle-duotone' : 'ph:copy-duotone'} className={`text-lg ${emailCopied ? 'text-green-500' : ''}`} />
                  </button>
                </div>
                {emailCopied && <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 ml-1">Email disalin!</p>}
              </div>

              <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <label htmlFor="guestPasswordInput" className="block text-sm font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                  <Icon icon="solar:key-duotone" className="mr-2 text-lg" />
                  Password
                </label>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-grow">
                    <input
                      id="guestPasswordInput"
                      type={showPassword ? "text" : "password"}
                      value={guestPassword || ''}
                      readOnly
                      className="w-full p-2.5 pr-10 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 font-mono text-xs sm:text-sm focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={toggleShowPassword}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400"
                      title={showPassword ? "Sembunyikan Password" : "Tampilkan Password"}
                    >
                      <Icon icon={showPassword ? 'ph:eye-slash-duotone' : 'ph:eye-duotone'} className="text-lg" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(guestPassword, 'password')}
                    className="p-2.5 border border-slate-300 dark:border-slate-600 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600/50 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-colors duration-150"
                    title="Salin Password"
                  >
                    <Icon icon={passwordCopied ? 'ph:check-circle-duotone' : 'ph:copy-duotone'} className={`text-lg ${passwordCopied ? 'text-green-500' : ''}`} />
                  </button>
                </div>
                {passwordCopied && <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 ml-1">Password disalin!</p>}
              </div>
            </div>

            <div className="text-center pt-4">
              <Button
                onClick={handleCloseModal}
                className="w-auto text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 dark:focus:ring-offset-slate-900 font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 text-sm px-6 py-2.5"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Social;