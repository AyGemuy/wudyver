'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import InputGroup from '@/components/ui/InputGroup';
import Icon from '@/components/ui/Icon';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useRouter } from 'next/navigation';
import Checkbox from '@/components/ui/Checkbox';
import Button from '@/components/ui/Button';
import { signIn, useSession } from 'next-auth/react';
import apiConfig from '@/configs/apiConfig';
import Cookies from 'js-cookie';

const schema = yup
  .object({
    email: yup.string().email('Email tidak valid').required('Email wajib diisi'),
    password: yup
      .string()
      .min(6, 'Kata sandi minimal 6 karakter')
      .max(20, 'Kata sandi tidak boleh lebih dari 20 karakter')
      .required('Kata sandi wajib diisi'),
    confirmpassword: yup
      .string()
      .oneOf([yup.ref('password'), null], 'Kata sandi tidak cocok')
      .required('Konfirmasi kata sandi wajib diisi'),
  })
  .required();

const RegForm = () => {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingGithub, setLoadingGithub] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      Cookies.set('is_authenticated', 'true', { expires: 7 });
      router.replace('/analytics');
    } else if (status === 'unauthenticated') {
      Cookies.remove('is_authenticated');
    }
  }, [status, router]);

  const {
    register,
    formState: { errors },
    handleSubmit,
    setError,
  } = useForm({
    resolver: yupResolver(schema),
    mode: 'all',
  });

  const onSubmit = async (data) => {
    if (!checked) {
      toast.error('Anda harus menyetujui syarat dan ketentuan.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`https://${apiConfig.DOMAIN_URL}/api/auth-v2/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.message && result.message.includes('Email already exists')) {
          setError('email', {
            type: 'manual',
            message: 'Email ini sudah terdaftar',
          });
          toast.error('Email ini sudah terdaftar. Silakan gunakan email lain atau login.');
        } else {
          throw new Error(result.message || 'Pendaftaran gagal');
        }
        return;
      }

      toast.success('Pendaftaran berhasil! Mencoba login otomatis...');

      // Attempt to sign in immediately after successful registration
      // This will update the session status, which triggers the useEffect
      const signInResult = await signIn('credentials', {
        redirect: false, // Next-Auth tidak akan langsung redirect
        email: data.email,
        password: data.password,
      });

      if (signInResult?.error) {
        toast.error(signInResult.error || 'Gagal masuk secara otomatis setelah pendaftaran. Silakan login manual.');
      }
      // Jika tidak ada error, useEffect akan mendeteksi status 'authenticated' dan melakukan redirect
    } catch (err) {
      toast.error(err.message || 'Terjadi kesalahan saat pendaftaran atau login.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    if (provider === 'google') {
      setLoadingGoogle(true);
    } else if (provider === 'github') {
      setLoadingGithub(true);
    }

    try {
      await signIn(provider, { callbackUrl: '/analytics' });
    } catch (err) {
      toast.error(`Terjadi kesalahan saat pendaftaran dengan ${provider}: ${err.message}`);
    } finally {
      if (provider === 'google') {
        setLoadingGoogle(false);
      } else if (provider === 'github') {
        setLoadingGithub(false);
      }
    }
  };

  if (status === 'loading') {
    return (
      <div className="w-full px-2 py-6 text-center text-slate-700 dark:text-slate-300">
        Memuat sesi...
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white"></div>
        </div>
      </div>
    );
  }

  if (status === 'authenticated') {
    return (
      <div className="w-full px-2 py-6 text-center text-slate-700 dark:text-slate-300">
        Anda akan diarahkan...
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-2 py-6">
      <div className="w-full p-6 border rounded-2xl shadow-lg bg-white dark:bg-slate-800 text-card-foreground">
        <h2 className="text-2xl font-semibold text-center mb-6 text-slate-900 dark:text-white">Buat Akun Baru</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 ">
          <InputGroup
            type="email"
            label="Email"
            id="email"
            name="email"
            placeholder="Masukkan email Anda"
            prepend={<Icon icon="heroicons-outline:user" />}
            register={register}
            error={errors?.email}
          />
          <InputGroup
            type="password"
            label="Kata Sandi"
            id="password"
            name="password"
            placeholder="Masukkan kata sandi Anda"
            prepend={<Icon icon="heroicons-outline:lock-closed" />}
            register={register}
            error={errors?.password}
            hasicon
          />
          <InputGroup
            type="password"
            label="Konfirmasi Kata Sandi"
            id="confirmpassword"
            name="confirmpassword"
            placeholder="Konfirmasi kata sandi Anda"
            prepend={<Icon icon="heroicons-outline:lock-closed" />}
            register={register}
            error={errors?.confirmpassword}
            hasicon
          />
          <Checkbox
            label="Saya menyetujui Syarat & Ketentuan dan Kebijakan Privasi kami"
            value={checked}
            onChange={() => setChecked(!checked)}
          />
          <Button
            text={loading ? 'Memproses...' : 'Buat Akun'}
            className="btn-dark w-full"
            isLoading={loading}
            disabled={loading || loadingGoogle || loadingGithub}
            type="submit"
          />
        </form>
        <div className="mt-6 text-center text-slate-600 dark:text-slate-400">
          Sudah punya akun?{' '}
          <button
            type="button"
            className="text-blue-600 hover:underline dark:text-blue-400"
            onClick={() => router.push('/login')}
          >
            Login di sini
          </button>
        </div>
        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
          <span className="flex-shrink mx-4 text-gray-500 dark:text-gray-400">Atau</span>
          <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
        </div>
        <div className="space-y-4">
          <Button
            className="btn-outline-dark w-full flex items-center justify-center space-x-2"
            onClick={() => handleOAuthLogin('google')}
            isLoading={loadingGoogle}
            disabled={loadingGoogle || loadingGithub || loading}
          >
            <Icon icon="logos:google-icon" className="text-xl" />
            <span>Daftar dengan Google</span>
          </Button>
          <Button
            className="btn-outline-dark w-full flex items-center justify-center space-x-2"
            onClick={() => handleOAuthLogin('github')}
            isLoading={loadingGithub}
            disabled={loadingGoogle || loadingGithub || loading}
          >
            <Icon icon="mdi:github" className="text-xl" />
            <span>Daftar dengan GitHub</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RegForm;