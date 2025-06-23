
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"

export default function PortalGroupsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
         <Users className="h-8 w-8 text-primary flex-shrink-0" />
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Portal Groups & Permissions</h1>
            <p className="text-muted-foreground mt-1">Define user groups and assign granular permissions.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            This section will allow you to create groups and manage their permissions within the portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Functionality for this page is currently under development.</p>
        </CardContent>
      </Card>
    </div>
  )
}
