# Problem Statement

## Problem

**SIH Problem Statement 26100** — AI-powered integrated bid compliance verification for GeM / CPSE procurement (Ministry of Petroleum & Natural Gas / CPCL context).

Procurement teams handle fragmented bidder information, document-heavy verification, cross-source inconsistencies, manual review, weak evidence traceability, and difficulty comparing bids transparently.

## Users

* Procurement officers
* Reviewers
* Administrators (platform)

## Actors

* BharatBid (decision-support software)
* DEMO SOURCE adapters (GST, MCA, Udyam, GeM representations)
* Officers who remain responsible for decisions

## Pain Points

* Documents not tied to tender requirements
* Government-source checks are inconsistent and hard to explain
* Reviews and clarifications live outside the bid file
* Comparison of bids lacks a shared evidence matrix
* Risk of over-claiming “verified” or “winner”

## Current Workflow

Manual collection of GST/MCA/MSME documents, ad-hoc spreadsheets, and late-stage review.

## Proposed Workflow

Tender → requirements → bid + evidence → DEMO SOURCE verification → cross-checks → requirement intelligence → officer review → Officer Review Priority → comparative evaluation → decision-support record → PDF report. Command Center shows the operational picture.

## Functional Requirements

Covered in Slices 1–10 (tenders, bidders, bids, documents, verification, cross-checks, review, attention, evaluation, command center, notifications, reports).

## Non-Functional Requirements

RBAC, auditability, demo-mode labelling, no automatic award/rejection.

## External integrations

Not required for this SIH product. BharatBid uses DEMO / SYNTHETIC source adapters only.

## New Application Entities

Tender, Requirement, Bidder, BidSubmission, documents, verifications, cross-checks, reviews, evaluations — see `database/prisma/schema.prisma` and [BHARATBID_ARCHITECTURE.md](docs/BHARATBID_ARCHITECTURE.md).

## AI Opportunities

Document extraction via the existing AI service (untrusted). No award AI. No fraud model.

## Notification Requirements

In-app notices for bid/review/evaluation events (existing `NotificationService`).

## Reporting Requirements

Tender evaluation / evidence / verification / review / decision PDFs with disclaimer and DEMO label.

## File/Document Requirements

Authenticated upload, versioning, mapping, preview, download.

## External Integrations

Demo adapters only in this submission.

## Authentication

JWT session (kit auth).

## Authorization

Kit RBAC plus BharatBid permissions (`tenders.*`, `bids.*`, `bidders.*`).

## Security Requirements

See [docs/BHARATBID_SECURITY.md](docs/BHARATBID_SECURITY.md).

## Expected Output

A demo-ready Command Center and end-to-end officer workflow with honest DEMO SOURCE labelling.

## Success Criteria

Judges can follow [docs/BHARATBID_DEMO_GUIDE.md](docs/BHARATBID_DEMO_GUIDE.md) without dead ends or false government-API claims.
