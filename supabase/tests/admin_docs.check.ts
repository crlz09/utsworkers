import { PGlite } from "npm:@electric-sql/pglite@0.3.14";
import assert from "node:assert/strict";

Deno.test(
  "admin library enforces authorization, combines sources, groups legacy types and paginates globally",
  async () => {
    const db = new PGlite();
    try {
      await db.exec(`
      create role anon; create role authenticated;
      create function public.can_manage_worker_documents() returns boolean language sql stable as $$ select coalesce(current_setting('request.admin',true),'false')='true' $$;
      create table workers(id uuid primary key,name text,email text);
      create table worker_documents(id uuid primary key,worker_id uuid,file_name text,file_path text,file_type text,file_size integer,document_type text,uploaded_at timestamptz);
      create table candidate_screenings(id uuid primary key,worker_id uuid,candidate_name text,recipient_email text,file_name text,file_path text,file_size integer,received_at timestamptz,confirmation_number text,result_file_name text,result_file_path text,result_received_at timestamptz);
      alter table workers enable row level security;
      alter table worker_documents enable row level security;
      alter table candidate_screenings enable row level security;
      create policy admins on workers for select to authenticated using(public.can_manage_worker_documents());
      create policy admins on worker_documents for select to authenticated using(public.can_manage_worker_documents());
      create policy admins on candidate_screenings for select to authenticated using(public.can_manage_worker_documents());
      grant select on workers,worker_documents,candidate_screenings to authenticated;
      insert into workers values ('00000000-0000-4000-8000-000000000001','Example Candidate','example@example.com');
      insert into worker_documents
      select gen_random_uuid(),'00000000-0000-4000-8000-000000000001','file-'||n||'.pdf','path-'||n,'application/pdf',100,
        case when n=1 then 'osha' when n=2 then 'OSHA Card - Front' when n=3 then 'OSHA Card - Back' when n=4 then 'Other: Lift training' when n=5 then 'other' else 'Resume' end,
        '2026-10-07'::timestamptz + n*interval '1 minute' from generate_series(1,1105) n;
      insert into candidate_screenings values (gen_random_uuid(),null,'Unlinked Candidate','unlinked@example.com','ePassport.pdf','epassport.pdf',100,now(),'AI123456', 'result.pdf','result.pdf',now());
    `);
      await db.exec(
        await Deno.readTextFile(
          new URL(
            "../migrations/20261007234600_admin_document_library.sql",
            import.meta.url,
          ),
        ),
      );
      await db.exec(
        await Deno.readTextFile(
          new URL(
            "../migrations/20261008000005_onboarding_certificates.sql",
            import.meta.url,
          ),
        ),
      );
      await db.exec(
        "update worker_documents set onboarding_cert_category='mewp',document_name='Client aerial lift course',document_type='MEWP' where file_name='file-6.pdf';",
      );
      await assert.rejects(
        () =>
          db.exec(
            "update worker_documents set onboarding_cert_category='invalid' where file_name='file-6.pdf'",
          ),
        /check constraint/,
      );
      await assert.rejects(
        () =>
          db.exec(
            "update worker_documents set document_name='' where file_name='file-6.pdf'",
          ),
        /check constraint/,
      );
      await assert.rejects(
        () =>
          db.exec(
            "update worker_documents set onboarding_cert_category=null where file_name='file-6.pdf'",
          ),
        /check constraint/,
      );
      await db.exec("set role anon;");
      await assert.rejects(
        () => db.query("select search_admin_documents()"),
        /permission denied/,
      );
      await db.exec(
        "reset role; set role authenticated; set request.admin='false';",
      );
      await assert.rejects(
        () => db.query("select search_admin_documents()"),
        /Administrator access required/,
      );
      await db.exec("set request.admin='true';");
      const search = async (query = "", category = "", page = 1) =>
        (
          await db.query<{ data: any }>(
            "select search_admin_documents($1,$2,$3) as data",
            [query, category, page],
          )
        ).rows[0].data;
      const named = await search("aerial lift");
      assert.equal(named.total, 1);
      assert.equal(
        named.documents[0].document_name,
        "Client aerial lift course",
      );
      assert.equal((await search("", "MEWP")).total, 1);
      const all = await search();
      assert.equal(all.total, 1107);
      assert.equal(all.documents.length, 50);
      assert.equal((await search("", "OSHA Card")).total, 3);
      assert.equal((await search("", "Others")).total, 2);
      assert.equal((await search("LIFT", "Others")).total, 1);
      assert.equal((await search("example@EXAMPLE.com")).total, 1105);
      const last = await search("", "", 23);
      assert.equal(last.documents.length, 7);
      const ids = new Set<string>();
      for (let page = 1; page <= 23; page++)
        for (const row of (await search("", "", page)).documents)
          ids.add(row.id);
      assert.equal(ids.size, 1107);
      const unlinked = await search("unlinked");
      assert.equal(unlinked.total, 2);
      assert.equal(unlinked.documents[0].bucket, "candidate-screenings");
      assert.equal(unlinked.documents[0].worker_id, null);
      assert.equal((await search("%' OR 1=1 --")).total, 0);
      assert.equal((await search("not found")).categories.length, 0);
      await assert.rejects(() => search("a".repeat(251)), /250 characters/);
      assert.equal((await search("", "", -10)).page, 1);
    } finally {
      await db.close();
    }
  },
);
