# AI-Powered Government Scheme Eligibility Platform for Farmers - MVP

A MERN + Python project that builds a farmer profile (manually or from uploaded documents), checks it against
machine-readable scheme rules with a **deterministic rule engine**, and tells the farmer what they are eligible for,
what is missing, and when their status improves.

> **All scheme data in this repository is DEMO data** (`database/seed/schemes.json`). No real government scheme, API,
> DigiLocker capability, or official URL is invented or claimed. `officialApplicationUrl` is empty for every demo
> scheme. All sample documents are synthetic.
> The platform never submits applications; for real schemes it only links to the official portal.

## What is implemented (roadmap phases 1-12)

| Phase | Feature | Status |
|---|---|---|
| 1 | MERN foundation, Vite proxy, health endpoint | Done |
| 2 | Register / login (JWT + bcrypt), protected routes | Done |
| 3 | Farmer profile (nested schema, Joi validation) | Done |
| 4 | Document upload (type/size/signature checks, per-user storage) | Done |
| 5 | OCR (Python FastAPI + Tesseract / pdfplumber / pdf2image) | Done (needs Tesseract for images) |
| 6 | Structured extraction (regex + validation) | Done (LLM-assisted extraction not yet) |
| 7 | Auto profile generation with farmer review/confirm step | Done |
| 8 | Scheme database (6 DEMO schemes, rule trees as data) | Done (demo data only) |
| 9 | Generic rule engine: = != > < >= <= IN AND OR NOT; 4 statuses; unit-tested | Done |
| 10 | Recommendations dashboard, grouped | Done |
| 11 | Missing-document intelligence (completion %) | Done |
| 12 | Auto re-evaluation + notifications on improvement | Done |
| 13-14 | RAG + LLM explanations | **Not yet** |
| 15-21 | Ingestion, monitoring, DigiLocker, API Setu, provenance UI, hardening/deploy | **Not yet** |

See `docs/PROJECT_STATE.md` for models, APIs and next steps.

## Folder structure

```
project/
├── backend/              Express API (src/, tests/, .env.example)
├── frontend/             React + Vite app
├── python-services/
│   └── ocr-service/      FastAPI OCR service
├── database/
│   ├── seed/schemes.json         DEMO schemes
│   └── sample-documents/         synthetic Rajesh Patil documents (.txt)
├── docs/PROJECT_STATE.md
├── docker-compose.yml    optional MongoDB via Docker
└── package.json          root scripts (install:all, dev, seed, test, build)
```

## Prerequisites (Windows)

1. **Node.js 20 LTS** - https://nodejs.org (check: `node -v`)
2. **MongoDB** - either
   - MongoDB Community Server (https://www.mongodb.com/try/download/community) installed as a Windows service, **or**
   - Docker Desktop, then `docker compose up -d` in the project folder, **or**
   - a free MongoDB Atlas cluster (paste its connection string in `MONGODB_URI`).
3. **Python 3.10+** (only needed for the OCR service) - https://python.org (tick "Add to PATH")
4. *Optional, for photos/scanned documents:* **Tesseract** (Windows installer from UB Mannheim, usually
   `C:\Program Files\Tesseract-OCR\tesseract.exe`) and **Poppler** for Windows (scanned PDFs only).
   **You can test the whole workflow without these** using the `.txt` sample documents.

## Setup and run (PowerShell, from the extracted `project` folder)

```powershell
# 1. Install all Node dependencies
npm run install:all

# 2. Create the backend environment file
copy backend\.env.example backend\.env
#   Open backend\.env and set JWT_SECRET to a long random value, for example:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Make sure MongoDB is running (service started, or: docker compose up -d)

# 4. Load demo schemes + demo user
npm run seed

# 5. Start backend (http://localhost:5000) and frontend (http://localhost:5173) together
npm run dev
```

Open http://localhost:5173. Quick health check: http://localhost:5000/api/health should show `"database":"connected"`.

### Optional: start the OCR service (second terminal)

```powershell
cd python-services\ocr-service
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# only if tesseract.exe is not on PATH:
# $env:TESSERACT_CMD = "C:\Program Files\Tesseract-OCR\tesseract.exe"
# only for scanned PDFs:
# $env:POPPLER_PATH = "C:\path\to\poppler\Library\bin"
uvicorn app:app --port 8001
```

If PowerShell blocks `Activate.ps1`, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use `cmd` and
`.venv\Scripts\activate.bat`.

## Try the full workflow (the "Rajesh Patil" example)

1. Log in with `demo@farmer.test` / `Demo@12345` (created by `npm run seed`), or register a new account.
2. **Schemes for me**: everything is "Needs more information" (empty profile).
3. **My documents**: upload from `database/sample-documents/` (choose the matching document type each time):
   `aadhaar_sample.txt`, `land_record_sample.txt`, `income_certificate_sample.txt`.
   Review the values we read and click **Confirm and save to profile** for each.
4. **Schemes for me**: DEMO-001 is now **Almost eligible - 67%** (the Bank passbook is missing).
5. Upload `bank_passbook_sample.txt` (type: Bank passbook) -> DEMO-001 becomes **Eligible** and a notification appears.
6. Edit the profile (e.g. income to 900000) to see "Not eligible" with the reason.

## Tests

```powershell
npm test
```
Runs 27 Jest tests: every operator, AND/OR/NOT, the "missing data is INCOMPLETE, never NOT_ELIGIBLE" rule, the 67% worked
example, and extraction on the sample documents.

## API summary (all except auth need `Authorization: Bearer <token>`)

| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | Get a JWT |
| GET / PUT | /api/profile | Read / update profile |
| POST | /api/documents/upload | multipart: `documentType`, `file` |
| GET | /api/documents | List my documents |
| POST | /api/documents/:id/confirm | Save reviewed values into the profile |
| DELETE | /api/documents/:id | Delete a document |
| GET | /api/recommendations | Run the rule engine, grouped results |
| GET / POST / PATCH | /api/notifications, /read-all, /:id/read | Notifications |
| GET | /api/health | Liveness + DB status |

## Environment variables (`backend/.env`)

See `backend/.env.example` - every variable is commented. Never commit `.env`. Python service variables
(`TESSERACT_CMD`, `POPPLER_PATH`, `OCR_LANG`) are set in the terminal before `uvicorn`.

## Common errors

| Symptom | Fix |
|---|---|
| `Missing environment variable JWT_SECRET` | You skipped `copy backend\.env.example backend\.env` |
| `Startup failed ... MongoDB` | MongoDB not running, or wrong `MONGODB_URI` |
| Frontend shows network error / 502 on `/api` | Backend not running on port 5000 |
| Upload says "OCR service is not reachable" | Start the OCR service, or use the `.txt` samples |
| `Tesseract is not installed` | Install Tesseract and set `TESSERACT_CMD` |
| Scanned PDF fails | Install Poppler and set `POPPLER_PATH` |
| `EADDRINUSE` | Port 5000/5173/8001 busy - change `PORT` / stop the other process |

## Design rules kept from the roadmap

- The rule engine, not an LLM, decides eligibility. A missing field is `INCOMPLETE`, never `NOT_ELIGIBLE`.
- Aadhaar and bank account numbers are not extracted or stored. Extracted values must be confirmed by the farmer.
- `verified` stays `false` for uploads; only a real, authorised DigiLocker integration may ever set it.
- No scraping, no CAPTCHA bypass, no auto-submission to government portals.
- `ALLOW_TEXT_UPLOADS=true` exists only so the synthetic samples work; set it to `false` in any real deployment.