const jwt = require('jsonwebtoken');

function createToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      isHost: user.isHost,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
}

function toUserResponse(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    profilePicture: user.profilePicture || '',
    isHost: user.isHost,
    role: user.role
  };
}

module.exports = {
  createToken,
  toUserResponse
};
