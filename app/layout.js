"use client";
import "react-toastify/dist/ReactToastify.css";
import "simplebar-react/dist/simplebar.min.css";
import "flatpickr/dist/themes/light.css";
import "react-svg-map/lib/index.css";
import "leaflet/dist/leaflet.css";
import "./scss/app.scss";
import { Provider } from "react-redux";
import store from "../store";
import Head from "./head"; // Import komponen Head dari /app/head.js

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <Head /> {/* Render komponen Head di dalam tag <head> */}
      </head>
      <body className="font-inter custom-tippy dashcode-app">
        <Provider store={store}>{children}</Provider>
      </body>
    </html>
  );
}