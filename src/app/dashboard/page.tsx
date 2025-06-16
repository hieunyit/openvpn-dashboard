
"use client"

import { useState, useEffect, useCallback, memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getUserExpirations, getUsers, getGroups, getVPNStatus } from "@/lib/api"
import { Users, UserCheck, UserX, FolderKanban, AlertTriangle, Clock, BarChart3, Calendar, Wifi } from "lucide-react"
import Link from "next/link"
import { formatDateForDisplay } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  totalGroups: number
  expiringUsersCount30Days: number
  currentlyConnectedUsers: number
}

interface UserExpirationInfo {
  username: string
  email: string
  userExpiration: string
  daysUntilExpiry: number
  authMethod?: string
  role?: string
  groupName?: string
  mfa?: boolean
  macAddresses?: string[]
  accessControl?: string[]
  expirationStatus?: string
}

const ExpiringUsersTable = memo(({ users, title }: { users: UserExpirationInfo[]; title: string}) => (
  <Card className="shadow-sm">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-xl">
        <AlertTriangle className="h-5 w-5 text-orange-500" />
        {title}
      </CardTitle>
      <CardDescription>Users whose accounts will expire soon</CardDescription>
    </CardHeader>
    <CardContent>
      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No users expiring in this period.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Expiration Date</TableHead>
                <TableHead>Days Left</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.slice(0, 5).map((user) => (
                <TableRow key={user.username}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{formatDateForDisplay(user.userExpiration)}</TableCell>
                  <TableCell>
                    <Badge variant={user.daysUntilExpiry <= 3 ? "destructive" : (user.daysUntilExpiry <= 7 ? "secondary" : "outline")}>
                      {user.daysUntilExpiry} days
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/users/${user.username}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {users.length > 5 && (
            <div className="p-4 text-center border-t">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/users?filter=expiring&days=14">View All {users.length} Users</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </CardContent>
  </Card>
))
ExpiringUsersTable.displayName = "ExpiringUsersTable";


export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    totalGroups: 0,
    expiringUsersCount30Days: 0,
    currentlyConnectedUsers: 0,
  })
  const [expiringUsers3Days, setExpiringUsers3Days] = useState<UserExpirationInfo[]>([])
  const [expiringUsers7Days, setExpiringUsers7Days] = useState<UserExpirationInfo[]>([])
  const [expiringUsers14Days, setExpiringUsers14Days] = useState<UserExpirationInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast();

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [
        usersData, 
        activeUsersData, 
        groupsData, 
        expiring3DaysData, 
        expiring7DaysData, 
        expiring14DaysData, 
        expiring30DaysData,
        vpnStatusData
      ] = await Promise.all([
        getUsers(1, 1).catch(err => { console.error("Failed fetching total users:", err); return { total: 0 }; }),
        getUsers(1, 1, { isEnabled: "true" }).catch(err => { console.error("Failed fetching active users:", err); return { total: 0 }; }),
        getGroups(1, 1).catch(err => { console.error("Failed fetching total groups:", err); return { total: 0 }; }),
        getUserExpirations(3).catch(err => { console.error("Failed fetching 3-day expirations:", err); return { count: 0, users: [] }; }),
        getUserExpirations(7).catch(err => { console.error("Failed fetching 7-day expirations:", err); return { count: 0, users: [] }; }),
        getUserExpirations(14).catch(err => { console.error("Failed fetching 14-day expirations:", err); return { count: 0, users: [] }; }),
        getUserExpirations(30).catch(err => { console.error("Failed fetching 30-day expirations:", err); return { count: 0, users: [] }; }),
        getVPNStatus().catch(err => { console.error("Failed fetching VPN status:", err); return { total_connected_users: 0 }; }),
      ]);

      setStats({
        totalUsers: usersData.total || 0,
        activeUsers: activeUsersData.total || 0,
        inactiveUsers: (usersData.total || 0) - (activeUsersData.total || 0),
        totalGroups: groupsData.total || 0,
        expiringUsersCount30Days: expiring30DaysData.count || 0,
        currentlyConnectedUsers: vpnStatusData.total_connected_users || 0,
      })

      setExpiringUsers3Days(expiring3DaysData.users || [])
      setExpiringUsers7Days(expiring7DaysData.users || [])
      setExpiringUsers14Days(expiring14DaysData.users || [])

    } catch (err: any) {
      console.error("Failed to fetch dashboard data:", err)
      setError("Failed to load dashboard data. Please try again later.")
      toast({
        title: "Error Loading Dashboard",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/dashboard/users?action=new">Add User</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/groups?action=new">Add Group</Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {loading ? (
          <>
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </>
        ) : (
          <>
            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">Registered VPN users</p>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.activeUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalUsers > 0 ? (((stats.activeUsers || 0) / stats.totalUsers) * 100).toFixed(1) : "0.0"}% of total users
                </p>
              </CardContent>
            </Card>
            
            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Currently Connected</CardTitle>
                <Wifi className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.currentlyConnectedUsers}</div>
                <p className="text-xs text-muted-foreground">Live VPN connections</p>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Inactive Users</CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.inactiveUsers}</div>
                <p className="text-xs text-muted-foreground">
                   {stats.totalUsers > 0 ? (((stats.inactiveUsers || 0) / stats.totalUsers) * 100).toFixed(1) : "0.0"}% of total users
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Groups</CardTitle>
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.totalGroups}</div>
                <p className="text-xs text-muted-foreground">VPN access groups</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expiring-3">Expiring (3 days)</TabsTrigger>
          <TabsTrigger value="expiring-7">Expiring (7 days)</TabsTrigger>
          <TabsTrigger value="expiring-14">Expiring (14 days)</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-1">System Metrics</h2>
            <p className="text-sm text-muted-foreground mb-4">
                Key operational statistics of your OpenVPN Access Server.
            </p>
            {loading ? (
              <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-28 rounded-lg" />
                <Skeleton className="h-28 rounded-lg" />
                <Skeleton className="h-28 rounded-lg" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">User Distribution</CardTitle>
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{stats.activeUsers} / {stats.inactiveUsers}</div>
                    <p className="text-xs text-muted-foreground">active / inactive</p>
                  </CardContent>
                </Card>
                
                <Card className="shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Critical Expiry (3d)</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{expiringUsers3Days.length}</div>
                    <p className="text-xs text-muted-foreground">users expiring</p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Warning Expiry (7d)</CardTitle>
                    <Calendar className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{expiringUsers7Days.length}</div>
                    <p className="text-xs text-muted-foreground">users expiring</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                  <Link href="/dashboard/users">Manage Users</Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/groups">Manage Groups</Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/search">Advanced Search</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">System Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">API Version:</span>
                    <Badge variant="secondary">1.1.0</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Service:</span>
                    <span className="text-sm font-medium text-foreground">GoVPN API</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expiring-3" className="space-y-4">
          <ExpiringUsersTable users={expiringUsers3Days} title="Users Expiring in 3 Days" />
        </TabsContent>

        <TabsContent value="expiring-7" className="space-y-4">
          <ExpiringUsersTable users={expiringUsers7Days} title="Users Expiring in 7 Days" />
        </TabsContent>

        <TabsContent value="expiring-14" className="space-y-4">
          <ExpiringUsersTable users={expiringUsers14Days} title="Users Expiring in 14 Days" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
