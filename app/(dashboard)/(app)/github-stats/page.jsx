"use client";

import SimpleBar from "simplebar-react";
import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';

const GitHubStatsPage = () => {
  const [repoUrl, setRepoUrl] = useState("https://github.com/AyGemuy/wudyver");
  const [repoInfo, setRepoInfo] = useState(null);
  const [commitStats, setCommitStats] = useState(null);
  const [fileStats, setFileStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fungsi untuk mengekstrak owner dan repo dari URL GitHub
  const extractRepoInfo = (url) => {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname !== 'github.com') {
        throw new Error("URL harus dari github.com");
      }
      
      const pathParts = parsedUrl.pathname.split('/').filter(part => part !== '');
      if (pathParts.length < 2) {
        throw new Error("URL GitHub tidak valid");
      }
      
      const owner = pathParts[0];
      const repo = pathParts[1];
      
      return { owner, repo };
    } catch (err) {
      throw new Error("URL GitHub tidak valid: " + err.message);
    }
  };

  // Fungsi untuk mengambil data repository
  const fetchRepoData = async (owner, repo) => {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (!response.ok) {
        throw new Error(`Repository tidak ditemukan: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      throw new Error("Gagal mengambil data repository: " + err.message);
    }
  };

  // Fungsi untuk mengambil statistik commit
  const fetchCommitStats = async (owner, repo) => {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`);
      if (!response.ok) {
        throw new Error(`Tidak dapat mengambil statistik commit: ${response.status}`);
      }
      
      // GitHub mungkin perlu waktu untuk menyiapkan statistik
      if (response.status === 202) {
        // Coba lagi setelah delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await fetchCommitStats(owner, repo);
      }
      
      return await response.json();
    } catch (err) {
      throw new Error("Gagal mengambil statistik commit: " + err.message);
    }
  };

  // Fungsi untuk menganalisis perubahan file (simulasi)
  const analyzeFileChanges = (commitStats) => {
    if (!commitStats || !Array.isArray(commitStats)) return null;
    
    // Ini adalah simulasi karena GitHub API tidak menyediakan endpoint khusus untuk perubahan file
    // Dalam implementasi nyata, Anda mungkin perlu menggunakan GitHub Events API atau webhook
    let totalAdditions = 0;
    let totalDeletions = 0;
    let totalChanges = 0;
    let totalCommits = 0;
    
    commitStats.forEach(week => {
      totalAdditions += week.additions || 0;
      totalDeletions += week.deletions || 0;
      totalChanges += (week.additions || 0) + (week.deletions || 0);
      totalCommits += week.total || 0;
    });
    
    return {
      additions: totalAdditions,
      deletions: totalDeletions,
      changes: totalChanges,
      commits: totalCommits,
      newFiles: Math.floor(totalAdditions / 100), // Simulasi: setiap 100 baris tambahan = 1 file baru
      updatedFiles: Math.floor(totalChanges / 50), // Simulasi: setiap 50 perubahan = 1 file diupdate
      deletedFiles: Math.floor(totalDeletions / 80) // Simulasi: setiap 80 baris dihapus = 1 file dihapus
    };
  };

  const handleAnalyzeRepo = async (e) => {
    if (e) e.preventDefault();
    
    if (!repoUrl.trim()) {
      toast.warn("Mohon masukkan URL repository GitHub!");
      return;
    }
    
    setLoading(true);
    setError(null);
    setRepoInfo(null);
    setCommitStats(null);
    setFileStats(null);
    
    try {
      // Ekstrak informasi repo dari URL
      const { owner, repo } = extractRepoInfo(repoUrl);
      
      // Ambil data repository
      const repoData = await fetchRepoData(owner, repo);
      setRepoInfo(repoData);
      
      // Ambil statistik commit
      const stats = await fetchCommitStats(owner, repo);
      setCommitStats(stats);
      
      // Analisis perubahan file (simulasi)
      const fileChanges = analyzeFileChanges(stats);
      setFileStats(fileChanges);
      
      toast.success("Analisis repository berhasil!");
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load data untuk repo default saat komponen dimount
  useEffect(() => {
    handleAnalyzeRepo();
  }, []);

  const formatNumber = (num) => {
    if (!num) return "0";
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
              'bg-sky-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`
          }
        />
        <Card
          bodyClass="relative p-0 h-full overflow-hidden"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        >
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="octicon:repo-16" className="text-2xl sm:text-3xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                GitHub Repository Statistics
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Analisis statistik dan perubahan file pada repository GitHub.
            </p>
          </div>

          <SimpleBar className="max-h-[calc(100vh-230px)]">
            <div className="p-4 sm:p-6 space-y-6">
              <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <form onSubmit={handleAnalyzeRepo} className="space-y-4">
                  <label htmlFor="repoUrl" className="block text-sm sm:text-base font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center">
                    <Icon icon="ph:link-duotone" className="mr-2 text-xl" />
                    Masukkan URL Repository GitHub
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Textinput
                      id="repoUrl"
                      type="text"
                      placeholder="https://github.com/username/repository"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      disabled={loading}
                      className="flex-grow bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      inputClassName="text-sm bg-transparent placeholder-slate-400 dark:placeholder-slate-500 p-3"
                    />
                    <Button
                      text={
                        loading ? (
                          <span className="flex items-center justify-center">
                            <Icon icon="svg-spinners:ring-resize" className="animate-spin mr-2 text-lg" /> Processing...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center">
                            <Icon icon="ph:chart-line-duotone" className="mr-1.5 text-lg" />
                            Analisis
                          </span>
                        )
                      }
                      className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 py-2.5 px-4 text-sm flex items-center justify-center disabled:opacity-70"
                      disabled={loading || !repoUrl.trim()}
                      type="submit"
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Contoh: https://github.com/facebook/react
                  </p>
                </form>
              </div>

              {loading && (
                <div className="mt-6 flex flex-col items-center justify-center p-6 bg-slate-100/70 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow">
                  <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl text-teal-500 mb-3" />
                  <p className="text-sm text-slate-600 dark:text-teal-300">
                    Sedang mengambil data repository...
                  </p>
                </div>
              )}

              {error && !loading && (
                <div className="mt-6 p-3 sm:p-4 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 rounded-lg border border-red-300 dark:border-red-500/50 flex items-start text-sm sm:text-base shadow">
                  <Icon icon="ph:warning-octagon-duotone" className="text-xl mr-2.5 mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {repoInfo && (
                <div className="space-y-6">
                  {/* Informasi Repository */}
                  <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <h2 className="text-lg font-semibold text-teal-700 dark:text-teal-300 mb-4 flex items-center">
                      <Icon icon="octicon:repo-16" className="mr-2" />
                      Informasi Repository
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center">
                        <Icon icon="ph:user-duotone" className="text-teal-500 mr-2 text-xl" />
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Pemilik</p>
                          <p className="font-medium">{repoInfo.owner?.login}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Icon icon="octicon:repo-16" className="text-teal-500 mr-2 text-xl" />
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Nama Repository</p>
                          <p className="font-medium">{repoInfo.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Icon icon="ph:star-duotone" className="text-yellow-500 mr-2 text-xl" />
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Stars</p>
                          <p className="font-medium">{formatNumber(repoInfo.stargazers_count)}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Icon icon="ph:git-fork" className="text-blue-500 mr-2 text-xl" />
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Forks</p>
                          <p className="font-medium">{formatNumber(repoInfo.forks_count)}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Icon icon="ph:eye-duotone" className="text-purple-500 mr-2 text-xl" />
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Watchers</p>
                          <p className="font-medium">{formatNumber(repoInfo.watchers_count)}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Icon icon="ph:scale" className="text-green-500 mr-2 text-xl" />
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Size</p>
                          <p className="font-medium">{formatFileSize(repoInfo.size * 1024)}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Icon icon="ph:calendar-duotone" className="text-red-500 mr-2 text-xl" />
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Dibuat</p>
                          <p className="font-medium">{new Date(repoInfo.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Icon icon="ph:calendar-plus-duotone" className="text-orange-500 mr-2 text-xl" />
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Terakhir Update</p>
                          <p className="font-medium">{new Date(repoInfo.updated_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    {repoInfo.description && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Deskripsi</p>
                        <p className="font-medium">{repoInfo.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Statistik File */}
                  {fileStats && (
                    <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                      <h2 className="text-lg font-semibold text-teal-700 dark:text-teal-300 mb-4 flex items-center">
                        <Icon icon="ph:files-duotone" className="mr-2" />
                        Statistik Perubahan File
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-700/80 p-4 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                          <div className="flex items-center">
                            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 mr-3">
                              <Icon icon="ph:plus-circle-duotone" className="text-xl" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-500 dark:text-slate-400">File Baru</p>
                              <p className="text-xl font-bold">{formatNumber(fileStats.newFiles)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white dark:bg-slate-700/80 p-4 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                          <div className="flex items-center">
                            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 mr-3">
                              <Icon icon="ph:arrow-clockwise-duotone" className="text-xl" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-500 dark:text-slate-400">File Diupdate</p>
                              <p className="text-xl font-bold">{formatNumber(fileStats.updatedFiles)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white dark:bg-slate-700/80 p-4 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                          <div className="flex items-center">
                            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 mr-3">
                              <Icon icon="ph:trash-duotone" className="text-xl" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-500 dark:text-slate-400">File Dihapus</p>
                              <p className="text-xl font-bold">{formatNumber(fileStats.deletedFiles)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white dark:bg-slate-700/80 p-4 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                          <div className="flex items-center">
                            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 mr-3">
                              <Icon icon="ph:git-commit-duotone" className="text-xl" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-500 dark:text-slate-400">Total Commit</p>
                              <p className="text-xl font-bold">{formatNumber(fileStats.commits)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-700/80 p-4 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-500 dark:text-slate-400">Baris Ditambahkan</p>
                              <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatNumber(fileStats.additions)}</p>
                            </div>
                            <Icon icon="ph:trend-up-duotone" className="text-2xl text-green-500" />
                          </div>
                        </div>
                        <div className="bg-white dark:bg-slate-700/80 p-4 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-500 dark:text-slate-400">Baris Dihapus</p>
                              <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatNumber(fileStats.deletions)}</p>
                            </div>
                            <Icon icon="ph:trend-down-duotone" className="text-2xl text-red-500" />
                          </div>
                        </div>
                        <div className="bg-white dark:bg-slate-700/80 p-4 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-500 dark:text-slate-400">Total Perubahan</p>
                              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(fileStats.changes)}</p>
                            </div>
                            <Icon icon="ph:activity-duotone" className="text-2xl text-blue-500" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Informasi Bahasa Pemrograman */}
                  {repoInfo.language && (
                    <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                      <h2 className="text-lg font-semibold text-teal-700 dark:text-teal-300 mb-4 flex items-center">
                        <Icon icon="ph:code-duotone" className="mr-2" />
                        Bahasa Pemrograman
                      </h2>
                      <div className="flex items-center">
                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 mr-3">
                          <Icon icon="ph:code-duotone" className="text-xl" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Bahasa Utama</p>
                          <p className="text-xl font-bold">{repoInfo.language}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                        Catatan: Untuk informasi bahasa yang lebih detail, GitHub API memerlukan endpoint tambahan.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-start p-3 bg-teal-50 dark:bg-teal-800/30 rounded-lg border border-teal-200 dark:border-teal-700/50">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-100 dark:bg-teal-700/50 text-teal-600 dark:text-teal-300 mr-3 flex-shrink-0">
                  <Icon icon="ph:info-duotone" className="text-lg" />
                </div>
                <div className="text-sm text-teal-700 dark:text-teal-300 pt-0.5 space-y-1">
                  <p>• Masukkan URL repository GitHub untuk melihat statistik</p>
                  <p>• Data statistik file merupakan estimasi berdasarkan aktivitas commit</p>
                  <p>• Beberapa data mungkin memerlukan waktu untuk dimuat dari GitHub API</p>
                  <p>• Repository private memerlukan autentikasi untuk mengakses datanya</p>
                </div>
              </div>
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default GitHubStatsPage;