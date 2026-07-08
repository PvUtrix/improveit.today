import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useQuery } from '@tanstack/react-query';
import { problemsApi } from '../lib/api';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface Problem {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  category: string;
  status: string;
  upvotes: number;
}

function MapView() {
  const navigate = useNavigate();
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [viewState, setViewState] = useState({
    longitude: -100,
    latitude: 40,
    zoom: 3.5,
  });

  const { data: problems } = useQuery({
    queryKey: ['problems'],
    queryFn: () => problemsApi.list() as Promise<Problem[]>,
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      roads: '#FF5722',
      lighting: '#FFC107',
      waste: '#4CAF50',
      infrastructure: '#2196F3',
      environment: '#8BC34A',
      safety: '#F44336',
      other: '#9E9E9E',
    };
    return colors[category] || colors.other;
  };

  return (
    <div className="map-container">
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />

        {problems?.map((problem) => (
          <Marker
            key={problem.id}
            longitude={problem.longitude}
            latitude={problem.latitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedProblem(problem);
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: getCategoryColor(problem.category),
                border: '2px solid white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: 'white',
                fontWeight: 'bold',
              }}
            >
              {problem.upvotes > 0 ? problem.upvotes : ''}
            </div>
          </Marker>
        ))}

        {selectedProblem && (
          <Popup
            longitude={selectedProblem.longitude}
            latitude={selectedProblem.latitude}
            anchor="top"
            onClose={() => setSelectedProblem(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <div style={{ padding: '8px', minWidth: '200px' }}>
              <h3 style={{ marginBottom: '8px' }}>{selectedProblem.title}</h3>
              <p style={{ fontSize: '14px', marginBottom: '8px' }}>
                {selectedProblem.description.substring(0, 100)}...
              </p>
              <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#666' }}>
                <span>⬆️ {selectedProblem.upvotes} votes</span>
                <span>• {selectedProblem.category}</span>
              </div>
              <button
                className="button"
                style={{ marginTop: '8px', padding: '6px 12px', fontSize: '12px' }}
                onClick={() => navigate(`/problem/${selectedProblem.id}`)}
              >
                View Details
              </button>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

export default MapView;
