# Redis Caching Implementation

This project uses Redis to cache high-frequency API responses and user session data, significantly improving performance and reducing database load.

## Configuration

Redis is configured in `app/core/redis.py` with the following settings:
- **Connection Pooling**: Uses `aioredis` connection pool to manage connections efficiently.
- **Timeouts**: 5-second connection and socket timeouts to prevent hanging requests.
- **Encoding**: UTF-8 encoding.
- **Serialization**: Uses `PickleCoder` to handle complex Python objects (like SQLAlchemy models).
- **Fallback**: The application will start even if Redis is unavailable, logging an error but continuing to function without caching.

## Caching Layers

### 1. API Response Caching
We use `fastapi-cache2` with a Redis backend to cache API responses.
- **Decorator**: `@cache(expire=..., namespace=..., key_builder=cache_key_builder)`
- **Key Builder**: A custom `cache_key_builder` ensures keys are unique per user (RBAC support) and request parameters, while safely handling non-serializable objects like DB sessions.

#### Cached Endpoints & Expiration Strategy

| Module | Endpoint | Expiration | Namespace |
|--------|----------|------------|-----------|
| **Reports** | `/reports/dashboard` | 60s | `reports` |
| | `/reports/revenue` | 600s | `reports` |
| | `/reports/team-performance` | 300s | `reports` |
| | `/reports/project-profitability` | 300s | `reports` |
| | `/reports/ticket-analytics` | 300s | `reports` |
| **Leads** | `/leads` | 60s | `leads` |
| | `/leads/pipeline/stats` | 300s | `leads` |
| **Tasks** | `/tasks` | 60s | `tasks` |
| **Clients** | `/clients` | 60s | `clients` |
| | `/clients/{id}` | 60s | `clients` |
| | `/clients/{id}/projects` | 60s | `clients` |
| **Projects** | `/projects` | 60s | `projects` |
| | `/projects/{id}` | 60s | `projects` |
| | `/projects/{id}/members` | 60s | `projects` |
| **Tickets** | `/tickets` | 60s | `tickets` |
| | `/tickets/{id}` | 60s | `tickets` |
| | `/tickets/{id}/comments` | 60s | `tickets` |
| **Invoices** | `/invoices` | 60s | `invoices` |
| | `/invoices/{id}` | 60s | `invoices` |
| | `/invoices/payments/list` | 60s | `invoices` |
| **Users** | `/users` | 60s | `users` |
| | `/users/roles` | 1 hour | `users` |

### 2. User Session Caching
The `get_current_user` dependency is optimized using `get_cached_user`.
- **Expiration**: 300s (5 minutes)
- **Mechanism**: Fetches user and eager-loads roles to avoid "detached instance" errors.
- **Benefit**: Reduces DB queries on every authenticated request from 1+ to 0 (cache hit).

## Invalidation Strategies

We employ a **Namespace-based Invalidation Strategy**. When a data modification event occurs (Create, Update, Delete), we invalidate the relevant cache namespace.

### Event-Driven Invalidation
- **Direct Invalidation**: Modifying a resource invalidates its own namespace (e.g., updating a Task invalidates `tasks`).
- **Cascading Invalidation**: Modifying resources that affect reports also invalidates the `reports` namespace.
    - **Leads** → `leads`
    - **Tasks** → `tasks`, `reports`
    - **Clients** → `clients`, `reports`
    - **Projects** → `projects`, `reports`
    - **Tickets** → `tickets`, `reports`
    - **Invoices** → `invoices`, `reports`
    - **Users** → `users`

## Monitoring

A monitoring endpoint is available at `/monitoring/redis/stats` (Admin only).
It provides:
- Connection status
- Memory usage
- Hit/Miss ratio
- Total keys
- Uptime

## Thread Safety & Performance

- **Thread Safety**: Uses `aioredis` which is designed for `asyncio` and is thread-safe.
- **Performance Benefits**:
    - **Latency**: API response times for cached endpoints expected to drop from 100-500ms (DB dependent) to <10ms (Redis).
    - **Throughput**: Significantly higher concurrent request handling capacity.
    - **DB Load**: Massive reduction in read operations, especially for the heavy Dashboard/Report queries.
