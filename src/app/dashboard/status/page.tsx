
"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { getVPNStatus, disconnectUser, bulkDisconnectUsers, updateUser } from "@/lib/api"
import { getUser as getCurrentAuthUser } from "@/lib/auth"
import { formatDateForDisplay, formatBytes, getCoreApiErrorMessage } from "@/lib/utils"
import { Server, Users, Globe, Clock, ArrowDownCircle, ArrowUpCircle, Wifi, AlertTriangle, FileText, PowerOff, MoreHorizontal, LockKeyhole, Activity, RefreshCw, UserCircle2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription as DisconnectDialogDescription,
  DialogFooter as DisconnectDialogFooter,
  DialogHeader as DisconnectDialogHeader,
  DialogTitle as DisconnectDialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"


interface ConnectedUser {
  bytes_received: number
  bytes_sent: number
  client_id: string
  common_name: string
  connected_since: string
  connected_since_unix: number
  connection_duration: string
  country: string
  data_channel_cipher: string
  peer_id: string
  real_address: string
  username: string
  virtual_address: string
  virtual_ipv6_address: string
}

interface VPNStatus {
  connected_users: ConnectedUser[]
  timestamp: string
  total_connected_users: number
}

export default function VPNStatusPage() {
  const [status, setStatus] = useState<VPNStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [userToDisconnect, setUserToDisconnect] = useState<ConnectedUser | null>(null)
  const [disconnectMessage, setDisconnectMessage] = useState("")
  const [isSingleDisconnectDialogOpen, setIsSingleDisconnectDialogOpen] = useState(false)
  const [isBulkDisconnectDialogOpen, setIsBulkDisconnectDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [currentAuthUser, setCurrentAuthUser] = useState<any>(null);

  const [isConfirmDisableUserDialogOpen, setIsConfirmDisableUserDialogOpen] = useState(false);
  const [userToDisable, setUserToDisable] = useState<string | null>(null);


  useEffect(() => {
    setCurrentAuthUser(getCurrentAuthUser());
  }, []);

  const fetchStatus = useCallback(async (showLoadingIndicator = true) => {
    try {
      if(showLoadingIndicator) setLoading(true);
      setError(null)
      const statusData = await getVPNStatus()
      setStatus(statusData)
    } catch (err: any) {
      const coreMessage = getCoreApiErrorMessage(err);
      setError(coreMessage || "Failed to load VPN status. Please try again.")
      toast({
        title: "Error Loading VPN Status",
        description: coreMessage,
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      })
    } finally {
      if(showLoadingIndicator) setLoading(false);
    }
  }, [toast])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(() => fetchStatus(false), 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [fetchStatus])

  const handleSelectUser = (username: string, checked: boolean) => {
    setSelectedUsers((prev) =>
      checked ? [...prev, username] : prev.filter((u) => u !== username)
    )
  }

  const handleSelectAllUsers = (checked: boolean) => {
    setSelectedUsers(checked && status?.connected_users ? status.connected_users.map(u => u.username) : []);
  }

  const openSingleDisconnectDialog = (user: ConnectedUser) => {
    setUserToDisconnect(user)
    setDisconnectMessage("")
    setIsSingleDisconnectDialogOpen(true)
  }

  const openBulkDisconnectDialog = () => {
    if (selectedUsers.length === 0) {
      toast({ title: "No Users Selected", description: "Please select users to disconnect.", variant: "info", icon: <AlertTriangle className="h-5 w-5" /> });
      return;
    }
    setDisconnectMessage("")
    setIsBulkDisconnectDialogOpen(true)
  }

  const handleSingleDisconnectUser = async () => {
    if (!userToDisconnect) return
    setActionLoading(true)
    try {
      const result = await disconnectUser(userToDisconnect.username, disconnectMessage)
      toast({
        title: "User Disconnected Successfully",
        description: result.message || `Disconnect command sent for ${userToDisconnect.username}.`,
        variant: "success",
        icon: <CheckCircle className="h-5 w-5" />,
      })
      fetchStatus(false) 
      setIsSingleDisconnectDialogOpen(false)
      setUserToDisconnect(null)
    } catch (err: any) {
      toast({
        title: "Failed to Disconnect User",
        description: getCoreApiErrorMessage(err) || `An unexpected error occurred while disconnecting ${userToDisconnect.username}.`,
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleBulkDisconnectUsers = async () => {
    setActionLoading(true)
    try {
      const result = await bulkDisconnectUsers(selectedUsers, disconnectMessage)
      let description = `${result.disconnected_users?.length || 0} user(s) disconnected successfully.`;
      if (result.skipped_users?.length > 0) {
        description += ` ${result.skipped_users.length} user(s) skipped.`;
      }
      toast({
        title: "Bulk Disconnect Complete",
        description: result.message || description,
        variant: "success",
        icon: <CheckCircle className="h-5 w-5" />,
      })
      fetchStatus(false) 
      setIsBulkDisconnectDialogOpen(false)
      setSelectedUsers([])
    } catch (err: any) {
      toast({
        title: "Bulk Disconnect Failed",
        description: getCoreApiErrorMessage(err),
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      })
    } finally {
      setActionLoading(false)
    }
  }

  const initiateDisableUserAction = (username: string) => {
    if (username === currentAuthUser?.username) {
      toast({
        title: "Action Prevented",
        description: "You cannot disable your own user.",
        variant: "warning",
        icon: <AlertTriangle className="h-5 w-5" />,
      });
      return;
    }
    setUserToDisable(username);
    setIsConfirmDisableUserDialogOpen(true);
  };

  const executeDisableUserAction = async () => {
    if (!userToDisable) return;

    setActionLoading(true);
    try {
      await updateUser(userToDisable, { denyAccess: true });
      toast({
        title: "User Disabled Successfully",
        description: `User ${userToDisable} has been disabled. Their current session will be disconnected.`,
        variant: "success",
        icon: <CheckCircle className="h-5 w-5" />,
      });
      fetchStatus(false); 
    } catch (err: any) {
      toast({
        title: "Failed to Disable User",
        description: getCoreApiErrorMessage(err) || `An unexpected error occurred for ${userToDisable}.`,
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    } finally {
      setActionLoading(false);
      setIsConfirmDisableUserDialogOpen(false);
      setUserToDisable(null);
    }
  };


  if (error && loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">VPN Server Status</h1>
         <Card className="shadow-lg border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              Error Loading Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
            <Button onClick={() => fetchStatus(true)} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isAllSelected = status?.connected_users && status.connected_users.length > 0 && selectedUsers.length === status.connected_users.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Server className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">VPN Server Status</h1>
            <p className="text-muted-foreground mt-1">Live overview of connected users and server activity.</p>
          </div>
        </div>
        <Button onClick={() => fetchStatus(true)} variant="outline" disabled={loading && !status} className="w-full sm:w-auto">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading && !status ? 'animate-spin' : ''}`} />
          {loading && !status ? "Refreshing..." : "Refresh Status"}
        </Button>
      </div>

      {error && !loading && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-destructive">Update Error</AlertTitle>
          <AlertDescription className="text-destructive/90">
            Failed to refresh VPN status: {error}. Displaying last known data.
             <Button onClick={() => fetchStatus(true)} size="sm" variant="link" className="ml-2 text-destructive h-auto p-0">Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Connected Users</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              {loading && !status ? <Skeleton className="h-8 w-16 mb-1" /> : <div className="text-3xl font-bold text-foreground">{status?.total_connected_users ?? "N/A"}</div>}
              {loading && !status ? <Skeleton className="h-4 w-24" /> : <p className="text-xs text-muted-foreground">Currently active VPN sessions</p>}
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Last Updated</CardTitle>
                <Clock className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
                {loading && !status ? <Skeleton className="h-8 w-32 mb-1" /> : <div className="text-xl font-semibold text-foreground">{status?.timestamp ? formatDateForDisplay(status.timestamp) : "N/A"}</div>}
                {loading && !status ? <Skeleton className="h-4 w-28" /> : <p className="text-xs text-muted-foreground">Data retrieved from server</p>}
            </CardContent>
          </Card>
      </div>

      {selectedUsers.length > 0 && (
        <Card className="shadow-sm bg-primary/5 border-primary/20">
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-sm font-medium text-primary">{selectedUsers.length} user(s) selected for action.</span>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="destructive" size="sm" onClick={openBulkDisconnectDialog} disabled={actionLoading} className="flex-1 sm:flex-none">
                <PowerOff className="mr-2 h-4 w-4" /> Disconnect Selected
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedUsers([])} disabled={actionLoading} className="flex-1 sm:flex-none">
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-md border-0">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Wifi className="h-5 w-5 text-primary" />
            Connected Users ({status?.total_connected_users || 0})
          </CardTitle>
          <CardDescription>Detailed list of currently active VPN sessions.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading && !status ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-14 w-full rounded-md" />))}
            </div>
          ) : !status || !status.connected_users || status.connected_users.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 opacity-50 mb-2" />
              <p>No users currently connected.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 px-4">
                      <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAllUsers} aria-label="Select all users"/>
                    </TableHead>
                    <TableHead>User (Cipher)</TableHead>
                    <TableHead className="hidden md:table-cell">Public IP</TableHead>
                    <TableHead className="hidden lg:table-cell">Virtual IP</TableHead>
                    <TableHead className="hidden sm:table-cell">Country</TableHead>
                    <TableHead className="hidden md:table-cell">Connected Since</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead className="text-right px-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {status.connected_users.map((user) => (
                    <TableRow key={user.client_id} className={selectedUsers.includes(user.username) ? "bg-muted hover:bg-muted/80" : "hover:bg-muted/50 transition-colors"}>
                      <TableCell className="px-4">
                        <Checkbox checked={selectedUsers.includes(user.username)} onCheckedChange={(checked) => handleSelectUser(user.username, Boolean(checked))} aria-label={`Select user ${user.username}`}/>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{user.username || user.common_name}</div>
                        <Badge variant="outline" className="mt-1 text-xs">{user.data_channel_cipher || "N/A"}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{user.real_address}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{user.virtual_address}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {user.country ? (<div className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-muted-foreground" />{user.country}</div>) : "N/A"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{formatDateForDisplay(user.connected_since)}</TableCell>
                      <TableCell className="text-sm">{user.connection_duration}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400"><ArrowUpCircle className="h-4 w-4" />{formatBytes(user.bytes_sent)}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400"><ArrowDownCircle className="h-4 w-4" />{formatBytes(user.bytes_received)}</div>
                      </TableCell>
                       <TableCell className="text-right px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={actionLoading}>
                              <MoreHorizontal className="h-4 w-4" /> <span className="sr-only">Actions for {user.username}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openSingleDisconnectDialog(user)} className="text-orange-600 focus:text-orange-600 focus:bg-orange-500/10">
                              <PowerOff className="mr-2 h-4 w-4" /> Disconnect User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.username !== currentAuthUser?.username && (
                            <DropdownMenuItem onClick={() => initiateDisableUserAction(user.username)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={actionLoading}>
                              <LockKeyhole className="mr-2 h-4 w-4" /> Disable User
                            </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isSingleDisconnectDialogOpen} onOpenChange={setIsSingleDisconnectDialogOpen}>
        <DialogContent>
          <DisconnectDialogHeader>
            <DisconnectDialogTitle>Disconnect User</DisconnectDialogTitle>
            <DisconnectDialogDescription>
              Are you sure you want to disconnect user <span className="font-semibold">{userToDisconnect?.username}</span>?
            </DisconnectDialogDescription>
          </DisconnectDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="disconnectMessageSingle">Optional Message to User</Label>
            <Input id="disconnectMessageSingle" value={disconnectMessage} onChange={(e) => setDisconnectMessage(e.target.value)} placeholder="e.g., Scheduled maintenance" disabled={actionLoading}/>
          </div>
          <DisconnectDialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={actionLoading}>Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={handleSingleDisconnectUser} disabled={actionLoading}>
              {actionLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <PowerOff className="mr-2 h-4 w-4" />}
              {actionLoading ? "Disconnecting..." : "Disconnect"}
            </Button>
          </DisconnectDialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkDisconnectDialogOpen} onOpenChange={setIsBulkDisconnectDialogOpen}>
        <DialogContent>
          <DisconnectDialogHeader>
            <DisconnectDialogTitle>Bulk Disconnect Users</DisconnectDialogTitle>
            <DisconnectDialogDescription>
              Are you sure you want to disconnect {selectedUsers.length} selected user(s)?
            </DisconnectDialogDescription>
          </DisconnectDialogHeader>
           <div className="py-2">
            <Label className="text-sm font-medium">Users to disconnect:</Label>
            <div className="max-h-28 overflow-y-auto rounded-md border p-2 text-sm bg-muted/50 mt-1">
                {selectedUsers.join(", ")}
            </div>
          </div>
          <div className="space-y-2 py-2">
            <Label htmlFor="disconnectMessageBulk">Optional Message to Users</Label>
            <Input id="disconnectMessageBulk" value={disconnectMessage} onChange={(e) => setDisconnectMessage(e.target.value)} placeholder="e.g., Server rebooting soon" disabled={actionLoading}/>
          </div>
          <DisconnectDialogFooter>
             <DialogClose asChild><Button variant="outline" disabled={actionLoading}>Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={handleBulkDisconnectUsers} disabled={actionLoading}>
              {actionLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <PowerOff className="mr-2 h-4 w-4" />}
              {actionLoading ? "Disconnecting..." : "Disconnect All Selected"}
            </Button>
          </DisconnectDialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmDisableUserDialogOpen} onOpenChange={setIsConfirmDisableUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Disable User</AlertDialogTitle>
            <AlertDialogDescription>
              Disabling user "{userToDisable}" will prevent them from future connections and disconnect their current session. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmDisableUserDialogOpen(false)} disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDisableUserAction} disabled={actionLoading} className="bg-destructive hover:bg-destructive/90">
              {actionLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <LockKeyhole className="mr-2 h-4 w-4" />}
              {actionLoading ? "Disabling..." : "Confirm Disable User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

    
