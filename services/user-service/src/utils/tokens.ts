import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../db';

export interface TokenUser {
  id: string;
  email: string;
  role: string;
}

export interface IssuedTokens {
  token: string;
  refreshToken: string;
  expiresIn: string;
}

const ACCESS_EXPIRY = (process.env.JWT_EXPIRY || '15m') as jwt.SignOptions['expiresIn'];
const REFRESH_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

/** Parse a duration like "7d" / "15m" / "3600s" into milliseconds. */
export function durationToMs(d: string): number {
  const m = /^(\d+)\s*([smhd])$/.exec(d.trim());
  if (!m) return 7 * 24 * 60 * 60 * 1000; // safe default: 7 days
  const n = Number(m[1]);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]]!;
  return n * unit;
}

function signAccessToken(user: TokenUser): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_EXPIRY }
  );
}

/** Refresh tokens are opaque; only their SHA-256 hash is stored, so a DB
 * leak cannot be replayed. */
export function hashRefreshToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Mint an access token and a rotating refresh token, persisting a session
 * row keyed by the hashed refresh token.
 */
export async function issueTokens(
  user: TokenUser,
  meta: { userAgent?: string; ipAddress?: string } = {}
): Promise<IssuedTokens> {
  const rawRefresh = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + durationToMs(REFRESH_EXPIRY));

  await db.query(
    `INSERT INTO sessions (user_id, refresh_token, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, hashRefreshToken(rawRefresh), meta.userAgent ?? null, meta.ipAddress ?? null, expiresAt]
  );

  return {
    token: signAccessToken(user),
    refreshToken: rawRefresh,
    expiresIn: String(ACCESS_EXPIRY),
  };
}

export interface RotationResult {
  tokens: IssuedTokens;
  user: TokenUser;
}

/**
 * Validate a refresh token and rotate it: the presented session is deleted
 * and a fresh one issued in a single transaction. Returns null if the token
 * is unknown, expired, or the user is gone/inactive.
 */
export async function rotateRefreshToken(
  rawRefresh: string,
  meta: { userAgent?: string; ipAddress?: string } = {}
): Promise<RotationResult | null> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const hashed = hashRefreshToken(rawRefresh);
    const session = await client.query(
      `SELECT s.id, s.expires_at, u.id AS user_id, u.email, u.role, u.is_active
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token = $1
       FOR UPDATE`,
      [hashed]
    );

    if (session.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const row = session.rows[0];

    // Always consume the presented token (rotation / reuse-invalidation).
    await client.query('DELETE FROM sessions WHERE id = $1', [row.id]);

    if (new Date(row.expires_at).getTime() < Date.now() || !row.is_active) {
      await client.query('COMMIT');
      return null;
    }

    const user: TokenUser = { id: row.user_id, email: row.email, role: row.role };
    const rawNew = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + durationToMs(REFRESH_EXPIRY));
    await client.query(
      `INSERT INTO sessions (user_id, refresh_token, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, hashRefreshToken(rawNew), meta.userAgent ?? null, meta.ipAddress ?? null, expiresAt]
    );

    await client.query('COMMIT');

    return {
      user,
      tokens: {
        token: signAccessToken(user),
        refreshToken: rawNew,
        expiresIn: String(ACCESS_EXPIRY),
      },
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** Revoke a single refresh token (logout). Returns true if a session was removed. */
export async function revokeRefreshToken(rawRefresh: string): Promise<boolean> {
  const result = await db.query(
    'DELETE FROM sessions WHERE refresh_token = $1 RETURNING id',
    [hashRefreshToken(rawRefresh)]
  );
  return result.rows.length > 0;
}
