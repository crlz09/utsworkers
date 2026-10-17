import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { getCurrentUserAccess } from "../lib/userAccess";
import { AccessContext } from "../lib/accessContext";

// One session/access owner for route guards, navigation and floating notes.
export default function AccessProvider({ children }) {
  const [state, setState] = useState({ checking: true, access: null, error: "" });
  const refreshRef = useRef(null);
  const refresh = useCallback(() => refreshRef.current?.(), []);
  useEffect(() => {
    let active = true;
    let generation = 0;
    let identity;
    let pending;
    let checkedAt = 0;
    const load = () => {
      if (pending) return pending;
      const version = ++generation;
      pending = getCurrentUserAccess().then(access => {
        if (active && version === generation) {
          identity = access.user?.id || null;
          checkedAt = Date.now();
          setState({ checking: false, access, error: "" });
          return access;
        }
        return null;
      }).catch(error => {
        if (active && version === generation)
          setState(previous => ({ ...previous, checking: false, error: error.message || "Could not check access." }));
      }).finally(() => { if (version === generation) pending = null; });
      return pending;
    };
    refreshRef.current = load;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // No Supabase API calls inside the synchronous auth callback.
      const nextIdentity = session?.user.id || null;
      if (event === "SIGNED_OUT") {
        ++generation;
        pending = null;
        identity = null;
        setState({ checking: false, access: null, error: "" });
      } else if (nextIdentity !== identity || event === "USER_UPDATED") {
        if (identity !== undefined && nextIdentity !== identity) {
          ++generation;
          pending = null;
          setState({ checking: true, access: null, error: "" });
        }
        identity = nextIdentity;
        setTimeout(() => { if (active) void load(); }, 0);
      }
    });
    const revalidate = () => {
      if (!document.hidden && Date.now() - checkedAt > 60000) void load();
    };
    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidate);
    const timer = setInterval(revalidate, 60000);
    void load();
    return () => { active = false; ++generation; subscription.unsubscribe(); refreshRef.current = null;
      clearInterval(timer); window.removeEventListener("focus", revalidate); document.removeEventListener("visibilitychange", revalidate); };
  }, []);
  return <AccessContext.Provider value={{ ...state, refresh }}>{children}</AccessContext.Provider>;
}
