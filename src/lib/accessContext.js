import { createContext, useContext } from "react";

export const AccessContext = createContext(null);
export function useAccess() {
  const value = useContext(AccessContext);
  if (!value) throw new Error("useAccess requires AccessProvider");
  return value;
}
