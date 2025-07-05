"use client";
import { useState, useEffect } from "react";
import SimpleBar from "simplebar-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  const usersPerPage = 10;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      
      if (data.users) {
        setAllUsers(data.users);
        setTotalUsers(data.users.length);
        const calculatedTotalPages = Math.ceil(data.users.length / usersPerPage);
        setTotalPages(calculatedTotalPages);
        
        const newCurrentPage = Math.min(currentPage, calculatedTotalPages) || 1;
        setCurrentPage(newCurrentPage);
        updateCurrentPageData(newCurrentPage, data.users);
      } else {
        setAllUsers([]);
        setTotalUsers(0);
        setTotalPages(0);
        setUsers([]);
      }
    } catch (error) {
      toast.error("Gagal memuat data users!");
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCurrentPageData = (page, usersData = allUsers) => {
    const startIndex = (page - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const paginatedUsers = usersData.slice(startIndex, endIndex);
    setUsers(paginatedUsers);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (allUsers.length > 0) {
      updateCurrentPageData(currentPage, allUsers);
    } else {
      setUsers([]);
    }
  }, [currentPage, allUsers]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleRefresh = () => {
    fetchUsers();
    toast.success("Data berhasil diperbarui!");
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const maskPassword = (password) => {
    if (!password) return "N/A";
    return '*'.repeat(password.length > 12 ? 12 : password.length);
  };

  return (
    <>
      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        newestOnTop 
        theme="colored"
        toastClassName={(o) => 
            `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer 
            ${o?.type === 'success' ? 'bg-emerald-500 text-white' : o?.type === 'error' ? 'bg-red-500 text-white' : 'bg-sky-500 text-white'} 
            dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`
        }
      />
      <div className="w-full px-2 sm:px-4 md:px-6 py-6">
        <Card
        bodyClass="relative p-0 h-full overflow-hidden"
        className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
      >
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left">
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mb-2 sm:mb-0">
                <Icon icon="ph:users-three-duotone" className="text-2xl" />
              </div>
              <div>
                <h4 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-emerald-500">
                  User Management
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Kelola dan pantau data pengguna terdaftar
                </p>
              </div>
            </div>
          </div>

          <SimpleBar className="h-full" style={{ maxHeight: 'calc(100vh - 230px)' }}>
            <div className="p-4 sm:p-6">
              <div className="mb-6 bg-slate-100 dark:bg-slate-800/60 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-3 sm:gap-0">
                  <div className="flex items-center text-emerald-600 dark:text-emerald-400">
                    <Icon icon="ph:chart-bar-duotone" className="mr-2 text-xl" />
                    <span className="font-medium">Statistik Users</span>
                  </div>
                  <Button
                    onClick={handleRefresh}
                    className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white rounded-md px-4 py-2 text-sm shadow-sm flex items-center justify-center"
                    disabled={loading}
                  >
                    <Icon icon="ph:arrows-clockwise-duotone" className="mr-1 sm:mr-2" />
                    Refresh
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-slate-900/70 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{totalUsers}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Total Users</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900/70 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="text-2xl font-bold text-teal-500 dark:text-teal-400">{currentPage}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Halaman Saat Ini</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900/70 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm sm:col-span-2 md:col-span-1">
                    <div className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{totalPages}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Total Halaman</div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-base sm:text-lg font-semibold text-slate-700 dark:text-slate-200 flex items-center">
                    <Icon icon="ph:list-bullets-duotone" className="mr-2 text-emerald-500 dark:text-emerald-400 text-xl" />
                    Daftar Users ({users.length > 0 ? `Hal ${currentPage} dari ${totalPages}` : 'Tidak ada data'})
                  </h5>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Icon icon="svg-spinners:blocks-shuffle-3" className="text-5xl text-emerald-500 mb-4" />
                    <span className="ml-0 mt-4 sm:mt-3 text-slate-600 dark:text-slate-300">Memuat data...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.length > 0 ? (
                      users.map((user, index) => (
                        <div  
                          key={user._id}  
                          className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-lg p-3 sm:p-4 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/70 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                            <div className="flex items-center space-x-3 sm:space-x-4">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm shrink-0">
                                {((currentPage - 1) * usersPerPage + index + 1)}
                              </div>
                              <div className="min-w-0">
                                <a  
                                  href={`mailto:${user.email}`}
                                  className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline flex items-center text-sm sm:text-base group break-all"
                                  title={`Kirim email ke ${user.email}`}
                                >
                                  <Icon icon="ph:envelope-simple-duotone" className="mr-1 sm:mr-2 text-emerald-500 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 shrink-0 text-lg" />
                                  {user.email}
                                </a>
                                {user.ipAddress && (
                                  <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center mt-1">
                                    <Icon icon="ph:map-pin-duotone" className="mr-1 sm:mr-2 text-slate-400 dark:text-slate-500 shrink-0 text-base" />
                                    IP: {user.ipAddress}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-left sm:text-right mt-2 sm:mt-0 pl-11 sm:pl-0">
                              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center sm:justify-end">
                                <Icon icon="ph:key-duotone" className="mr-1 sm:mr-2 shrink-0 text-base" />
                                Sandi: {maskPassword(user.password)}
                              </div>
                              <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                ID: {user._id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                        <Icon icon="ph:users-four-duotone" className="text-5xl mx-auto mb-4 opacity-70" />
                        <p className="text-lg">Tidak ada data users yang ditemukan.</p>
                        <p className="text-sm mt-1">Coba refresh atau periksa koneksi.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {totalPages > 0 && (
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between bg-slate-100 dark:bg-slate-800/60 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 mt-6 shadow-sm">
                  <Button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1 || loading}
                    className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-md px-4 sm:px-6 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Icon icon="ph:caret-left-bold" className="mr-1 sm:mr-2" />
                    Sebelumnya
                  </Button>
                  
                  <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 text-xs sm:text-sm order-first sm:order-none">
                    <span>
                      Menampilkan {users.length > 0 ? ((currentPage - 1) * usersPerPage) + 1 : 0} - {Math.min(currentPage * usersPerPage, totalUsers)} dari {totalUsers} users
                    </span>
                  </div>
                  
                  <Button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages || loading}
                    className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white rounded-md px-4 sm:px-6 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    Berikutnya
                    <Icon icon="ph:caret-right-bold" className="ml-1 sm:ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default UserManagementPage;