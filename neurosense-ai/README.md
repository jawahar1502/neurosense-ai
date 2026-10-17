# NeuroSense AI — EEG Depression-Screening Research Prototype

A frontend-only research workspace built with **HTML5, CSS3 and vanilla JavaScript** (no frameworks, no build step).

> **Research screening only. Results are not a diagnosis.** This is a prototype, not a clinically validated device. EEG alone cannot diagnose depression. No trained model is included.

## Run locally

Open `login.html` in a browser, or serve the folder (recommended):

```bash
cd neurosense-ai
python3 -m http.server 8080
# then visit http://localhost:8080/login.html
```

Demo credentials (fictional, unlock the demo UI only): `demo@neurosense.local` / `Demo123!`, or press **Try Demo Access**.

## Structure

```
login.html, signup.html, index.html
pages/   eeg-analysis, signal-explorer, ai-screening, analytics, reports, dataset-explorer, settings
css/     styles.css (tokens, layout) · components.css · responsive.css · auth.css
js/      app.js (session guard, DSP, canvas charts) · navigation.js (shell) · auth.js
         dashboard, eeg-analysis, signal-explorer, screening, analytics, reports, dataset
         recording.js (current-recording hand-off) · demo-data.js (sample data, kept separate)
```

## What is real and what is demo

| Area | Status |
|---|---|
| CSV upload, header/numeric validation, quality checks | **Real** (basic statistical checks, not validated artifact detection) |
| Band-pass filter, Welch PSD, band power, epoch count, spectral features | **Real**, run in JavaScript |
| EDF files | Header metadata only — signal decoding **not implemented** |
| Dashboard waveform, sample recording | **Synthetic** demonstration signal, labelled as such |
| KPI values, recent-activity table, analytics charts, sample result | **Illustrative demo data**, labelled |
| AI classification / score / confidence | **Not implemented** — shows “AI model not configured” |
| Dataset counts | Taken from the NEMAR source page text; not independently verified; nothing is downloaded |

## Demo authentication

Sign-up and sign-in are **simulated**. No backend, database, OTP or email is used. A session is kept in `sessionStorage` (cleared on logout/closing the browser); the sign-up profile (name, email, role, institution) is kept there too, but **passwords are never stored**. Because the password is not retained, a registered email accepts any password meeting the demo rule (≥ 8 chars, a letter and a number). Route protection is only a UI demonstration and can be bypassed — never use it to protect real data.

## Connecting a real model later (FastAPI)

Enter the service URL on the AI Screening page (stored as a harmless UI setting). Expected contract:

- `GET  /health` → `200 OK`
- `POST /api/v1/predict`
  - request: `{ "recording_id": str, "sampling_frequency": number, "features": { "<name>": "<value>" } }`
  - response: `{ "label": str, "score": number, "model_version": str, "feature_importance": [{ "name": str, "value": number }] }`

The UI shows only fields the service actually returns; missing values display “Not supplied”. Enable CORS on the service for the page origin. Train and evaluate with **participant-independent** splits.

## Limitations

- Large CSVs (> ~3.5 MB of numbers) are analysed on the EEG Analysis page but are not handed off to other pages.
- PDF export is not configured; use **Print Report → Save as PDF**.
- Canvas charts are custom-drawn and intentionally simple.
