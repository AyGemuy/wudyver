"use client";

import { useState, useEffect } from "react";
import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import Modal from "@/components/ui/Modal";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';
import apiConfig from "@/configs/apiConfig";
import { useRouter } from 'next/navigation';

const WORDS_PER_SEGMENT = 75;
const DELETE_PASSWORD = apiConfig.PASSWORD;

const PostsListPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [expandedPostSegments, setExpandedPostSegments] = useState({});
  const [editingPost, setEditingPost] = useState(null);
  const [showEditPostModal, setShowEditPostModal] = useState(false);

  const router = useRouter();

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (sortBy) params.append('sortBy', sortBy);

      const response = await fetch(`/api/posts?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setPosts(result.data);
        setExpandedPostSegments({});
      } else {
        if (response.status === 404 && result.message === "No posts found") {
          setPosts([]);
        } else {
          toast.error(result.message || "Gagal mengambil daftar postingan");
        }
      }
    } catch (error) {
      toast.error("Gagal mengambil daftar postingan");
      console.error("Error fetching posts:", error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPost = async () => {
    if (!editingPost || !editingPost.title || !editingPost.content) {
        toast.warn("Judul dan Konten tidak boleh kosong.");
        return;
    }
    setLoading(true);
    try {
        const response = await fetch('/api/posts', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postId: editingPost._id,
                newTitle: editingPost.title,
                newContent: editingPost.content,
            }),
        });
        const result = await response.json();
        if (result.success) {
            toast.success("Postingan berhasil diperbarui!");
            setShowEditPostModal(false);
            setEditingPost(null);
            fetchPosts();
        } else {
            toast.error(result.message || "Gagal memperbarui postingan.");
        }
    } catch (error) {
        toast.error("Terjadi kesalahan saat memperbarui postingan.");
        console.error("Error updating post:", error);
    } finally {
        setLoading(false);
    }
  };

  const openEditModal = (post) => {
    setEditingPost({ ...post });
    setShowEditPostModal(true);
  };

  const handleDeletePost = async (postId) => {
    if (!confirm("Apakah Anda yakin ingin menghapus postingan ini?\nAnda akan diminta memasukkan password setelah ini.")) return;

    const enteredPassword = prompt(`Untuk menghapus postingan ini, masukkan password:`);
    if (enteredPassword === null) {
      toast.info("Penghapusan postingan dibatalkan.");
      return;
    }
    if (enteredPassword !== DELETE_PASSWORD) {
      toast.error("Password salah. Penghapusan postingan dibatalkan.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/posts?id=${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (result.success) {
        toast.success("Postingan berhasil dihapus!");
        fetchPosts();
      } else {
        toast.error(result.message || "Gagal menghapus postingan");
      }
    } catch (error) {
      toast.error("Gagal menghapus postingan");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success("Konten disalin ke clipboard!"))
      .catch(() => toast.error("Gagal menyalin konten."));
  };

  const getContentSegments = (contentText) => {
    const words = contentText.split(/\s+/);
    const segments = [];
    for (let i = 0; i < words.length; i += WORDS_PER_SEGMENT) {
      segments.push(words.slice(i, i + WORDS_PER_SEGMENT).join(' '));
    }
    return segments;
  };

  const showNextContentSegment = (id) => {
    setExpandedPostSegments(prevState => ({
      ...prevState,
      [id]: (prevState[id] || 1) + 1
    }));
  };

  const resetContentView = (id) => {
    setExpandedPostSegments(prevState => ({ ...prevState, [id]: 1 }));
  };

  useEffect(() => {
    fetchPosts();
  }, [searchTerm, sortBy]);

  const inputBaseClass = "w-full bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md shadow-sm text-sm p-2 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const sectionCardClass = "bg-slate-100/70 dark:bg-slate-800/40 p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-700/50 shadow-sm";
  const buttonGradientBase = "text-white font-medium py-1.5 px-3 sm:py-2 sm:px-3.5 rounded-md shadow-md text-xs sm:text-sm flex items-center justify-center transition-all duration-150 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed";
  const labelBaseClass = "block text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1 flex items-center";

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="colored"
        toastClassName={(o) =>
          `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer
          ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : o?.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-sky-500 text-white'}
          dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`
        }
      />
      <div className="w-full px-2 sm:px-4 py-4">
        <Card
          bodyClass="relative p-0 h-full overflow-hidden"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        >
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:article-duotone" className="text-xl sm:text-2xl" />
              </div>
              <h1 className="ml-0 sm:ml-4 text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500 text-center sm:text-left">
                Daftar Postingan
              </h1>
            </div>
            <p className="text-sm text-center sm:text-left text-slate-500 dark:text-slate-400 mt-2 ml-0 sm:ml-[calc(2.5rem+1rem)] md:ml-[calc(3rem+1rem)]">
              Lihat dan kelola semua artikel dan postingan Anda di sini.
            </p>
          </div>

          <SimpleBar className="flex-grow overflow-y-auto">
            <div className="p-3 sm:p-4">
              <div className={`${sectionCardClass} mb-4`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label htmlFor="searchTermInput" className={labelBaseClass}>
                      <Icon icon="ph:magnifying-glass-duotone" className="mr-1.5 text-sm sm:text-base" />
                      Cari Judul Postingan
                    </label>
                    <Textinput
                      id="searchTermInput"
                      type="text"
                      placeholder="Cari berdasarkan judul..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={inputBaseClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="sortBySelect" className={labelBaseClass}>
                      <Icon icon="ph:sort-ascending-duotone" className="mr-1.5 text-sm sm:text-base" />
                      Urutkan Berdasarkan
                    </label>
                    <select id="sortBySelect" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={inputBaseClass}>
                      <option value="createdAt">Tanggal Dibuat</option>
                      <option value="title">Judul Postingan</option>
                      <option value="author">Penulis</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
                <Button
                  onClick={fetchPosts}
                  className={`${buttonGradientBase} bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600`}
                  disabled={loading}
                  icon="ph:arrow-clockwise-duotone"
                  text="Segarkan"
                  iconPosition="left"
                  iconClassName="text-sm sm:text-base mr-1.5"
                />
              </div>

              {loading && posts.length === 0 && (
                <div className="text-center py-10 flex flex-col items-center justify-center min-h-[200px]">
                  <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl sm:text-5xl text-emerald-500 mb-4" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Memuat daftar postingan...</p>
                </div>
              )}

              {!loading && posts.length === 0 && (
                <div className="bg-slate-100/70 dark:bg-slate-800/40 p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-700/50 shadow-sm text-center py-10 sm:py-12">
                  <Icon icon="ph:files-duotone" className="mx-auto text-5xl text-slate-400 dark:text-slate-500 mb-3" />
                  <p className="text-base text-slate-500 dark:text-slate-400">Belum ada postingan.</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Coba tambahkan postingan baru atau ubah filter Anda.</p>
                </div>
              )}

              {!loading && posts.length > 0 && (
                <div className="space-y-3 sm:space-y-4">
                  {posts.map((post) => {
                    const contentSegments = getContentSegments(post.content);
                    const segmentsToShow = expandedPostSegments[post._id] || 1;
                    const displayedContent = contentSegments.slice(0, segmentsToShow).join(' ');
                    const hasMoreSegments = segmentsToShow < contentSegments.length;

                    return (
                      <div
                        key={post._id}
                        className="bg-white dark:bg-slate-800/60 p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow duration-150 cursor-pointer"
                        onClick={() => router.push(`/posts/${post._id}`)}
                      >
                        <div className="flex justify-between items-start mb-2 sm:mb-3">
                          <div className="flex-grow min-w-0">
                            <h6 className="text-sm sm:text-base font-semibold text-emerald-700 dark:text-emerald-300 flex items-center truncate">
                              <Icon icon="ph:article-medium-duotone" className="mr-1.5 text-base sm:text-lg shrink-0" />
                              <span className="truncate" title={post.title}>{post.title}</span>
                            </h6>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">ID: {post._id}</span>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                              {post.authorAvatar && (
                                <img src={post.authorAvatar} alt={post.author} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full mr-1" />
                              )}
                              <span className="flex items-center">
                                {!post.authorAvatar && <Icon icon="ph:user-circle-duotone" className="mr-0.5 sm:mr-1 text-xs sm:text-sm" />}
                                 {post.author}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center shrink-0 ml-2">
                            <Button
                                onClick={(e) => { e.stopPropagation(); openEditModal(post); }}
                                className="p-1 sm:p-1.5 rounded-md text-sky-500 hover:bg-sky-100 dark:hover:bg-sky-500/20 dark:text-sky-400 hover:text-sky-600 mr-1"
                                disabled={loading}
                                icon="ph:pencil-simple-duotone"
                                iconClassName="text-sm sm:text-base"
                                title="Edit Postingan"
                            />
                            <Button
                                onClick={(e) => { e.stopPropagation(); handleDeletePost(post._id); }}
                                className="p-1 sm:p-1.5 rounded-md text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 dark:text-red-400 hover:text-red-600"
                                disabled={loading}
                                icon="ph:trash-duotone"
                                iconClassName="text-sm sm:text-base"
                                title="Hapus Postingan"
                            />
                          </div>
                        </div>

                        <div className="bg-slate-100 dark:bg-slate-900/70 rounded-md p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700/80 relative mt-1.5">
                          <pre className="text-slate-700 dark:text-slate-200 text-[11px] sm:text-xs font-sans whitespace-pre-wrap break-words overflow-x-auto max-h-52 sm:max-h-72 simple-scrollbar">
                            <p>{displayedContent}</p>
                          </pre>
                          <div className="flex flex-col sm:flex-row items-center justify-between mt-2.5 gap-1.5 sm:gap-2">
                            <Button
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(post.content); }}
                              className={`${buttonGradientBase} w-full sm:w-auto text-[11px] sm:text-xs py-1 px-2 sm:py-1.5 sm:px-2.5 bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600`}
                              icon="ph:copy-duotone" text="Salin Konten" iconPosition="left" iconClassName="mr-1 text-xs sm:text-sm"
                            />
                            {contentSegments.length > 1 && (
                              hasMoreSegments ? (
                                <Button
                                  onClick={(e) => { e.stopPropagation(); showNextContentSegment(post._id); }}
                                  className={`${buttonGradientBase} w-full sm:w-auto text-[11px] sm:text-xs py-1 px-2 sm:py-1.5 sm:px-2.5 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600`}
                                  icon="ph:caret-down-duotone" text={`Lanjut (${segmentsToShow * WORDS_PER_SEGMENT}/${post.content.split(/\s+/).length} kata)`} iconPosition="left" iconClassName="mr-1 text-xs sm:text-sm"
                                />
                              ) : (
                                <Button
                                  onClick={(e) => { e.stopPropagation(); resetContentView(post._id); }}
                                  className={`${buttonGradientBase} w-full sm:w-auto text-[11px] sm:text-xs py-1 px-2 sm:py-1.5 sm:px-2.5 bg-gradient-to-r from-slate-500 to-gray-500 hover:from-slate-600 hover:to-gray-600`}
                                  icon="ph:caret-up-duotone" text="Ringkas" iconPosition="left" iconClassName="mr-1 text-xs sm:text-sm"
                                />
                              )
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2.5 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center"><Icon icon="ph:calendar-duotone" className="mr-1 text-xs sm:text-sm" /> {new Date(post.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          {post.updatedAt && new Date(post.updatedAt).getTime() !== new Date(post.createdAt).getTime() && (
                                 <span className="flex items-center italic"><Icon icon="ph:clock-clockwise-duotone" className="mr-1 text-xs sm:text-sm" /> Diedit: {new Date(post.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </SimpleBar>
        </Card>
      </div>

      {editingPost && (
        <Modal
            title="Edit Postingan"
            activeModal={showEditPostModal}
            onClose={() => {
                setShowEditPostModal(false);
                setEditingPost(null);
            }}
            footerContent={
                <div className="flex justify-end space-x-2">
                    <Button
                        type="button" text="Batal"
                        onClick={() => {
                            setShowEditPostModal(false);
                            setEditingPost(null);
                        }}
                        className="btn btn-outline-secondary dark:text-slate-300 dark:border-slate-600 hover:dark:bg-slate-700"
                        disabled={loading}
                    />
                    <Button
                        onClick={handleEditPost}
                        text="Simpan Perubahan"
                        className={`${buttonGradientBase} bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600`}
                        disabled={loading || !editingPost?.title || !editingPost?.content}
                        icon="ph:floppy-disk-back-duotone"
                        iconPosition="left"
                        iconClassName="text-sm sm:text-base mr-1.5"
                    />
                </div>
            }
        >
            <div className="space-y-3 text-slate-800 dark:text-slate-100 p-0.5">
                <Textinput
                    label="Judul Postingan *"
                    placeholder="Judul artikel atau postingan"
                    value={editingPost.title}
                    onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                    className={inputBaseClass}
                    labelClass={labelBaseClass}
                />
                <div>
                    <label htmlFor="editPostContent" className={labelBaseClass}>
                        Konten Postingan *
                    </label>
                    <textarea
                        id="editPostContent"
                        placeholder="Tulis konten artikel Anda di sini..."
                        value={editingPost.content}
                        onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                        rows={8}
                        className={`${inputBaseClass} font-sans text-sm leading-relaxed min-h-[150px]`}
                    />
                </div>
                   <Textinput
                    label="Nama Penulis (Tidak dapat diubah)"
                    value={editingPost.author}
                    className={inputBaseClass}
                    labelClass={labelBaseClass}
                    disabled
                />
                {editingPost.authorAvatar && (
                    <Textinput
                        label="URL Avatar Penulis (Tidak dapat diubah)"
                        value={editingPost.authorAvatar}
                        className={inputBaseClass}
                        labelClass={labelBaseClass}
                        disabled
                    />
                )}
            </div>
        </Modal>
      )}
    </>
  );
};

export default PostsListPage;