# BharatBid — Slice 4

Document Evidence & Intelligence Foundation on top of Slice 1–3. Runtime remains `backend/src/problem/`. The starter-kit `Document` intelligence model and `StorageService.upload()` file registry were **not** reused as the bid evidence store (uploader-only ACL and invoice-oriented types). Bid evidence uses a new `BidDocument` model and `storage.put()` / `storage.get()`.

This slice does **not** verify documents against government sources, compute compliance, score risk, or produce AI procurement decisions.

## 1. Objective

Procurement officers can upload supporting files onto a bid submission, associate them optionally with a tender requirement, inspect and download them, create versions, archive them, and see machine-extracted text when the existing starter-kit text extractor can read the file.

Reviewers can inspect the same evidence without mutating it.

```text
Bid Submission
      ↓
Documents
      ↓
Evidence Metadata
      ↓
Document Preview / Inspection
      ↓
Extraction-ready foundation
```

## 2. Document architecture

```text
Tender
  └── BidSubmission
        └── BidDocument (groupId + versionNumber)
              └── TenderRequirement? (optional link)
```

A document always belongs to one bid. It may be **Unmapped** (no requirement) and mapped later. Linking is association only — not requirement satisfaction.

Kit `Document` / `POST /api/v1/documents/analyze` remains untouched.

## 3. Upload workflow

```text
Authenticate + bids.write
  → multipart file + documentType + optional tenderRequirementId
  → MIME / extension / magic-byte validation
  → size limit (DOCUMENT_MAX_BYTES)
  → checksum SHA-256
  → reject identical current file (409)
  → storage.put(bids/{bidId}/documents/{documentId}/v{version})
  → persist BidDocument (status ready)
  → extract text (best effort)
```

If storage fails, no READY metadata row is left behind. If extraction fails, the stored file remains available.

## 4. Storage architecture

Reuses the existing `StorageService` provider (`put` / `get` / `delete`), not `upload()` (which creates `StoredFile` rows with uploader-only access).

Internal key pattern:

```text
bids/{bidId}/documents/{documentId}/v{version}
```

Keys are never returned in API DTOs. Downloads stream through an authenticated API. No public or permanent URLs.

## 5. Document types

Controlled catalog (labels, not verification results):

| Category | Types |
| --- | --- |
| Identity | PAN, GST Certificate, CIN, Udyam Certificate |
| Financial | Financial Statement, Turnover Certificate, Bank Certificate |
| Technical | Technical Qualification, Experience Certificate, OEM Authorization, Product Datasheet |
| Legal | Incorporation Certificate, Authorization Letter, Affidavit, Declaration |
| Procurement | Bid Form, Tender Response, Price Schedule |
| Other | Other Supporting Document |

User-selected. No automatic AI classification.

## 6. Document lifecycle

Separate from extraction:

| Field | Values |
| --- | --- |
| `status` | `uploaded`, `processing`, `ready`, `failed`, `archived` |
| `extractionStatus` | `not_started`, `queued`, `processing`, `completed`, `failed` |

Successful store → document `ready`. There is no `verified`, `compliant`, `authentic`, or `fraudulent` state.

## 7. Versioning

Replacement creates a new row with the same `groupId`, incremented `versionNumber`, `isCurrent = true`. The previous current row is archived (`isCurrent = false`). Bytes of earlier versions are retained.

## 8. Requirement mapping

`POST .../link-requirement` with a tender requirement id or `null` / `unmapped`. UI copy: **Document linked** / **Unmapped** / **Not provided**. Never “Requirement satisfied”.

## 9. Extraction foundation

Reuses `validateDocumentFile` and `extractDocumentText` (PDF/PNG/JPEG/TXT, magic bytes). Text files and text-bearing PDFs can complete extraction. Images (and empty PDFs) stay stored; extraction is `failed` with: “Text extraction is not available for this file. The original document is still available.”

No OCR engine, no Gemini `document.process` job, no fake extracted text.

UI advisory (mandatory):

> Machine-extracted information. Not independently verified.

Extracted values (for example a GSTIN-shaped string) are **extracted**, not **verified**.

## 10. RBAC

Object access follows **bid** permissions, not the original uploader:

| Role | Access |
| --- | --- |
| procurement_officer (`bids.write`) | upload, version, map, archive, view, download |
| reviewer (`bids.read` only) | list, view, preview, download, metadata |
| unauthenticated / `bids.read` missing | 401 / 403 |
| admin | existing catalog (includes bid keys) |

Any authorised user who can read the bid can read its documents. Frontend hiding is not sufficient; routes use `requirePermission`.

## 11. Security

- Authentication on every document route
- Bid-scoped authorization (document id must belong to the bid in the path)
- Generated storage keys; original filename is metadata only
- Path traversal rejected (`../`, absolute paths)
- MIME + extension + magic-byte checks; `.pdf` wrapping an unrelated payload is rejected
- Configurable `DOCUMENT_MAX_BYTES` (default 10 MiB); errors mention the limit
- Downloads: `Content-Disposition`, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, CSP `sandbox`
- No `/uploads/...` public paths
- Audit redaction includes `extractedText` and `storageKey`

## 12. Audit

Existing `AuditService`. Resource is the **bid** (`resourceId` = bid id); `documentId` is in metadata.

| Action |
| --- |
| `document.uploaded` |
| `document.updated` |
| `document.version.created` |
| `document.requirement.linked` |
| `document.archived` |
| `document.downloaded` |
| `document.extraction.started` |
| `document.extraction.completed` |
| `document.extraction.failed` |

File contents and extracted bodies are not logged.

## 13. API

All under `/api/v1`. Nested under bids so they do not collide with kit `/documents/:id`.

| Method | Path |
| --- | --- |
| `GET` | `/bids/:id/documents` |
| `POST` | `/bids/:id/documents` (multipart `file`) |
| `GET` | `/bids/:bidId/documents/:id` |
| `GET` | `/bids/:bidId/documents/:id/download?disposition=inline\|attachment` |
| `GET` | `/bids/:bidId/documents/:id/activity` |
| `POST` | `/bids/:bidId/documents/:id/version` |
| `POST` | `/bids/:bidId/documents/:id/link-requirement` |
| `POST` | `/bids/:bidId/documents/:id/archive` |
| `GET` | `/bids/:id` includes `documentSummary` |

List query: `documentType`, `category`, `status`, `extractionStatus`, `tenderRequirementId` (`unmapped` supported), `currentOnly` (default true), `sort` (`newest` \| `oldest` \| `name` \| `type`), `page` / `pageSize`.

List payload is metadata only (no `extractedText`, no `storageKey`). Duplicate current checksum: **409** “An identical file already exists for this submission.”

## 14. Database changes

Prisma migration `20260830201500_bharatbid_bid_documents`. New enums `BidDocumentType`, `BidDocumentStatus`, `BidDocumentExtractionStatus` and table `bid_documents`. Indexes on bid+createdAt, bid+isCurrent, bid+checksum, requirement, type, status, group+version. No reset of Slice 1–3 tables.

## 15. Demo data

Seven synthetic TXT files on demo bid `BID-GEM2026BCPCL001-0001` (Bayfront), labelled **DEMO / SYNTHETIC**. Types: GST Certificate (v1 archived, v2 current), PAN, Udyam (unmapped), Experience Certificate, Financial Statement, OEM Authorization (unmapped). Bytes written under local storage keys matching metadata. Not government-issued and not authentic.

## 16. Tests

- Unit: document type / unmapped aliases, list query filters, serialize omits `storageKey` / list `extractedText`, activity titles without verification language
- HTTP (when `DATABASE_URL` is set): officer upload lifecycle, reviewer 403 upload / 200 read+download, invalid MIME/extension, path traversal filename, oversized file, duplicate checksum, unauthenticated download, standard user 403
- Frontend: document list, empty state, upload modal (type + requirement), upload success/error, preview + advisory, download/archive/version actions, reviewer read-only, bid detail tabs

If Postgres is unavailable: `HTTP/API tests skipped — database unavailable.`

## 17. Known limitations

- No image OCR; image extraction is failed, file remains
- Extraction is heuristic text only (not structured field extraction as a verification input)
- Duplicate identical files are rejected for the current set; user must keep the existing file or upload a different checksum as a new version of another group
- Demo files are TXT only
- Activity is empty if the audit store is unavailable
- Kit document-analyze pipeline is unchanged and unused for bid evidence

## 18. Future verification integration points

Slice 4 stops before any government source:

```text
Document
   ↓
Extracted Data          ← Slice 4 foundation
   ↓
Government Source       ← not implemented
   ↓
Verification Result
   ↓
Cross-Verification
   ↓
Compliance
```

Do not treat a linked document, a checksum match, or extracted text as GST / PAN / MCA / Udyam / GeM verification or as compliance.
