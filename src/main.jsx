import React from 'react';
import { createRoot } from 'react-dom/client';
import Display from './Display.jsx';
import Control from './Control.jsx';
import { syncClock } from './time.js';
import './styles.css';

syncClock();
setInterval(syncClock, 5 * 60_000);

// Two pages: the projector screen at / and the control page at /control.
const isControl = window.location.pathname.replace(/\/+$/, '') === '/control';
document.title = isControl ? 'Missionathon Timer · Control' : 'Missionathon Timer';

createRoot(document.getElementById('root')).render(<React.StrictMode>{isControl ? <Control /> : <Display />}</React.StrictMode>);
