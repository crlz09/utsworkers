import { PGlite } from "npm:@electric-sql/pglite@0.3.14";
import assert from "node:assert/strict";

Deno.test(
  "migration executes and keeps orders, result PDFs, and sync credentials private",
  async () => {
    const db = new PGlite();
    try {
      await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create table public.workers(id uuid primary key);
      create function public.can_manage_worker_documents() returns boolean language sql stable as $$ select current_setting('request.admin', true) = 'true' $$;
      create schema storage;
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit integer, allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
      alter table storage.objects enable row level security;
      grant usage on schema storage to anon, authenticated, service_role;
      grant all on storage.objects to anon, authenticated, service_role;
      create policy old_broad_read on storage.objects for select to anon, authenticated using (true);
      create policy old_broad_write on storage.objects for all to authenticated using (true) with check (true);
    `);
      await db.exec(
        await Deno.readTextFile(
          new URL(
            "../migrations/20261007231153_candidate_screening_onboarding.sql",
            import.meta.url,
          ),
        ),
      );
      await db.exec(
        await Deno.readTextFile(
          new URL(
            "../migrations/20261007231437_screening_access_and_indexes.sql",
            import.meta.url,
          ),
        ),
      );
      const worker = "00000000-0000-4000-8000-000000000002",
        actor = "00000000-0000-4000-8000-000000000001";
      await db.exec(
        `insert into auth.users values ('${actor}'); insert into workers values ('${worker}');`,
      );
      const { rows } = await db.query<{
        id: string;
        updated_at: string;
      }>(`insert into candidate_screenings(source,confirmation_number,file_path,file_name,file_sha256,file_size,created_by)
      values ('manual','AI123456789AB','order/order.pdf','order.pdf','abc',20,'${actor}') returning id,updated_at::text`);
      const id = rows[0].id;
      assert.equal(
        (await db.query("select * from candidate_screening_events")).rows
          .length,
        1,
      );
      await assert.rejects(
        () =>
          db.exec(
            `insert into candidate_screenings(source,confirmation_number,file_path,file_name,file_sha256,file_size) values ('manual','AI123456789AB','other.pdf','other.pdf','abc',20)`,
          ),
        /unique/,
      );
      await assert.rejects(
        () =>
          db.exec(
            `update candidate_screenings set worker_id='${worker}' where id='${id}'`,
          ),
        /check constraint/,
      );
      await db.exec(
        `update candidate_screenings set worker_id='${worker}', identity_verified_at=now(), identity_verified_by='${actor}' where id='${id}';`,
      );
      const stale = await db.query(
        `update candidate_screenings set lab_name='Wrong' where id=$1 and updated_at=$2 returning id`,
        [id, rows[0].updated_at],
      );
      assert.equal(stale.rows.length, 0);
      await assert.rejects(
        () =>
          db.exec(
            `update candidate_screenings set result_received_at=now() where id='${id}'`,
          ),
        /check constraint/,
      );
      await db.exec(
        `insert into storage.objects(bucket_id,name) values ('candidate-screenings','order/order.pdf'), ('candidate-screenings','order/result.pdf'), ('other','public.pdf');`,
      );
      await db.exec("set role authenticated; set request.admin = 'false';");
      assert.equal(
        (await db.query("select * from candidate_screenings")).rows.length,
        0,
      );
      assert.equal(
        (await db.query("select * from candidate_screening_events")).rows
          .length,
        0,
      );
      assert.equal(
        (
          await db.query(
            "select * from storage.objects where bucket_id='candidate-screenings'",
          )
        ).rows.length,
        0,
      );
      await assert.rejects(
        () => db.query("select * from screening_sync_state"),
        /permission denied/,
      );
      await db.exec("set request.admin = 'true';");
      assert.equal(
        (await db.query("select * from candidate_screenings")).rows.length,
        1,
      );
      assert.equal(
        (
          await db.query(
            "select * from storage.objects where bucket_id='candidate-screenings'",
          )
        ).rows.length,
        2,
      );
      await assert.rejects(
        () =>
          db.exec(
            `update candidate_screenings set lab_name='Unauthorized' where id='${id}'`,
          ),
        /permission denied/,
      );
      await assert.rejects(
        () =>
          db.exec(
            "insert into storage.objects(bucket_id,name) values ('candidate-screenings','bad.pdf')",
          ),
        /row-level security/,
      );
      assert.equal(
        (
          await db.query(
            "delete from storage.objects where bucket_id='candidate-screenings' returning id",
          )
        ).rows.length,
        0,
      );
      await db.exec("reset role; set role anon;");
      await assert.rejects(
        () => db.query("select * from candidate_screenings"),
        /permission denied/,
      );
      assert.equal(
        (
          await db.query(
            "select * from storage.objects where bucket_id='candidate-screenings'",
          )
        ).rows.length,
        0,
      );
      await db.exec("reset role; set role service_role;");
      assert.equal(
        (await db.query("select * from candidate_screenings")).rows.length,
        1,
      );
    } finally {
      await db.close();
    }
  },
);
