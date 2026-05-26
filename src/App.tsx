import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import SettingsPage from './pages/SettingsPage';
import LibraryPage from './pages/LibraryPage';
import ReaderPage from './pages/ReaderPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SettingsPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/read/:bookId" element={<ReaderPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
