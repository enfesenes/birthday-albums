// ========================================
// Firebase Configuration
// Replace these values with your own
// from the Firebase Console.
// ========================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBepk8hoifRh4Pqj1zTeC4HWKsjTlcZE0g",
  authDomain: "horse-dab86.firebaseapp.com",
  projectId: "horse-dab86",
  storageBucket: "horse-dab86.firebasestorage.app",
  messagingSenderId: "133545486824",
  appId: "1:133545486824:web:31b5d5627bbffb57bedc5d"
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
