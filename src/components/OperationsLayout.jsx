import { Suspense, useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import UtsTopNavBar from "./UtsTopNavBar";

// Keep navigation mounted while only the current page loads or changes.
export default function OperationsLayout() {
  const { pathname } = useLocation();
  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [pathname]);
  return <>
    <UtsTopNavBar />
    <Suspense fallback={<div className="operations-view-loading" role="status">Loading view…</div>}>
      <Outlet />
    </Suspense>
  </>;
}
