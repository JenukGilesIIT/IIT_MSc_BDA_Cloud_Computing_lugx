# LUGX Gaming Cloud Platform
## CMM707 Cloud Computing Coursework

A cloud-native gaming platform built with microservices architecture, deployed on AWS using Docker and Kubernetes.

## Project Structure

```
lugx-gaming-cloud/
│
├── docs/                       # All documentation, diagrams, final report
│   ├── architecture-diagram.png
│   ├── deployment-diagram.png
│   ├── ci-cd-pipeline.png
│   ├── security_keys/          # AWS keys and certificates
│   └── CMM707_Report.pdf       # Final report to be submitted
│
├── frontend/                   # The provided frontend app (static)
│   ├── assets/                 # CSS, JS, images
│   ├── vendor/                 # Bootstrap, jQuery
│   ├── *.html                  # HTML pages
│   └── Dockerfile
│
├── services/                   # Backend microservices
│   ├── game-service/
│   │   ├── app/
│   │   ├── Dockerfile
│   │   └── k8s.yaml
│   ├── order-service/
│   │   ├── app/
│   │   ├── Dockerfile
│   │   └── k8s.yaml
│   └── analytics-service/
│       ├── app/
│       ├── Dockerfile
│       └── k8s.yaml
│
├── k8s/                        # Kubernetes manifests for entire app
│   ├── frontend-deployment.yaml
│   ├── front-end-k8s.yaml
│   ├── ingress.yaml
│   ├── namespace.yaml
│   ├── clickhouse/             # ClickHouse configuration
│   ├── monitoring/             # Prometheus/Grafana setup
│   └── secrets/                # Kubernetes secrets
│
├── database/                   # SQL scripts or DB schema docs
│   ├── relational-schema.sql
│   └── clickhouse-init.sql
│
├── ci-cd/                      # CI/CD pipeline files
│   ├── github-actions/         # GitHub Actions workflows
│   └── test-scripts/           # Testing scripts
│
├── runbook/                    # Simple deployment and testing instructions
│   └── runbook.md
│
├── backup/                     # Backup of old/unused files
├── .gitignore
└── README.md
```

## Technology Stack

- **Frontend**: Static HTML/CSS/JS website
- **Backend**: Microservices (to be implemented)
- **Database**: Relational DB + ClickHouse for analytics
- **Container**: Docker
- **Orchestration**: Kubernetes
- **Cloud Provider**: AWS (EC2)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus & Grafana

## Getting Started

1. **Prerequisites**
   - AWS Account with EC2 access
   - Docker installed
   - kubectl configured
   - Git repository setup

2. **Local Development**
   ```bash
   # Clone the repository
   git clone <repository-url>
   cd lugx-gaming-cloud
   
   # Build and run frontend locally
   cd frontend
   docker build -t lugx-frontend .
   docker run -p 8080:80 lugx-frontend
   ```

3. **Deployment**
   - See `runbook/runbook.md` for detailed deployment instructions

## Status

🚧 **Work in Progress** - This is a coursework project for CMM707 Cloud Computing module.

## Author

Student: Jenuk Giles
Module: CMM707 Cloud Computing
Institution: Informatics Institute of Technology

