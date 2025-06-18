
"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ShieldCheck, LogIn, LayoutGrid } from "lucide-react" // Added LayoutGrid
import { login } from "@/lib/auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { getCoreApiErrorMessage } from "@/lib/utils"


export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null) // For inline error display
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!username.trim() || !password.trim()) {
      const validationError = "Please enter both username and password."
      setError(validationError)
      toast({
        title: "Login Validation Failed",
        description: validationError,
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    try {
      const user = await login(username.trim(), password)
      toast({
        title: "Login Successful",
        description: `Welcome back, ${user.username}!`,
        variant: "success",
      })
      router.push("/dashboard")
    } catch (loginError: any) {
      let errorMessage = "An unexpected error occurred. Please try again."
      if (loginError instanceof Error) {
         errorMessage = getCoreApiErrorMessage(loginError.message)

        if (loginError.message.includes("fetch") || loginError.message.includes("NetworkError")) {
          errorMessage = "Unable to connect to the server. Please check your connection or try again later."
        } else if (loginError.message.includes("JSON")) {
          errorMessage = "Server returned an invalid response. Please try again."
        } else if (loginError.message.includes("401")) {
          errorMessage = "Invalid username or password."
        } else if (loginError.message.includes("500")) {
          errorMessage = "Server error. Please try again later."
        }
      }
      
      setError(errorMessage) 
      if (loginError.message !== "SESSION_EXPIRED") {
          toast({
            title: "Login Failed",
            description: errorMessage,
            variant: "destructive",
          });
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted/70 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 rounded-xl">
        <CardHeader className="space-y-2 text-center pt-8 pb-4">
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mx-auto mb-3">
            <LayoutGrid className="h-10 w-10 text-primary" /> 
          </div>
          <CardTitle className="text-3xl font-bold text-foreground">
            System Portal
          </CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            Sign in to access the System Portal
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 px-8">
            {error && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <AlertTitle className="text-destructive">Login Error</AlertTitle>
                <AlertDescription className="text-destructive/90">{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-muted-foreground">Username</Label>
              <Input
                id="username"
                placeholder="e.g., adminuser"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="username"
                className="text-base h-12 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
                className="text-base h-12 focus:border-primary"
              />
            </div>
          </CardContent>
          <CardFooter className="px-8 pb-8 pt-2">
            <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
              ) : (
                <LogIn className="mr-2 h-5 w-5" />
              )}
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </CardFooter>
        </form>
      </Card>
      <p className="text-center text-xs text-muted-foreground mt-8">
        &copy; {new Date().getFullYear()} System Portal. All rights reserved.
      </p>
    </div>
  )
}

    
