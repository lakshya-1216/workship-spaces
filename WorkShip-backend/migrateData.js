require('dotenv').config();
const mongoose = require('mongoose');

const UserSchema = require('./models/User').schema;
const WorkspaceSchema = require('./models/Workspace').schema;

// Replace with your local database connection string if it's different
const LOCAL_URI = 'mongodb://localhost:27017/workship';
const ATLAS_URI = process.env.MONGO_URI;

if (!ATLAS_URI || ATLAS_URI.includes('<YOUR_PASSWORD>')) {
  console.error("❌ ERROR: Please update your MONGO_URI in the .env file with your actual Atlas password.");
  process.exit(1);
}

async function migrate() {
  console.log('Connecting to local database...');
  const localDb = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log('✅ Connected to local database.');

  console.log('Connecting to Atlas database...');
  const atlasDb = await mongoose.createConnection(ATLAS_URI).asPromise();
  console.log('✅ Connected to Atlas database.');

  // Create models for both connections
  const LocalUser = localDb.model('User', UserSchema);
  const LocalWorkspace = localDb.model('Workspace', WorkspaceSchema);

  const AtlasUser = atlasDb.model('User', UserSchema);
  const AtlasWorkspace = atlasDb.model('Workspace', WorkspaceSchema);

  try {
    // Migrate Users
    console.log('\n--- Migrating Users ---');
    const users = await LocalUser.find().lean();
    console.log(`Found ${users.length} users. Migrating to Atlas...`);
    if (users.length > 0) {
      await AtlasUser.deleteMany({}); // Optional: clear existing data in Atlas first
      await AtlasUser.insertMany(users);
    }
    console.log('✅ Users migrated successfully.');

    // Migrate Workspaces
    console.log('\n--- Migrating Workspaces ---');
    const workspaces = await LocalWorkspace.find().lean();
    console.log(`Found ${workspaces.length} workspaces. Migrating to Atlas...`);
    if (workspaces.length > 0) {
      await AtlasWorkspace.deleteMany({});
      await AtlasWorkspace.insertMany(workspaces);
    }
    console.log('✅ Workspaces migrated successfully.');

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    // Close connections
    await localDb.close();
    await atlasDb.close();
    process.exit(0);
  }
}

migrate();
