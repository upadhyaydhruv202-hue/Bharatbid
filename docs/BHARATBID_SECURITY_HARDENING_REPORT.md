# BharatBid — Security and hardening report

Audit of the existing SIH 26100 codebase. **Fixed** means the change is in this repository and covered by automated tests named in the Test column. **Informational** items are documented limitations, not silent claims of safety.

| Area | Issue | Severity | Fix | Test |
| --- | --- | --- | --- | --- |
| Tender calendar | Opening and bid acceptance used tender **status only**. Client date checks could be bypassed; evaluation could start while the window was still open. | **HIGH** | Server-time gates: cannot open before issue date; bids only when `open` and `issueDate ≤ now ≤ closingDate`; evaluation only after `now > closingDate`. Allowed status actions filtered the same way for the UI. | `backend/src/problem/transitions.test.ts`; `backend/tests/bharatbid.http.test.ts` (late bid, future issue); `backend/tests/bharatbid-evaluations.http.test.ts` (evaluation before close) |
| Bid submission | Status-only create/submit; race on duplicate bidder+tender. | **HIGH** | Calendar + existing unique `(tenderId, bidderId)` + ConflictError mapping. Concurrent POSTs → 201 and 409. | `bharatbid.http.test.ts` duplicate + concurrent; unique constraint in Prisma |
| Tender create | Could persist `under_evaluation` / `closed` / `awarded` / `cancelled` on create, skipping the lifecycle. | **MEDIUM** | Create limited to `draft` or `open` (open still requires issue date). | Service guard + invalid transition HTTP test |
| Evaluation window | Evaluation create/start ignored closing date and tender status. | **HIGH** | `assertEvaluationMayBegin` on create and start. | Unit calendar tests; evaluation HTTP “before closing” |
| Cross-verification | A field missing on one source still produced overall **consistent** if the other field matched. | **HIGH** | Missing/not comparable fields → `insufficient_evidence`. Differences still `inconsistent`. Errors/not_found remain insufficient, not mismatch. | `backend/src/problem/intelligence/compare.test.ts` |
| AI HTTP | `POST /ai/structured` with `schemaName: decision` returned a decision envelope to clients. | **MEDIUM** | HTTP schema allows only `insight`. Internal `generateDecision` unchanged. | `ai.http.test.ts`; `ai.schemas.test.ts` |
| Officer review | `open → assessed` skipped Start review. | **MEDIUM** | Assess table no longer includes `open`. UI hides Record assessment until `in_review` (or later). | `review/lifecycle.test.ts`; `ReviewDetailPage.test.tsx` |
| Requirements | Requirements could still change after evaluation started (`under_evaluation` / `closed`). | **MEDIUM** | `assertRequirementsMutable` — only `draft` and `open`. Core type/mandatory already locked after submitted bids. | `transitions.test.ts` |
| Documents | Upload/replace allowed after tender closed, silently changing evidence used in evaluation. | **MEDIUM** | Block upload/replace/link/archive when tender is closed/awarded/cancelled or bid is withdrawn/finalized. Versioning preserved. | `transitions.test.ts` (`assertBidDocumentsMutable`) |
| Upload MIME | Validated files persisted the **client** MIME string. | **LOW** | Persist canonical `EXTENSION_MIME[extension]`. Magic-byte checks already present. | `document.files.test.ts` |
| Audit redaction | Email and Aadhaar-like keys were not in the sensitive set (PAN/GSTIN/CIN already were). | **MEDIUM** | Added `email`, `contactemail`, `aadhaar`, `aadhar`, `uid`. | `audit.service.test.ts` |
| IDOR on nested bid resources | Document/verification/cross-check/review already required `bidSubmissionId` match. | **INFORMATIONAL** | Preserved; no rewrite. | Existing domain HTTP tests |
| Frontend-only RBAC | Buttons hidden by permission. | **INFORMATIONAL** | Backend `requirePermission` remains the authority (already present). | Existing 401/403 HTTP tests |
| Multi-tenant isolation | Officers with read access could see all tenders. | **HIGH** | `Organization` / `OrganizationMember`; tenders and bidders scoped; ALS + repository filters; 404 on cross-tenant IDs. | `backend/tests/organization.http.test.ts` |
| Live government APIs | Demo adapters could be mistaken for live GSTN/MCA. | **HIGH** (integrity) | Orchestrator + modes `demo`/`sandbox`/`live`/`manual`. LIVE only after configured HTTPS provider call. No credentials in this workspace. | `http-adapter.test.ts`; verification unit tests |
| OCR | Scanned PDFs/images had no OCR. | **INFORMATIONAL** | Optional `OCR_HTTP_URL`; otherwise honest `ocr-unavailable`. OCR ≠ verification. | Extraction still unit-tested for text |
| Requirement history | Editing names after bids still possible while tender is `open`. | **MEDIUM** | Name/description/type/mandatory locked once tender is not `draft`. Add a new requirement instead. | Tender HTTP requirement tests remain on draft |
| Financial evaluation | No commercial scoring. | **INFORMATIONAL** | Explicit “outside scope” copy preserved. | Evaluation display/readiness tests |
| Error leakage | Unhandled errors could theoretically leak internals. | **LOW** | Existing handler already sanitizes production 500s; no stack traces to clients. | Existing error middleware |
| Attention score misuse | Could be read as a winner/fraud score. | **INFORMATIONAL** | Copy and docs already say review-priority only; no code change to the formula. | `attention/score.test.ts` |
| AI as award engine | Guardrails exist; HTTP decision schema was the remaining footgun. | **MEDIUM** | HTTP decision schema removed (see AI HTTP). | AI HTTP/schema tests |
| Multer `fileFilter` | Relies on later `validateDocumentFile`; client MIME not trusted at persist. | **LOW** | Left as-is plus canonical MIME persist. | Upload validation tests |

## Classification notes

- **CRITICAL** would mean remote unauthenticated compromise or automatic false award. None were marked CRITICAL after this pass.
- Do not treat DEMO verification MATCHED as a government certificate.

## Residual risk (not marked Fixed)

1. LIVE government calls require credentials/onboarding that are not in this workspace (READY_FOR_CREDENTIALS).
2. MCA, Udyam, EPFO, ESIC, GeM, NSIC, OEM, Make in India, debarment have no honest unattended official REST API here — manual or DEMO.
3. OCR without `OCR_HTTP_URL` cannot read scans; extraction is never verification.
4. No financial evaluation / automatic award.
5. Requirement **text** is frozen after publish. Silent additions while `open` are blocked. Officers must record a versioned amendment with a change reason.
6. Attention score can still be misread if a presenter ignores the disclaimer.
