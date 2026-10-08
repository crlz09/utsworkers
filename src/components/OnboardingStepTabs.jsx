import { NavLink, useParams } from "react-router-dom";
import { FileCheck2, FlaskConical } from "lucide-react";
import "./OnboardingStepTabs.css";

export default function OnboardingStepTabs() {
  const { workerId = "" } = useParams();
  const base = workerId
    ? `/admin/workers/${workerId}/onboarding`
    : "/admin/onboarding";
  return (
    <nav className="onboarding-step-tabs" aria-label="Onboarding steps">
      <NavLink to={base} end>
        <FlaskConical size={18} /> Screening
      </NavLink>
      <NavLink to={`${base}/certs`}>
        <FileCheck2 size={18} /> Certs
      </NavLink>
    </nav>
  );
}
