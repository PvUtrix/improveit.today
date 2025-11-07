# Specifications

This directory contains all technical specifications for ImproveIt.Today using the GitHub Spec-Kit format.

## Directory Structure

```
specs/
├── rfcs/           # Request for Comments - Major feature proposals
├── adrs/           # Architecture Decision Records
├── api/            # API specifications
└── features/       # Feature specifications
```

## Spec-Kit Format

All specifications follow this structure:

```markdown
---
status: [draft|review|accepted|implemented|deprecated]
date: YYYY-MM-DD
decision-makers: [@username, @username]
consulted: [@username, @username]
informed: [@username, @username]
---

# Title

## Status
Current status and decision date

## Context
What is the issue/opportunity that we're addressing?

## Decision
What is the change we're proposing?

## Consequences
What becomes easier or more difficult as a result of this change?
```

## Creating a New Spec

### RFC (Request for Comments)
For major features or architectural changes:
```bash
cp specs/templates/rfc-template.md specs/rfcs/RFC-NNN-feature-name.md
```

### ADR (Architecture Decision Record)
For documenting important architectural decisions:
```bash
cp specs/templates/adr-template.md specs/adrs/ADR-NNN-decision-title.md
```

### API Spec
For API endpoint documentation:
```bash
cp specs/templates/api-template.md specs/api/service-name-api.md
```

### Feature Spec
For feature requirements and design:
```bash
cp specs/templates/feature-template.md specs/features/feature-name.md
```

## Review Process

1. **Draft**: Author writes initial version
2. **Review**: Team reviews and provides feedback
3. **Accepted**: Decision makers approve
4. **Implemented**: Feature/decision is implemented
5. **Deprecated**: (if applicable) No longer relevant

## Index

### RFCs
- [RFC-001: Voting System Design](./rfcs/RFC-001-voting-system.md)
- [RFC-002: Payment and Crowdfunding](./rfcs/RFC-002-payment-system.md)
- [RFC-003: Authority Notification System](./rfcs/RFC-003-authority-notifications.md)

### ADRs
- [ADR-001: Microservices Architecture](./adrs/ADR-001-microservices-architecture.md)
- [ADR-002: Database Choice](./adrs/ADR-002-database-choice.md)
- [ADR-003: Event-Driven Architecture](./adrs/ADR-003-event-driven-architecture.md)

### API Specifications
- [Voting Service API](./api/voting-service-api.md)
- [Problem Service API](./api/problem-service-api.md)
- [User Service API](./api/user-service-api.md)

### Feature Specifications
- [Problem Reporting Flow](./features/problem-reporting.md)
- [Vote Threshold System](./features/vote-threshold.md)
- [Solver Marketplace](./features/solver-marketplace.md)
