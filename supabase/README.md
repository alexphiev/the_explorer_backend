# Local Development with Supabase

This guide outlines the steps to set up Supabase locally and manage database migrations.

## Prerequisites

- Docker: Ensure Docker is installed and running on your machine.
- Supabase CLI: Install the Supabase CLI using Homebrew with the command `brew install supabase/tap/supabase`.

## Setting Up Supabase Locally

1. **Initialize Supabase Project:** Run `supabase init` to create a new Supabase project locally. This command sets up the necessary Docker containers for the database, Auth, and storage.

2. **Start Supabase:** Use `supabase start` to start the local Supabase instance. This will boot up all the required services.

3. **Pull database schema:** To pull the database schema from your Supabase project, run `supabase db pull`. This command will fetch the schema from your Supabase project and apply it to your local database.

4. *Dump production data:* If you want to dump the production data to your local database, you can use `supabase db dump -f supabase/seed.sql --data-only`. This command will fetch the data from your Supabase project and populate a `seed.sql` file.

5. **Apply Migrations and Seed Data:** To apply the migrations and seed data to your local database, run `supabase db reset`. This will remove all existing data.

## Managing Migrations

1. **Create a New Migration:** To create a new migration file, run `supabase migration new <migration_name>`. This will generate a new SQL file in the `supabase/migrations` directory where you can define your schema changes.

2. **Apply Migrations:** To apply migrations to your local database, use `supabase migration up`. This command runs all pending migrations.

## Supabase Edge functions

1. **Create a new Edge function:** To create a new Edge function, run `supabase functions new <function_name>`. This will generate a new Edge function file in the `supabase/functions` directory where you can define your function logic.

2. **Run Edge functions locally:** To run Edge functions locally, use `supabase functions serve`. This command will start a local server to test your Edge functions.

3. **Deploy Edge functions:** To deploy Edge functions to your Supabase project, use `supabase functions deploy`. This command will deploy your Edge functions to your Supabase project.