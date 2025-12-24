"use client";

import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import { Icon } from '@iconify/react';
import { useEffect, useState } from "react";

// Asumsi apiConfig tersedia di lingkungan atau dapat diimpor
import apiConfig from "@/configs/apiConfig";

const TosPage = () => {
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
                <Icon icon="ph:scroll-duotone" className="text-2xl sm:text-3xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                Syarat & Ketentuan Penggunaan {domainName}
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Harap baca dengan saksama Syarat & Ketentuan ini sebelum menggunakan layanan kami.
            </p>
          </div>

          <SimpleBar className="max-h-[calc(100vh-230px)]">
            <div className="p-4 sm:p-6 space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-teal-700 dark:text-teal-300 mb-2">1. Pendahuluan</h2>
                <p>Selamat datang di {domainName}. Dengan mengakses atau menggunakan layanan kami, Anda setuju untuk terikat oleh Syarat & Ketentuan ini. Jika Anda tidak setuju dengan bagian mana pun dari ketentuan ini, Anda tidak dapat mengakses layanan.</p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-teal-700 dark:text-teal-300 mb-2">2. Definisi</h2>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>"Layanan"</strong> mengacu pada semua produk, layanan, situs web, dan aplikasi yang disediakan oleh {domainName}.</li>
                  <li><strong>"Pengguna"</strong> mengacu pada individu atau entitas yang menggunakan Layanan.</li>
                  <li><strong>"Konten"</strong> mengacu pada teks, gambar, video, atau informasi lain yang diunggah, ditampilkan, atau ditautkan oleh Pengguna di Layanan.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-teal-700 dark:text-teal-300 mb-2">3. Akun Pengguna</h2>
                <p>Anda bertanggung jawab untuk menjaga kerahasiaan informasi akun dan kata sandi Anda. Anda setuju untuk segera memberi tahu kami tentang setiap penggunaan tidak sah atas akun Anda.</p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-teal-700 dark:text-teal-300 mb-2">4. Kewajiban Pengguna</h2>
                <p>Anda setuju untuk tidak menggunakan Layanan untuk tujuan apa pun yang melanggar hukum atau dilarang oleh Syarat & Ketentuan ini. Anda tidak boleh menggunakan Layanan dengan cara apa pun yang dapat merusak, melumpuhkan, membebani, atau mengganggu server {domainName} atau jaringan yang terhubung ke server {domainName}.</p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-teal-700 dark:text-teal-300 mb-2">5. Kekayaan Intelektual</h2>
                <p>Semua konten asli, fitur, dan fungsionalitas Layanan adalah dan akan tetap menjadi milik eksklusif {domainName} dan pemberi lisensinya.</p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-teal-700 dark:text-teal-300 mb-2">6. Penafian</h2>
                <p>Layanan disediakan berdasarkan "apa adanya" dan "sebagaimana tersedia". {domainName} tidak memberikan jaminan dalam bentuk apa pun, baik tersurat maupun tersirat, sehubungan dengan pengoperasian layanan mereka.</p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-teal-700 dark:text-teal-300 mb-2">7. Perubahan Ketentuan</h2>
                <p>Kami berhak untuk memodifikasi atau mengganti Syarat & Ketentuan ini kapan saja. Kami akan memberikan pemberitahuan yang wajar tentang perubahan signifikan. Dengan terus mengakses atau menggunakan Layanan kami setelah revisi menjadi efektif, Anda setuju untuk terikat oleh ketentuan yang direvisi.</p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-teal-700 dark:text-teal-300 mb-2">8. Hukum yang Mengatur</h2>
                <p>Syarat & Ketentuan ini akan diatur dan ditafsirkan sesuai dengan hukum negara/wilayah tempat {domainName} terdaftar, tanpa memperhatikan pertentangan ketentuan hukumnya.</p>
              </section>

              <div className="flex items-start p-3 bg-teal-50 dark:bg-teal-800/30 rounded-lg border border-teal-200 dark:border-teal-700/50">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-100 dark:bg-teal-700/50 text-teal-600 dark:text-teal-300 mr-3 flex-shrink-0">
                  <Icon icon="ph:info-duotone" className="text-lg" />
                </div>
                <span className="text-sm text-teal-700 dark:text-teal-300 pt-0.5">
                  Terakhir diperbarui: 18 Juni 2025.
                </span>
              </div>
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default TosPage;
