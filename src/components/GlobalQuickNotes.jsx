import { useAccess } from "../lib/accessContext";
import QuickNotes from "./QuickNotes";

export default function GlobalQuickNotes() {
  const { access } = useAccess();
  return access?.isAdmin ? <QuickNotes key={access.user.id} userId={access.user.id} /> : null;
}
