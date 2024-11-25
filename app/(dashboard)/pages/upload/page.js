'use client';

import React, { useState } from 'react';
import { Button, Form, Alert, Spinner, Card } from 'react-bootstrap';
import { CloudUpload, FileLock, CheckCircle } from 'react-bootstrap-icons';
import { useDropzone } from 'react-dropzone';
import { fileTypeFromBuffer } from "file-type";
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export default function UploadFilePage() {
  const [file, setFile] = useState(null);
  const [optionParam, setOptionParam] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadResult, setUploadResult] = useState('');

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => setFile(acceptedFiles[0]),
    multiple: false,
    accept: '.jpg,.png,.jpeg,.pdf,.doc,.docx,.txt',
  });

  const handleOptionChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 1 && value <= 35) {
      setOptionParam(value);
      setError('');
    } else {
      setError('Opsi harus berupa angka antara 1 dan 35.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file) {
      setError('Harap pilih file untuk diunggah');
      return;
    }

    setError('');
    setUploading(true);
    setUploadResult('');

    try {
      const fileBlob = new Blob([file], { type: file.type || 'application/octet-stream' });
      const uploadUrl = `/api/tools/upload?option=${optionParam}`;

      const { ext, mime } = (await fileTypeFromBuffer(file)) || {
        ext: "bin",
        mime: "application/octet-stream",
      };

      const generateSlug = crypto
        .createHash("md5")
        .update(`${Date.now()}-${uuidv4()}`)
        .digest("hex")
        .substring(0, 8);

      const formData = new FormData();
      formData.append('file', fileBlob, `${generateSlug}.${ext || "bin"}`);

      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload gagal');

      const result = await res.json();
      setUploadResult(result.result);
    } catch (err) {
      setError('Terjadi kesalahan saat mengunggah file');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setOptionParam(1);
    setUploadResult('');
    setError('');
  };

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">Unggah File</h2>

      <div className="d-flex justify-content-center">
        <Card className="p-4 shadow-lg w-75" style={{ borderRadius: '10px', backgroundColor: '#f9f9f9' }}>
          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="file" className="mb-3">
              <Form.Label><FileLock /> Pilih File untuk Diunggah</Form.Label>
              <div
                {...getRootProps()}
                className="dropzone p-4 text-center border border-dashed border-primary rounded"
                style={{
                  cursor: 'pointer',
                  borderColor: '#007bff',
                  backgroundColor: '#f7f9fc',
                }}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div>
                    <p><strong>File Terpilih:</strong> {file.name}</p>
                  </div>
                ) : (
                  <p>Seret file di sini atau klik untuk memilih file</p>
                )}
              </div>
            </Form.Group>

            <Form.Group controlId="option" className="mb-3">
              <Form.Label>Pilih Opsi (Angka antara 1 hingga 35)</Form.Label>
              <Form.Control
                type="number"
                value={optionParam}
                onChange={handleOptionChange}
                min="1"
                max="35"
                required
                style={{ borderRadius: '8px' }}
              />
              <Form.Text className="text-muted">
                Masukkan angka antara 1 dan 35 untuk memilih opsi yang tepat.
              </Form.Text>
            </Form.Group>

            <Button 
              variant="primary" 
              type="submit" 
              disabled={uploading} 
              className="w-100" 
              style={{ borderRadius: '8px', padding: '10px', backgroundColor: '#007bff' }}
            >
              {uploading ? <Spinner animation="border" size="sm" /> : <><CloudUpload /> Unggah</>}
            </Button>

            {uploadResult && (
              <Button 
                variant="secondary" 
                onClick={handleReset} 
                className="w-100 mt-3" 
                style={{ borderRadius: '8px', padding: '10px' }}
              >
                <CheckCircle /> Reset
              </Button>
            )}
          </Form>
        </Card>
      </div>

      {error && <Alert variant="danger" className="mt-3 text-center">{error}</Alert>}

      {uploadResult && (
        <Card className="mt-4 shadow-lg">
          <Card.Body className="text-center">
            <h5 className="mb-3">Hasil Unggahan:</h5>
            <p>{uploadResult}</p>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
