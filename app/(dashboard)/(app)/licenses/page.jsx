"use client";

import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import { Icon } from '@iconify/react';
import { useEffect, useState } from "react";

// Asumsi apiConfig tersedia di lingkungan atau dapat diimpor
import apiConfig from "@/configs/apiConfig";

const LicensePage = () => {
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
                <Icon icon="ph:certificate-duotone" className="text-2xl sm:text-3xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                Informasi Lisensi {domainName}
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Rincian lisensi untuk penggunaan produk dan API {domainName}.
            </p>
          </div>

          <SimpleBar className="max-h-[calc(100vh-230px)]">
            <div className="p-4 sm:p-6 space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-teal-700 dark:text-teal-300 mb-2">Wudysoft.xyz Public Data License (WPDL) 1.0</h2>
                <p>Lisensi ini mengatur penggunaan data dan API publik yang disediakan oleh {domainName}. Dengan mengakses atau menggunakan data ini, Anda setuju dengan semua ketentuan yang dijelaskan di sini.</p>
                <p className="mt-2"><strong>Versi:</strong> 1.0</p>
                <p><strong>Tanggal Efektif:</strong> 1 Januari 2025</p>
              </section>

              <section>
                <h3 className="text-md sm:text-lg font-semibold text-teal-600 dark:text-teal-400 mb-2">1. Pemberian Lisensi</h3>
                <p> {domainName} dengan ini memberikan kepada Anda lisensi yang bersifat non-eksklusif, bebas royalti, dapat ditarik kembali, dan tidak dapat dipindahtangankan untuk mengakses dan menggunakan data publik serta API yang terkait.</p>
                <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                  <li><strong>Akses:</strong> Anda dapat mengakses data melalui API yang disediakan atau metode lain yang disetujui.</li>
                  <li><strong>Penggunaan:</strong> Anda dapat menggunakan data untuk tujuan pribadi, komersial, atau penelitian, dengan ketentuan yang dijelaskan dalam lisensi ini.</li>
                  <li><strong>Modifikasi:</strong> Anda dapat memodifikasi, mengadaptasi, atau membuat karya turunan dari data, namun harus mencantumkan atribusi yang jelas kepada {domainName} sebagai sumber asli.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-md sm:text-lg font-semibold text-teal-600 dark:text-teal-400 mb-2">2. Atribusi Wajib</h3>
                <p>Untuk setiap penggunaan data atau API {domainName}, Anda wajib memberikan atribusi yang jelas dan mencolok kepada {domainName} sebagai sumber data. Atribusi dapat berupa tautan ke situs web kami, logo {domainName}, atau referensi tekstual yang sesuai.</p>
              </section>

              <section>
                <h3 className="text-md sm:text-lg font-semibold text-teal-600 dark:text-teal-400 mb-2">3. Batasan</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Anda tidak boleh menggunakan data atau API dengan cara yang melanggar hukum yang berlaku.</li>
                  <li>Anda tidak boleh menggunakan data atau API untuk tujuan yang merusak reputasi {domainName}.</li>
                  <li>Anda tidak boleh mendistribusikan data mentah secara massal tanpa modifikasi atau penambahan nilai yang signifikan.</li>
                  <li>Anda tidak boleh menggunakan API dengan cara yang membebani server kami secara berlebihan atau mengganggu ketersediaan layanan.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-md sm:text-lg font-semibold text-teal-600 dark:text-teal-400 mb-2">4. Penafian Jaminan</h3>
                <p>DATA DAN API DISEDIAKAN "APA ADANYA", TANPA JAMINAN APA PUN, BAIK TERSURAT MAUPUN TERSIRAT. {domainName} TIDAK MENJAMIN AKURASI, KELENGKAPAN, ATAU KETERSEDIAAN DATA SECARA TERUS-MENERUS.</p>
              </section>

              <section>
                <h3 className="text-md sm:text-lg font-semibold text-teal-600 dark:text-teal-400 mb-2">5. Pembatasan Tanggung Jawab</h3>
                <p>DALAM KEADAAN APA PUN {domainName} TIDAK BERTANGGUNG JAWAB ATAS KERUGIAN LANGSUNG, TIDAK LANGSUNG, INSIDENTAL, KHUSUS, KONSEKUENSIAL, ATAU HUKUMAN APA PUN, TERMASUK NAMUN TIDAK TERBATAS PADA KEHILANGAN KEUNTUNGAN, DATA, PENGGUNAAN, NIAT BAIK, ATAU KERUGIAN TIDAK BERWUJUD LAINNYA, YANG TIMBUL DARI AKSES ATAU PENGGUNAAN ANDA ATAS DATA ATAU API.</p>
              </section>

              <section>
                <h3 className="text-md sm:text-lg font-semibold text-teal-600 dark:text-teal-400 mb-2">6. Pengakhiran</h3>
                <p>{domainName} berhak untuk mengakhiri lisensi ini kapan saja jika Anda melanggar ketentuan apa pun. Setelah pengakhiran, Anda harus segera berhenti menggunakan data dan API serta menghapus semua salinan data yang Anda miliki.</p>
              </section>

              <div className="flex items-start p-3 bg-teal-50 dark:bg-teal-800/30 rounded-lg border border-teal-200 dark:border-teal-700/50">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-100 dark:bg-teal-700/50 text-teal-600 dark:text-teal-300 mr-3 flex-shrink-0">
                  <Icon icon="ph:info-duotone" className="text-lg" />
                </div>
                <span className="text-sm text-teal-700 dark:text-teal-300 pt-0.5">
                  Untuk pertanyaan mengenai lisensi ini, silakan hubungi tim hukum kami.
                </span>
              </div>
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default LicensePage;
