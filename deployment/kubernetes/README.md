# Kubernetes Deployment Strategy

This directory contains the Kubernetes manifests for deploying **ImproveIt.Today** to a high-availability cluster.

## 📂 Structure

- **`/apps`**: Contains the stateless Application microservices.
  - Each service has its own folder with `deployment.yaml` and `service.yaml`.
- **`/infrastructure`**: Contains recommendations and values for stateful services (Databases, Queues).
  - We recommend using **Helm Charts** and **Operators** for these components in production to ensure "Unkillable" status (HA, automated failover).

## 🚀 Getting Started (Staging/Production)

### Prerequisites
- A Kubernetes Cluster (v1.24+)
- `kubectl` configured
- `helm` installed (for infrastructure)

### 1. Deploy Infrastructure (The "Stateful" Layer)
Don't deploy databases manually with raw YAMLs. Use mature Helm charts.
See [infrastructure/README.md](./infrastructure/README.md) for the exact commands to install:
- PostgreSQL (HA)
- Kafka + Zookeeper
- Redis
- MinIO (if not using AWS S3)

### 2. Deploy Applications (The "Stateless" Layer)
Apply the manifests for the microservices.

```bash
# Apply all services
kubectl apply -R -f apps/
```

## 🔄 The "Unkillable" GitOps Workflow

For a true production setup, do not use `kubectl apply` manually.

1. **Install ArgoCD** in your cluster.
2. **Point ArgoCD** to this `deployment/kubernetes` folder.
3. **Commit** changes to these YAML files.
4. **ArgoCD** will automatically sync the cluster state.

## 🛠 Configuration

Configuration is handled via `ConfigMaps` and `Secrets`.
*Note: For security, never commit raw secrets. Use SealedSecrets or ExternalSecrets operator.*
