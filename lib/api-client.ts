const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

export class ApiClient {
  private token: string | null = null

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token")
    }
  }

  setToken(token: string, remember: boolean = true) {
    this.token = token
    if (typeof window !== "undefined") {
      if (remember) {
        localStorage.setItem("access_token", token)
        sessionStorage.removeItem("access_token")
      } else {
        sessionStorage.setItem("access_token", token)
        localStorage.removeItem("access_token")
      }
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token")
      sessionStorage.removeItem("access_token")
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    if (this.token) {
      ;(headers as Record<string, string>)["Authorization"] = `Bearer ${this.token}`
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "An error occurred" }))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async login(email: string, password: string, remember: boolean = true) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Invalid credentials" }))
      throw new Error(error.detail)
    }

    const data = await response.json()
    this.setToken(data.access_token, remember)
    return data
  }

  async register(email: string, password: string, full_name: string) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    })
  }

  

  async getCurrentUser() {
    return this.request("/auth/me", { method: "GET" })
  }

  async checkHealth(): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL.replace("/api/v1", "")}/health`, {
        method: "GET",
      })
      if (!response.ok) {
        return { ok: false, error: `Server returned ${response.status}: ${response.statusText}` }
      }
      const data = await response.json()
      if (data.status === "healthy" && data.database === "connected") {
        return { ok: true }
      }
      return { ok: false, error: "Database disconnected" }
    } catch (error) {
      console.error("Health check failed:", error)
      return { ok: false, error: error instanceof Error ? error.message : "Network error" }
    }
  }

  // Reports
  async getRevenueReport(start_date?: string, end_date?: string, period: "monthly" | "weekly" | "quarterly" = "monthly") {
    const params = new URLSearchParams()
    if (start_date) params.append("start_date", start_date)
    if (end_date) params.append("end_date", end_date)
    params.append("period", period)
    const query = params.toString()
    return this.request(`/reports/revenue${query ? `?${query}` : ""}`, { method: "GET" })
  }

  // Dashboard
  async getDashboardStats() {
    return this.request("/reports/dashboard", { method: "GET" })
  }

  // Leads
  async getLeads(params?: Record<string, any>) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/leads${query ? `?${query}` : ""}`, { method: "GET" })
  }

  async createLead(data: any) {
    return this.request("/leads", { method: "POST", body: JSON.stringify(data) })
  }

  async updateLead(id: string | number, data: any) {
    return this.request(`/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) })
  }

  async deleteLead(id: string | number) {
    return this.request(`/leads/${id}`, { method: "DELETE" })
  }

  async convertLead(id: string | number) {
    return this.request(`/leads/${id}/convert`, { method: "POST" })
  }

  // Clients
  async getClients(params?: Record<string, any>) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/clients${query ? `?${query}` : ""}`, { method: "GET" })
  }

  async getClient(id: string | number) {
    return this.request(`/clients/${id}`, { method: "GET" })
  }

  async createClient(data: any) {
    return this.request("/clients", { method: "POST", body: JSON.stringify(data) })
  }

  async updateClient(id: string | number, data: any) {
    return this.request(`/clients/${id}`, { method: "PATCH", body: JSON.stringify(data) })
  }

  async deleteClient(id: string | number) {
    return this.request(`/clients/${id}`, { method: "DELETE" })
  }

  async restoreClient(id: string | number) {
    return this.request(`/clients/${id}/restore`, { method: "POST" })
  }

  async getClientProjects(id: string | number) {
    return this.request(`/clients/${id}/projects`, { method: "GET" })
  }

  // Projects
  async getProjects(params?: Record<string, any>) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/projects${query ? `?${query}` : ""}`, { method: "GET" })
  }

  async createProject(data: any) {
    return this.request("/projects", { method: "POST", body: JSON.stringify(data) })
  }

  async updateProject(id: string | number, data: any) {
    return this.request(`/projects/${id}`, { method: "PUT", body: JSON.stringify(data) })
  }

  async deleteProject(id: string | number) {
    return this.request(`/projects/${id}`, { method: "DELETE" })
  }

  // Project Members
  async getProjectMembers(projectId: string | number) {
    return this.request(`/projects/${projectId}/members`, { method: "GET" })
  }

  async addProjectMember(projectId: string | number, data: any) {
    return this.request(`/projects/${projectId}/members`, { method: "POST", body: JSON.stringify(data) })
  }

  async removeProjectMember(projectId: string | number, userId: string | number) {
    return this.request(`/projects/${projectId}/members/${userId}`, { method: "DELETE" })
  }

  async updateProjectMember(projectId: string | number, userId: string | number, data: any) {
    return this.request(`/projects/${projectId}/members/${userId}`, { method: "PUT", body: JSON.stringify(data) })
  }

  // Tasks
  async getTasks(params?: Record<string, any>) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/tasks${query ? `?${query}` : ""}`, { method: "GET" })
  }

  async createTask(data: any) {
    return this.request("/tasks", { method: "POST", body: JSON.stringify(data) })
  }

  async updateTask(id: string | number, data: any) {
    return this.request(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) })
  }

  async deleteTask(id: string | number) {
    return this.request(`/tasks/${id}`, { method: "DELETE" })
  }

  // Users
  async getUsers(params?: Record<string, any>) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/users${query ? `?${query}` : ""}`, { method: "GET" })
  }

  async inviteUser(data: any) {
    return this.request("/users/invite", { method: "POST", body: JSON.stringify(data) })
  }

  async deleteUser(userId: string) {
    return this.request(`/users/${userId}`, { method: "DELETE" })
  }

  // Tickets
  async getTickets(params?: Record<string, any>) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/tickets${query ? `?${query}` : ""}`, { method: "GET" })
  }

  async getTicketAnalytics() {
    return this.request("/reports/ticket-analytics", { method: "GET" })
  }

  async createTicket(data: any) {
    return this.request("/tickets", { method: "POST", body: JSON.stringify(data) })
  }

  async updateTicket(id: string | number, data: any) {
    return this.request(`/tickets/${id}`, { method: "PATCH", body: JSON.stringify(data) })
  }

  async deleteTicket(id: string | number) {
    return this.request(`/tickets/${id}`, { method: "DELETE" })
  }

  // Invoices
  async getInvoices(params?: Record<string, any>) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/invoices${query ? `?${query}` : ""}`, { method: "GET" })
  }

  async createInvoice(data: any) {
    return this.request("/invoices", { method: "POST", body: JSON.stringify(data) })
  }

  async updateInvoice(id: string | number, data: any) {
    return this.request(`/invoices/${id}`, { method: "PUT", body: JSON.stringify(data) })
  }

  async approveInvoice(id: string | number) {
    return this.request(`/invoices/${id}/approve`, { method: "POST" })
  }

  async sendInvoice(id: string | number) {
    return this.request(`/invoices/${id}/send`, { method: "POST" })
  }

  async deleteInvoice(id: string | number) {
    return this.request(`/invoices/${id}`, { method: "DELETE" })
  }
}

export const apiClient = new ApiClient()
