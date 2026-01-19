"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { apiClient } from "@/lib/api-client"

interface UserRole {
  id: string
  name: string
  description?: string | null
}

interface User {
  id: string
  email: string
  full_name: string
  phone?: string | null
  role: UserRole | null
  is_active: boolean
  is_verified: boolean
  last_login_at?: string | null
  created_at: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string, remember?: boolean) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token")
    if (token) {
      apiClient
        .getCurrentUser()
        .then((userData) => setUser(userData))
        .catch(() => {
          localStorage.removeItem("access_token")
          sessionStorage.removeItem("access_token")
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (email: string, password: string, remember: boolean = true) => {
    await apiClient.login(email, password, remember)
    const userData = await apiClient.getCurrentUser()
    setUser(userData)
  }

  const register = async (email: string, password: string, fullName: string) => {
    await apiClient.register(email, password, fullName)
    await login(email, password)
  }

  const logout = () => {
    apiClient.clearToken()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
