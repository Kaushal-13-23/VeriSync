# VeriSync Prisma Database Layer

This directory holds the Prisma schema and database migrations for the VeriSync platform.

## Ownership

Owned by **Kaushal Kumar Singh (Dev A)**.

## Commands

### Generate Prisma Client

```bash
pnpm prisma generate
```

### Apply Migrations (Development)

```bash
pnpm prisma migrate dev --name <migration_name>
```

### Prisma Studio (DB Inspector UI)

```bash
pnpm prisma studio
```
