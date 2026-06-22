import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Search, ChevronLeft, ChevronRight, Filter,
  Loader2, UserCheck, UserX, Shield, Heart, Stethoscope, Calendar
} from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiClient } from '@/context/AuthContext';

const ROLE_CONFIG = {
  admin: { color: '#f472b6', bg: 'rgba(244,114,182,0.12)', icon: Shield },
  caretaker: { color: 'var(--purple-light)', bg: 'rgba(167,139,250,0.12)', icon: Stethoscope },
  patient: { color: 'var(--cyan)', bg: 'rgba(0,212,255,0.1)', icon: Heart },
};

export default function AdminUserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});
  const [hoveredRow, setHoveredRow] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (roleFilter) params.role = roleFilter;
      if (searchQuery) params.search = searchQuery;
      const { data } = await apiClient.get('/admin/users/', { params });
      setUsers(data.users || []);
      setMeta({
        total: data.total_count,
        pages: data.total_pages,
        current: data.current_page,
        hasNext: data.has_next,
        hasPrev: data.has_previous,
      });
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (value) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleRoleChange = (value) => {
    setRoleFilter(value);
    setPage(1);
  };

  const handleRowClick = (user) => {
    if (user.role === 'patient') {
      navigate(`/admin/patient/${user.id}`);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRoleConfig = (role) => ROLE_CONFIG[role] || ROLE_CONFIG.patient;

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} color="var(--cyan)" />
          </div>
          <div>
            <h1 className="font-syne" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>User Management</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manage and monitor all platform users</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="var(--cyan)" />
            </div>
            <div>
              <div className="font-syne" style={{ fontSize: 24, fontWeight: 800, color: 'var(--cyan)' }}>{meta.total || 0}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Users</div>
            </div>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,255,157,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={18} color="var(--emerald)" />
            </div>
            <div>
              <div className="font-syne" style={{ fontSize: 24, fontWeight: 800, color: 'var(--emerald)' }}>{users.filter(u => u.is_active).length}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active (page)</div>
            </div>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserX size={18} color="#ef4444" />
            </div>
            <div>
              <div className="font-syne" style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>{users.filter(u => !u.is_active).length}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Inactive (page)</div>
            </div>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(167,139,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Filter size={18} color="var(--purple-light)" />
            </div>
            <div>
              <div className="font-syne" style={{ fontSize: 24, fontWeight: 800, color: 'var(--purple-light)' }}>{meta.pages || 1}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Pages</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 220, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', transition: 'border-color 0.2s' }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or email..."
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 14, width: '100%', fontFamily: 'inherit' }}
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => handleRoleChange(e.target.value)}
            style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', cursor: 'pointer', fontFamily: 'inherit', minWidth: 140 }}
          >
            <option value="">All Roles</option>
            <option value="patient">Patient</option>
            <option value="caretaker">Caretaker</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 }}>
            <Loader2 size={24} color="var(--cyan)" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading users...</span>
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <Users size={32} color="var(--text-muted)" strokeWidth={1} />
                        <span style={{ fontSize: 15 }}>No users found</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Try adjusting your search or filter</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const roleConf = getRoleConfig(u.role);
                    const isPatient = u.role === 'patient';
                    const isHovered = hoveredRow === u.id;
                    return (
                      <tr
                        key={u.id}
                        onClick={() => handleRowClick(u)}
                        onMouseEnter={() => setHoveredRow(u.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          cursor: isPatient ? 'pointer' : 'default',
                          transition: 'background 0.2s',
                          background: isHovered && isPatient ? 'rgba(0,212,255,0.06)' : 'transparent',
                        }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, ${roleConf.color}40, ${roleConf.color}20)`, border: `1px solid ${roleConf.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: roleConf.color }}>
                                {(u.full_name || u.username || '?')[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{u.full_name || u.username}</div>
                              {isPatient && isHovered && (
                                <div style={{ fontSize: 11, color: 'var(--cyan)', marginTop: 1 }}>Click to view profile →</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{u.email}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: roleConf.bg, color: roleConf.color, textTransform: 'capitalize', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <roleConf.icon size={11} />
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: u.is_active ? 'var(--emerald)' : 'var(--text-muted)', display: 'inline-block', boxShadow: u.is_active ? '0 0 8px rgba(0,255,157,0.4)' : 'none' }} />
                            <span style={{ fontSize: 13, fontWeight: 500, color: u.is_active ? 'var(--emerald)' : 'var(--text-muted)' }}>
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={12} color="var(--text-muted)" />
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatDate(u.created_at)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {meta.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Page {meta.current} of {meta.pages} · {meta.total} total users
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    disabled={!meta.hasPrev}
                    onClick={() => setPage((p) => p - 1)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '7px 14px', borderRadius: 8,
                      background: meta.hasPrev ? 'rgba(0,212,255,0.08)' : 'transparent',
                      border: `1px solid ${meta.hasPrev ? 'rgba(0,212,255,0.2)' : 'var(--border)'}`,
                      color: meta.hasPrev ? 'var(--cyan)' : 'var(--text-muted)',
                      cursor: meta.hasPrev ? 'pointer' : 'not-allowed',
                      fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                      transition: 'all 0.2s',
                    }}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <button
                    disabled={!meta.hasNext}
                    onClick={() => setPage((p) => p + 1)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '7px 14px', borderRadius: 8,
                      background: meta.hasNext ? 'rgba(0,212,255,0.08)' : 'transparent',
                      border: `1px solid ${meta.hasNext ? 'rgba(0,212,255,0.2)' : 'var(--border)'}`,
                      color: meta.hasNext ? 'var(--cyan)' : 'var(--text-muted)',
                      cursor: meta.hasNext ? 'pointer' : 'not-allowed',
                      fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                      transition: 'all 0.2s',
                    }}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select option { background: var(--bg-secondary); color: var(--text-primary); }
      `}</style>
    </AdminLayout>
  );
}
