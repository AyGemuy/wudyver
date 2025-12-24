"use client";

import { Provider as ReduxProvider } from "react-redux";
import { SessionProvider } from "next-auth/react";
import store from "../store";
import { HelmetProvider } from 'react-helmet-async';
import DevtoolDetector from '@/components/DevtoolDetector';
import CustomCookieConsent from "@/components/partials/widget/cookie-consent";

import "react-toastify/dist/ReactToastify.css";
import "simplebar-react/dist/simplebar.min.css";
import "flatpickr/dist/themes/light.css";
import "react-svg-map/lib/index.css";
import "leaflet/dist/leaflet.css";
import "./scss/app.scss";

export default function Providers({ children, session }) {
  return (
    <SessionProvider session={session}>
      <HelmetProvider>
        <ReduxProvider store={store}>
          <DevtoolDetector />
          {children}
          <CustomCookieConsent />
        </ReduxProvider>
      </HelmetProvider>
    </SessionProvider>
  );
}