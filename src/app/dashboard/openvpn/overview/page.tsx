
"use client"

import { useState, useEffect, useCallback, memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getUserExpirations, getUsers, getGroups, getVPNStatus, getServerInfo, type ServerInfo } from "@/lib/api"
import { Users, UserCheck, UserX, FolderKanban, AlertTriangle, Clock, BarChart3, CalendarDays, Wifi, PlusCircle, Settings, ExternalLink, Activity, Search, Server, CheckCircle, Info } from "lucide-react"
import Link from "next/link"
import { formatDateForDisplay, getCoreApiErrorMessage } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface DashboardStats {
  totalUsers: number
  totalGroups: number
  expiringUsersCount30Days: number 
  currentlyConnectedUsers: number
}

interface UserExpirationInfo {
  username: string
  email: string
  userExpiration: string
  daysUntilExpiry: number
}

const StatCard = ({ title, value, icon: Icon, description, isLoading, link }: { title: string; value: string | number; icon: React.ElementType; description: string; isLoading: boolean; link?: string }) => (
  <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-5 w-5 text-primary" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <>
          <Skeleton className="h-7 w-20 mb-1" />
          <Skeleton className="h-4 w-full" />
        </>
      ) : (
        <>
          <div className="text-3xl font-bold text-foreground">{value}</div>
          <p className="text-xs text-muted-foreground">{description}</p>
           {link && (
            <Button variant="link" size="sm" className="px-0 h-auto mt-1 text-xs" asChild>
              <Link href={link}>View Details <ExternalLink className="ml-1 h-3 w-3"/></Link>
            </Button>
          )}
        </>
      )}
    </CardContent>
  </Card>
);


const ExpiringUsersTable = memo(({ users, title, isLoading }: { users: UserExpirationInfo[]; title: string; isLoading: boolean}) => (
  <Card className="shadow-sm">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg">
        <AlertTriangle className="h-5 w-5 text-orange-500" />
        {title}
      </CardTitle>
      <CardDescription>Users whose accounts are expiring or have expired recently.</CardDescription>
    </CardHeader>
    <CardContent>
      {isLoading ? (
         <div className="space-y-2">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full"/>)}
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No users expiring in this period.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Expiration Date</TableHead>
                <TableHead className="text-right">Days Left</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.slice(0, 5).map((user) => (
                <TableRow key={user.username}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell className="hidden sm:table-cell">{user.email}</TableCell>
                  <TableCell>{formatDateForDisplay(user.userExpiration)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={user.daysUntilExpiry <= 0 ? "destructive" : (user.daysUntilExpiry <= 7 ? "secondary" : "outline")}
                           className={user.daysUntilExpiry <=0 ? "bg-destructive/80 text-destructive-foreground" : (user.daysUntilExpiry <=7 ? "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/50" : "")}>
                      {user.daysUntilExpiry <= 0 ? "Expired" : `${user.daysUntilExpiry} days`}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
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
                <Link href={`/dashboard/users?filter=expiring&days=${title.includes("3") ? 3 : title.includes("7") ? 7 : 14}`}>View All {users.length} Users</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </CardContent>
  </Card>
))
ExpiringUsersTable.displayName = "ExpiringUsersTable";


export default function OpenVPNOverviewPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalGroups: 0,
    expiringUsersCount30Days: 0,
    currentlyConnectedUsers: 0,
  })
  const [expiringUsers3Days, setExpiringUsers3Days] = useState<UserExpirationInfo[]>([])
  const [expiringUsers7Days, setExpiringUsers7Days] = useState<UserExpirationInfo[]>([])
  const [expiringUsers14Days, setExpiringUsers14Days] = useState<UserExpirationInfo[]>([])
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDeferred, setLoadingDeferred] = useState(true); 
  const [error, setError] = useState<string | null>(null) 
  const { toast } = useToast();

  const fetchInitialDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [
        usersData, 
        groupsData, 
        expiring3DaysData, 
        expiring7DaysData, 
        vpnStatusData,
        serverInfoData,
      ] = await Promise.allSettled([
        getUsers(1, 1),
        getGroups(1, 1),
        getUserExpirations(3),
        getUserExpirations(7),
        getVPNStatus(),
        getServerInfo(),
      ]);

      const getResult = (promiseResult: PromiseSettledResult<any>, defaultValue: any) => 
        promiseResult.status === 'fulfilled' ? promiseResult.value : defaultValue;

      const usersResult = getResult(usersData, { total: 0 });
      const groupsResult = getResult(groupsData, { total: 0 });
      const expiring3DaysResult = getResult(expiring3DaysData, { count: 0, users: [] });
      const expiring7DaysResult = getResult(expiring7DaysData, { count: 0, users: [] });
      const vpnStatusResult = getResult(vpnStatusData, { total_connected_users: 0 });
      const serverInfoResult = getResult(serverInfoData, null);

      setStats(prevStats => ({
        ...prevStats,
        totalUsers: usersResult.total || 0,
        totalGroups: groupsResult.total || 0,
        currentlyConnectedUsers: vpnStatusResult.total_connected_users || 0,
      }));

      setExpiringUsers3Days(expiring3DaysResult.users || [])
      setExpiringUsers7Days(expiring7DaysResult.users || [])
      setServerInfo(serverInfoResult);
      
      const errors = [usersData, groupsData, expiring3DaysData, expiring7DaysData, vpnStatusData, serverInfoData]
        .filter(r => r.status === 'rejected')
        .map(r => getCoreApiErrorMessage((r as PromiseRejectedResult).reason) || "An API call failed")
      
      if (errors.length > 0) {
         const errorMessage = `Failed to load some dashboard data: ${errors.join(', ')}`;
         setError(errorMessage); 
         toast({ title: "Partial Data Loaded", description: "Some dashboard information could not be retrieved.", variant: "warning", icon: <AlertTriangle className="h-5 w-5" />})
      }

    } catch (err: any) { 
      const coreMessage = getCoreApiErrorMessage(err)
      setError(`A critical error occurred while loading dashboard data. ${coreMessage}`) 
      toast({
        title: "Error Loading Dashboard",
        description: coreMessage || "An unexpected critical error occurred.",
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchDeferredDashboardData = useCallback(async () => {
    try {
      setLoadingDeferred(true);
      const [
        expiring14DaysData,
        expiring30DaysData,
      ] = await Promise.allSettled([
        getUserExpirations(14),
        getUserExpirations(30), 
      ]);

      const getResult = (promiseResult: PromiseSettledResult<any>, defaultValue: any) =>
        promiseResult.status === 'fulfilled' ? promiseResult.value : defaultValue;
      
      const expiring14DaysResult = getResult(expiring14DaysData, { count: 0, users: [] });
      const expiring30DaysResult = getResult(expiring30DaysData, { count: 0, users: [] });

      setExpiringUsers14Days(expiring14DaysResult.users || []);
      setStats(prevStats => ({
        ...prevStats,
        expiringUsersCount30Days: expiring30DaysResult.count || 0,
      }));

      const deferredErrors = [expiring14DaysData, expiring30DaysData]
        .filter(r => r.status === 'rejected')
        .map(r => getCoreApiErrorMessage((r as PromiseRejectedResult).reason) || "A deferred API call failed");

      if (deferredErrors.length > 0) {
        
      }

    } catch (err: any) {
      
    } finally {
      setLoadingDeferred(false);
    }
  }, []);


  useEffect(() => {
    let isMounted = true;
    fetchInitialDashboardData().then(() => {
      if(isMounted) {
        fetchDeferredDashboardData();
      }
    });
    return () => { isMounted = false; }
  }, [fetchInitialDashboardData, fetchDeferredDashboardData])


  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">OpenVPN Overview</h1>
          <p className="text-muted-foreground">Key metrics and insights for your VPN server.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/dashboard/users?action=new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add User
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/groups?action=new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Group
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6 bg-destructive/10 border-destructive/30">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-destructive">Loading Error</AlertTitle>
          <AlertDescription className="text-destructive/90">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Users" value={stats.totalUsers} icon={Users} description="All registered VPN users" isLoading={loading} link="/dashboard/users" />
        <StatCard title="Currently Connected" value={stats.currentlyConnectedUsers} icon={Wifi} description="Live VPN connections" isLoading={loading} link="/dashboard/status" />
        <StatCard title="Total Groups" value={stats.totalGroups} icon={FolderKanban} description="Configured VPN access groups" isLoading={loading} link="/dashboard/groups" />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview">System Summary</TabsTrigger>
          <TabsTrigger value="expiring-3">Expiring (3d)</TabsTrigger>
          <TabsTrigger value="expiring-7">Expiring (7d)</TabsTrigger>
          <TabsTrigger value="expiring-14">Expiring (14d)</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Critical Expiry (3 Days)</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-7 w-10 mb-1" /> : <div className="text-2xl font-bold text-foreground">{expiringUsers3Days.length}</div>}
                {loading ? <Skeleton className="h-4 w-24" /> : <p className="text-xs text-muted-foreground">users expiring very soon</p>}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Warning Expiry (7 Days)</CardTitle>
                <CalendarDays className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-7 w-10 mb-1" /> : <div className="text-2xl font-bold text-foreground">{expiringUsers7Days.length}</div>}
                {loading ? <Skeleton className="h-4 w-24" /> : <p className="text-xs text-muted-foreground">users needing attention</p>}
              </CardContent>
            </Card>
          </div>
          
           <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-sm flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
                <CardDescription>Common OpenVPN administrative tasks.</CardDescription>
              </CardHeader>
               <CardContent className="flex-1 flex flex-col pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                    <Link href="/dashboard/users"><Users className="mr-2 h-4 w-4"/>Manage Users</Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/dashboard/groups"><FolderKanban className="mr-2 h-4 w-4"/>Manage Groups</Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/dashboard/search"><Search className="mr-2 h-4 w-4"/>Advanced Search</Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/dashboard/settings"><Settings className="mr-2 h-4 w-4"/>System Settings</Link>
                    </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center text-lg font-semibold">
                        <Server className="mr-2 h-5 w-5 text-primary" />
                        System Information
                    </CardTitle>
                    <CardDescription>Key details about your VPN server.</CardDescription>
                </CardHeader>
                <CardContent className="pt-2 space-y-3 text-sm flex-1">
                    <div className="flex justify-between items-center p-2.5 bg-muted/50 rounded-md">
                        <span className="font-medium text-muted-foreground">Server Name:</span>
                        {loading || !serverInfo ? <Skeleton className="h-5 w-24"/> : <Badge variant="secondary">{serverInfo.web_server_name || "N/A"}</Badge> }
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-muted/50 rounded-md">
                        <span className="font-medium text-muted-foreground">Node Type:</span>
                        {loading || !serverInfo ? <Skeleton className="h-5 w-20"/> : <Badge variant="outline">{serverInfo.node_type || "N/A"}</Badge> }
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-muted/50 rounded-md">
                        <span className="font-medium text-muted-foreground">Server Status:</span>
                        {loading || !serverInfo ? <Skeleton className="h-5 w-20"/> : 
                            <Badge variant={serverInfo.status?.toLowerCase() === "healthy" ? "default" : "destructive"} 
                                   className={serverInfo.status?.toLowerCase() === "healthy" ? "bg-green-600/10 text-green-700 dark:text-green-400 border-green-600/30" : ""}>
                                <Activity className="h-3 w-3 mr-1.5"/>{serverInfo.status || "N/A"}
                            </Badge> 
                        }
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-muted/50 rounded-md">
                        <span className="font-medium text-muted-foreground">Admin Port:</span>
                        {loading || !serverInfo ? <Skeleton className="h-5 w-16"/> : <Badge variant="outline">{serverInfo.admin_port || "N/A"}</Badge> }
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-muted/50 rounded-md">
                        <span className="font-medium text-muted-foreground">UI Version:</span>
                        <Badge variant="secondary">1.0.0</Badge> 
                    </div>
                </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expiring-3">
          <ExpiringUsersTable users={expiringUsers3Days} title="Users Expiring in Next 3 Days" isLoading={loading} />
        </TabsContent>

        <TabsContent value="expiring-7">
          <ExpiringUsersTable users={expiringUsers7Days} title="Users Expiring in Next 7 Days" isLoading={loading} />
        </TabsContent>

        <TabsContent value="expiring-14">
          <ExpiringUsersTable users={expiringUsers14Days} title="Users Expiring in Next 14 Days" isLoading={loadingDeferred} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
