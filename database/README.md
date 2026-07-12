Database migrations

Apply the SQL migration files in the `database/migrations/` directory to your PostgreSQL instance. Example using `psql` with a connection string:

Windows PowerShell:

```powershell
$env:DATABASE_URL = "postgres://user:password@host:5432/dbname"
psql $env:DATABASE_URL -f "database/migrations/2026-06-18-add-session-meta.sql"
```

Unix/macOS:

```bash
export DATABASE_URL="postgres://user:password@host:5432/dbname"
psql "$DATABASE_URL" -f database/migrations/2026-06-18-add-session-meta.sql
```

If you're using a migration tool (e.g., Flyway, dbmate, knex, or a framework), integrate these SQL files accordingly. Make sure to run migrations in a backup/transactional context and test on staging first.
