import { supabase } from "./supabase";

export async function getCurrentUserAccess() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      user: null,
      isAdmin: false,
      isClient: false,
      isWorker: false,
      client: null,
      worker: null,
    };
  }

  // Claims an existing candidate profile after the email has been verified.
  // Admin/client accounts simply receive a no-profile error, which is intentionally ignored.
  await supabase.rpc("claim_current_worker_profile");

  let workerRes = await supabase
    .from("workers")
    .select("id, name, email, auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!workerRes.data && user.email) {
    workerRes = await supabase
      .from("workers")
      .select("id, name, email, auth_user_id")
      .ilike("email", user.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
  }

  const [adminRes, clientRes] = await Promise.all([
    supabase
      .from("admin_permissions")
      .select("user_id, can_edit_workers, can_delete_workers")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("client_users")
      .select("user_id, client_name, recruiter_name, is_active, can_view_cts_jobs")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const client = clientRes.data || null;
  const worker = workerRes.data || null;
  const isClient = !!client?.can_view_cts_jobs;
  const isAdmin =
    !!adminRes.data?.can_edit_workers || !!adminRes.data?.can_delete_workers;
  const isWorker = !!worker?.id;

  return {
    user,
    isAdmin,
    isClient,
    isWorker,
    client,
    worker,
  };
}
