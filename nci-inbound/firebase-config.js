// Firebase web app config for the NCI/Greif inbound exceptions tool.
// Get it from the Firebase console: Project settings (gear icon) → General → Your apps → Web app → "SDK setup and configuration" → Config.
// These values identify the project; they are not secrets. Access is controlled by firestore.rules and sign-in.
// You can reuse the dock board's Firebase project: the two tools use different collections and this tool keeps
// its own people list under roles/, so a dock-board login does not see inbound issues unless it is added here too.
window.FIREBASE_CONFIG = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};
