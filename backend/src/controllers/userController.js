import User from '../models/User.js';

/* GET /api/user/profile  — auth required */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch profile.', message: err.message });
  }
};

/* GET /api/admin/users  — admin only */
export const listUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch users.', message: err.message });
  }
};

/* DELETE /api/admin/user/:id  — admin only */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.userId) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    res.json({ success: true, message: `User "${user.name}" deleted.` });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete user.', message: err.message });
  }
};
