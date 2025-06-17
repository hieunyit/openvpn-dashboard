
"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getAccessToken, isTokenExpired, validateToken } from "@/lib/auth" // Removed logout as it's handled by validateToken or router
import { Loader2 } from "lucide-react"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken()

      if (!token) {
        router.push("/login")
        return
      }

      // Check local token expiration first
      if (!isTokenExpired(token)) {
        // Token exists and is not expired by local check
        setIsLoading(false)
      } else {
        // Token is expired locally or needs server validation (which includes refresh attempt)
        const isValidAfterServerCheck = await validateToken()
        if (!isValidAfterServerCheck) {
          // validateToken handles logout internally if refresh fails critically.
          // Router push ensures UI consistency if validateToken didn't redirect (e.g. passive failure).
          router.push("/login")
        } else {
          setIsLoading(false)
        }
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return <>{children}</>
}
