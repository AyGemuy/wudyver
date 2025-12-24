'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import InputGroup from '@/components/ui/InputGroup';
import Icon from '@/components/ui/Icon';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { signIn, useSession } from 'next-auth/react';
import { useDispatch } from 'react-redux';
import { handleLogin } from './store';
import Cookies from 'js-cookie';

const schema = yup
  .object({
    email: yup.string().email('Email tidak valid').required('Email wajib diisi'),
    password: yup
      .string()
      .min(6, 'Kata sandi minimal 6 karakter')
      .max(20, 'Kata sandi tidak boleh lebih dari 20 karakter')
      .required('Kata sandi wajib diisi'),
  })
  .required();

const LoginPage = () => {
  const [loadingCredential, setLoadingCredential] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingGithub, setLoadingGithub] = useState(false);

  const router = useRouter();
  const dispatch = useDispatch();
  const { data: session, status } = useSession();

  useEffect(() => {
    // Pastikan efek ini hanya berjalan setelah sesi dimuat
    if (status === 'authenticated') {
      Cookies.set('is_authenticated', 'true', { expires: 7 });

      // Hanya tampilkan toast sukses dan log saat login baru (isNewSignIn true)
      // Ini mencegah toast muncul setiap kali halaman refresh saat sudah login
      if (session?.isNewSignIn) {
        toast.success('Login berhasil! Mengalihkan...');
      }
      dispatch(handleLogin(true));
      router.replace('/analytics');
    } else if (status === 'unauthenticated') {
      Cookies.remove('is_authenticated');
      dispatch(handleLogin(false));
    }
  }, [status, router, dispatch, session]);

  const {
    register,
    formState: { errors },
    handleSubmit,
    setError,
  } = useForm({
    resolver: yupResolver(schema),
    mode: 'all',
  });

  const handleCredentialLogin = async (data) => {
    setLoadingCredential(true);
    try {
      const signInResult = await signIn('credentials', {
        redirect: false, // Penting: Next-Auth tidak akan langsung redirect, kita handle di useEffect
        email: data.email,
        password: data.password,
      });

      if (signInResult?.error) {
        if (signInResult.error === 'CredentialsSignin') {
          setError('email', { type: 'manual', message: 'Email atau kata sandi tidak valid' });
          setError('password', { type: 'manual', message: 'Email atau kata sandi tidak valid' });
          toast.error('Email atau kata sandi tidak valid.');
        } else {
          toast.error(signInResult.error || 'Login gagal. Silakan coba lagi.');
        }
      }
      // Jika tidak ada error, useEffect akan mendeteksi status 'authenticated' dan melakukan redirect
    } catch (err) {
      toast.error('Terjadi kesalahan yang tidak terduga: ' + err.message);
    } finally {
      setLoadingCredential(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    if (provider === 'google') {
      setLoadingGoogle(true);
    } else if (provider === 'github') {
      setLoadingGithub(true);
    }

    try {
      // Untuk OAuth, NextAuth akan secara otomatis mengarahkan setelah autentikasi berhasil
      // dan callbackUrl akan digunakan sebagai tujuan redirect.
      await signIn(provider, { callbackUrl: '/analytics' });
      // Setelah ini, useEffect di atas akan menangkap status 'authenticated' dan mengarahkan lebih lanjut
    } catch (err) {
      toast.error(`Terjadi kesalahan saat login dengan ${provider}: ${err.message}`);
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

  // Jika sudah terautentikasi, tampilkan pesan pengalihan
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

  // Tampilkan form login jika belum terautentikasi
  return (
    <div className="w-full px-2 py-6">
      <div className="w-full p-6 border rounded-2xl shadow-lg bg-white dark:bg-slate-800 text-card-foreground">
        <h2 className="text-2xl font-semibold text-center mb-6 text-slate-900 dark:text-white">Login ke Akun Anda</h2>
        <form onSubmit={handleSubmit(handleCredentialLogin)} className="space-y-4">
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
          <Button
            text={loadingCredential ? 'Memproses...' : 'Login'}
            className="btn-dark w-full"
            isLoading={loadingCredential}
            disabled={loadingGoogle || loadingGithub || loadingCredential}
            type="submit"
          />
        </form>
        <div className="mt-6 text-center text-slate-600 dark:text-slate-400">
          Belum punya akun?{' '}
          <button
            type="button"
            className="text-blue-600 hover:underline dark:text-blue-400"
            onClick={() => router.push('/register')}
          >
            Daftar di sini
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
            disabled={loadingGoogle || loadingGithub || loadingCredential}
          >
            <Icon icon="logos:google-icon" className="text-xl" />
            <span>Login dengan Google</span>
          </Button>
          <Button
            className="btn-outline-dark w-full flex items-center justify-center space-x-2"
            onClick={() => handleOAuthLogin('github')}
            isLoading={loadingGithub}
            disabled={loadingGoogle || loadingGithub || loadingCredential}
          >
            <Icon icon="mdi:github" className="text-xl" />
            <span>Login dengan GitHub</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;