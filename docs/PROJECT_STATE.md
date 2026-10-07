# Project state (running record)

## Implemented: roadmap phases 1-12 (MVP + notifications)

### Database models (MongoDB / Mongoose)
- **User** - name, email (unique), passwordHash, role
- **FarmerProfile** - user (unique), personal{name,age,gender}, location{state,district}, agriculture{landAreaHectares,occupation}, financial{annualIncome}, social{category}
- **Document** - user, documentType, file metadata, source (MANUAL_UPLOAD|DIGILOCKER), verified, rawText, extractedData, warnings, status (PENDING_REVIEW|CONFIRMED)
- **Scheme** - code, name, benefit info, rules (tree), requiredDocuments, officialApplicationUrl, source{type,name,url,retrievedAt,lastVerifiedAt,note}, version, isActive
- **EligibilityResult** - user+scheme (unique), status, matched/failed rules, missingInformation, missingDocuments, completionPercent, schemeVersion
- **Notification** - user, scheme, title, message, read

### Services (backend/src/services)
- `eligibilityEngine.js` - pure, deterministic, three-valued logic (true / false / unknown)
- `extractionService.js` - regex extraction + validation, per-document allowed fields
- `ocrClient.js` - .txt read directly; PDF/images sent to Python OCR service
- `profileMerge.js` - writes farmer-confirmed values into the profile
- `reevaluate.js` - re-runs all schemes, stores results, creates notifications when status rank improves

### Not verified in the build environment
The sandbox had no MongoDB or Tesseract, so these were verified by unit tests, a booted Express app (health/401/404/validation)
and a successful Vite build, but **not** end-to-end against a live database or real OCR. First run on your machine is the
real integration test - report any failure.

## Remaining roadmap
13 RAG (chunking, embeddings, Chroma/FAISS) -> 14 LLM explanations (grounded, never decides eligibility) ->
LLM-assisted extraction (phase 6 add-on) -> conflicting-document handling and per-field OCR confidence ->
15 permitted-source ingestion -> 16 source hashing/versioning -> 17 application-URL monitoring ->
18 DigiLocker (needs requester approval) -> 19 API Setu -> 20 provenance/evidence UI -> 21 hardening, CI, deployment.
Also: replace DEMO schemes with researched real schemes from permitted official sources (with verified URLs).
