import React, { useState } from "react";
import Textinput from "@/components/ui/Textinput";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";

const schema = yup
  .object({
    email: yup.string().email("Invalid email").required("Email is Required"),
  })
  .required();

const ForgotPass = () => {
  const [loading, setLoading] = useState(false);
  const [apiResult, setApiResult] = useState(null); // state untuk menampilkan response

  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    const loadingToast = toast.loading("Sending recovery email...");
    setLoading(true);
    setApiResult(null); // reset sebelumnya

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await res.json();
      setApiResult(result); // tampilkan hasil

      if (res.ok && result.status === 200) {
        toast.update(loadingToast, {
          render: result.message || "Recovery email sent. Please check your inbox.",
          type: "success",
          isLoading: false,
          autoClose: 1500,
        });
      } else {
        throw new Error(result.message || "User not found");
      }
    } catch (err) {
      toast.update(loadingToast, {
        render: err.message || "Something went wrong",
        type: "error",
        isLoading: false,
        autoClose: 1500,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Textinput
          name="email"
          label="Email"
          type="email"
          placeholder="Enter your email"
          register={register}
          error={errors.email}
        />

        <button
          type="submit"
          className="btn btn-dark block w-full text-center"
          disabled={loading}
        >
          {loading ? "Sending..." : "Send recovery email"}
        </button>
      </form>

      {/* tampilkan JSON result */}
      {apiResult && (
        <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded">
          <h4 className="font-semibold mb-2">API Result:</h4>
          <pre className="text-sm whitespace-pre-wrap break-all">
            {JSON.stringify(apiResult, null, 2)}
          </pre>
        </div>
      )}
    </>
  );
};

export default ForgotPass;
