import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import StartScreen from './pages/StartScreen';
import GameDetail from './pages/GameDetail';
import GameTable from './pages/GameTable';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartScreen />} />
        <Route path="/games/:id" element={<GameDetail />} />
        <Route path="/games/:id/play" element={<GameTable />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
