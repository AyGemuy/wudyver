"use client";

import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { handleLogout as logout } from "@/components/partials/auth/store";
import Card from "@/components/ui/Card";
import { toast } from "react-toastify";

const OutPage = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const doLogout = async () => {
      try {
        setLoading(true);
        await dispatch(logout());
        toast.success("Logged out successfully.");
      } catch (error) {
        toast.error("Failed to logout.");
      } finally {
        setLoading(false);
      }
    };

    doLogout();
  }, [dispatch]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="p-6 w-full max-w-md text-center">
        {loading ? (
          <p className="text-slate-500 dark:text-slate-400">Logging out...</p>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">You have been logged out.</p>
        )}
      </Card>
    </div>
  );
};

export default OutPage;
