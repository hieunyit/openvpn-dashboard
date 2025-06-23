
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldCheck, UserCog, Settings, BookUser, Network, History } from "lucide-react"
import Link from "next/link"

export default function PortalDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">System Portal Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome! Select a module from the sidebar to manage system components.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">OpenVPN Management</CardTitle>
            <ShieldCheck className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Manage VPN users, groups, status, and configurations.
            </CardDescription>
            <Button asChild>
              <Link href="/dashboard/openvpn/overview">Go to OpenVPN</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Portal Users</CardTitle>
            <BookUser className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Administer portal accounts and their access permissions.
            </CardDescription>
            <Button asChild>
              <Link href="/dashboard/portal-users">Manage Users</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Connections</CardTitle>
            <Network className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Configure system connections like LDAP and OpenVPN.
            </CardDescription>
            <Button asChild>
              <Link href="/dashboard/connections">Configure</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Audit Logs</CardTitle>
            <History className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Review system activity and administrative actions.
            </CardDescription>
            <Button asChild>
              <Link href="/dashboard/audit-logs">View Logs</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Portal Settings</CardTitle>
            <Settings className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Configure application-wide settings and preferences.
            </CardDescription>
            <Button asChild variant="outline">
              <Link href="/dashboard/settings">Go to Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
