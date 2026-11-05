import { useSearchParams } from 'react-router-dom';
import { useAccess } from '../lib/accessContext';
import CandidateTopBar from '../components/CandidateTopBar';
import ContractorPaystubHistory from '../components/ContractorPaystubHistory';
import './PayrollPage.css';

export default function WorkerPaystubsPage() {
  const {access}=useAccess();
  const [params]=useSearchParams();
  const requested=params.get('statement')||'';
  const statementId=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requested)?requested:'';
  return <div className="paystub-portal"><CandidateTopBar workerName={access.worker?.name}/><main className="payroll-page"><header className="pay-header"><div><p className="pay-kicker">UNIVERSAL TALENT SOURCE</p><h1>My paystubs</h1><p className="pay-subtitle">View your final weekly 1099 statements and download a PDF for your records.</p></div></header><ContractorPaystubHistory employeeMode workerId={access.worker?.id} initialStatementId={statementId}/></main></div>;
}
