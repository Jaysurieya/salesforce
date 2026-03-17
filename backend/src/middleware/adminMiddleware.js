/**
 * Allow only admin role — must run AFTER authMiddleware
 */
const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden', message: 'Admin access required.' });
  }
  next();
};

export default adminMiddleware;
