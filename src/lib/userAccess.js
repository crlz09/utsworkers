import { supabase } from "./supabase";

export async function getCurrentUserAccess() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError && userError.name !== "AuthSessionMissingError" && ![400, 401, 403].includes(userError.status)) throw userError;
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

  // Most sessions are staff/client sessions: resolve these permissions first.
  // Claiming a worker profile is reserved for actual candidate sessions.
  const [adminRes, clientRes] = await Promise.all([
    supabase.from("admin_permissions")
      .select("user_id, can_edit_workers, can_delete_workers")
      .eq("user_id", user.id).maybeSingle(),
    supabase.from("client_users")
      .select("user_id, client_name, recruiter_name, is_active, can_view_cts_jobs")
      .eq("user_id", user.id).eq("is_active", true).maybeSingle(),
  ]);
  if (adminRes.error || clientRes.error) throw adminRes.error || clientRes.error;
  const staff = !!adminRes.data?.can_edit_workers || !!adminRes.data?.can_delete_workers;
  let workerRes = { data: null };
  if (!staff && !clientRes.data?.can_view_cts_jobs) {
    await supabase.rpc("claim_current_worker_profile");
    workerRes = await supabase.from("workers")
      .select("id, name, email, auth_user_id").eq("auth_user_id", user.id).maybeSingle();
    if (workerRes.error) throw workerRes.error;
    if (!workerRes.data && user.email) {
      workerRes = await supabase.from("workers")
        .select("id, name, email, auth_user_id").ilike("email", user.email.replace(/[\\%_]/g, "\\$&"))
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (workerRes.error) throw workerRes.error;
    }
  }

  const client = clientRes.data || null;
  const worker = workerRes.data || null;
  const isClient = !!client?.can_view_cts_jobs;
  const isAdmin =
    !!adminRes.data?.can_edit_workers || !!adminRes.data?.can_delete_workers;
  const isWorker = !!worker?.id;

  return {
    user,
    permissions: adminRes.data || null,
    isAdmin,
    isClient,
    isWorker,
    client,
    worker,
  };
}
