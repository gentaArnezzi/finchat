import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      telegram_id: user.telegram_id,
      name: user.name 
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

export const verifyTelegramAuth = (initData) => {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');
    
    const dataCheckString = Array.from(params.entries())
      .sort()
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    const secretKey = crypto.createHash('sha256')
      .update(process.env.TELEGRAM_BOT_TOKEN || '')
      .digest();
    
    const expectedHash = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    if (hash !== expectedHash) {
      return null;
    }
    
    const authDate = parseInt(params.get('auth_date'));
    if (Date.now() / 1000 - authDate > 86400) {
      return null;
    }
    
    return {
      telegram_id: parseInt(params.get('id')),
      name: params.get('first_name'),
      username: params.get('username'),
    };
  } catch (error) {
    console.error('Telegram auth verification failed:', error);
    return null;
  }
};

export default { authenticateToken, generateToken, verifyTelegramAuth };