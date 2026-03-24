import { useState, useCallback } from 'react';

const CORE_API_BASE = 'http://127.0.0.1:8789/api/core';
const EMAIL_API_BASE = 'http://127.0.0.1:8787/api/email';

export function useCoreData() {
  const [dashboardData, setDashboardData] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [emails, setEmails] = useState([]);
  const [syncActive, setSyncActive] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${CORE_API_BASE}/dashboard`);
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      const data = await res.json();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCompanies = useCallback(async (params = {}) => {
    try {
      const q = new URLSearchParams();
      if (params.q) q.set('q', params.q);
      if (params.min_employees !== undefined) q.set('min_employees', String(params.min_employees));
      if (params.target_only !== undefined) q.set('target_only', String(params.target_only));
      const url = `${CORE_API_BASE}/companies${q.toString() ? `?${q.toString()}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch companies');
      const data = await res.json();
      setCompanies(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch(`${CORE_API_BASE}/applications`);
      if (!res.ok) throw new Error('Failed to fetch applications');
      const data = await res.json();
      setApplications(data.items || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);
  
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${CORE_API_BASE}/tasks`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      setTasks(data || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const toggleTask = async (taskId) => {
    try {
      await fetch(`${CORE_API_BASE}/tasks/${taskId}/toggle`, { method: 'PATCH' });
      fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  return {
    dashboardData,
    companies,
    applications,
    tasks,
    emails,
    syncActive,
    error,
    loading,
    fetchDashboard,
    fetchCompanies,
    fetchApplications,
    fetchTasks,
    toggleTask,
    fetchLocalEmails: useCallback(async (jobOnly = true, search = '') => {
      try {
        setLoading(true);
        const res = await fetch(`${EMAIL_API_BASE}/list-local-inbox?job_only=${jobOnly ? 1 : 0}&q=${encodeURIComponent(search)}`);
        if (!res.ok) throw new Error('Failed to fetch local emails');
        const data = await res.json();
        setEmails(data.items || []);
        setSyncActive(data.syncActive || false);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, []),
    startEmailSync: async (config) => {
      try {
        setLoading(true);
        const res = await fetch(`${EMAIL_API_BASE}/start-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
        if (!res.ok) throw new Error('Failed to start sync');
        setSyncActive(true);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    stopEmailSync: async () => {
      try {
        await fetch(`${EMAIL_API_BASE}/stop-sync`, { method: 'POST' });
        setSyncActive(false);
      } catch (err) {
        setError(err.message);
      }
    },
    updateEmailStatus: async (id, status) => {
      try {
        await fetch(`${EMAIL_API_BASE}/local-inbox/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
      } catch (err) {
        setError(err.message);
      }
    },
    triggerManualSync: async () => {
      try {
        setLoading(true);
        const res = await fetch(`${EMAIL_API_BASE}/sync-now`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to trigger manual sync');
        return true;
      } catch (err) {
        setError(err.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    accounts: [],
    fetchAccounts: useCallback(async () => {
      try {
        setLoading(true);
        const res = await fetch(`${CORE_API_BASE}/accounts`);
        if (!res.ok) throw new Error('Failed to fetch accounts');
        const data = await res.json();
        return data;
      } catch (err) {
        setError(err.message);
        return [];
      } finally {
        setLoading(false);
      }
    }, []),
    addAccount: async (account) => {
      try {
        const res = await fetch(`${CORE_API_BASE}/accounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(account)
        });
        if (!res.ok) throw new Error('Failed to add account');
        return await res.json();
      } catch (err) {
        setError(err.message);
        return null;
      }
    },
    updateAccount: async (id, account) => {
      try {
        const res = await fetch(`${CORE_API_BASE}/accounts/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(account)
        });
        if (!res.ok) throw new Error('Failed to update account');
        return true;
      } catch (err) {
        setError(err.message);
        return false;
      }
    },
    deleteAccount: async (id) => {
      try {
        const res = await fetch(`${CORE_API_BASE}/accounts/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete account');
        return true;
      } catch (err) {
        setError(err.message);
        return false;
      }
    }
  };
}
