'use client';

import React, { useState, useEffect } from 'react';
import { Card, Alert, Spinner, Button, Form } from 'react-bootstrap';
import { CloudSun, ThermometerHalf, Wind, Map } from 'react-bootstrap-icons';
import Image from 'next/image';

export default function CuacaPage() {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [city, setCity] = useState('');
  const [ipCity, setIpCity] = useState('');
  const [useIpCity, setUseIpCity] = useState(true);

  useEffect(() => {
    const fetchCityByIp = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) throw new Error('Gagal mendapatkan lokasi berdasarkan IP.');
        const data = await response.json();
        setIpCity(data.city || '');
      } catch (err) {
        console.error('Error mendapatkan kota berdasarkan IP:', err);
      }
    };
    fetchCityByIp();
  }, []);

  const fetchWeather = async (cityName) => {
    if (!cityName) {
      setError('Nama kota tidak boleh kosong.');
      return;
    }

    setLoading(true);
    setError('');
    setWeatherData(null);

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

  const handleSubmit = (event) => {
    event.preventDefault();
    fetchWeather(useIpCity ? ipCity : city.trim());
  };

  const openMap = (lat, lon) => {
    if (!lat || !lon) {
      alert('Koordinat lokasi tidak tersedia.');
      return;
    }
    window.open(`https://www.google.com/maps?q=${lat},${lon}`, '_blank');
  };

  return (
    <Card className="shadow-lg border-0 p-4">
      <Card.Header className="text-center">
        <h4>
          <CloudSun size={25} className="me-2" />
          Cek Cuaca
        </h4>
      </Card.Header>

      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Check
            type="checkbox"
            label="Gunakan lokasi berdasarkan IP saya"
            checked={useIpCity}
            onChange={() => setUseIpCity(!useIpCity)}
          />
          {!useIpCity && (
            <Form.Group className="mt-3">
              <Form.Control
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Contoh: Bandung"
              />
            </Form.Group>
          )}
          <Button variant="primary" type="submit" className="mt-3 w-100" disabled={!useIpCity && !city.trim()}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Cari Cuaca'}
          </Button>
        </Form>

        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

        {weatherData && (
          <div className="mt-4">
            <h5 className="text-center">
              {weatherData.location.name}, {weatherData.location.region}, {weatherData.location.country}
            </h5>
            <div className="d-flex justify-content-center align-items-center">
              <Image src={weatherData.current.condition.iconUrl} alt="Cuaca" width={50} height={50} />
              <p className="ms-2">{weatherData.current.condition.text}</p>
            </div>

            <div className="d-flex justify-content-between">
              <div>
                <p>
                  <ThermometerHalf size={18} className="me-2" />
                  Suhu: {weatherData.current.temp_c}°C ({weatherData.current.temp_f}°F)
                </p>
                <p>Feels Like: {weatherData.current.feelslike_c}°C</p>
                <p>Humidity: {weatherData.current.humidity}%</p>
              </div>
              <div>
                <p>
                  <Wind size={18} className="me-2" />
                  Angin: {weatherData.current.wind_kph} kph
                </p>
                <p>Tekanan: {weatherData.current.pressure_mb} mb</p>
                <p>Visibilitas: {weatherData.current.vis_km} km</p>
              </div>
            </div>

            <div className="text-center mt-3">
              <Image src={weatherData.tileUrl} alt="Peta Cuaca" width={500} height={300} layout="intrinsic" />
              <Button variant="outline-primary" className="mt-2" onClick={() => openMap(weatherData.location.lat, weatherData.location.lon)}>
                <Map size={20} className="me-2" />
                Lihat di Google Maps
              </Button>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
