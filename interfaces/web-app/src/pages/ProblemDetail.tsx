import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { problemsApi, votesApi } from '../lib/api';
import { useAuth } from '../store/auth';
import FundingPanel from '../components/FundingPanel';
import BidsPanel from '../components/BidsPanel';

function ProblemDetail() {
  const { id } = useParams();
  const problemId = id!;
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: problem, isLoading } = useQuery({
    queryKey: ['problem', problemId],
    queryFn: () => problemsApi.get(problemId),
  });

  const { data: stats } = useQuery({
    queryKey: ['votes', problemId],
    queryFn: () => votesApi.getStats(problemId),
  });

  const { data: myVote } = useQuery({
    queryKey: ['myVote', problemId, user?.id],
    queryFn: () => votesApi.getMyVote(user!.id, problemId),
    enabled: !!user,
  });

  const hasUpvoted = myVote?.vote_type === 'upvote';

  const vote = useMutation({
    mutationFn: () =>
      hasUpvoted
        ? votesApi.remove(user!.id, problemId)
        : votesApi.cast(user!.id, problemId, 'upvote'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['votes', problemId] });
      qc.invalidateQueries({ queryKey: ['myVote', problemId, user?.id] });
    },
  });

  if (isLoading) {
    return <div className="detail-page">Loading…</div>;
  }
  if (!problem) {
    return <div className="detail-page">Problem not found</div>;
  }

  const upvotes = stats?.upvotes ?? problem.upvotes ?? 0;

  return (
    <div className="detail-page">
      <h1>{problem.title}</h1>

      <div className="detail-meta">
        <span>
          📍 {problem.address || `${problem.latitude}, ${problem.longitude}`}
        </span>
        <span>•</span>
        <span>🏷️ {problem.category}</span>
        <span>•</span>
        <span className={`status-pill status-${problem.status}`}>
          {problem.status.replace('_', ' ')}
        </span>
      </div>

      <p className="detail-description">{problem.description}</p>

      {problem.media && problem.media.length > 0 && (
        <div className="detail-media">
          {problem.media.map((m) => (
            <img key={m.id} src={m.media_url} alt="Problem" />
          ))}
        </div>
      )}

      <div className="detail-actions">
        <button
          className={`button ${hasUpvoted ? '' : 'button-secondary'}`}
          disabled={!user || vote.isPending}
          onClick={() => vote.mutate()}
          title={user ? '' : 'Sign in to vote'}
        >
          ⬆️ {hasUpvoted ? 'Upvoted' : 'Upvote'} · {upvotes}
        </button>
      </div>

      <div className="detail-panels">
        <FundingPanel problemId={problemId} />
        <BidsPanel problemId={problemId} problemStatus={problem.status} />
      </div>
    </div>
  );
}

export default ProblemDetail;
