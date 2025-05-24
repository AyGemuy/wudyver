"use client";
import { useState, useEffect } from "react";
import SimpleBar from "simplebar-react";
import useWidth from "@/hooks/useWidth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // Store all users data
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const { width, breakpoints } = useWidth();
  
  const usersPerPage = 10;

  // Fetch users data
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      
      // Store all users data
      if (data.users) {
        setAllUsers(data.users);
        setTotalUsers(data.users.length);
        setTotalPages(Math.ceil(data.users.length / usersPerPage));
        
        // Set current page data
        updateCurrentPageData(1, data.users);
      }
    } catch (error) {
      toast.error("Gagal memuat data users");
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update current page data from stored users
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
      updateCurrentPageData(currentPage);
    }
  }, [currentPage]);

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
    setCurrentPage(1); // Reset to first page
    fetchUsers();
    toast.success("Data berhasil diperbarui");
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
    return '*'.repeat(password.length);
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        toastClassName="bg-slate-800 text-slate-200 border border-slate-700"
      />
      <div className="w-full px-2 py-6">
        <Card
          bodyClass="relative p-6 h-full overflow-hidden"
          className="w-full border border-indigo-700 rounded-3xl shadow-lg bg-white text-slate-900"
        >
          <SimpleBar className="h-full">
            {/* Header */}
            <div className="p-6 border-b border-purple-800 bg-gradient-to-r from-slate-800 to-purple-900 rounded-t-3xl">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-lg">
                  <Icon icon="material-symbols:group" className="text-2xl" />
                </div>
              </div>
              <h4 className="text-xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-fuchsia-500">
                User Management
              </h4>
              <p className="text-sm text-center text-slate-400 mt-2">
                Kelola dan pantau data pengguna terdaftar
              </p>
            </div>

            {/* Stats Section */}
            <div className="p-6">
              <div className="mb-6 bg-slate-800 p-5 rounded-2xl border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center text-purple-300">
                    <Icon icon="material-symbols:analytics" className="mr-2" />
                    <span className="font-medium">Statistik Users</span>
                  </div>
                  <Button
                    onClick={handleRefresh}
                    className="bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700 text-white rounded-xl px-4 py-2 text-sm"
                    disabled={loading}
                  >
                    <Icon icon="material-symbols:refresh" className="mr-2" />
                    Refresh
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-600">
                    <div className="text-2xl font-bold text-purple-400">{totalUsers}</div>
                    <div className="text-sm text-slate-400">Total Users</div>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-600">
                    <div className="text-2xl font-bold text-fuchsia-400">{currentPage}</div>
                    <div className="text-sm text-slate-400">Halaman Saat Ini</div>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-600">
                    <div className="text-2xl font-bold text-indigo-400">{totalPages}</div>
                    <div className="text-sm text-slate-400">Total Halaman</div>
                  </div>
                </div>
              </div>

              {/* Users List */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-lg font-semibold text-slate-800 flex items-center">
                    <Icon icon="material-symbols:list" className="mr-2 text-purple-600" />
                    Daftar Users (Halaman {currentPage} dari {totalPages})
                  </h5>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <span className="ml-3 text-slate-600">Memuat data...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.length > 0 ? (
                      users.map((user, index) => (
                        <div key={user._id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:bg-slate-100 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-fuchsia-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {((currentPage - 1) * usersPerPage + index + 1)}
                              </div>
                              <div>
                                <div className="font-medium text-slate-800 flex items-center">
                                  <Icon icon="material-symbols:mail" className="mr-2 text-purple-600" />
                                  {user.email}
                                </div>
                                <div className="text-sm text-slate-600 flex items-center mt-1">
                                  <Icon icon="material-symbols:location-on" className="mr-2 text-slate-400" />
                                  IP: {user.ipAddress}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-slate-500 flex items-center">
                                <Icon icon="material-symbols:key" className="mr-2" />
                                Password: {maskPassword(user.password)}
                              </div>
                              <div className="text-xs text-slate-400 mt-1">
                                ID: {user._id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-slate-500">
                        <Icon icon="material-symbols:inbox" className="text-4xl mx-auto mb-4" />
                        <p>Tidak ada data users yang ditemukan</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <Button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1 || loading}
                  className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon icon="material-symbols:chevron-left" className="mr-2" />
                  Previous
                </Button>
                
                <div className="flex items-center space-x-2 text-slate-300">
                  <span className="text-sm">
                    Menampilkan {((currentPage - 1) * usersPerPage) + 1} - {Math.min(currentPage * usersPerPage, totalUsers)} dari {totalUsers} users
                  </span>
                </div>
                
                <Button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages || loading}
                  className="bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700 text-white rounded-xl px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <Icon icon="material-symbols:chevron-right" className="ml-2" />
                </Button>
              </div>
            </div>
          </SimpleBar>
        </Card>
      </div>
    </>
  );
};

export default UserManagementPage;