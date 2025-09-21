import React from 'react';
import { type AppProps } from 'next/app';
import '../app/globals.css';

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

// getInitialProps removed to enable Automatic Static Optimization
// This improves performance and prevents reload loops

