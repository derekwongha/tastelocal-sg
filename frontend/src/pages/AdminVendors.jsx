import React, { useMemo, useState, useEffect } from 'react';
import { getAdminVendors, approveVendor, rejectVendor } from '../api/administration';
import AdminSidebar from '../components/AdminSidebar';
import Breadcrumb from '../components/Breadcrumb';
import { AlertPanel, StatusBadge } from '../components/UIPrimitives';
import { cleanPublicLabel, cleanPublicNarrative } from '../utils/homepageDisplay';

const AdminVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('Pending'); // default to pending for actionability
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Inline confirmations states
  const [approveConfirmId, setApproveConfirmId] = useState(null);
  const [rejectConfirmId, setRejectConfirmId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchVendors = async () => {
    try {
      const data = await getAdminVendors();
      setVendors(data);
      const pendingData = data.filter(v => v.approval_status === 'Pending');
      if (pendingData.length > 0) {
        setSelectedVendor(pendingData[0]);
      } else if (data.length > 0) {
        setSelectedVendor(data[0]);
      }
    } catch (err) {
      console.error('Failed to load vendors:', err);
      setError('Could not load vendor profile records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleApprove = async (id, name) => {
    setError(null);
    setSuccessMsg(null);
    setActionLoadingId(id);
    try {
      await approveVendor(id);
      setSuccessMsg(`Vendor "${name}" has been approved successfully.`);
      setApproveConfirmId(null);
      await fetchVendors();
    } catch (err) {
      console.error(err);
      setError(`Failed to approve vendor "${name}".`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id, name) => {
    setError(null);
    setSuccessMsg(null);
    setActionLoadingId(id);
    try {
      await rejectVendor(id);
      setSuccessMsg(`Vendor "${name}" has been rejected.`);
      setRejectConfirmId(null);
      await fetchVendors();
    } catch (err) {
      console.error(err);
      setError(`Failed to reject vendor "${name}".`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const displayVendors = useMemo(() => vendors.map((vendor) => ({
    ...vendor,
    business_name: cleanPublicLabel(vendor.business_name || ''),
    full_name: cleanPublicLabel(vendor.full_name || ''),
    description: cleanPublicNarrative(vendor.description || ''),
    business_address: cleanPublicLabel(vendor.business_address || ''),
    user: vendor.user ? { ...vendor.user, full_name: cleanPublicLabel(vendor.user.full_name || '') } : vendor.user,
  })), [vendors]);
  const displaySelectedVendor = displayVendors.find((vendor) => vendor.vendor_profile_id === selectedVendor?.vendor_profile_id) || null;
  const filteredVendors = displayVendors.filter(v => {
    if (activeTab === 'All') return true;
    return v.approval_status === activeTab;
  });
  const pageCount = Math.max(1, Math.ceil(filteredVendors.length / pageSize));
  const pagedVendors = filteredVendors.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="sg-content-shell">
      {/* Top Breadcrumbs */}
      <Breadcrumb items={[
        { label: 'Admin Dashboard', path: '/admin/dashboard' },
        { label: 'Vendor Partners', path: '/admin/vendors' }
      ]} />

      <div className="row g-4">
        {/* Left Column: Admin Navigation Sidebar */}
        <div className="col-lg-3">
          <AdminSidebar />
        </div>

        {/* Right Columns */}
        <div className="col-lg-9">
          <div className="sg-surface p-4 mb-4">
            <span className="sg-eyebrow">Platform Administration</span>
            <h1 className="sg-page-title">Vendor Applications</h1>
            <p className="text-muted small mb-0">Approve or reject new vendor sign-up requests to authorize hosting permissions.</p>
          </div>

          {successMsg && (
            <div className="alert alert-success border-0 mb-4" role="alert">
              <strong>Success:</strong> {successMsg}
            </div>
          )}

          {error && (
            <div className="alert alert-danger border-0 mb-4" role="alert">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* WF17 Filter Tabs */}
          <div className="d-flex gap-2 mb-4">
            {['Pending', 'Approved', 'Rejected', 'All'].map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setCurrentPage(1);
                  setApproveConfirmId(null);
                  setRejectConfirmId(null);
                }}
                className={`btn btn-sm px-3 py-2 fw-semibold ${
                  activeTab === tab ? 'btn-danger text-white' : 'btn-outline-secondary text-muted bg-white'
                }`}
              >
                {tab} ({vendors.filter(v => v.approval_status === tab || (tab === 'All')).length})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="d-flex justify-content-center py-5">
              <div className="spinner-border text-danger" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="row g-4">
              {/* Center Panel: Applications Log Table */}
              <div className="col-xl-8">
                <div className="sg-table-card">
                  <h5 className="fw-bold text-dark mb-3">Applications Registry</h5>
                  {filteredVendors.length === 0 ? (
                    <p className="small text-muted text-center py-4">No vendor registrations found matching status.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead>
                          <tr className="text-muted small">
                            <th>Business</th>
                            <th>Applicant</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedVendors.map(vendor => {
                            const isSelected = selectedVendor?.vendor_profile_id === vendor.vendor_profile_id;
                            return (
                              <tr 
                                key={vendor.vendor_profile_id}
                                onClick={() => setSelectedVendor(vendor)}
                                className={`cursor-pointer ${isSelected ? 'table-danger' : ''}`}
                                style={{ cursor: 'pointer' }}
                              >
                                <td>
                                  <strong className="text-dark small d-block">{vendor.business_name}</strong>
                                  <span className="text-muted small">📞 {vendor.contact_number}</span>
                                </td>
                                <td className="small text-dark">{vendor.full_name || vendor.user?.full_name}</td>
                                <td>
                                  <StatusBadge status={vendor.approval_status} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {filteredVendors.length > pageSize && (
                    <div className="d-flex justify-content-between align-items-center mt-3 small text-muted">
                      <span>Page {currentPage} of {pageCount}</span>
                      <div className="btn-group btn-group-sm" aria-label="Application pages">
                        <button className="btn btn-outline-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(page => page - 1)}>Previous</button>
                        <button className="btn btn-outline-secondary" disabled={currentPage === pageCount} onClick={() => setCurrentPage(page => page + 1)}>Next</button>
                      </div>
                    </div>
                  )}
                </div>
                <AlertPanel tone="info" title="Application workflow" className="mt-4">
                  Approved vendors gain access to their vendor workspace. Rejected vendors remain restricted and are directed to their application status page.
                </AlertPanel>
              </div>

              {/* Right Panel: Detail Review Panel */}
              <div className="col-xl-4">
                <div className="sg-info-panel sticky-top" style={{ top: '88px' }}>
                  <h5 className="fw-bold text-dark mb-3 border-bottom pb-2">Application Details</h5>

                  {displaySelectedVendor ? (
                    <>
                      <div className="mb-3">
                        <span className="text-muted small d-block">Business Name</span>
                        <strong className="text-dark d-block">{displaySelectedVendor.business_name}</strong>
                      </div>

                      <div className="mb-3 border-top pt-2">
                        <span className="text-muted small d-block">Description / Stall Details</span>
                        <p className="small text-muted mb-0">{displaySelectedVendor.description || 'No business description details provided.'}</p>
                      </div>

                      <div className="mb-3 border-top pt-2">
                        <span className="text-muted small d-block">Stall Address</span>
                        <span className="small text-dark">{displaySelectedVendor.business_address}</span>
                      </div>

                      <div className="mb-3 border-top pt-2">
                        <span className="text-muted small d-block">Contact Info</span>
                        <span className="small text-dark d-block">📞 {selectedVendor.contact_number}</span>
                        <span className="small text-muted">✉️ {selectedVendor.user?.email}</span>
                      </div>

                      <div className="mb-4 border-top pt-2">
                        <span className="text-muted small d-block">Approval Status</span>
                        <StatusBadge status={selectedVendor.approval_status} />
                      </div>

                      {/* Approve / Reject Controls */}
                      {selectedVendor.approval_status === 'Pending' && (
                        <div className="border-top pt-3">
                          {actionLoadingId === selectedVendor.vendor_profile_id ? (
                            <div className="text-center">
                              <span className="spinner-border spinner-border-sm text-danger" />
                            </div>
                          ) : approveConfirmId === selectedVendor.vendor_profile_id ? (
                            <div className="d-flex gap-2">
                              <button 
                                onClick={() => handleApprove(selectedVendor.vendor_profile_id, displaySelectedVendor.business_name)}
                                className="btn btn-success btn-sm flex-grow-1"
                              >
                                Confirm Approve
                              </button>
                              <button onClick={() => setApproveConfirmId(null)} className="btn btn-light btn-sm">Cancel</button>
                            </div>
                          ) : rejectConfirmId === selectedVendor.vendor_profile_id ? (
                            <div className="d-flex gap-2">
                              <button 
                                onClick={() => handleReject(selectedVendor.vendor_profile_id, displaySelectedVendor.business_name)}
                                className="btn btn-danger btn-sm flex-grow-1"
                              >
                                Confirm Reject
                              </button>
                              <button onClick={() => setRejectConfirmId(null)} className="btn btn-light btn-sm">Cancel</button>
                            </div>
                          ) : (
                            <div className="d-flex flex-column gap-2">
                              <button 
                                onClick={() => setApproveConfirmId(selectedVendor.vendor_profile_id)}
                                className="btn btn-success btn-sm"
                              >
                                Approve Application
                              </button>
                              <button 
                                onClick={() => setRejectConfirmId(selectedVendor.vendor_profile_id)}
                                className="btn btn-outline-danger btn-sm"
                              >
                                Reject Application
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="small text-muted text-center py-4">Select an application row to view detail properties.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminVendors;
