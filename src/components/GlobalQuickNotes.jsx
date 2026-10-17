import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import QuickNotes from "./QuickNotes";

// Lives outside route content so open notes and drafts survive navigation.
export default function GlobalQuickNotes() {
  const [userId, setUserId] = useState("");
  useEffect(() => {
    let active = true;
    let version = 0;
    async function refresh(user) {
      const current = ++version;
      if (!user) {
        if (active) setUserId("");
        return;
      }
      const { data, error } = await supabase.from("admin_permissions")
        .select("can_edit_workers,can_delete_workers").eq("user_id", user.id).maybeSingle();
      if (active && current === version) {
        setUserId(!error && (data?.can_edit_workers || data?.can_delete_workers) ? user.id : "");
      }
    }
    void supabase.auth.getSession().then(({ data }) => refresh(data.session?.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Run database lookups outside the auth callback's lock.
      queueMicrotask(() => { if (active) void refresh(session?.user); });
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  return userId ? <QuickNotes key={userId} userId={userId} /> : null;
}
