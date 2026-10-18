import { useEffect, useRef, useState } from 'react';
import { HIRING_MODES } from '../lib/hiringModes';
import './HiringModeDialog.css';

export default function useHiringModeDialog() {
  const [request, setRequest] = useState(null);
  const resolver = useRef(null);
  const dialog = useRef(null);
  useEffect(() => () => resolver.current?.(null), []);
  useEffect(() => { if (request) dialog.current.showModal(); }, [request]);
  function chooseHiringMode(candidate) {
    if (resolver.current) return Promise.resolve(null);
    setRequest(candidate);
    return new Promise(resolve => { resolver.current = resolve; });
  }
  function finish(mode) {
    resolver.current?.(mode);
    resolver.current = null;
    setRequest(null);
  }
  const modal = request ? <dialog ref={dialog} className="hiring-mode-dialog" aria-labelledby="hiring-mode-title" onCancel={event => { event.preventDefault(); finish(null); }}>
    <h2 id="hiring-mode-title">Place candidate · hiring mode</h2>
    <p>{request.name_snapshot || request.name || 'Candidate'} — choose the employer and fee structure for this project.</p>
    <div className="hiring-mode-options">{HIRING_MODES.map(mode => <button key={mode.id} type="button" onClick={() => finish(mode.id)}>
      <strong>{mode.label}</strong><span>Employer: {mode.employer}</span><b>${mode.hourlyFee}/hour · {mode.placementFee ? '$50 one-time placement' : 'No placement fee'}</b><span>{mode.description}</span>
    </button>)}</div>
    <button className="hiring-mode-cancel" type="button" onClick={() => finish(null)}>Cancel</button>
  </dialog> : null;
  return [chooseHiringMode, modal];
}
