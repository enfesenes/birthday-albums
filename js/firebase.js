// ========================================
// Firebase Configuration
// Replace these values with your own
// from the Firebase Console.
// ========================================

const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let db, storage;

try {
  firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.firestore();
  storage = firebase.storage();
} catch (e) {
  console.warn("Firebase not configured yet — running in demo mode.");
  console.warn("Set your config in js/firebase.js");
}

// --- Firestore helpers ---

function getLetters() {
  return db.collection("letters")
    .orderBy("createdAt", "asc")
    .get()
    .then(function(snapshot) {
      return snapshot.docs.map(function(doc) {
        return Object.assign({ id: doc.id }, doc.data());
      });
    });
}

function addLetter(data) {
  return db.collection("letters").add(Object.assign({}, data, {
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
}

function getLetterCount() {
  return db.collection("letters").get().then(function(snapshot) {
    return snapshot.size;
  });
}

// --- Storage helpers ---

function uploadPhoto(file, fileName) {
  var ref = storage.ref("photos/" + fileName);
  return ref.put(file).then(function() {
    return ref.getDownloadURL();
  });
}
