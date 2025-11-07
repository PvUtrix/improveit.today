import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MapView from './pages/MapView';
import GlobeView from './pages/GlobeView';
import ProblemDetail from './pages/ProblemDetail';
import Header from './components/Header';

function App() {
  return (
    <div className="app">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/globe" element={<GlobeView />} />
        <Route path="/problem/:id" element={<ProblemDetail />} />
      </Routes>
    </div>
  );
}

export default App;
