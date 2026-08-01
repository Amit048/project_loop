import jwt from 'jsonwebtoken';

// ─── Access Token: Short-lived (15 minutes) ───────────────────────────────────
// Used for API requests. Short expiry = less damage if stolen.
export const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
};

// ─── Refresh Token: Long-lived (7 days) ───────────────────────────────────────
// Used ONLY to get a new access token. Stored in DB so it can be revoked.
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
};

// ─── Verify Token Helper ─────────────────────────────────────────────────────
export const verifyToken = (token, secret) => {
  return jwt.verify(token, secret);
};
