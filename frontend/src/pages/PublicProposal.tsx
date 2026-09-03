import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiGet, apiGetFile } from '../api/client';
import ProposalSheet from '../components/ProposalSheet';
import type { Proposal } from '../types/proposal';
import type { Business } from '../types/business';
import './ProposalPreview.css';
import './PublicProposal.css';

export default function PublicProposal() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ proposal: Proposal; business: Business } | null>(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const fetchedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id || fetchedIdRef.current === id) return;
    fetchedIdRef.current = id;
    apiGet<{ proposal: Proposal; business: Business }>(`/api/public/proposals/${id}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'This link is no longer valid'));
  }, [id]);

  async function handleDownloadPdf() {
    if (!id || !data) return;
    setDownloading(true);
    setDownloadError('');
    try {
      const blob = await apiGetFile(`/api/public/proposals/${id}/pdf`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.proposal.proposalNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  }

  if (error) return <p className="pp-notice">{error}</p>;
  if (!data) return <p className="pp-notice">Loading…</p>;

  return (
    <div className="pp-page">
      <div className="pv-container">
        <div className="pp-header">
          {downloadError && <span className="pv-error">{downloadError}</span>}
          <button type="button" className="pv-download-btn" onClick={handleDownloadPdf} disabled={downloading}>
            {downloading ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
        <ProposalSheet proposal={data.proposal} business={data.business} />
      </div>
    </div>
  );
}
