const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('finchat_token', token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('finchat_token');
    }
    return null;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('finchat_token');
    }
  }

  getApiUrl(): string {
    return API_URL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Request failed');
    }

    const data = await response.json();
    return data;
  }

  async login(telegramId: number, name: string, username?: string) {
    const data = await this.request<{ success: boolean; user: any; token: string }>('/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ telegram_id: telegramId, name, username }),
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async telegramAuth(telegramData: Record<string, any>) {
    const data = await this.request<{ success: boolean; user: any; token: string }>('/api/users/telegram-auth', {
      method: 'POST',
      body: JSON.stringify(telegramData),
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async getMe() {
    return this.request<{ success: boolean; user: any }>('/api/users/me');
  }

  async updateUser(data: { timezone?: string }) {
    return this.request<{ success: boolean; user: any }>('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getTransactions(filters?: {
    startDate?: string;
    endDate?: string;
    type?: string;
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    return this.request<{ success: boolean; transactions: any[] }>(
      `/api/transactions?${params.toString()}`
    );
  }

  async getStats(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return this.request<{ success: boolean; stats: any }>(
      `/api/transactions/stats?${params.toString()}`
    );
  }

  async getComparisonStats() {
    return this.request<{ success: boolean; comparison: any }>('/api/transactions/compare');
  }

  async getDailyTrend(days?: number) {
    const params = days ? `?days=${days}` : '';
    return this.request<{ success: boolean; trend: any[] }>(`/api/transactions/daily-trend${params}`);
  }

  async getMonthlyStats(year: number, month: number) {
    return this.request<{ success: boolean; stats: any[] }>(
      `/api/transactions/monthly/${year}/${month}`
    );
  }

  async getHistory(year: number) {
    return this.request<{ success: boolean; stats: any[] }>(
      `/api/transactions/history/${year}`
    );
  }

  async getCategories() {
    return this.request<{ success: boolean; categories: any[] }>('/api/categories');
  }

  async createCategory(data: { name: string; icon?: string; color?: string }) {
    return this.request<{ success: boolean; category: any }>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: string, data: { name?: string; icon?: string; color?: string }) {
    return this.request<{ success: boolean; category: any }>(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string) {
    return this.request<{ success: boolean; message: string; category: any }>(`/api/categories/${id}`, {
      method: 'DELETE',
    });
  }

  async getBudgets(month: number, year: number) {
    return this.request<{ success: boolean; budgets: any[] }>(
      `/api/budgets?month=${month}&year=${year}`
    );
  }

  async getBudgetSpending(month: number, year: number) {
    return this.request<{ success: boolean; spending: any[] }>(
      `/api/budgets/spending?month=${month}&year=${year}`
    );
  }

  async createTransaction(data: {
    amount: number;
    type: string;
    category: string;
    description?: string;
    date?: string;
  }) {
    return this.request<{ success: boolean; transaction: any }>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTransaction(id: string, data: {
    amount?: number;
    type?: string;
    category_id?: string;
    description?: string;
    date?: string;
  }) {
    return this.request<{ success: boolean; transaction: any }>(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTransaction(id: string) {
    return this.request<{ success: boolean; message: string }>(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  async parseTransaction(message: string) {
    return this.request<{ success: boolean; data: any }>('/api/transactions/parse', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async createBudget(data: {
    category_id: string;
    amount: number;
    month: number;
    year: number;
  }) {
    return this.request<{ success: boolean; budget: any }>('/api/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBudget(id: string, amount: number) {
    return this.request<{ success: boolean; budget: any }>(`/api/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ amount }),
    });
  }

  async deleteBudget(id: string) {
    return this.request<{ success: boolean; message: string }>(`/api/budgets/${id}`, {
      method: 'DELETE',
    });
  }

  async copyBudgetsFromLastMonth(month: number, year: number) {
    return this.request<{ success: boolean; budgets: any[] }>('/api/budgets/copy', {
      method: 'POST',
      body: JSON.stringify({ month, year }),
    });
  }

  async getPreferences() {
    return this.request<{ success: boolean; preferences: any }>('/api/users/preferences');
  }

  async updatePreferences(data: {
    daily_reminder?: boolean;
    reminder_time?: string;
    weekly_summary?: boolean;
    monthly_report?: boolean;
    budget_alerts?: boolean;
  }) {
    return this.request<{ success: boolean; preferences: any }>('/api/users/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getPlans() {
    return this.request<{ success: boolean; plans: any[] }>('/api/subscription/plans');
  }

  async getSubscriptionStatus() {
    return this.request<{ success: boolean; subscription: any }>('/api/subscription/status');
  }

  async createPayment(plan: string) {
    return this.request<{ success: boolean; payment: any }>('/api/subscription/create-payment', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
  }

  async devActivatePlan(plan: string) {
    return this.request<{ success: boolean; subscriptionId: string; plan: string }>('/api/subscription/dev-activate', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
  }

  async getPaymentHistory() {
    return this.request<{ success: boolean; payments: any[] }>('/api/subscription/payments');
  }

  async checkFeature(feature: string) {
    return this.request<{ success: boolean; hasAccess: boolean; feature: string }>(`/api/subscription/check-feature/${feature}`);
  }

  async downloadExport(type: 'pdf' | 'excel', filters?: { startDate?: string; endDate?: string; category?: string }) {
    const token = this.getToken();
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    
    const url = `${API_URL}/api/export/${type}?${params.toString()}`;
    const response = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `finchat-laporan.${type === 'excel' ? 'xlsx' : 'pdf'}`;
    if (contentDisposition && contentDisposition.indexOf('filename=') !== -1) {
      const parts = contentDisposition.split('filename=');
      if (parts.length > 1) {
        filename = parts[1].replace(/["']/g, '');
      }
    }
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export const api = new ApiClient();