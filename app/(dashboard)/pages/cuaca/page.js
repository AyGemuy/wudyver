'use client';

import React, { useState, useEffect } from 'react';
import { Card, Alert, Spinner, Button, Form } from 'react-bootstrap';
import { CloudSun, ThermometerHalf, Wind } from 'react-bootstrap-icons';
import Image from 'next/image';

export default function CuacaPage() {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [city, setCity] = useState('');
  const [ipCity, setIpCity] = useState('');
  const [useIpCity, setUseIpCity] = useState(true);

  const fetchCityByIp = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error('Gagal mendapatkan data lokasi berdasarkan IP.');
      const data = await response.json();
      setIpCity(data.city || '');
    } catch (err) {
      console.error('Error mendapatkan kota berdasarkan IP:', err);
    }
  };

  useEffect(() => {
    fetchCityByIp();
  }, []);

  const fetchWeather = async (cityName) => {
    if (!cityName) {
      setError('Nama kota tidak boleh kosong.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/info/cuaca?kota=${cityName}`);
      if (!response.ok) throw new Error('Terjadi kesalahan saat mengambil data cuaca.');
      const data = await response.json();
      setWeatherData(data.result);
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat mengambil data cuaca.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (useIpCity && ipCity) fetchWeather(ipCity);
  }, [useIpCity, ipCity]);

  const handleCityChange = (event) => {
    setCity(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const cityToFetch = useIpCity ? ipCity : city.trim();
    fetchWeather(cityToFetch);
  };

  return (
    <div className="container mt-4">
      {loading && (
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <span className="ml-2">Memuat cuaca...</span>
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      {!weatherData && !loading && (
        <Form onSubmit={handleSubmit}>
          <Form.Check
            type="checkbox"
            label="Gunakan kota berdasarkan IP saya"
            checked={useIpCity}
            onChange={() => setUseIpCity(!useIpCity)}
          />
          {!useIpCity && (
            <Form.Group className="mt-3">
              <Form.Label>Masukkan Nama Kota:</Form.Label>
              <Form.Control
                type="text"
                value={city}
                onChange={handleCityChange}
                placeholder="Contoh: Bandung"
              />
            </Form.Group>
          )}
          <Button variant="primary" type="submit" className="mt-3" disabled={!useIpCity && !city.trim()}>
            Cari Cuaca
          </Button>
        </Form>
      )}

      {weatherData && (
        <>
          <h2 className="text-center mt-4">
            Cuaca di {weatherData.location.name}, {weatherData.location.region}, {weatherData.location.country}
          </h2>

          <Card className="mt-4 shadow">
            <Card.Header>
              <CloudSun size={20} className="me-2" />
              Informasi Cuaca
            </Card.Header>
            <Card.Body>
              <div className="row">
                <div className="col-md-6">
                  <h5>Suasana:</h5>
                  <p>
                    {weatherData.current.condition.text}
                    <Image
                      src={weatherData.current.condition.iconUrl}
                      alt="Cuaca"
                      width={40}
                      height={40}
                    />
                  </p>
                </div>

                <div className="col-md-6">
                  <h5>Suhu:</h5>
                  <p>
                    <ThermometerHalf size={18} className="me-2" />
                    {weatherData.current.temp_c}°C ({weatherData.current.temp_f}°F)
                  </p>
                  <h5>Feels Like:</h5>
                  <p>{weatherData.current.feelslike_c}°C ({weatherData.current.feelslike_f}°F)</p>
                  <h5>Humidity:</h5>
                  <p>{weatherData.current.humidity}%</p>
                  <h5>
                    <Wind size={18} className="me-2" />
                    Wind:
                  </h5>
                  <p>
                    {weatherData.current.wind_mph} mph ({weatherData.current.wind_kph} kph), {weatherData.current.wind_dir}
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Button
            variant="link"
            className="mt-4"
            href={`https://www.google.com/maps?q=${weatherData.location.name}`}
            target="_blank"
          >
            Lihat Lokasi di Google Maps
          </Button>
        </>
      )}
    </div>
  );
}
