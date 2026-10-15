import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/anton/latin-400.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import Display from './Display.jsx';
import Control from './Control.jsx';
import './styles.css';

// Two views in one page: the projector screen, and the control panel at
// #control. Hash links work even when index.html is opened straight from disk.
function App() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const isControl = hash === '#control';
  useEffect(() => {
    document.title = isControl ? 'Missionathon Timer · Control' : 'Missionathon Timer';
  }, [isControl]);
  return isControl ? <Control /> : <Display preview={hash === '#preview'} />;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
