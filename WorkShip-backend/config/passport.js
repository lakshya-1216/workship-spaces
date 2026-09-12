const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { findOrCreateGoogleUser } = require('../services/oauthService');

function configurePassport() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
    return false;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = await findOrCreateGoogleUser(profile);
          done(null, user);
        } catch (error) {
          done(error);
        }
      }
    )
  );

  return true;
}

module.exports = {
  passport,
  configurePassport
};
