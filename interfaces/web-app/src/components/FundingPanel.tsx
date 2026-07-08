import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fundingApi } from '../lib/api';
import { useAuth } from '../store/auth';

function money(amount: string | number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    Number(amount)
  );
}

function FundingPanel({ problemId }: { problemId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [amount, setAmount] = useState(20);
  const [goal, setGoal] = useState(200);
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', problemId],
    queryFn: () => fundingApi.getByProblem(problemId),
  });

  const createCampaign = useMutation({
    mutationFn: () => fundingApi.create(problemId, goal),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign', problemId] }),
    onError: (e: any) =>
      setError(e?.response?.data?.error?.message || 'Failed to create campaign'),
  });

  const contribute = useMutation({
    mutationFn: () => fundingApi.contribute(campaign!.id, user!.id, amount, anonymous),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign', problemId] }),
    onError: (e: any) =>
      setError(e?.response?.data?.error?.message || 'Contribution failed'),
  });

  if (isLoading) return <div className="panel">Loading funding…</div>;

  return (
    <section className="panel">
      <h2>💰 Crowdfunding</h2>
      {error && <div className="form-error">{error}</div>}

      {!campaign ? (
        <div>
          <p className="muted">No funding campaign yet.</p>
          {user ? (
            <div className="inline-form">
              <label className="field-inline">
                <span>Goal</span>
                <input
                  type="number"
                  min={1}
                  value={goal}
                  onChange={(e) => setGoal(Number(e.target.value))}
                />
              </label>
              <button
                className="button"
                disabled={createCampaign.isPending}
                onClick={() => {
                  setError(null);
                  createCampaign.mutate();
                }}
              >
                Start campaign
              </button>
            </div>
          ) : (
            <p className="muted">Sign in to start a campaign.</p>
          )}
        </div>
      ) : (
        <div>
          {(() => {
            const pct = Math.min(
              100,
              Math.round(
                (Number(campaign.current_amount) / Number(campaign.goal_amount)) * 100
              )
            );
            return (
              <>
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${pct}%` }} />
                </div>
                <div className="progress-meta">
                  <strong>{money(campaign.current_amount, campaign.currency)}</strong>{' '}
                  raised of {money(campaign.goal_amount, campaign.currency)} ({pct}%)
                  {campaign.status !== 'active' && (
                    <span className={`status-pill status-${campaign.status}`}>
                      {campaign.status}
                    </span>
                  )}
                </div>

                {user && campaign.status === 'active' ? (
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
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={anonymous}
                        onChange={(e) => setAnonymous(e.target.checked)}
                      />
                      Anonymous
                    </label>
                    <button
                      className="button"
                      disabled={contribute.isPending}
                      onClick={() => {
                        setError(null);
                        contribute.mutate();
                      }}
                    >
                      Contribute
                    </button>
                  </div>
                ) : !user ? (
                  <p className="muted">Sign in to contribute.</p>
                ) : null}

                {campaign.recentContributions &&
                  campaign.recentContributions.length > 0 && (
                    <ul className="contrib-list">
                      {campaign.recentContributions.map((c) => (
                        <li key={c.id}>
                          <span>{c.contributor || 'Anonymous'}</span>
                          <span>{money(c.amount, c.currency)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
              </>
            );
          })()}
        </div>
      )}
    </section>
  );
}

export default FundingPanel;
