---
status: accepted
date: 2025-11-07
decision-makers: [Project Lead]
---

# ADR-003: Event-Driven Architecture with Kafka

## Status

**Status**: Accepted
**Date**: 2025-11-07
**Decision Makers**: Project Lead

## Context

ImproveIt.Today's microservices need to communicate and react to events:
- When a problem reaches vote threshold → notify authorities
- When a bid is accepted → notify solver and start escrow
- When payment completes → notify stakeholders and update status
- When problem is resolved → notify voters and close campaign

### Background

Service communication patterns needed:
1. **Synchronous**: Direct API calls for immediate responses
2. **Asynchronous**: Event notifications for eventual consistency
3. **Fan-out**: Single event triggers multiple actions
4. **Decoupling**: Services don't need to know about each other

Traditional request/response creates tight coupling and doesn't handle:
- Service failures gracefully
- Multiple consumers of same event
- Event replay for debugging
- Audit trails
- Scaling consumers independently

### Constraints

- **Reliability**: Events must not be lost
- **Ordering**: Some events must be processed in order
- **Scalability**: Handle millions of events per day
- **Latency**: Acceptable delay of seconds (not real-time trading)
- **Cost**: Affordable for startup

## Decision

We will implement **Event-Driven Architecture using Apache Kafka** as our event bus with these principles:

1. **Event Sourcing**: Critical state changes published as events
2. **Consumer Groups**: Multiple instances of services process events
3. **Topic Design**: Single topic `improveit-events` with event types
4. **At-Least-Once Delivery**: Handle duplicate events gracefully
5. **Dead Letter Queue**: Failed events go to DLQ for retry

### Architecture

```
┌─────────────┐
│   Service   │──► publish event
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Kafka    │  (Event Bus)
│   Topic     │
└──────┬──────┘
       │
       ├──► ┌───────────────┐
       │    │ Notification  │ (Consumer)
       │    │    Service    │
       │    └───────────────┘
       │
       ├──► ┌───────────────┐
       │    │   Analytics   │ (Consumer)
       │    │    Service    │
       │    └───────────────┘
       │
       └──► ┌───────────────┐
            │   Authority   │ (Consumer)
            │    Service    │
            └───────────────┘
```

### Event Types

```typescript
// vote.cast
{
  type: 'vote.cast',
  data: { userId, problemId, voteType, newScore }
}

// problem.threshold_reached
{
  type: 'problem.threshold_reached',
  data: { problemId, upvotes, threshold, authorityEmail }
}

// bid.accepted
{
  type: 'bid.accepted',
  data: { bidId, problemId, solverId, amount }
}

// payment.completed
{
  type: 'payment.completed',
  data: { transactionId, amount, problemId }
}
```

### Rationale

1. **Decoupling**: Services don't call each other directly
2. **Resilience**: Consumers process at their own pace
3. **Scalability**: Add consumers without changing producers
4. **Audit Trail**: All events persisted for debugging
5. **Replay**: Can replay events for testing or recovery

## Alternatives Considered

### Alternative 1: Direct HTTP Calls

**Description**: Services call each other's REST APIs

**Pros**:
- Simple to understand
- Immediate feedback
- No additional infrastructure

**Cons**:
- Tight coupling
- Cascading failures
- No retry mechanism
- Cannot scale consumers independently

**Why rejected**: Creates service dependencies. If Notification Service is down, voting fails.

### Alternative 2: RabbitMQ

**Description**: Message queue for async communication

**Pros**:
- Mature and stable
- Good for task queues
- Easier to setup than Kafka
- Lower latency

**Cons**:
- Not designed for event streaming
- Limited replay capability
- Consumers acknowledge messages (lose history)
- Less suitable for analytics

**Why rejected**: Need event log for analytics and replay. Kafka better for event sourcing.

### Alternative 3: AWS SNS/SQS

**Description**: Managed AWS messaging services

**Pros**:
- Fully managed
- No infrastructure to maintain
- Good AWS integration
- Simple pricing

**Cons**:
- Vendor lock-in
- Cannot move to other clouds
- Limited retention
- More expensive at scale

**Why rejected**: Want to avoid vendor lock-in. Need longer event retention.

### Alternative 4: Redis Pub/Sub

**Description**: Use Redis for publish/subscribe

**Pros**:
- Very fast
- Simple to use
- Already using Redis for cache
- Low latency

**Cons**:
- No persistence
- No message replay
- Fire-and-forget (can lose messages)
- Not suitable for critical events

**Why rejected**: Cannot lose payment or voting events. Need persistence.

## Consequences

### Positive Consequences

1. **Loose Coupling**: Services are independent
2. **Scalability**: Can scale producers and consumers separately
3. **Resilience**: Service failures don't propagate
4. **Observability**: Event log provides audit trail
5. **Flexibility**: Easy to add new consumers
6. **Debugging**: Can replay events to reproduce issues

### Negative Consequences

1. **Complexity**: Adds infrastructure to manage
2. **Eventual Consistency**: Not immediately consistent
3. **Duplicate Processing**: Must handle at-least-once delivery
4. **Learning Curve**: Team needs to learn Kafka
5. **Debugging**: Distributed tracing more complex
6. **Latency**: Events processed asynchronously (seconds delay)

### Neutral Consequences

1. **Operations**: Need Kafka expertise
2. **Monitoring**: Require lag monitoring and alerting
3. **Cost**: ~$50-100/month for managed Kafka

## Implementation

### Required Actions

- [x] Setup Kafka + Zookeeper in Docker
- [x] Create `improveit-events` topic
- [x] Implement event publisher in Voting Service
- [x] Implement event consumer in Notification Service
- [ ] Add dead letter queue (DLQ)
- [ ] Implement idempotency keys
- [ ] Add distributed tracing
- [ ] Setup Kafka monitoring (lag alerts)
- [ ] Document all event types
- [ ] Create event schema registry

### Event Publishing Pattern

```typescript
// In Voting Service
await publishEvent({
  type: 'vote.cast',
  data: {
    voteId,
    userId,
    problemId,
    voteType,
    newScore
  }
});
```

### Event Consuming Pattern

```typescript
// In Notification Service
consumer.run({
  eachMessage: async ({ message }) => {
    const event = JSON.parse(message.value);

    switch (event.type) {
      case 'problem.threshold_reached':
        await handleThresholdReached(event.data);
        break;
      // ... other events
    }
  }
});
```

### Timeline

**Phase 1** (Complete): Basic Kafka setup
**Phase 2** (In Progress): More event types
**Phase 3** (Planned): Schema registry, DLQ, monitoring

## Compliance

**Security**: Events may contain sensitive data - encrypt at rest

**Privacy**: PII in events must comply with GDPR

**Performance**: Acceptable latency for async operations

**Cost**: ~$100/month managed Kafka

**Maintenance**: Kafka requires monitoring and maintenance

## References

- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Designing Event-Driven Systems](https://www.confluent.io/designing-event-driven-systems/)
- [Kafka Consumer Best Practices](https://www.confluent.io/blog/kafka-consumer-best-practices/)

## Revision History

| Date | Changes | Author |
|------|---------|--------|
| 2025-11-07 | Initial version | Project Lead |
