# Architecture Decision — BharatBid

## Problem

SIH Problem Statement 26100 needs an evidence-driven procurement workspace: tenders, bidder documents, DEMO SOURCE verification, cross-checks, officer review, Officer Review Priority, comparative evaluation, and decision-support reports.

## Target users

CPSE procurement officers and reviewers (demo: CPCL-style synthetic tenders).

## Actors

Procurement officers, reviewers, background jobs (document extraction, notifications, PDF reports), and DEMO SOURCE verification adapters.

## Core workflow

Login → Command Center → Tender → Bid → Documents → Verification → Cross-checks → Requirements → Officer review → Officer Review Priority → Comparative evaluation → Officer decision → Report → Activity → Notifications.

See [docs/BHARATBID_ARCHITECTURE.md](docs/BHARATBID_ARCHITECTURE.md) and [docs/BHARATBID_DEMO_GUIDE.md](docs/BHARATBID_DEMO_GUIDE.md).

## Application database entities

Auth/RBAC users and roles; audit; notifications; storage/document extraction; BharatBid models: Tender, TenderRequirement, Bidder, BidSubmission, BidDocument, BidVerification, BidCrossVerification, BidReviewItem, ReviewAssessment, ReviewClarification, TenderEvaluation, EvaluationNote, EvaluationDecision.

## AI capabilities

Document intelligence (extract/classify) through a provider-agnostic AI adapter. AI output is untrusted structured data. There is no winner model, fraud score, or automatic award.

## Notifications

In-app notification service used by BharatBid officer workflows.

## Background jobs

Document extraction, PDF/report generation, and notification dispatch (in-process during `npm run dev`; dedicated worker in Docker Compose).

## File processing

Local (or optional S3) object storage plus the document extraction pipeline.

## Reports

pdf-lib renderer; BharatBid evaluation report in `backend/src/problem/operations/report.ts`.

## External integrations

DEMO / SYNTHETIC / MOCK / SIMULATED government-source adapters only. No live GSTN, MCA, Udyam, or GeM production APIs.

## Authentication and authorization

JWT access + rotating refresh. RBAC catalog (`procurement_officer`, `reviewer`, `admin`) on `/api/v1`.

## Security considerations

[docs/BHARATBID_SECURITY.md](docs/BHARATBID_SECURITY.md).

## Deployment

Docker Compose: frontend, API, worker, PostgreSQL, Redis. Not claimed as production-certified.

## Why these technologies?

React/Vite, Express, PostgreSQL/Prisma, and optional Redis/BullMQ already implement the SIH demo. A parallel stack was rejected.

## Alternatives considered

Rebuilding a single-purpose app from scratch — rejected. Live government APIs — out of scope without credentials and legal access.

## Risks

Demo data mistaken for live government results — mitigated by DEMO / SYNTHETIC / DEMO SOURCE labels throughout the product.

## Success criteria

A stable SIH demonstration of the officer workflow above, with an SIH-only repository (no unused Copilot, RAG, Odoo, or generic kit product chrome).
