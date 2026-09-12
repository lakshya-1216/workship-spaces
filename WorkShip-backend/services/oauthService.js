const User = require('../models/User');

async function findOrCreateGoogleUser(profile) {
  const googleId = profile.id;
  const email = profile.emails?.[0]?.value?.toLowerCase().trim();
  const isEmailVerified = profile.emails?.[0]?.verified;

  if (!googleId || !email || isEmailVerified === false) {
    throw new Error('Google account email could not be verified');
  }

  const existingGoogleUser = await User.findOne({ googleId });
  if (existingGoogleUser) return existingGoogleUser;

  const existingEmailUser = await User.findOne({ email });
  if (existingEmailUser) {
    existingEmailUser.googleId = googleId;
    if (!existingEmailUser.provider) existingEmailUser.provider = 'local';
    if (!existingEmailUser.profilePicture && profile.photos?.[0]?.value) {
      existingEmailUser.profilePicture = profile.photos[0].value;
    }
    await existingEmailUser.save();
    return existingEmailUser;
  }

  const displayName = profile.displayName || email.split('@')[0];
  const user = new User({
    name: displayName,
    email,
    googleId,
    provider: 'google',
    profilePicture: profile.photos?.[0]?.value || '',
    role: 'user',
    isHost: false
  });

  await user.save();
  return user;
}

module.exports = {
  findOrCreateGoogleUser
};
