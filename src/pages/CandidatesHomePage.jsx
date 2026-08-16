import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowUpDown, Loader2, UserPlus, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import UtsTopNavBar from "../components/UtsTopNavBar";
import { matchesSearchQuery } from "../lib/search";
import { supabase } from "../lib/supabase";

export default function CandidatesHomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadCandidates = async () => {
      const { data, error: loadError } = await supabase
        .from("workers")
        .select("id,name,email,phone,state,status,created_at")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (loadError) setError(loadError.message || "Could not load candidates.");
      setCandidates(data || []);
      setLoading(false);
    };
    void loadCandidates();
    return () => { active = false; };
  }, []);

  const search = new URLSearchParams(location.search).get("q") || "";
  const sort = new URLSearchParams(location.search).get("sort") || "registered_desc";
  const filteredCandidates = useMemo(() => candidates.filter((candidate) =>
    matchesSearchQuery(
      search,
      [candidate.name, candidate.email, candidate.phone, candidate.state, candidate.status],
      [candidate.phone]
    )
  ).sort((a, b) => {
    if (sort === "name_asc") return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
    if (sort === "name_desc") return String(b.name || "").localeCompare(String(a.name || ""), undefined, { sensitivity: "base" });
    const aDate = new Date(a.created_at || 0).getTime();
    const bDate = new Date(b.created_at || 0).getTime();
    return sort === "registered_asc" ? aDate - bDate : bDate - aDate;
  }), [candidates, search, sort]);

  const changeSort = (nextSort) => {
    const params = new URLSearchParams(location.search);
    params.set("sort", nextSort);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  const openCandidate = (candidateId) => navigate(`/admin/workers/${candidateId}/details`);

  return (
    <div className="candidates-home-page">
      <style>{`
        .candidates-home-page { min-height: 100vh; background: #f4f6f8; color: #172033; font-family: Inter,ui-sans-serif,system-ui,sans-serif; }
        .candidates-home-shell { width: min(100% - 48px,1380px); margin: 0 auto; padding: 28px 0 54px; display: grid; gap: 20px; }
        .candidates-home-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
        .candidates-home-heading h1 { margin: 0; font-size: clamp(28px,4vw,38px); letter-spacing: -.035em; }
        .candidates-home-heading p { margin: 7px 0 0; color: #6b7b8f; }
        .candidates-add { border: 0; border-radius: 8px; padding: 11px 15px; display: inline-flex; align-items: center; gap: 8px; background: #2f6fed; color: white; font-weight: 800; cursor: pointer; white-space: nowrap; }
        .candidates-directory { overflow: hidden; border: 1px solid #dfe4ea; border-radius: 12px; background: white; box-shadow: 0 4px 18px rgba(15,23,42,.05); }
        .candidates-directory-head { padding: 19px; display: flex; align-items: center; justify-content: space-between; gap: 18px; border-bottom: 1px solid #dfe4ea; }
        .candidates-directory-head h2 { margin: 0; font-size: 19px; }
        .candidates-directory-head span { color: #76869a; font-size: 13px; }
        .candidates-sort { display: flex; align-items: center; gap: 8px; color: #526276; }
        .candidates-sort select { min-height: 38px; padding: 0 34px 0 11px; border: 1px solid #d6dde6; border-radius: 8px; background: white; color: #263548; font: inherit; font-size: 13px; font-weight: 750; cursor: pointer; }
        .candidates-list { display: grid; }
        .candidate-directory-columns,.candidate-directory-row { width: 100%; padding: 0 19px; display: grid; grid-template-columns: 52px minmax(150px,1fr) minmax(190px,1.2fr) minmax(130px,.8fr) minmax(100px,.6fr) minmax(110px,.6fr) 34px; align-items: center; gap: 14px; }
        .candidate-directory-columns { min-height: 42px; border-bottom: 1px solid #e4e8ed; background: #f8f9fb; color: #718096; font-size: 11px; font-weight: 850; letter-spacing: .06em; text-transform: uppercase; }
        .candidate-directory-row { min-height: 72px; border-bottom: 1px solid #edf0f3; background: white; }
        .candidate-directory-row:hover { background: #f7faff; }
        .candidate-directory-avatar { width: 40px; height: 40px; padding: 0; border: 0; border-radius: 50%; display: grid; place-items: center; background: #eaf1ff; color: #2f6fed; cursor: pointer; }
        .candidate-directory-name { min-width: 0; padding: 0; border: 0; background: transparent; color: #172033; font-weight: 850; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
        .candidate-directory-cell { min-width: 0; color: #5f7085; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
        .candidate-directory-status { width: fit-content; padding: 5px 9px; border-radius: 999px; color: #166534; background: #e8f8ef; border: 1px solid #b9ebce; font-size: 12px; font-weight: 800; text-transform: capitalize; }
        .candidate-directory-open { width: 34px; height: 34px; padding: 0; border: 0; border-radius: 8px; display: grid; place-items: center; background: transparent; color: #708095; cursor: pointer; }
        .candidate-directory-open:hover,.candidate-directory-avatar:hover,.candidate-directory-name:hover { color: #225fce; }
        .candidates-home-empty { min-height: 230px; display: grid; place-items: center; padding: 30px; color: #718096; text-align: center; }
        @media(max-width:980px){ .candidate-directory-columns,.candidate-directory-row{grid-template-columns:48px minmax(140px,1fr) minmax(150px,1fr) minmax(105px,.7fr) minmax(100px,.6fr) 34px}.candidate-directory-state,.candidate-directory-columns .state-column{display:none} }
        @media(max-width:700px){ .candidates-home-shell{width:min(100% - 24px,1380px);padding-top:20px}.candidates-home-heading,.candidates-directory-head{align-items:stretch;flex-direction:column}.candidate-directory-columns{display:none}.candidate-directory-row{padding:12px 14px;grid-template-columns:44px minmax(0,1fr) 34px;gap:10px}.candidate-directory-email,.candidate-directory-phone,.candidate-directory-state,.candidate-directory-status{display:none} }
      `}</style>
      <UtsTopNavBar />
      <main className="candidates-home-shell">
        <header className="candidates-home-heading">
          <div><h1>Candidates</h1><p>Select a candidate to open their complete record, documents, public profile, and CTS form.</p></div>
          <button className="candidates-add" type="button" onClick={() => window.open("/register", "_blank", "noopener,noreferrer")}><UserPlus size={17} /> Add candidate</button>
        </header>

        <section className="candidates-directory">
          <div className="candidates-directory-head">
            <div><h2>Candidate directory</h2><span>{filteredCandidates.length} result{filteredCandidates.length === 1 ? "" : "s"}</span></div>
            <label className="candidates-sort"><ArrowUpDown size={16} /><span>Sort by</span><select value={sort} onChange={(event) => changeSort(event.target.value)} aria-label="Sort candidates"><option value="registered_desc">Newest registered</option><option value="registered_asc">Oldest registered</option><option value="name_asc">Name A–Z</option><option value="name_desc">Name Z–A</option></select></label>
          </div>
          {loading ? <div className="candidates-home-empty"><span><Loader2 className="spin" size={22} /><br />Loading candidates...</span></div> : error ? <div className="candidates-home-empty" style={{ color: "#b91c1c" }}>{error}</div> : filteredCandidates.length ? (
            <div className="candidates-list">
              <div className="candidate-directory-columns" aria-hidden="true"><span>Image</span><span>Name</span><span>Email</span><span>Phone</span><span className="state-column">State</span><span>Status</span><span /></div>
              {filteredCandidates.map((candidate) => (
                <div key={candidate.id} className="candidate-directory-row">
                  <button className="candidate-directory-avatar" type="button" onClick={() => openCandidate(candidate.id)} aria-label={`Open ${candidate.name || "candidate"} details`}><UserRound size={20} /></button>
                  <button className="candidate-directory-name" type="button" onClick={() => openCandidate(candidate.id)}>{candidate.name || "Unnamed candidate"}</button>
                  <span className="candidate-directory-cell candidate-directory-email" title={candidate.email || ""}>{candidate.email || "—"}</span>
                  <span className="candidate-directory-cell candidate-directory-phone">{candidate.phone || "—"}</span>
                  <span className="candidate-directory-cell candidate-directory-state">{candidate.state || "—"}</span>
                  <span className="candidate-directory-status">{candidate.status === "completed" ? "Available" : candidate.status || "Available"}</span>
                  <button className="candidate-directory-open" type="button" onClick={() => openCandidate(candidate.id)} aria-label={`Open ${candidate.name || "candidate"} record`}><ArrowRight size={18} /></button>
                </div>
              ))}
            </div>
          ) : <div className="candidates-home-empty">No candidates match this search.</div>}
        </section>
      </main>
    </div>
  );
}
