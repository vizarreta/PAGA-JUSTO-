import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('paga-justo-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('paga-justo-token');
      localStorage.removeItem('paga-justo-user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  challenge: (publicKey: string) => api.post('/auth/challenge', { publicKey }),
  verify: (data: { publicKey: string; signature: string; nonce: string }) =>
    api.post('/auth/verify', data),
  me: () => api.get('/auth/me'),
};

export const agreementsApi = {
  create: (data: any) => api.post('/agreements', data),
  list: (address: string) => api.get('/agreements', { params: { address } }),
  get: (id: string) => api.get(`/agreements/${id}`),
  fund: (id: string, client: string) => api.post(`/agreements/${id}/fund`, { client }),
  submitMilestone: (id: string, index: number, data: any) =>
    api.post(`/agreements/${id}/milestones/${index}/submit`, data),
  requestChanges: (id: string, index: number, client: string) =>
    api.post(`/agreements/${id}/milestones/${index}/changes`, { client }),
  approveMilestone: (id: string, index: number, data: { client: string; txHash: string }) =>
    api.post(`/agreements/${id}/milestones/${index}/approve`, data),
  openResolution: (id: string, address: string) =>
    api.post(`/agreements/${id}/resolution`, { address }),
  proposeSettlement: (id: string, data: any) =>
    api.post(`/agreements/${id}/settlement`, data),
  acceptSettlement: (id: string, proposalId: string, address: string) =>
    api.post(`/agreements/${id}/settlement/${proposalId}/accept`, { address }),
};

export const agentApi = {
  draft: (data: any) => api.post('/agent/draft', data),
  summarizeEvidence: (data: any) => api.post('/agent/summarize-evidence', data),
};

export const stellarApi = {
  fundAccount: (publicKey: string) => api.post('/stellar/fund-account', { publicKey }),
};