/**
 * Query by Humming - Main Application
 * =====================================
 * A premium web application that identifies songs from hummed melodies.
 * 
 * Design System:
 * - Background: Zinc-950 (#09090b)
 * - Surface: Zinc-900 (#18181b)
 * - Accent: Emerald-500 (#10b981)
 * - Glow: Violet-500 (#8b5cf6)
 * - Typography: Figtree / Montserrat
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Home } from './pages/Home';
import { Library } from './pages/Library';
import { HowItWorks } from './pages/HowItWorks';
import { SongDetails } from './pages/SongDetails';
import './index.css';

/**
 * Main Application Component with Routing
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="library" element={<Library />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="song/:id" element={<SongDetails />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
