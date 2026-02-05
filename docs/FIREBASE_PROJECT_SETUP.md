# Use your own Firebase project

The app is currently configured for a project (`studio-2931927133-a7d7c`) that is not in your Firebase account. To run and deploy with **your** project:

## 1. Pick a project

Use one of your existing projects from `firebase projects:list`, or create a new one in [Firebase Console](https://console.firebase.google.com).

## 2. Link the CLI to that project

```bash
firebase use YOUR_PROJECT_ID
```

Example with one of your listed projects:

```bash
firebase use studio-9632556640-bd58d
```

To save it for this repo (so you don’t have to run `firebase use` every time), this will create a `.firebaserc` file.

## 3. Get the web app config

1. Open [Firebase Console](https://console.firebase.google.com) → select **your project**.
2. Go to **Project settings** (gear) → **Your apps**.
3. If there is no web app, click **Add app** → **Web** (</>), register the app, then continue.
4. In the SDK setup snippet, copy the `firebaseConfig` object (e.g. `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).

## 4. Update the app config

Paste that config into **`src/firebase/config.ts`**, replacing the existing `firebaseConfig` so the app talks to your project.

## 5. Enable Firestore and deploy indexes

1. In Firebase Console → **Build** → **Firestore Database** → **Create database** (if not already created).
2. Deploy rules and indexes from your machine:

```bash
firebase deploy --only firestore
```

Or only indexes:

```bash
firebase deploy --only firestore:indexes
```

After the composite index finishes building, the **Who Likes You** section should load correctly.

## 6. (Optional) Use a different project for deploy

If you want the default project for this repo to be another one (e.g. `gstgenius-65c93`), run:

```bash
firebase use OTHER_PROJECT_ID
```

Then repeat step 4 with that project’s web config so the app and CLI both use the same project.
