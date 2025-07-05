'use client';

import "react-toastify/dist/ReactToastify.css";
import "simplebar-react/dist/simplebar.min.css";
import "flatpickr/dist/themes/light.css";
import "react-svg-map/lib/index.css";
import "leaflet/dist/leaflet.css";
import "./scss/app.scss";

import { Provider } from "react-redux";
import store from "../store";
import Head from "./head";
import { HelmetProvider } from 'react-helmet-async';
import DevtoolDetector from '@/components/DevtoolDetector';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <Head />
      </head>
      <body className="font-inter custom-tippy dashcode-app">
        <HelmetProvider>
          <Provider store={store}>
            <DevtoolDetector />
            {children}
          </Provider>
        </HelmetProvider>
      </body>
    </html>
  );
}