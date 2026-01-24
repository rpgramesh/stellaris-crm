# Deploying to Google Cloud Run

This guide details the steps to deploy the CRM Portal (Frontend + Backend) to Google Cloud Run.

## Prerequisites

1.  **Google Cloud Project**: Create a project in the [Google Cloud Console](https://console.cloud.google.com/).
2.  **Billing Enabled**: Ensure billing is enabled for your project.
3.  **gcloud CLI**: Install and authenticate the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install).
4.  **APIs Enabled**: Enable the following APIs:
    *   Cloud Run API
    *   Artifact Registry API
    *   Cloud Build API
    *   Cloud SQL Admin API (if using Cloud SQL)
    *   Redis API (if using Memorystore)

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com sqladmin.googleapis.com redis.googleapis.com
```

## Step 1: Set Up Infrastructure (Database & Redis)

### 1. Cloud SQL (PostgreSQL)
Create a PostgreSQL instance for the backend.

```bash
# Create instance
gcloud sql instances create crm-db-instance \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1

# Create database
gcloud sql databases create crm_db --instance=crm-db-instance

# Set password for 'postgres' user
gcloud sql users set-password postgres \
    --instance=crm-db-instance \
    --password='YOUR_DB_PASSWORD'
```

*Note: For production, use a private IP and VPC connector. For simplicity, this guide assumes public IP (allow 0.0.0.0/0 for testing or configure authorized networks).*

### 2. Redis (Memorystore)
Create a Redis instance for caching.

```bash
gcloud redis instances create crm-cache \
    --size=1 \
    --region=us-central1 \
    --redis-version=redis_6_x
```

Get the Redis Host/IP:
```bash
gcloud redis instances describe crm-cache --region=us-central1 --format='value(host)'
```

## Step 2: Build and Deploy Backend

1.  **Create Artifact Registry Repository** (to store docker images)

    ```bash
    gcloud artifacts repositories create crm-repo \
        --repository-format=docker \
        --location=us-central1
    ```

2.  **Build Backend Image**

    ```bash
    cd backend
    gcloud builds submit --tag us-central1-docker.pkg.dev/PROJECT_ID/crm-repo/backend:v1 .
    cd ..
    ```
    *(Replace `PROJECT_ID` with your actual project ID)*

3.  **Deploy Backend to Cloud Run**

    ```bash
    gcloud run deploy crm-backend \
        --image us-central1-docker.pkg.dev/PROJECT_ID/crm-repo/backend:v1 \
        --platform managed \
        --region us-central1 \
        --allow-unauthenticated \
        --set-env-vars="DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@DB_HOST_IP/crm_db" \
        --set-env-vars="REDIS_URL=redis://REDIS_HOST_IP:6379/0" \
        --set-env-vars="SECRET_KEY=YOUR_SECURE_SECRET_KEY" \
        --set-env-vars="CORS_ORIGINS=*"
    ```

    *   Replace `DB_HOST_IP` with your Cloud SQL public IP.
    *   Replace `REDIS_HOST_IP` with your Redis instance IP.
    *   `CORS_ORIGINS=*` allows all origins initially. Once the frontend is deployed, update this to the specific frontend URL.

    **Copy the Backend URL** from the output (e.g., `https://crm-backend-xyz.a.run.app`).

## Step 3: Build and Deploy Frontend

1.  **Build Frontend Image**

    ```bash
    gcloud builds submit --tag us-central1-docker.pkg.dev/PROJECT_ID/crm-repo/frontend:v1 .
    ```

2.  **Deploy Frontend to Cloud Run**

    ```bash
    gcloud run deploy crm-frontend \
        --image us-central1-docker.pkg.dev/PROJECT_ID/crm-repo/frontend:v1 \
        --platform managed \
        --region us-central1 \
        --allow-unauthenticated \
        --set-env-vars="API_URL=https://crm-backend-xyz.a.run.app"
    ```

    *   Replace the `API_URL` value with your actual **Backend URL** from Step 2.

## Step 4: Final Configuration

1.  **Initialize Database**
    You can run a one-off job or connect locally to initialize the schema. Since the backend attempts to create tables on startup (`startup_db` in `main.py`), the tables should already be created when the backend service started.

2.  **Update CORS (Optional but Recommended)**
    Update the backend to only allow the frontend URL.

    ```bash
    gcloud run services update crm-backend \
        --update-env-vars="CORS_ORIGINS=https://crm-frontend-xyz.a.run.app"
    ```

## Troubleshooting

*   **503 Service Unavailable**: Check Cloud Run logs. Usually implies the container failed to start (e.g., DB connection failed).
*   **Database Connection**: Ensure Cloud Run can reach Cloud SQL. If using Public IP, ensure the instance allows connections. For Private IP, you need a VPC Connector.
