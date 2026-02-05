# How to get the latest code onto GitHub

The **latest code** (full feature set: auth, profile, discovery, likes, chat, calls, virtual dates, groups, events) is **only in this folder**. It was never pushed to GitHub because the push failed with a 403 (wrong GitHub user / no write access).

## Option A: Push from this folder (recommended)

1. **Use the GitHub account that owns** `restartguru25-gstr/nueflirt` (or has write access).
2. In a terminal, go to this folder:
   ```bash
   cd /home/surya/Downloads/nueflirt-main
   ```
3. Make sure Git uses your account:
   - **HTTPS:** Use a Personal Access Token (PAT) instead of password.
     - GitHub → Settings → Developer settings → Personal access tokens → Generate new token (repo scope).
     - When Git asks for password, paste the PAT.
   - Or **SSH:** Add your SSH key to GitHub, then switch remote to SSH:
     ```bash
     git remote set-url origin git@github.com:restartguru25-gstr/nueflirt.git
     git push -u origin main
     ```
4. Push:
   ```bash
   git push -u origin main
   ```

After a successful push, the latest code will appear on GitHub.

---

## Option B: Apply the patch in another clone

If you prefer to push from a different machine or clone:

1. Clone the repo (you’ll get the **old** code):
   ```bash
   git clone https://github.com/restartguru25-gstr/nueflirt.git
   cd nueflirt
   ```
2. Copy the patch file from this folder into the clone:
   - From this folder: `nueflirt-main/nueflirt-full-feature-set.patch`
   - Into the clone (e.g. `nueflirt/`).
3. Apply the patch:
   ```bash
   git am nueflirt-full-feature-set.patch
   ```
4. Push (with your account that has write access):
   ```bash
   git push -u origin main
   ```

---

## Summary

| Where                | Commit | What you see                          |
|----------------------|--------|----------------------------------------|
| **This folder**      | 27ccbbf | Latest full feature set (current)     |
| **GitHub** (before push) | f8c0bd7 | Older "India-Specific & PWA" commit   |

Once you push from this folder (or from a clone after applying the patch) using the account that has write access to `restartguru25-gstr/nueflirt`, the latest code will be visible on GitHub.
