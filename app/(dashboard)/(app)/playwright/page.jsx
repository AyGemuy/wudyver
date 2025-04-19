'use client';

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Clipboard, PlayCircleFill } from 'react-bootstrap-icons';
import {
  setSourceCode,
  setTimeoutMs,
  setCopied,
  runPlaywrightCode,
} from '@/components/partials/app/playwright/store';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Textinput from '@/components/ui/Textinput';
import Textarea from '@/components/ui/Textarea';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import SimpleBar from 'simplebar-react';
import { ToastContainer, toast } from 'react-toastify';

const PlaywrightPage = () => {
  const dispatch = useDispatch();
  const {
    sourceCode,
    timeoutMs,
    loading,
    error,
    output,
    copied,
  } = useSelector((state) => state.playwright);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sourceCode) return toast.error('Harap masukkan source code.');
    dispatch(runPlaywrightCode({ sourceCode, timeout: timeoutMs }));
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output);
      dispatch(setCopied(true));
      setTimeout(() => dispatch(setCopied(false)), 2000);
    } catch {
      toast.error('Gagal menyalin ke clipboard.');
    }
  };

  return (
    <>
      <ToastContainer />
      <div className="w-full px-2 py-6">
  <Card
    bodyClass="relative p-4 h-full overflow-hidden"
    className="w-full p-6 border rounded-2xl shadow-lg bg-card text-card-foreground"
  >
        <h1 className="text-2xl font-bold text-center">Playwright Test</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              label="Source Code"
              id="sourceCode"
              placeholder="Masukkan kode Playwright Anda di sini..."
              rows="6"
              value={sourceCode}
              onChange={(e) => dispatch(setSourceCode(e.target.value))}
              required
            />

            <Textinput
              label="Timeout (ms)"
              id="timeout"
              type="number"
              value={timeoutMs}
              min={1000}
              onChange={(e) => dispatch(setTimeoutMs(Number(e.target.value)))}
              required
            />

            <Button
              className="btn-dark w-full"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Execute'}
            </Button>

            {error && (
              <div className="text-red-600 text-center mt-2">{error}</div>
            )}
          </form>
        </Card>
        
        <div className="mt-4" />

        {output && (
          <Card
    bodyClass="relative p-4 h-full overflow-hidden"
    className="w-full p-6 border rounded-2xl shadow-lg bg-card text-card-foreground"
  >
            <SimpleBar style={{ maxHeight: 400 }}>
              <SyntaxHighlighter language="plaintext" style={atomOneLight}>
                {output}
              </SyntaxHighlighter>
            </SimpleBar>

            <Button
              className="btn-dark w-full"
              onClick={copyToClipboard}
              disabled={!output}
            >
              {copied ? 'Tersalin!' : 'Salin ke Clipboard'}
            </Button>
          </Card>
        )}
      </div>
    </>
  );
};

export default PlaywrightPage;
