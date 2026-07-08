import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { biddingApi } from '../lib/api';
import { useAuth } from '../store/auth';

function money(amount: string | number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    Number(amount)
  );
}

function BidsPanel({
  problemId,
  problemStatus,
}: {
  problemId: string;
  problemStatus: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [amount, setAmount] = useState(100);
  const [timelineDays, setTimelineDays] = useState(7);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: bids, isLoading } = useQuery({
    queryKey: ['bids', problemId],
    queryFn: () => biddingApi.listForProblem(problemId),
  });

  // Is the signed-in user a registered solver?
  const { data: solver } = useQuery({
    queryKey: ['solver', user?.id],
    queryFn: () => biddingApi.getSolverByUser(user!.id),
    enabled: !!user,
  });

  const becomeSolver = useMutation({
    mutationFn: () => biddingApi.registerSolver(user!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['solver', user?.id] }),
    onError: (e: any) =>
      setError(e?.response?.data?.error?.message || 'Failed to register as solver'),
  });

  const submitBid = useMutation({
    mutationFn: () =>
      biddingApi.submit({
        problemId,
        solverId: solver!.id,
        amount,
        description,
        timelineDays,
      }),
    onSuccess: () => {
      setDescription('');
      qc.invalidateQueries({ queryKey: ['bids', problemId] });
    },
    onError: (e: any) =>
      setError(e?.response?.data?.error?.message || 'Failed to submit bid'),
  });

  const acceptBid = useMutation({
    mutationFn: (bidId: string) => biddingApi.accept(bidId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bids', problemId] });
      qc.invalidateQueries({ queryKey: ['problem', problemId] });
    },
    onError: (e: any) =>
      setError(e?.response?.data?.error?.message || 'Failed to accept bid'),
  });

  const biddable = ['reported', 'verified', 'escalated'].includes(problemStatus);

  if (isLoading) return <div className="panel">Loading bids…</div>;

  return (
    <section className="panel">
      <h2>🔧 Solver Marketplace</h2>
      {error && <div className="form-error">{error}</div>}

      {bids && bids.length > 0 ? (
        <ul className="bid-list">
          {bids.map((bid) => (
            <li key={bid.id} className="bid-item">
              <div className="bid-head">
                <strong>{money(bid.amount, bid.currency)}</strong>
                <span className={`status-pill status-${bid.status}`}>{bid.status}</span>
              </div>
              <div className="bid-meta">
                {bid.company_name || bid.solver_username || 'Solver'}
                {bid.solver_rating && Number(bid.solver_rating) > 0 && (
                  <span> · ⭐ {Number(bid.solver_rating).toFixed(1)}</span>
                )}
                {typeof bid.completed_jobs === 'number' && (
                  <span> · {bid.completed_jobs} jobs</span>
                )}
                {bid.timeline_days && <span> · {bid.timeline_days}d</span>}
              </div>
              <p className="bid-desc">{bid.description}</p>
              {user && biddable && bid.status === 'pending' && (
                <button
                  className="button button-small"
                  disabled={acceptBid.isPending}
                  onClick={() => {
                    setError(null);
                    acceptBid.mutate(bid.id);
                  }}
                >
                  Accept bid
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No bids yet.</p>
      )}

      {!biddable && (
        <p className="muted">This problem is no longer open for bidding.</p>
      )}

      {user && biddable && (
        <div className="bid-form">
          {solver ? (
            <>
              <h3>Submit a bid</h3>
              <div className="inline-form">
                <label className="field-inline">
                  <span>Amount</span>
                  <input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
                </label>
                <label className="field-inline">
                  <span>Days</span>
                  <input
                    type="number"
                    min={1}
                    value={timelineDays}
                    onChange={(e) => setTimelineDays(Number(e.target.value))}
                  />
                </label>
              </div>
              <textarea
                className="textarea"
                placeholder="Describe how you'll fix it…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <button
                className="button"
                disabled={submitBid.isPending || !description.trim()}
                onClick={() => {
                  setError(null);
                  submitBid.mutate();
                }}
              >
                Submit bid
              </button>
            </>
          ) : (
            <div className="become-solver">
              <p className="muted">Want to fix this? Register as a solver to bid.</p>
              <button
                className="button button-secondary"
                disabled={becomeSolver.isPending}
                onClick={() => {
                  setError(null);
                  becomeSolver.mutate();
                }}
              >
                Become a solver
              </button>
            </div>
          )}
        </div>
      )}

      {!user && <p className="muted">Sign in to bid or accept bids.</p>}
    </section>
  );
}

export default BidsPanel;
