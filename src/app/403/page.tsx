"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"
import Link from "next/link"

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg border-destructive bg-destructive/5">
        <CardHeader className="text-center">
          <div className="mx-auto bg-destructive/10 p-4 rounded-full w-fit">
            <Lock className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-3xl font-bold text-destructive mt-4">
            403 - Access Denied
          </CardTitle>
          <CardDescription className="text-base text-destructive/80">
            You do not have the necessary permissions to access this page or perform this action.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            Please contact your system administrator if you believe this is an error.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
