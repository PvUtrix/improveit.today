# Infrastructure Deployment (The "Unkillable" Layer)

For High Availability (HA) and "unkillable" resilience, we rely on industry-standard Operators and Helm Charts.

## 1. PostgreSQL (HA) with CNPG
We use **CloudNativePG** (CNPG) operator. It manages failover, backups, and point-in-time recovery automatically.

```bash
# Install Operator
kubectl apply -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/main/releases/cnpg-1.22.1.yaml

# Create Cluster (3 instances)
kubectl apply -f - <<EOF
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: improveit-db-cluster
spec:
  instances: 3
  storage:
    size: 10Gi
  bootstrap:
    initdb:
      database: improveit
      owner: improveit
EOF
```

## 2. Kafka (HA) with Strimzi
We use the **Strimzi** operator for running Kafka on K8s.

```bash
# Install Strimzi
kubectl create -f 'https://strimzi.io/install/latest?namespace=kafka' -n kafka

# Deploy Kafka Cluster (3 replicas)
kubectl apply -f - <<EOF
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: improveit-cluster
  namespace: kafka
spec:
  kafka:
    version: 3.6.0
    replicas: 3
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
    storage:
      type: jbod
      volumes:
      - id: 0
        type: persistent-claim
        size: 100Gi
        deleteClaim: false
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 100Gi
      deleteClaim: false
  entityOperator:
    topicOperator: {}
    userOperator: {}
EOF
```

## 3. Redis (HA)
Use the Bitnami Helm chart for Redis Sentinel.

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install improveit-redis bitnami/redis \
  --set architecture=replication \
  --set sentinel.enabled=true \
  --set auth.enabled=false \
  --set replica.replicaCount=3
```

## 4. MinIO (High Availability)
For on-premise object storage (if not using AWS S3).

```bash
helm install improveit-minio bitnami/minio \
  --set mode=distributed \
  --set replicas=4
```
