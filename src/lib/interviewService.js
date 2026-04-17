import { supabase } from "./supabase";

export async function linkInterviewToWorker(interviewId, workerId) {
  const { data, error } = await supabase
    .from("candidate_interviews")
    .update({
      worker_id: workerId,
    })
    .eq("id", interviewId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function unlinkInterviewFromWorker(interviewId) {
  const { data, error } = await supabase
    .from("candidate_interviews")
    .update({
      worker_id: null,
      linked_at: null,
    })
    .eq("id", interviewId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getWorkerInterviews(workerId) {
  const { data, error } = await supabase
    .from("candidate_interviews")
    .select("*")
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function searchUnlinkedInterviews(searchText = "") {
  let query = supabase
    .from("candidate_interviews")
    .select("*")
    .is("worker_id", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (searchText?.trim()) {
    const q = searchText.trim();
    query = query.or(
      `candidate_name.ilike.%${q}%,position.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`
    );
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}