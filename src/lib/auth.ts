
import { jwtDecode } from "jwt-decode"

const API_URL = "/api/proxy/auth"

interface UserInfo {
  username: string
  email: string
  role: string
}

interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: UserInfo
}

interface ApiResponse {
  success?: {
    data: AuthTokens
    status: number
  }
  error?: {
    message: string
    status: number
  }
}

export async function login(username: string, password: string): Promise<UserInfo> {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "1",
      },
      body: JSON.stringify({ username, password }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Login failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const responseText = await response.text()
    let apiResponse: any;
    try {
      apiResponse = JSON.parse(responseText)
    } catch (parseError) {
      throw new Error("Invalid JSON response from server")
    }

    let authData: AuthTokens

    if (apiResponse.success && apiResponse.success.data) {
      authData = apiResponse.success.data
    } else if (apiResponse.accessToken) {
      authData = apiResponse
    } else if (apiResponse.data && apiResponse.data.accessToken) {
      authData = apiResponse.data
    } else {
      throw new Error("Invalid response format from server")
    }

    if (!authData.accessToken || !authData.user) {
      throw new Error("Invalid authentication data received")
    }

    const { accessToken, refreshToken, user } = authData

    localStorage.setItem("accessToken", accessToken)
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken)
    }
    localStorage.setItem("user", JSON.stringify(user))

    return user
  } catch (error) {
    throw error
  }
}

export async function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken")
  localStorage.removeItem("refreshToken")
  localStorage.removeItem("user")
  window.location.href = '/login'; 
}

export function getUser(): UserInfo | null {
  if (typeof window === "undefined") return null

  const userJson = localStorage.getItem("user")
  if (!userJson) return null

  try {
    return JSON.parse(userJson)
  } catch (e) {
    return null
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("accessToken")
}

export async function refreshToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const currentRefreshToken = localStorage.getItem("refreshToken")
  if (!currentRefreshToken) {
    await logout(); 
    return false;
  }

  try {
    const response = await fetch(`${API_URL}/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "1",
      },
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    })

    if (!response.ok) {
      if (response.status === 401 || response.status >= 500) { 
        await logout(); 
      }
      return false; 
    }

    const responseText = await response.text()
    let apiResponse: any;
    try {
      apiResponse = JSON.parse(responseText)
    } catch (parseError) {
      await logout(); 
      return false;
    }

    let authData: AuthTokens
    if (apiResponse.success && apiResponse.success.data) {
      authData = apiResponse.success.data
    } else if (apiResponse.accessToken) {
      authData = apiResponse
    } else if (apiResponse.data && apiResponse.data.accessToken) {
      authData = apiResponse.data
    } else {
      await logout(); 
      return false;
    }

    const { accessToken, refreshToken: newRefreshToken, user } = authData

    localStorage.setItem("accessToken", accessToken)
    if (newRefreshToken) {
      localStorage.setItem("refreshToken", newRefreshToken)
    }
    localStorage.setItem("user", JSON.stringify(user))

    return true
  } catch (error) {
    await logout(); 
    return false
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const decoded: any = jwtDecode(token)
    const currentTime = Date.now() / 1000
    return decoded.exp < currentTime
  } catch (e) {
    return true
  }
}

export async function validateToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const token = getAccessToken()
  if (!token) {
    return false;
  }

  if (isTokenExpired(token)) {
    const refreshed = await refreshToken(); 
    return refreshed;
  }

  try {
    const response = await fetch(`${API_URL}/validate`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "1",
      },
    })
    if (!response.ok) {
        return await refreshToken(); 
    }
    return true; 
  } catch (error) {
    return await refreshToken(); 
  }
}

