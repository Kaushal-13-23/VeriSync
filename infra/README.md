# VeriSync Local Infrastructure

This directory contains local infrastructure services orchestrated via Docker Compose.

## Services

### PostgreSQL 16

The core relational database storing identity, candidate profiles, assessments, questions, attempts, answers, coding submissions, audit logs, and results.

### Starting Infrastructure

To start the database in detached mode:

```bash
docker compose -f infra/docker-compose.yml up -d
```

To verify the database healthcheck:

```bash
docker compose -f infra/docker-compose.yml ps
```

To stop infrastructure:

```bash
docker compose -f infra/docker-compose.yml down
```

To reset the database volume (clears all persistent data):

```bash
docker compose -f infra/docker-compose.yml down -v
```
