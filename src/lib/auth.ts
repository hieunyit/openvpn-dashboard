
import { jwtDecode } from "jwt-decode"

// Sửa lại đường dẫn API cho xác thực - không có tiền tố /api
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

// Update the login function to handle the nested response structure
export async function login(username: string, password: string): Promise<UserInfo> {
  try {
    console.log("Attempting login for username:", username)

    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "1",
      },
      body: JSON.stringify({ username, password }),
    })

    console.log("Login response status:", response.status)
    console.log("Login response headers:", Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Login failed with status:", response.status, "Error:", errorText)
      throw new Error(`Login failed: ${response.status} ${response.statusText}`)
    }

    const responseText = await response.text()
    console.log("Raw response:", responseText)

    let apiResponse: any
    try {
      apiResponse = JSON.parse(responseText)
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError)
      throw new Error("Invalid JSON response from server")
    }

    console.log("Parsed response:", apiResponse)

    // Handle different response structures
    let authData: AuthTokens

    if (apiResponse.success && apiResponse.success.data) {
      // Nested structure
      authData = apiResponse.success.data
    } else if (apiResponse.accessToken) {
      // Direct structure
      authData = apiResponse
    } else if (apiResponse.data && apiResponse.data.accessToken) {
      // Data wrapper structure
      authData = apiResponse.data
    } else {
      console.error("Unexpected response structure:", apiResponse)
      throw new Error("Invalid response format from server")
    }

    if (!authData.accessToken || !authData.user) {
      console.error("Missing required fields in response:", authData)
      throw new Error("Invalid authentication data received")
    }

    const { accessToken, refreshToken, user } = authData

    // Store tokens in localStorage
    localStorage.setItem("accessToken", accessToken)
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken)
    }
    localStorage.setItem("user", JSON.stringify(user))

    console.log("Login successful for user:", user.username)
    return user
  } catch (error) {
    console.error("Login error:", error)
    throw error
  }
}

export async function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken")
  localStorage.removeItem("refreshToken")
  localStorage.removeItem("user")
  // Optionally, redirect to login page or inform other parts of the app
  // For example, by dispatching a custom event or using a state management solution
  window.location.href = '/login'; // Force redirect
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
    console.warn("[refreshToken] No refresh token found.");
    await logout(); // Ensure cleanup if no refresh token
    return false;
  }

  try {
    console.log("[refreshToken] Attempting token refresh.");
    const response = await fetch(`${API_URL}/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "1",
      },
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    })

    if (!response.ok) {
      console.error("[refreshToken] Token refresh failed with status:", response.status);
      if (response.status === 401 || response.status >= 500) { // Handle 401 OR 5xx server errors
        console.warn(`[refreshToken] Refresh token is invalid, expired, or server error (${response.status}). Logging out.`);
        await logout(); // Explicitly logout
      }
      return false; // Return false if not ok
    }

    const responseText = await response.text()
    let apiResponse: any;
    try {
      apiResponse = JSON.parse(responseText)
    } catch (parseError) {
      console.error("[refreshToken] Failed to parse refresh response:", parseError);
      await logout(); // Logout if response parsing fails
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
      console.error("[refreshToken] Invalid response format from refresh endpoint.");
      await logout(); // Logout on invalid format
      return false;
    }

    const { accessToken, refreshToken: newRefreshToken, user } = authData

    localStorage.setItem("accessToken", accessToken)
    if (newRefreshToken) {
      localStorage.setItem("refreshToken", newRefreshToken)
    }
    localStorage.setItem("user", JSON.stringify(user))

    console.log("[refreshToken] Token refresh successful.");
    return true
  } catch (error) {
    console.error("[refreshToken] Exception during token refresh:", error);
    await logout(); // Logout on any unexpected error during refresh
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

// Update the validateToken function to use the proxy
export async function validateToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const token = getAccessToken()
  if (!token) {
    // No need to call logout() here if it's already called when getAccessToken() would lead to this
    // However, if called directly, it might be good.
    // For now, AuthGuard handles the redirection if this returns false due to no token.
    return false;
  }

  if (isTokenExpired(token)) {
    console.log("[validateToken] Access token expired, attempting refresh.");
    const refreshed = await refreshToken(); // refreshToken now handles logout on its own failure
    // No need to explicitly call logout here if refresh fails, as refreshToken should handle it.
    return refreshed;
  }

  // Token is present and not expired according to client-side check,
  // optionally validate with backend if desired (current code does this)
  try {
    const response = await fetch(`${API_URL}/validate`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "1",
      },
    })
    if (!response.ok) {
        console.warn(`[validateToken] Backend validation failed with status: ${response.status}. Attempting refresh.`);
        // If backend validation fails, it might be due to an expired token that client check missed, or other server issue.
        // Attempting refresh is a good strategy.
        return await refreshToken(); // refreshToken handles its own logout on failure.
    }
    return true; // Backend validation successful
  } catch (error) {
    console.error("[validateToken] Error during backend token validation:", error);
    // Network error during validation, attempt refresh as a fallback
    console.log("[validateToken] Network error during validation, attempting refresh.");
    return await refreshToken(); // refreshToken handles its own logout on failure.
  }
}
