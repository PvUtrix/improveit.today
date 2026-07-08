import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MapView from './pages/MapView';
import GlobeView from './pages/GlobeView';
import ProblemDetail from './pages/ProblemDetail';
import AuthorityDashboard from './pages/AuthorityDashboard';
import ReportProblem from './pages/ReportProblem';
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
        <Route path="/dashboard" element={<AuthorityDashboard />} />
        <Route path="/report" element={<ReportProblem />} />
      </Routes>
    </div>
  );
}

export default App;
