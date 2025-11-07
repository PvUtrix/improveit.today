---
status: accepted
date: 2025-11-07
decision-makers: [Pavel Shershnev]
---

# ADR-002: PostgreSQL + PostGIS as Primary Database

## Status

**Status**: Accepted
**Date**: 2025-11-07
**Decision Makers**: Pavel Shershnev

## Context

ImproveIt.Today requires a database that can:
- Store relational data (users, problems, votes, bids)
- Handle geospatial queries efficiently (find problems near location)
- Support ACID transactions (payment, voting)
- Scale to billions of records
- Provide full-text search capabilities
- Support analytics and reporting

### Background

Core data model includes:
- Geospatial data: Problems have location coordinates
- Relational data: Users, votes, bids, funding have complex relationships
- Time-series data: Analytics on problem trends
- High read volume: Problem browsing, map viewing
- Medium write volume: Problem reporting, voting

### Constraints

- **Performance**: Sub-100ms query response time
- **Scale**: Must handle billions of problems
- **Geospatial**: Efficient radius and boundary queries
- **Cost**: Open-source preferred
- **Maturity**: Production-proven at scale

## Decision

We will use **PostgreSQL 15+ with PostGIS extension** as our primary database with the following architecture:

1. **Primary Database**: PostgreSQL + PostGIS
2. **Caching Layer**: Redis for hot data
3. **Search Engine**: Elasticsearch for full-text search
4. **Time-Series**: TimescaleDB for analytics
5. **Sharding Strategy**: Geographic sharding for scaling

### Rationale

1. **Geospatial Support**: PostGIS provides world-class GIS capabilities
   - ST_DWithin for radius queries
   - ST_Within for jurisdiction boundaries
   - Spatial indexes (GIST) for performance

2. **Reliability**: PostgreSQL is battle-tested
   - ACID compliance for payments and voting
   - Mature replication and backup
   - Strong consistency guarantees

3. **Features**:
   - JSON support for flexible metadata
   - Full-text search (pg_trgm)
   - Materialized views for vote aggregates
   - Foreign key constraints for data integrity

4. **Ecosystem**:
   - Excellent Node.js support (pg library)
   - Rich tooling and monitoring
   - Large community and resources

5. **Cost**: Open-source with no licensing fees

## Alternatives Considered

### Alternative 1: MongoDB

**Description**: Document database with geospatial support

**Pros**:
- Native geospatial indexes
- Flexible schema
- Horizontal scaling built-in
- Good Node.js support

**Cons**:
- Weaker consistency guarantees
- No ACID transactions (critical for payments)
- Harder to model complex relationships
- Less mature geospatial queries than PostGIS

**Why rejected**: Need ACID transactions for voting and payments. Relational data model fits better.

### Alternative 2: MySQL

**Description**: Popular relational database

**Pros**:
- Well-known and widely used
- Good performance
- Mature replication

**Cons**:
- Weaker geospatial support
- No advanced GIS functions
- Less extensible than PostgreSQL
- JSON support not as robust

**Why rejected**: PostGIS far superior to MySQL spatial extensions.

### Alternative 3: DynamoDB

**Description**: AWS managed NoSQL database

**Pros**:
- Unlimited scaling
- Managed service
- Strong consistency option
- Good geospatial support

**Cons**:
- Vendor lock-in to AWS
- Complex pricing model
- Harder to query complex relationships
- Expensive at scale

**Why rejected**: Want to avoid vendor lock-in. PostgreSQL can be deployed anywhere.

### Alternative 4: CockroachDB

**Description**: Distributed SQL database

**Pros**:
- Horizontal scaling built-in
- PostgreSQL compatible
- Strong consistency
- Geo-distribution

**Cons**:
- Less mature than PostgreSQL
- More complex to operate
- Performance overhead for distribution
- Smaller community

**Why rejected**: Can start with PostgreSQL and migrate if needed. Not worth complexity at this stage.

## Consequences

### Positive Consequences

1. **Powerful Geospatial**: PostGIS provides all needed GIS functions
2. **Data Integrity**: ACID transactions protect critical operations
3. **Flexibility**: JSON columns for extensibility
4. **Tooling**: Excellent admin tools (pgAdmin, DataGrip)
5. **Performance**: Can handle billions of rows with proper indexing
6. **Cost**: No licensing fees

### Negative Consequences

1. **Scaling**: Requires careful sharding for extreme scale
2. **Horizontal Scaling**: Not as easy as NoSQL options
3. **Learning Curve**: PostGIS functions require learning
4. **Single Point of Failure**: Need proper replication setup

### Neutral Consequences

1. **Backup Strategy**: Need robust backup and restore procedures
2. **Monitoring**: Requires query performance monitoring
3. **Connection Pooling**: Need pgBouncer or similar

## Implementation

### Required Actions

- [x] Setup PostgreSQL 15 with PostGIS extension
- [x] Design database schema with geospatial columns
- [x] Create spatial indexes (GIST)
- [x] Implement materialized views for aggregates
- [ ] Setup read replicas for scaling
- [ ] Implement geographic sharding
- [ ] Configure connection pooling (PgBouncer)
- [ ] Setup automated backups
- [ ] Implement query performance monitoring

### Database Architecture

```
┌─────────────────┐
│   API Services  │
└────────┬────────┘
         │
    ┌────▼────┐
    │  Redis  │ (Cache Layer)
    └────┬────┘
         │
┌────────▼────────────┐
│  PostgreSQL Primary │ (Write)
└────────┬────────────┘
         │
    ┌────▼────┐
    │ Replica │ (Read)
    └─────────┘
```

### Sharding Strategy

When scaling beyond single instance:

```
┌──────────────┐
│ Shard Router │
└──────┬───────┘
       │
   ┌───┴───┬─────────┬─────────┐
   │       │         │         │
   ▼       ▼         ▼         ▼
┌─────┐ ┌─────┐  ┌─────┐  ┌─────┐
│ NA  │ │ EU  │  │ AS  │  │ SA  │
│Shard│ │Shard│  │Shard│  │Shard│
└─────┘ └─────┘  └─────┘  └─────┘
```

Shard by geographic region based on problem location.

### Timeline

**Phase 1** (Complete): Single PostgreSQL instance with PostGIS
**Phase 2** (Q1 2026): Read replicas
**Phase 3** (Q2 2026): Geographic sharding

## Compliance

**Security**: Encrypted connections, encrypted at rest, role-based access

**Privacy**: Row-level security for multi-tenant data

**Performance**: Proper indexing, materialized views, query optimization

**Cost**: ~$100/month for managed PostgreSQL, scales with usage

**Maintenance**: Regular VACUUM, index maintenance, query optimization

## References

- [PostGIS Documentation](https://postgis.net/documentation/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Sharding PostgreSQL](https://www.citusdata.com/blog/2017/03/31/how-to-scale-postgres/)
- [PostgreSQL at Scale](https://www.2ndquadrant.com/en/blog/postgresql-scalability/)

## Revision History

| Date | Changes | Author |
|------|---------|--------|
| 2025-11-07 | Initial version | Pavel Shershnev |
