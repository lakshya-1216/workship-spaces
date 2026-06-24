const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];

  // Guard against literally "undefined" or "null" being sent as token
  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('[AUTH] JWT error:', err.name, '-', err.message);

    // TokenExpiredError is thrown by jsonwebtoken when exp has passed.
    // Return a distinct message so the client can show a friendly toast.
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }

    res.status(401).json({ message: 'Unauthorized' });
  }
};
