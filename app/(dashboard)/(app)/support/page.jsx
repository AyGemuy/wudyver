"use client";

import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button"; // Dipertahankan jika ada kebutuhan tombol di masa depan
import Textinput from "@/components/ui/Textinput"; // Dipertahankan jika ada kebutuhan input di masa depan
import { Icon } from '@iconify/react';
import { useEffect, useState } from "react";

// Asumsi apiConfig tersedia di lingkungan atau dapat diimpor
// Jika ini adalah file mandiri di luar proyek Next.js Anda,
// Anda mungkin perlu meniru apiConfig di sini untuk demo.
// Misalnya:
import apiConfig from "@/configs/apiConfig";

const SupportPage = () => {
  const domainName = apiConfig.DOMAIN_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');

  return (
    <>
      <div className="w-full px-2 sm:px-4 py-6">
        <Card
          bodyClass="relative p-0 h-full overflow-hidden"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        >
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:headset-duotone" className="text-2xl sm:text-3xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                Dukungan {domainName}
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Temukan bantuan, FAQ, dan cara menghubungi tim dukungan {domainName} kami.
            </p>
          </div>

          <SimpleBar className="max-h-[calc(100vh-230px)]">
            <div className="p-4 sm:p-6 space-y-6">
              <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <h3 className="text-lg sm:text-xl font-semibold text-teal-700 dark:text-teal-300 mb-3 flex items-center">
                  <Icon icon="ph:envelope-duotone" className="mr-2 text-xl" />
                  Kontak Email
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                  Untuk pertanyaan umum atau dukungan teknis, silakan kirim email kepada kami di:
                </p>
                <p className="text-base font-medium text-cyan-600 dark:text-cyan-400">
                  <a href={`mailto:support@${domainName}`} className="hover:underline">support@{domainName}</a>
                </p>
              </div>

              <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <h3 className="text-lg sm:text-xl font-semibold text-teal-700 dark:text-teal-300 mb-3 flex items-center">
                  <Icon icon="ph:question-duotone" className="mr-2 text-xl" />
                  Pertanyaan Umum (FAQ)
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                  Kunjungi bagian FAQ kami untuk menemukan jawaban atas pertanyaan yang sering diajukan:
                </p>
                <Button
                  text="Lihat FAQ"
                  className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center"
                  link={`https://${domainName}/faq`}
                >
                    <Icon icon="ph:arrow-square-out-duotone" className="mr-1.5 text-lg" />
                </Button>
              </div>

              <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <h3 className="text-lg sm:text-xl font-semibold text-teal-700 dark:text-teal-300 mb-3 flex items-center">
                  <Icon icon="ph:chats-circle-duotone" className="mr-2 text-xl" />
                  Forum Komunitas
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                  Bergabunglah dengan komunitas {domainName} kami untuk berdiskusi, berbagi tips, dan mendapatkan bantuan dari pengguna lain:
                </p>
                <Button
                  text="Kunjungi Forum"
                  className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 text-sm flex items-center justify-center"
                  link={`https://community.${domainName}`}
                >
                    <Icon icon="ph:arrow-square-out-duotone" className="mr-1.5 text-lg" />
                </Button>
              </div>

              <div className="flex items-start p-3 bg-teal-50 dark:bg-teal-800/30 rounded-lg border border-teal-200 dark:border-teal-700/50">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-100 dark:bg-teal-700/50 text-teal-600 dark:text-teal-300 mr-3 flex-shrink-0">
                  <Icon icon="ph:info-duotone" className="text-lg" />
                </div>
                <span className="text-sm text-teal-700 dark:text-teal-300 pt-0.5">
                  Kami berkomitmen untuk memberikan dukungan terbaik. Waktu respons dapat bervariasi.
                </span>
              </div>
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default SupportPage;
