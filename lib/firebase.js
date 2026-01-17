const admin = require('firebase-admin');

// In Vercel, we use Environment Variables for secrets.
// We check if the app is already initialized to prevent "App already exists" errors in hot reloads.
if (!admin.apps.length) {
  // Option A: If running locally or securely, use service account JSON
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://pkdtech-1-default-rtdb.firebaseio.com"
    });
  } else {
    // Option B: Fallback for local testing (NOT for production without auth)
    // Warning: This is a placeholder. For the server to work 100%, 
    // you MUST set the FIREBASE_SERVICE_ACCOUNT env var in Vercel.
    console.error("❌ MISSING FIREBASE_SERVICE_ACCOUNT ENV VAR");
  }
}

const db = admin.database();

module.exports = { db, admin };
