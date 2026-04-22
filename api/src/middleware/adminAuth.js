import dotenv from 'dotenv';

dotenv.config();

const ADMIN_SECRET = process.env.ADMIN_SECRET;

/**
 * Middleware to authenticate admin requests.
 * Expects: Authorization: Bearer <ADMIN_SECRET>
 */
export const authenticateAdmin = (req, res, next) => {
  if (!ADMIN_SECRET) {
    return res.status(500).json({ error: 'ADMIN_SECRET not configured on server' });
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Admin secret required' });
  }

  if (token !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Invalid admin secret' });
  }

  next();
};

export default { authenticateAdmin };
