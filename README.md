# Practice

A personal, mobile-first practice companion. All teaching materials are stored
encrypted (AES-256-GCM, key derived from a passphrase with PBKDF2) and are only
readable after unlocking on a device. Nothing in this repository is usable without
the passphrase.

- `tools/encrypt.mjs` encrypts content and audio from a private folder outside this repo.
- `tools/book2json.py` converts a PDF into reflowable JSON for the reader (output stays private).
- `tools/events.mjs` syncs a calendar daily via GitHub Actions (secrets: `VAULT_KEY`, `CAL_URL`).
