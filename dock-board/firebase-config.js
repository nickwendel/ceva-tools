// Firebase web app config for the receiving dock board.
// All CEVA tools share the Firebase project "ceva-tools": one sign-in, one Firestore database and one people list.
// Security rules live in /firestore.rules at the repository root.
// These values identify the project; they are not secrets. Access is controlled by the rules and sign-in.
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDAEk97tIQATIVyOjKT2NtnOJ6ixuw5AbA",
  authDomain: "ceva-tools.firebaseapp.com",
  projectId: "ceva-tools",
  storageBucket: "ceva-tools.firebasestorage.app",
  messagingSenderId: "645599802031",
  appId: "1:645599802031:web:1b7dcee50f3ae87941da5a"
};
