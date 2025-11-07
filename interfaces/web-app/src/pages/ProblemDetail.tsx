import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

function ProblemDetail() {
  const { id } = useParams();

  const { data: problem, isLoading } = useQuery({
    queryKey: ['problem', id],
    queryFn: async () => {
      const response = await axios.get(`/api/problems/${id}`);
      return response.data.data;
    },
  });

  if (isLoading) {
    return <div style={{ padding: '24px' }}>Loading...</div>;
  }

  if (!problem) {
    return <div style={{ padding: '24px' }}>Problem not found</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '16px' }}>{problem.title}</h1>

      <div style={{ marginBottom: '24px', color: '#666' }}>
        <span>📍 {problem.address || `${problem.latitude}, ${problem.longitude}`}</span>
        <span style={{ margin: '0 12px' }}>•</span>
        <span>🏷️ {problem.category}</span>
        <span style={{ margin: '0 12px' }}>•</span>
        <span>⬆️ {problem.upvotes} votes</span>
      </div>

      <p style={{ marginBottom: '24px', lineHeight: '1.6' }}>
        {problem.description}
      </p>

      {problem.media && problem.media.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '16px' }}>Photos</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {problem.media.map((media: any) => (
              <img
                key={media.id}
                src={media.media_url}
                alt="Problem"
                style={{ width: '100%', borderRadius: '8px' }}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="button">⬆️ Upvote</button>
        <button className="button">💰 Fund This</button>
        <button className="button button-secondary">📤 Share</button>
      </div>
    </div>
  );
}

export default ProblemDetail;
