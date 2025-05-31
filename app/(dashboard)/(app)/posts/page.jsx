"use client";

import { useState, useEffect } from "react";
import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import InputGroup from "@/components/ui/InputGroup"; // Diasumsikan ini adalah Textinput atau wrapper yang sesuai
import Modal from "@/components/ui/Modal";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from "@iconify/react";

const PostsPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false); // General loading state for fetching posts
  const [isSubmitting, setIsSubmitting] = useState(false); // Specific for modal form submissions
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showEditPostModal, setShowEditPostModal] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "" });
  const [editingPost, setEditingPost] = useState(null); // Stores { _id, title, content } for the post being edited

  const [userProfile, setUserProfile] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedProfile = localStorage.getItem("chatUserProfile");
      if (savedProfile) {
        try {
          return JSON.parse(savedProfile);
        } catch (e) {
          console.error("Gagal parse profil pengguna dari localStorage", e);
        }
      }
    }
    return {
      name: "Anonim",
      avatar: "/assets/images/users/user-default.png",
      userId: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    };
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const callApi = async (url, method, body = null, operationContext = "") => {
    const isLoadingSetter = operationContext === "submit" ? setIsSubmitting : setLoading;
    isLoadingSetter(true);
    
    try {
      const options = {
        method,
        headers: { "Content-Type": "application/json" },
      };
      if (body) options.body = JSON.stringify(body);
      
      const response = await fetch(url, options);
      const responseData = await response.json(); // Backend should always return JSON

      if (!response.ok || !responseData.success) {
        const errorMsg = responseData.message || `Operasi ${operationContext || method.toLowerCase()} gagal. Status: ${response.status}`;
        toast.error(errorMsg);
        return { success: false, message: errorMsg, data: responseData.data || null };
      }
      return { success: true, message: responseData.message, data: responseData.data };
    } catch (err) {
      console.error(`API call error (${operationContext || method}):`, err);
      const errorMsg = "Terjadi kesalahan jaringan atau server.";
      toast.error(errorMsg);
      return { success: false, message: errorMsg, data: null };
    } finally {
      isLoadingSetter(false);
    }
  };

  const fetchPosts = async () => {
    const result = await callApi("/api/posts", "GET", null, "memuat postingan");
    if (result.success) {
      // Backend GET returns { success: true, data: postsArray } or 
      // { success: false, message: "No posts found" } if empty (as per original backend)
      // or { success: true, data: [] } if modified backend for empty case
      setPosts(result.data || []); 
    } else {
      // Error toast is shown by callApi. Set posts to empty if fetch failed.
      setPosts([]);
    }
  };

  const handleCreatePost = async (e) => {
    if (e) e.preventDefault();
    if (!newPost.title.trim() || !newPost.content.trim()) {
      toast.warn("Judul dan konten postingan tidak boleh kosong.");
      return;
    }
    if (!userProfile.name || userProfile.name === "Anonim") {
      toast.warn("Mohon atur nama Anda di profil (misal dari halaman Chat) terlebih dahulu sebelum membuat postingan!");
      return; 
    }

    const postData = {
      title: newPost.title,
      content: newPost.content,
      author: userProfile.name, // Matches backend field
      authorAvatar: userProfile.avatar || "/assets/images/users/user-default.png", // Matches backend field
    };

    const result = await callApi("/api/posts", "POST", postData, "submit");
    if (result.success) {
      toast.success(result.message || "Postingan berhasil dibuat!");
      setNewPost({ title: "", content: "" });
      setShowCreatePostModal(false);
      fetchPosts();
    }
  };

  const handleEditPost = async (e) => {
    if (e) e.preventDefault();
    if (!editingPost || !editingPost.title.trim() || !editingPost.content.trim()) {
      toast.warn("Judul dan konten postingan yang diedit tidak boleh kosong.");
      return;
    }

    const updatedData = {
      postId: editingPost._id,       // Matches backend field
      newTitle: editingPost.title,   // Matches backend field
      newContent: editingPost.content, // Matches backend field
    };
    // Author and authorAvatar are not sent as they are not updatable via this backend endpoint

    const result = await callApi("/api/posts", "PUT", updatedData, "submit");
    if (result.success) {
      toast.success(result.message || "Postingan berhasil diperbarui!");
      setEditingPost(null);
      setShowEditPostModal(false);
      fetchPosts();
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm("Apakah Anda yakin ingin menghapus postingan ini?")) return;

    const result = await callApi(`/api/posts?id=${postId}`, "DELETE", null, "menghapus postingan");
    if (result.success) {
      toast.success(result.message || "Postingan berhasil dihapus!");
      fetchPosts();
    }
  };
  
  const inputBaseClass = "w-full bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const buttonPrimaryClass = "bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-150 py-2 px-4 text-sm flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed";
  const buttonSecondaryClass = "border border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-md shadow-sm py-2 px-4 text-sm flex items-center justify-center disabled:opacity-70";
  const labelBaseClass = "block text-sm font-medium text-teal-700 dark:text-teal-300 mb-1.5 flex items-center";
  const sectionCardClass = "bg-slate-100/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700/50 shadow-sm";

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="colored"
        toastClassName={(o) => `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : o?.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-sky-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`}
      />
      <div className="w-full px-2 sm:px-4 py-4">
        <Card
          bodyClass="relative p-0 h-full overflow-hidden flex flex-col"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-xl bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
          style={{ height: 'calc(100vh - 4rem)' }}
        >
          <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700/60 shrink-0">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center">
                <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mr-2.5 sm:mr-3 shrink-0">
                  <Icon icon="ph:article-medium-duotone" className="text-xl sm:text-2xl" />
                </div>
                <div className="text-center sm:text-left">
                  <h1 className="text-base sm:text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
                    Postingan Komunitas
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Diposting sebagai: <strong className="text-teal-600 dark:text-teal-400">{userProfile.name}</strong>
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowCreatePostModal(true)}
                text={<><Icon icon="ph:plus-circle-duotone" className="mr-1.5 text-sm sm:text-base" /> Buat Postingan</>}
                className={`${buttonPrimaryClass} py-2 px-3 sm:px-4 text-xs sm:text-sm w-full mt-2 sm:w-auto sm:mt-0`}
                disabled={loading || isSubmitting}
              />
            </div>
          </div>

          <SimpleBar className="flex-grow overflow-y-auto">
            <div className="p-3 sm:p-4 space-y-4">
              {loading && posts.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center justify-center min-h-[300px]">
                  <Icon icon="svg-spinners:blocks-shuffle-3" className="text-4xl text-teal-500 mb-4" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Memuat postingan...</p>
                </div>
              ) : posts.length > 0 ? (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post._id} className={`${sectionCardClass} bg-white dark:bg-slate-800/60`}>
                      <div className="flex items-start mb-2.5">
                        <img
                          src={post.authorAvatar || "/assets/images/users/user-default.png"}
                          alt={`${post.author}'s Avatar`}
                          onError={(e) => { e.target.onerror = null; e.target.src = "/assets/images/users/user-default.png"; }}
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full mr-2.5 sm:mr-3 border-2 border-teal-500/50 object-cover bg-slate-200 dark:bg-slate-700"
                        />
                        <div>
                          <p className="text-sm sm:text-base font-semibold text-teal-600 dark:text-teal-300">{post.author}</p>
                          <small className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                            {new Date(post.createdAt).toLocaleString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            {post.updatedAt && new Date(post.createdAt).getTime() !== new Date(post.updatedAt).getTime() && (
                              <span className="ml-1.5 opacity-70">(diedit)</span>
                            )}
                          </small>
                        </div>
                      </div>
                      <h4 className="text-md sm:text-lg font-bold text-slate-800 dark:text-slate-100 mb-1.5">{post.title}</h4>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap mb-3 leading-relaxed">{post.content}</p>
                      
                      {post.author === userProfile.name && (
                        <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                          <Button
                            onClick={() => { 
                              setEditingPost({ 
                                _id: post._id, 
                                title: post.title, 
                                content: post.content,
                                // author and authorAvatar are not part of editingPost state as they are not editable here
                              }); 
                              setShowEditPostModal(true); 
                            }}
                            text={<><Icon icon="ph:pencil-simple-duotone" className="mr-1 text-xs" /> Edit</>}
                            className="border border-sky-500/70 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 dark:hover:bg-sky-500/20 text-[11px] sm:text-xs py-1 px-2 rounded-md transition-colors"
                            disabled={isSubmitting}
                          />
                          <Button
                            onClick={() => handleDeletePost(post._id)}
                            text={<><Icon icon="ph:trash-duotone" className="mr-1 text-xs" /> Hapus</>}
                            className="border border-red-500/70 text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/20 text-[11px] sm:text-xs py-1 px-2 rounded-md transition-colors"
                            disabled={isSubmitting}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`${sectionCardClass} text-center py-10`}>
                    <Icon icon="ph:files-duotone" className="mx-auto text-5xl text-slate-400 dark:text-slate-500 mb-3" />
                    <p className="text-base text-slate-500 dark:text-slate-400">
                      {!loading ? "Belum ada postingan." : "Memuat data..." /* Should not show if loading is true and posts are empty */}
                    </p>
                    {!loading && posts.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Jadilah yang pertama membuat postingan!</p>}
                </div>
              )}
            </div>
          </SimpleBar>
        </Card>
      </div>

      <Modal
        title="Buat Postingan Baru"
        activeModal={showCreatePostModal}
        onClose={() => {setShowCreatePostModal(false); setNewPost({ title: "", content: "" });}}
        themeClass="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-lg shadow-xl"
        headerClass="bg-gradient-to-r from-teal-500 to-cyan-600 text-white"
        titleClass="text-base sm:text-lg font-semibold"
        footerContent={
          <div className="flex justify-end space-x-2">
            <Button
              type="button" text="Batal"
              onClick={() => {setShowCreatePostModal(false); setNewPost({ title: "", content: "" });}}
              className={buttonSecondaryClass + " text-xs sm:text-sm py-1.5 px-3"}
              disabled={isSubmitting}
            />
            <Button
              text={isSubmitting ? <><Icon icon="svg-spinners:ring-resize" className="mr-2 text-sm"/> Membuat...</> : 'Buat Postingan'}
              onClick={handleCreatePost} 
              className={buttonPrimaryClass + " text-xs sm:text-sm py-1.5 px-3"}
              disabled={isSubmitting || !newPost.title.trim() || !newPost.content.trim()}
            />
          </div>
        }
      >
        <form onSubmit={handleCreatePost} className="space-y-3 text-slate-800 dark:text-slate-100 p-0.5">
          <div>
            <label htmlFor="postTitle" className={labelBaseClass}><Icon icon="ph:text-aa-duotone" className="mr-1.5 text-sm"/>Judul Postingan</label>
            <InputGroup
              id="postTitle" type="text"
              placeholder="Judul yang menarik..."
              value={newPost.title}
              onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
              className={inputBaseClass}
              required
            />
          </div>
          <div>
            <label htmlFor="postContent" className={labelBaseClass}><Icon icon="ph:note-pencil-duotone" className="mr-1.5 text-sm"/>Konten Postingan</label>
            <textarea
              id="postContent"
              placeholder="Tuliskan pemikiran Anda di sini..."
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              rows="5"
              className={`${inputBaseClass} min-h-[100px]`}
              required
            />
          </div>
        </form>
      </Modal>

      <Modal
        title="Edit Postingan"
        activeModal={showEditPostModal}
        onClose={() => {setShowEditPostModal(false); setEditingPost(null);}}
        themeClass="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-lg shadow-xl"
        headerClass="bg-gradient-to-r from-sky-500 to-blue-600 text-white" 
        titleClass="text-base sm:text-lg font-semibold"
        footerContent={
          <div className="flex justify-end space-x-2">
            <Button
              type="button" text="Batal"
              onClick={() => {setShowEditPostModal(false); setEditingPost(null);}}
              className={buttonSecondaryClass + " text-xs sm:text-sm py-1.5 px-3"}
              disabled={isSubmitting}
            />
            <Button
              text={isSubmitting ? <><Icon icon="svg-spinners:ring-resize" className="mr-2 text-sm"/> Memperbarui...</> : 'Perbarui Postingan'}
              onClick={handleEditPost}
              className={`bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition duration-150 py-1.5 px-3 text-xs sm:text-sm flex items-center justify-center disabled:opacity-70`} // py-2 px-4 was a bit large for modal
              disabled={isSubmitting || !editingPost?.title.trim() || !editingPost?.content.trim()}
            />
          </div>
        }
      >
        <form onSubmit={handleEditPost} className="space-y-3 text-slate-800 dark:text-slate-100 p-0.5">
          <div>
            <label htmlFor="editPostTitle" className={labelBaseClass.replace('text-teal-700 dark:text-teal-300', 'text-sky-700 dark:text-sky-300')}><Icon icon="ph:text-aa-duotone" className="mr-1.5 text-sm"/>Judul Postingan</label>
            <InputGroup
              id="editPostTitle" type="text"
              placeholder="Judul yang diperbarui..."
              value={editingPost?.title || ""}
              onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
              className={inputBaseClass.replace('focus:ring-teal-500 focus:border-teal-500','focus:ring-sky-500 focus:border-sky-500')}
              required
            />
          </div>
          <div>
            <label htmlFor="editPostContent" className={labelBaseClass.replace('text-teal-700 dark:text-teal-300', 'text-sky-700 dark:text-sky-300')}><Icon icon="ph:note-pencil-duotone" className="mr-1.5 text-sm"/>Konten Postingan</label>
            <textarea
              id="editPostContent"
              placeholder="Konten yang diperbarui..."
              value={editingPost?.content || ""}
              onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
              rows="5"
              className={`${inputBaseClass.replace('focus:ring-teal-500 focus:border-teal-500','focus:ring-sky-500 focus:border-sky-500')} min-h-[100px]`}
              required
            />
          </div>
        </form>
      </Modal>
    </>
  );
};

export default PostsPage;