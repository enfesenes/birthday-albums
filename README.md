# Birthday Album Letters 🎂

A surprise web app for a 19th birthday — 19 loved ones each leave a letter, pick a song, and share a photo. On the birthday, all 19 CD cases unlock to reveal their messages.

## Setup

### 1. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project
2. Under **Build > Firestore Database**, create a database (start in production mode)
3. Under **Build > Storage**, enable Storage
4. In **Project settings > General**, scroll down and click "Add app" (web app `</>`)
5. Copy the Firebase config object — it looks like:

```js
{
  apiKey: "AIza...",
  authDomain: "project.firebaseapp.com",
  projectId: "project-id",
  storageBucket: "project.appspot.com",
  messagingSenderId: "123...",
  appId: "1:123..."
}
```

6. Paste those values into `js/firebase.js`, replacing the placeholders

### 2. Set Firestore security rules

In Firebase Console > Firestore > Rules, set:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /letters/{doc} {
      allow read: if true;
      allow create: if true;
    }
  }
}
```

### 3. Set Storage security rules

In Firebase Console > Storage > Rules, set:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /photos/{file} {
      allow read: if true;
      allow create: if true;
    }
  }
}
```

### 4. Change the upload password

In `js/upload.js`, change `UPLOAD_PASSWORD` to your own shared secret. Share this password with the 19 loved ones.

### 5. Rename the upload page (optional)

Rename `upload.html` to something obscure (e.g., `sunflowers-2026.html`) so only people with the link can find it. Update the file name in your repo.

### 6. Deploy to GitHub Pages

1. Create a new GitHub repository
2. Push all files to the repo
3. Go to **Settings > Pages**, set source to `main` branch, root folder
4. Your site will be live at `https://your-username.github.io/repo-name/`

Optionally, deploy to Netlify or Vercel for the same result.

## How It Works

### For Loved Ones (the upload page)
1. Go to `https://your-site.com/upload.html` (or your renamed URL)
2. Enter the shared password
3. Fill out name, relationship, letter, song, and upload a photo
4. Submit — the letter is stored safely until her birthday

### For the Birthday Girl (the main page)
- **Before Aug 2, 2026:** A countdown timer and 19 locked album silhouettes build anticipation
- **On Aug 2, 2026:** All 19 CD cases unlock, each showing a photo and the person's name
- Click any CD case to open it and read the letter inside, along with the song they picked

## Changing the Birthday Date

Edit the `BIRTHDAY` variable in `js/main.js`:
```js
var BIRTHDAY = new Date(2026, 7, 2); // Year, Month (0-indexed), Day
```

## After All 19 Letters Are In

For extra security, you can lock down the Firestore rules to read-only:
```
allow read: if true;
allow write: if false;
```
