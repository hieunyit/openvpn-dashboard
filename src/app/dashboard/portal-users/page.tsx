
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookUser } from "lucide-react"

export default function PortalUsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
         <BookUser className="h-8 w-8 text-primary flex-shrink-0" />
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Portal Users</h1>
            <p className="text-muted-foreground mt-1">Manage users who can access this System Portal.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            This section will allow you to manage portal administrators and their permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Functionality for this page is currently under development.</p>
        </CardContent>
      </Card>
    </div>
  )
}
