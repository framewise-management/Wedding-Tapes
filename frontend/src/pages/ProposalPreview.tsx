import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiDelete, apiGet, apiPatch, apiPostFile } from '../api/client';
import ProposalSheet from '../components/ProposalSheet';
import type { Proposal, ProposalStatus } from '../types/proposal';
import type { Business } from '../types/business';
import './ProposalPreview.css';

const STATUSES: ProposalStatus[] = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'];

export default function ProposalPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shareOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [shareOpen]);

  async function handleStatusChange(newStatus: ProposalStatus) {
    if (!id) return;
    setStatusError('');
    try {
      const updated = await apiPatch<Proposal>(`/api/proposals/${id}/status`, { status: newStatus });
      setProposal(updated);
      setShareOpen(false);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  async function handleCopyLink() {
    if (!id) return;
    setStatusError('');
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/p/${id}`);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      if (proposal?.status === 'DRAFT') {
        const updated = await apiPatch<Proposal>(`/api/proposals/${id}/status`, { status: 'SENT' });
        setProposal(updated);
      }
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to copy link');
    }
  }

  async function handleDelete() {
    if (!id || !proposal) return;
    if (!confirm(`Delete proposal ${proposal.proposalNumber}? This can't be undone.`)) return;
    setDeleteError('');
    try {
      await apiDelete(`/api/proposals/${id}`);
      navigate('/proposals');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete proposal');
    }
  }

  async function handleDownloadPdf() {
    if (!id || !proposal) return;
    setDownloading(true);
    setDownloadError('');
    try {
      const blob = await apiPostFile(`/api/proposals/${id}/generate-pdf`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${proposal.proposalNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiGet<Proposal>(`/api/proposals/${id}`),
      apiGet<Business>('/api/business'),
    ])
      .then(([p, b]) => {
        setProposal(p);
        setBusiness(b);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load proposal'));
  }, [id]);

  if (error) return <p className="pv-error">{error}</p>;
  if (!proposal || !business) return <p>Loading…</p>;

  return (
    <div className="pv-container">
      <div className="pv-page-header">
        <Link to="/proposals" className="pv-back-link">← Back to proposals</Link>
        <div className="pv-header-actions">
          {statusError && <span className="pv-error">{statusError}</span>}
          {deleteError && <span className="pv-error">{deleteError}</span>}
          <span className={`pv-status-badge pv-status-${proposal.status.toLowerCase()}`}>
            {proposal.status}
          </span>
          {proposal.shareViewCount > 0 && (
            <span className="pv-view-count">
              Viewed {proposal.shareViewCount} time{proposal.shareViewCount === 1 ? '' : 's'}
            </span>
          )}
          {proposal.status === 'DRAFT' && (
            <Link to={`/proposals/${proposal.id}/edit`} className="pv-edit-link">Edit</Link>
          )}
          <button type="button" className="pv-edit-link pv-danger" onClick={handleDelete}>
            Delete
          </button>
          <div className="pv-share-wrap" ref={shareRef}>
            <button type="button" className="pv-download-btn" onClick={() => setShareOpen((v) => !v)}>
              Share
            </button>
            {shareOpen && (
              <div className="pv-share-menu">
                <button type="button" className="pv-share-menu-item" onClick={handleCopyLink}>
                  {linkCopied ? 'Link copied!' : 'Copy shareable link'}
                </button>
                <button
                  type="button"
                  className="pv-share-menu-item"
                  onClick={() => {
                    setShareOpen(false);
                    handleDownloadPdf();
                  }}
                  disabled={downloading}
                >
                  {downloading ? 'Generating…' : 'Download PDF'}
                </button>
                {downloadError && <p className="pv-error pv-share-error">{downloadError}</p>}
                <div className="pv-share-divider" />
                <p className="pv-share-label">Mark as</p>
                {STATUSES.filter((s) => s !== proposal.status).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="pv-share-menu-item"
                    onClick={() => handleStatusChange(s)}
                  >
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ProposalSheet proposal={proposal} business={business} />
    </div>
  );
}
