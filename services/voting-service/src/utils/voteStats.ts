import { db } from '../db';
import { logger } from './logger';

export interface VoteStats {
  upvotes: number;
  downvotes: number;
  score: number;
}

/**
 * Exact live counts for one problem, straight from the votes table (indexed
 * by problem_id). Cheap and always current — used for the response to a vote
 * and for the per-problem stats endpoint, so callers never see a stale count
 * even though the `vote_aggregates` matview is refreshed lazily.
 */
export async function computeStats(problemId: string): Promise<VoteStats> {
  const { rows } = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE vote_type = 'upvote')::int   AS upvotes,
       COUNT(*) FILTER (WHERE vote_type = 'downvote')::int AS downvotes
     FROM votes WHERE problem_id = $1`,
    [problemId]
  );
  const upvotes = rows[0]?.upvotes ?? 0;
  const downvotes = rows[0]?.downvotes ?? 0;
  return { upvotes, downvotes, score: upvotes - downvotes };
}

/**
 * `vote_aggregates` is a materialized view feeding the cross-problem trending
 * query. Refreshing it on every vote (`REFRESH MATERIALIZED VIEW CONCURRENTLY`
 * per write) does not scale, so we coalesce refreshes: a burst of votes
 * triggers at most one refresh per interval. Trending can lag by that
 * interval, which is fine; exact per-problem counts come from computeStats.
 */
const REFRESH_INTERVAL_MS = Number(process.env.VOTE_AGG_REFRESH_MS || 5000);
let timer: NodeJS.Timeout | null = null;
let refreshing = false;
let lastRun = 0;

export function scheduleAggregateRefresh(): void {
  if (timer) return; // a refresh is already queued; coalesce into it
  const wait = Math.max(0, REFRESH_INTERVAL_MS - (Date.now() - lastRun));
  timer = setTimeout(runRefresh, wait);
  // Don't keep the event loop alive solely for a pending refresh.
  if (typeof timer.unref === 'function') timer.unref();
}

async function runRefresh(): Promise<void> {
  timer = null;
  if (refreshing) {
    // A refresh is mid-flight; re-queue so the latest writes are captured.
    scheduleAggregateRefresh();
    return;
  }
  refreshing = true;
  lastRun = Date.now();
  try {
    await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY vote_aggregates');
  } catch (error) {
    logger.error('vote_aggregates refresh failed:', error);
  } finally {
    refreshing = false;
  }
}
