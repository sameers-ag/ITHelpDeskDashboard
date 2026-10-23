import * as React from 'react';
import styles from './ItHelpDeskDashboard.module.scss';
import type { IItHelpDeskDashboardProps } from './IItHelpDeskDashboardProps';
import { ITicket, TicketPriority, TicketStatus, TicketCategory } from '../models/ITicket';
import { INITIAL_TICKETS } from '../data/mockTickets';

const STORAGE_KEY = 'spfx_it_helpdesk_tickets_v1';

const pad = (n: number): string => (n < 10 ? '0' : '') + n;
const formatDateTime = (d: Date): string => {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const ItHelpDeskDashboard: React.FC<IItHelpDeskDashboardProps> = (props) => {
  const { isDarkTheme, userDisplayName } = props;

  // State
  const [tickets, setTickets] = React.useState<ITicket[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return INITIAL_TICKETS;
  });

  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<string>('All');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('All');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('All');
  const [kpiFilter, setKpiFilter] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>('grid');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = React.useState<ITicket | null>(null);
  const [notification, setNotification] = React.useState<string | null>(null);

  // New Ticket Form State
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    category: 'Software' as TicketCategory,
    priority: 'Medium' as TicketPriority,
    requester: userDisplayName || 'Current User',
    requesterEmail: 'user@contoso.com',
    department: 'Operations'
  });

  // Save to local storage on change
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    } catch {
      // ignore storage errors
    }
  }, [tickets]);

  const showToast = (message: string): void => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // KPIs
  const stats = React.useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'Open').length;
    const inProgress = tickets.filter(t => t.status === 'In Progress').length;
    const critical = tickets.filter(t => t.priority === 'Critical' && t.status !== 'Closed' && t.status !== 'Resolved').length;
    const resolved = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
    const onTrackCount = tickets.filter(t => t.slaStatus !== 'breached').length;
    const slaRate = total > 0 ? Math.round((onTrackCount / total) * 100) : 100;

    return { total, open, inProgress, critical, resolved, slaRate };
  }, [tickets]);

  // Filtering
  const filteredTickets = React.useMemo(() => {
    return tickets.filter(ticket => {
      // KPI shortcut filter
      if (kpiFilter === 'open' && ticket.status !== 'Open') return false;
      if (kpiFilter === 'inProgress' && ticket.status !== 'In Progress') return false;
      if (kpiFilter === 'critical' && ticket.priority !== 'Critical') return false;
      if (kpiFilter === 'resolved' && (ticket.status !== 'Resolved' && ticket.status !== 'Closed')) return false;

      // Status
      if (statusFilter !== 'All' && ticket.status !== statusFilter) return false;

      // Priority
      if (priorityFilter !== 'All' && ticket.priority !== priorityFilter) return false;

      // Category
      if (categoryFilter !== 'All' && ticket.category !== categoryFilter) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          ticket.id.toLowerCase().includes(q) ||
          ticket.title.toLowerCase().includes(q) ||
          ticket.description.toLowerCase().includes(q) ||
          ticket.requester.toLowerCase().includes(q) ||
          ticket.department.toLowerCase().includes(q) ||
          ticket.assignedTo.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [tickets, kpiFilter, statusFilter, priorityFilter, categoryFilter, searchQuery]);

  // Handlers
  const handleCreateTicket = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Please provide a ticket title.');
      return;
    }

    const formattedDate = formatDateTime(new Date());
    const newId = `HD-${1000 + tickets.length + 1}`;

    const newTicket: ITicket = {
      id: newId,
      title: formData.title,
      description: formData.description,
      category: formData.category,
      priority: formData.priority,
      status: 'Open',
      requester: formData.requester,
      requesterEmail: formData.requesterEmail,
      department: formData.department,
      assignedTo: 'Tier-1 Service Desk',
      createdAt: formattedDate,
      updatedAt: formattedDate,
      slaDue: formData.priority === 'Critical' ? '2 hours remaining' : '8 hours remaining',
      slaStatus: 'on-track',
      commentsCount: 0
    };

    setTickets([newTicket, ...tickets]);
    setIsCreateModalOpen(false);
    setFormData({
      title: '',
      description: '',
      category: 'Software',
      priority: 'Medium',
      requester: userDisplayName || 'Current User',
      requesterEmail: 'user@contoso.com',
      department: 'Operations'
    });
    showToast(`Ticket ${newId} created successfully!`);
  };

  const updateTicketStatus = (ticketId: string, newStatus: TicketStatus): void => {
    const formattedDate = formatDateTime(new Date());

    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        const updated = {
          ...t,
          status: newStatus,
          updatedAt: formattedDate,
          slaDue: newStatus === 'Resolved' || newStatus === 'Closed' ? 'Resolved within SLA' : t.slaDue
        };
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(updated);
        }
        return updated;
      }
      return t;
    }));
    showToast(`Ticket ${ticketId} status updated to "${newStatus}"`);
  };

  const handleResetData = (): void => {
    if (confirm('Reset tickets back to default demo dataset?')) {
      setTickets(INITIAL_TICKETS);
      localStorage.removeItem(STORAGE_KEY);
      showToast('Demo dataset restored.');
    }
  };

  const handleExportCsv = (): void => {
    const headers = ['ID', 'Title', 'Category', 'Priority', 'Status', 'Requester', 'Department', 'AssignedTo', 'Created'];
    const rows = filteredTickets.map(t => [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      t.category,
      t.priority,
      t.status,
      `"${t.requester}"`,
      `"${t.department}"`,
      `"${t.assignedTo}"`,
      t.createdAt
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ITHelpDesk_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported tickets to CSV.');
  };

  return (
    <section className={`${styles.itHelpDeskDashboard} ${isDarkTheme ? styles.darkTheme : ''}`}>
      {/* Toast */}
      {notification && (
        <div className={styles.toastNotification}>
          <span>✓</span> {notification}
        </div>
      )}

      {/* Hero Header */}
      <div className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <div className={styles.systemBadge}>
            <span className={styles.pulseDot} />
            IT SERVICE OPERATIONS • ACTIVE
          </div>
          <h1 className={styles.headerTitle}>IT Help Desk Dashboard</h1>
          <p className={styles.headerSubtitle}>
            Welcome, <strong>{userDisplayName || 'IT Administrator'}</strong>. Monitor support tickets, SLA performance, and incident response.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={handleResetData} title="Reset demo tickets">
            ↺ Reset Demo
          </button>
          <button className={styles.btnSecondary} onClick={handleExportCsv} title="Export to CSV">
            ↓ Export CSV
          </button>
          <button className={styles.btnPrimary} onClick={() => setIsCreateModalOpen(true)}>
            + New Ticket
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className={styles.kpiGrid}>
        <div
          className={`${styles.kpiCard} ${kpiFilter === null ? styles.kpiActive : ''}`}
          onClick={() => setKpiFilter(null)}
        >
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Total Tickets</span>
            <div className={`${styles.kpiIconWrapper} ${styles.iconBlue}`}>📋</div>
          </div>
          <div className={styles.kpiValue}>{stats.total}</div>
          <div className={styles.kpiSubtext}>All logged requests</div>
        </div>

        <div
          className={`${styles.kpiCard} ${kpiFilter === 'open' ? styles.kpiActive : ''}`}
          onClick={() => setKpiFilter(kpiFilter === 'open' ? null : 'open')}
        >
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Open Queue</span>
            <div className={`${styles.kpiIconWrapper} ${styles.iconAmber}`}>⏳</div>
          </div>
          <div className={styles.kpiValue}>{stats.open}</div>
          <div className={styles.kpiSubtext}>Awaiting initial review</div>
        </div>

        <div
          className={`${styles.kpiCard} ${kpiFilter === 'inProgress' ? styles.kpiActive : ''}`}
          onClick={() => setKpiFilter(kpiFilter === 'inProgress' ? null : 'inProgress')}
        >
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>In Progress</span>
            <div className={`${styles.kpiIconWrapper} ${styles.iconPurple}`}>⚙️</div>
          </div>
          <div className={styles.kpiValue}>{stats.inProgress}</div>
          <div className={styles.kpiSubtext}>Actively being resolved</div>
        </div>

        <div
          className={`${styles.kpiCard} ${kpiFilter === 'critical' ? styles.kpiActive : ''}`}
          onClick={() => setKpiFilter(kpiFilter === 'critical' ? null : 'critical')}
        >
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Critical / Urgent</span>
            <div className={`${styles.kpiIconWrapper} ${styles.iconRose}`}>🔥</div>
          </div>
          <div className={styles.kpiValue}>{stats.critical}</div>
          <div className={styles.kpiSubtext}>High priority attention</div>
        </div>

        <div
          className={`${styles.kpiCard} ${kpiFilter === 'resolved' ? styles.kpiActive : ''}`}
          onClick={() => setKpiFilter(kpiFilter === 'resolved' ? null : 'resolved')}
        >
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>SLA Compliance</span>
            <div className={`${styles.kpiIconWrapper} ${styles.iconEmerald}`}>🛡️</div>
          </div>
          <div className={styles.kpiValue}>{stats.slaRate}%</div>
          <div className={styles.kpiSubtext}>{stats.resolved} resolved tickets</div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className={styles.controlsBar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by ID, title, user, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending User">Pending User</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            className={styles.filterSelect}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            className={styles.filterSelect}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Hardware">Hardware</option>
            <option value="Software">Software</option>
            <option value="Network & VPN">Network & VPN</option>
            <option value="Access & Security">Access & Security</option>
            <option value="Email & M365">Email & M365</option>
            <option value="Cloud & Server">Cloud & Server</option>
          </select>

          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
              onClick={() => setViewMode('grid')}
              title="Card Grid View"
            >
              ⊞ Grid
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === 'table' ? styles.viewBtnActive : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              ≡ Table
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredTickets.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔍</div>
          <h3>No matching tickets found</h3>
          <p>Try adjusting your search criteria or resetting the filters.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className={styles.ticketsGrid}>
          {filteredTickets.map(ticket => {
            const initials = ticket.requester.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={ticket.id} className={styles.ticketCard}>
                <div>
                  <div className={styles.ticketHeader}>
                    <span className={styles.ticketId}>{ticket.id}</span>
                    <span className={`${styles.priorityBadge} ${
                      ticket.priority === 'Critical' ? styles.priorityCritical :
                      ticket.priority === 'High' ? styles.priorityHigh :
                      ticket.priority === 'Medium' ? styles.priorityMedium :
                      styles.priorityLow
                    }`}>
                      {ticket.priority}
                    </span>
                  </div>

                  <h3 className={styles.ticketTitle} onClick={() => setSelectedTicket(ticket)}>
                    {ticket.title}
                  </h3>

                  <span className={styles.categoryPill}>{ticket.category}</span>

                  <p className={styles.ticketDesc}>{ticket.description}</p>

                  <div className={styles.ticketMetaRow}>
                    <div className={styles.requesterAvatar}>{initials}</div>
                    <div className={styles.requesterInfo}>
                      <span className={styles.requesterName}>{ticket.requester}</span>
                      <span className={styles.requesterDept}>{ticket.department}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.ticketFooter}>
                  <span className={`${styles.statusBadge} ${
                    ticket.status === 'Open' ? styles.statusOpen :
                    ticket.status === 'In Progress' ? styles.statusInProgress :
                    ticket.status === 'Pending User' ? styles.statusPendingUser :
                    ticket.status === 'Resolved' ? styles.statusResolved :
                    styles.statusClosed
                  }`}>
                    ● {ticket.status}
                  </span>

                  <div className={styles.cardActions}>
                    <button
                      className={styles.btnActionSmall}
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      Details
                    </button>
                    {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
                      <button
                        className={`${styles.btnActionSmall} ${styles.btnSuccess}`}
                        onClick={() => updateTicketStatus(ticket.id, 'Resolved')}
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className={styles.ticketsTableWrapper}>
          <table className={styles.ticketsTable}>
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Title</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Requester</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>SLA Due</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map(ticket => (
                <tr key={ticket.id}>
                  <td><strong>{ticket.id}</strong></td>
                  <td>
                    <span
                      style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 600 }}
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      {ticket.title}
                    </span>
                  </td>
                  <td><span className={styles.categoryPill}>{ticket.category}</span></td>
                  <td>
                    <span className={`${styles.priorityBadge} ${
                      ticket.priority === 'Critical' ? styles.priorityCritical :
                      ticket.priority === 'High' ? styles.priorityHigh :
                      ticket.priority === 'Medium' ? styles.priorityMedium :
                      styles.priorityLow
                    }`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td>
                    <div>{ticket.requester}</div>
                    <small style={{ color: '#64748b' }}>{ticket.department}</small>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${
                      ticket.status === 'Open' ? styles.statusOpen :
                      ticket.status === 'In Progress' ? styles.statusInProgress :
                      ticket.status === 'Pending User' ? styles.statusPendingUser :
                      ticket.status === 'Resolved' ? styles.statusResolved :
                      styles.statusClosed
                    }`}>
                      ● {ticket.status}
                    </span>
                  </td>
                  <td>{ticket.assignedTo}</td>
                  <td>
                    <span style={{
                      color: ticket.slaStatus === 'breached' ? '#e11d48' :
                             ticket.slaStatus === 'warning' ? '#d97706' : '#16a34a',
                      fontWeight: 600
                    }}>
                      {ticket.slaDue}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className={styles.btnActionSmall}
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        View
                      </button>
                      {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
                        <button
                          className={`${styles.btnActionSmall} ${styles.btnSuccess}`}
                          onClick={() => updateTicketStatus(ticket.id, 'Resolved')}
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Ticket Modal */}
      {isCreateModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCreateModalOpen(false)}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Create Support Ticket</h3>
              <button className={styles.closeBtn} onClick={() => setIsCreateModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateTicket}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>Ticket Subject *</label>
                  <input
                    type="text"
                    required
                    className={styles.formInput}
                    placeholder="e.g. Outlook crashing after password update"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Category</label>
                    <select
                      className={styles.formSelect}
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as TicketCategory })}
                    >
                      <option value="Hardware">Hardware</option>
                      <option value="Software">Software</option>
                      <option value="Network & VPN">Network & VPN</option>
                      <option value="Access & Security">Access & Security</option>
                      <option value="Email & M365">Email & M365</option>
                      <option value="Cloud & Server">Cloud & Server</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Priority</label>
                    <select
                      className={styles.formSelect}
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as TicketPriority })}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Requester Name</label>
                    <input
                      type="text"
                      required
                      className={styles.formInput}
                      value={formData.requester}
                      onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Department</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Description & Error Details</label>
                  <textarea
                    required
                    className={styles.formTextarea}
                    placeholder="Provide details about the issue, error codes, steps to reproduce..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnCancel} onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnSubmit}>
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Details Drawer */}
      {selectedTicket && (
        <div className={styles.drawerOverlay} onClick={() => setSelectedTicket(null)}>
          <div className={styles.detailsDrawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <span className={styles.ticketId}>{selectedTicket.id}</span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '18px' }}>{selectedTicket.title}</h3>
              </div>
              <button className={styles.closeBtn} onClick={() => setSelectedTicket(null)}>×</button>
            </div>

            <div className={styles.drawerBody}>
              <div className={styles.drawerField}>
                <div className={styles.drawerFieldLabel}>Status & Lifecycle</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <span className={`${styles.statusBadge} ${
                    selectedTicket.status === 'Open' ? styles.statusOpen :
                    selectedTicket.status === 'In Progress' ? styles.statusInProgress :
                    selectedTicket.status === 'Pending User' ? styles.statusPendingUser :
                    selectedTicket.status === 'Resolved' ? styles.statusResolved :
                    styles.statusClosed
                  }`}>
                    ● {selectedTicket.status}
                  </span>
                  <span className={`${styles.priorityBadge} ${
                    selectedTicket.priority === 'Critical' ? styles.priorityCritical :
                    selectedTicket.priority === 'High' ? styles.priorityHigh :
                    selectedTicket.priority === 'Medium' ? styles.priorityMedium :
                    styles.priorityLow
                  }`}>
                    {selectedTicket.priority} Priority
                  </span>
                </div>

                <div className={styles.statusChangeButtons}>
                  <button
                    className={styles.btnStatusAction}
                    onClick={() => updateTicketStatus(selectedTicket.id, 'In Progress')}
                  >
                    Set In Progress
                  </button>
                  <button
                    className={styles.btnStatusAction}
                    onClick={() => updateTicketStatus(selectedTicket.id, 'Pending User')}
                  >
                    Pending User
                  </button>
                  <button
                    className={styles.btnStatusAction}
                    onClick={() => updateTicketStatus(selectedTicket.id, 'Resolved')}
                  >
                    ✓ Mark Resolved
                  </button>
                  <button
                    className={styles.btnStatusAction}
                    onClick={() => updateTicketStatus(selectedTicket.id, 'Closed')}
                  >
                    Archive / Close
                  </button>
                </div>
              </div>

              <div className={styles.drawerField}>
                <div className={styles.drawerFieldLabel}>Issue Description</div>
                <div className={styles.drawerFieldValue} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                  {selectedTicket.description}
                </div>
              </div>

              <div className={styles.drawerField}>
                <div className={styles.drawerFieldLabel}>Requester Information</div>
                <div className={styles.drawerFieldValue}>
                  <strong>{selectedTicket.requester}</strong> ({selectedTicket.department})
                  <br />
                  <small style={{ color: '#64748b' }}>{selectedTicket.requesterEmail}</small>
                </div>
              </div>

              <div className={styles.drawerField}>
                <div className={styles.drawerFieldLabel}>Assignment & SLA</div>
                <div className={styles.drawerFieldValue}>
                  Assigned Engineer: <strong>{selectedTicket.assignedTo}</strong>
                  <br />
                  SLA Target: <strong>{selectedTicket.slaDue}</strong>
                  <br />
                  Created: <small>{selectedTicket.createdAt}</small>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setSelectedTicket(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ItHelpDeskDashboard;
