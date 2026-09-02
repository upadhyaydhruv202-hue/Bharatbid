# BharatBid — Slice 2

Tender & Requirement Management workspace on top of the Slice 1 domain foundation.

Runtime remains `backend/src/problem/`. No AI, government verification, document upload, or compliance evaluation was added.

## 1. Scope

Procurement officers can create, edit, open, evaluate, close, award, and cancel tenders; configure ordered requirements; review configuration readiness; see bid participation counts; and inspect tender activity from the existing audit log.

Reviewers can view the same workspace without mutation controls.

## 2. Tender workflow

```text
Create (draft)
  → Configure requirements
  → Open
  → Receive bids
  → Start evaluation
  → Close evaluation
  → Mark awarded
```

Cancellation is allowed from draft, open, and under evaluation. Awarded and cancelled are terminal. Closed cannot return to draft or be cancelled.

**Assumption:** reference number is immutable after create. Issue date is locked after the tender leaves draft. Closing date is locked once any bid exists. Mandatory flag and requirement type are locked after a non-draft/non-withdrawn bid exists. Name, description, activate/deactivate, and reorder remain available until the tender is awarded or cancelled.

## 3. Requirement workflow

Requirements describe **what** must later be evidenced. They are not evaluated in this slice.

Officers can add, edit, activate, deactivate (row is retained), and reorder with up/down. Types remain the Slice 1 enum.

## 4. API changes

Existing `/api/v1` envelopes, auth, and RBAC.

| Endpoint | Notes |
| --- | --- |
| `GET /tenders` | `q` or `search`, `status`, `category`, `sortBy`/`sort` (`closingDate`, `createdAt`, `referenceNumber`, `status`), `sortOrder`/`order`, pagination. List items include `requirementCount`. |
| `GET /tenders/:id` | Adds `createdBy`, `readiness`, `requirementCounts`, `bidSummary`, `allowedStatusActions`, `fieldLocks`. |
| `PATCH /tenders/:id` | Enforces field locks. |
| `POST /tenders/:id/status` | Linear transitions only (see §2). |
| `GET /tenders/:id/activity` | Tender-scoped audit (`tenders.read`; does not require `audit.read`). |
| `POST /tenders/:tenderId/requirements/:id/move` | `{ direction: "up" \| "down" }` |

Category is still a string column; the API accepts `GOODS` or `goods` and stores `Goods` (Goods, Services, Works, IT, Consultancy, Other).

## 5. Database changes

Migration `20260830193000_bharatbid_tender_indexes`:

- index `tenders(category)`
- index `tender_requirements(tender_id, mandatory)`

No new tables.

## 6. RBAC

Unchanged permissions: `tenders.read` / `tenders.write`. Mutations remain backend-enforced. Object-level tender sharing is still a future capability; any officer with `tenders.read` sees all tenders.

## 7. Audit events

Existing: `tender.created`, `tender.updated`, `tender.status.changed`, `tender.requirement.created`, `tender.requirement.updated`.

Added: `tender.requirement.activated`, `tender.requirement.deactivated`, `tender.requirement.reordered`.

Requirement events store `resourceId` = tender id and `requirementId` in metadata so the activity tab can group them. PAN/GSTIN redaction from Slice 1 is unchanged.

## 8. UI routes

Same as Slice 1. Tender list, create, and detail pages were upgraded into a procurement workspace (tabs: Overview, Requirements, Bid participation, Activity).

## 9. Demo data

Still 5 tenders, 10 bidders, 15 bids. Requirement definitions on the first three tenders now cover PAN/GST plus Udyam/technical/financial, OEM/technical, and startup/local-content declarations. These remain definitions only.

## 10. Tests

- Unit: transitions, category normalization, list query aliases, readiness
- HTTP: search/filter/sort, requirement activate/deactivate/reorder, activity, reviewer mutation 403
- Frontend: tender list filters, create form sections, detail status actions and reviewer hide

## 11. Known limitations

- No per-officer tender ACL
- HTTP tests require `DATABASE_URL`
- Readiness is a configuration checklist, not a gate (API still allows opening a draft with zero requirements; the UI warns)
- Activity depends on audit persistence; empty if the audit store is unavailable
- No requirement versioning

## 12. Future extension points

`TenderRequirement` remains a definition record. Later slices should attach evidence, verification, and compliance results to bid submissions (and optionally to a requirement id) without turning this model into a rule engine.
