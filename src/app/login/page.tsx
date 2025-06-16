"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Shield } from "lucide-react"
import { login } from "@/lib/auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password")
      setIsLoading(false)
      return
    }

    try {
      console.log("Starting login process...")
      const user = await login(username.trim(), password)

      console.log("Login successful, user:", user)

      toast({
        title: "Login Successful",
        description: `Welcome back, ${user.username}!`,
      })

      setTimeout(() => {
        router.push("/dashboard")
      }, 500)
    } catch (error) {
      console.error("Login failed:", error)

      let errorMessage = "Invalid username or password. Please try again."

      if (error instanceof Error) {
        if (error.message.includes("fetch")) {
          errorMessage = "Unable to connect to the server. Please check your connection."
        } else if (error.message.includes("JSON")) {
          errorMessage = "Server returned an invalid response. Please try again."
        } else if (error.message.includes("401")) {
          errorMessage = "Invalid username or password."
        } else if (error.message.includes("500")) {
          errorMessage = "Server error. Please try again later."
        } else {
          errorMessage = error.message
        }
      }

      setError(errorMessage)
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-2 flex flex-col items-center pt-8">
          <div className="bg-primary/10 p-4 rounded-full">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-foreground">OpenVPN Access Server</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Enter your credentials to access the management dashboard
          </CardDescription>
        </CardHeader>
        {error && (
          <div className="px-6 pb-0">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="username"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
                className="text-base"
              />
            </div>
          </CardContent>
          <CardFooter className="pb-8">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </CardFooter>
        </form>

        {process.env.NODE_ENV === "development" && (
          <CardContent className="pt-0 text-xs text-muted-foreground">
            <details>
              <summary className="cursor-pointer">Debug Info</summary>
              <div className="mt-2 space-y-1 bg-muted p-2 rounded-md">
                <p>API URL: /api/proxy/auth/login</p>
                <p>Username: {username || "N/A"}</p>
                <p>Loading: {isLoading.toString()}</p>
              </div>
            </details>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
