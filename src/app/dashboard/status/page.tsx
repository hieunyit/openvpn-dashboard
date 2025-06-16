
"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { getVPNStatus, disconnectUser, bulkDisconnectUsers, updateUser } from "@/lib/api" // Added updateUser
import { getUser as getCurrentAuthUser } from "@/lib/auth" // Renamed to avoid conflict
import { formatDateForDisplay, formatBytes } from "@/lib/utils"
import { Server, Users, Globe, Clock, ArrowDownCircle, ArrowUpCircle, Wifi, AlertTriangle, FileText, PowerOff, Users2, MoreHorizontal, LockKeyhole } from "lucide-react" // Changed UserX to LockKeyhole
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog, // Added AlertDialog components
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
  DialogDescription as DisconnectDialogDescription, // Alias to avoid conflict
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

  const [isConfirmDenyAccessDialogOpen, setIsConfirmDenyAccessDialogOpen] = useState(false);
  const [userToDenyAccess, setUserToDenyAccess] = useState<string | null>(null);


  useEffect(() => {
    setCurrentAuthUser(getCurrentAuthUser());
  }, []);

  const fetchStatus = useCallback(async (showLoading = true) => {
    try {
      if(showLoading) setLoading(true);
      setError(null)
      const statusData = await getVPNStatus()
      setStatus(statusData)
    } catch (err: any) {
      console.error("Failed to fetch VPN status:", err)
      setError(err.message || "Failed to load VPN status. Please try again.")
      toast({
        title: "Error Loading VPN Status",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      if(showLoading) setLoading(false);
    }
  }, [toast])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(() => fetchStatus(false), 30000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const handleSelectUser = (username: string, checked: boolean) => {
    setSelectedUsers((prev) =>
      checked ? [...prev, username] : prev.filter((u) => u !== username)
    )
  }

  const handleSelectAllUsers = (checked: boolean) => {
    if (checked && status?.connected_users) {
      setSelectedUsers(status.connected_users.map((u) => u.username))
    } else {
      setSelectedUsers([])
    }
  }

  const openSingleDisconnectDialog = (user: ConnectedUser) => {
    setUserToDisconnect(user)
    setDisconnectMessage("")
    setIsSingleDisconnectDialogOpen(true)
  }

  const openBulkDisconnectDialog = () => {
    if (selectedUsers.length === 0) {
      toast({ title: "No Users Selected", description: "Please select users to disconnect.", variant: "destructive" });
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
        title: "Disconnect Action",
        description: result.message || `Disconnect command sent for ${userToDisconnect.username}.`,
      })
      fetchStatus(false)
      setIsSingleDisconnectDialogOpen(false)
      setUserToDisconnect(null)
    } catch (err: any) {
      toast({
        title: "Disconnect Failed",
        description: err.message || `Could not disconnect ${userToDisconnect.username}.`,
        variant: "destructive",
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
        description += ` ${result.skipped_users.length} user(s) skipped (e.g., not found or not connected).`;
      }
      if (result.validation_errors?.length > 0) {
        description += ` ${result.validation_errors.length} had validation issues.`;
      }

      toast({
        title: "Bulk Disconnect Action",
        description: result.message || description,
      })
      fetchStatus(false)
      setIsBulkDisconnectDialogOpen(false)
      setSelectedUsers([])
    } catch (err: any) {
      toast({
        title: "Bulk Disconnect Failed",
        description: err.message || "Could not perform bulk disconnect.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const initiateDenyAccessAction = (username: string) => {
    if (username === currentAuthUser?.username) {
      toast({
        title: "Action Prevented",
        description: "You cannot deny VPN access to your own account.",
        variant: "destructive",
      });
      return;
    }
    setUserToDenyAccess(username);
    setIsConfirmDenyAccessDialogOpen(true);
  };

  const executeDenyAccessAction = async () => {
    if (!userToDenyAccess) return;

    setActionLoading(true);
    try {
      await updateUser(userToDenyAccess, { denyAccess: true });
      toast({
        title: "VPN Access Denied",
        description: `VPN access for user ${userToDenyAccess} has been denied. They may be disconnected shortly.`,
      });
      fetchStatus(false); // Refresh status, user might get disconnected by backend
    } catch (err: any) {
      toast({
        title: "Failed to Deny Access",
        description: err.message || `Could not deny VPN access for ${userToDenyAccess}.`,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setIsConfirmDenyAccessDialogOpen(false);
      setUserToDenyAccess(null);
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
          <Server className="mr-3 h-8 w-8 text-primary" />
          VPN Server Status
        </h1>
        <Button onClick={() => fetchStatus(true)} variant="outline" disabled={loading && !status}>
          <Wifi className="mr-2 h-4 w-4" />
          {loading && !status ? "Refreshing..." : "Refresh Status"}
        </Button>
      </div>

      {error && !loading && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Update Error</AlertTitle>
          <AlertDescription>
            Failed to refresh VPN status: {error}. Displaying last known data.
             <Button onClick={() => fetchStatus(true)} size="sm" variant="link" className="ml-2">Retry</Button>
          </AlertDescription>
        </Alert>
      )}


      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5 text-primary" />
            Summary
          </CardTitle>
          <CardDescription>Overview of the VPN server status.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {loading && !status ? (
            <>
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Connected Users</p>
                  <p className="text-2xl font-bold text-foreground">{status?.total_connected_users ?? "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
                 <div className="rounded-full bg-primary/10 p-3">
                   <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                  <p className="text-lg font-semibold text-foreground">
                    {status?.timestamp ? formatDateForDisplay(status.timestamp) : "N/A"}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selectedUsers.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm font-medium">{selectedUsers.length} user(s) selected</span>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={openBulkDisconnectDialog}
                disabled={actionLoading}
              >
                <PowerOff className="mr-2 h-4 w-4" />
                Disconnect Selected
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedUsers([])} disabled={actionLoading}>
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Wifi className="h-5 w-5 text-primary" />
            Connected Users ({status?.total_connected_users || 0})
          </CardTitle>
          <CardDescription>
            Detailed list of currently connected users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !status ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !status || !status.connected_users || status.connected_users.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 opacity-50 mb-2" />
              <p>No users currently connected.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAllUsers}
                        aria-label="Select all users"
                      />
                    </TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Public IP</TableHead>
                    <TableHead>Virtual IP</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Connected Since</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Data Sent</TableHead>
                    <TableHead>Data Received</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {status.connected_users.map((user) => (
                    <TableRow key={user.client_id} className={selectedUsers.includes(user.username) ? "bg-muted/80" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.includes(user.username)}
                          onCheckedChange={(checked) => handleSelectUser(user.username, Boolean(checked))}
                          aria-label={`Select user ${user.username}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                           <Users2 className="h-4 w-4 text-muted-foreground" />
                          {user.username || user.common_name}
                        </div>
                        <Badge variant="outline" className="mt-1 text-xs">{user.data_channel_cipher}</Badge>
                      </TableCell>
                      <TableCell>{user.real_address}</TableCell>
                      <TableCell>{user.virtual_address}</TableCell>
                      <TableCell>
                        {user.country ? (
                           <div className="flex items-center gap-1">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                            {user.country}
                          </div>
                        ) : "N/A"}
                      </TableCell>
                      <TableCell>{formatDateForDisplay(user.connected_since)}</TableCell>
                      <TableCell>{user.connection_duration}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <ArrowUpCircle className="h-4 w-4" />
                          {formatBytes(user.bytes_sent)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <ArrowDownCircle className="h-4 w-4" />
                          {formatBytes(user.bytes_received)}
                        </div>
                      </TableCell>
                       <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={actionLoading}>
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open actions for {user.username}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => openSingleDisconnectDialog(user)}
                              className="text-orange-600 hover:!text-orange-600 focus:!text-orange-600 dark:text-orange-500 dark:hover:!text-orange-500 dark:focus:!text-orange-500"
                            >
                              <PowerOff className="mr-2 h-4 w-4" />
                              Disconnect User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.username !== currentAuthUser?.username && (
                            <DropdownMenuItem
                              onClick={() => initiateDenyAccessAction(user.username)}
                              className="text-red-600 hover:!text-red-600 focus:!text-red-600 dark:text-red-500 dark:hover:!text-red-500 dark:focus:!text-red-500"
                              disabled={actionLoading}
                            >
                              <LockKeyhole className="mr-2 h-4 w-4" />
                              <span>Deny VPN Access</span>
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

      {/* Single Disconnect Dialog */}
      <Dialog open={isSingleDisconnectDialogOpen} onOpenChange={setIsSingleDisconnectDialogOpen}>
        <DialogContent>
          <DisconnectDialogHeader>
            <DisconnectDialogTitle>Disconnect User</DisconnectDialogTitle>
            <DisconnectDialogDescription>
              Are you sure you want to disconnect user <span className="font-semibold">{userToDisconnect?.username}</span>?
            </DisconnectDialogDescription>
          </DisconnectDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="disconnectMessageSingle">Optional Message</Label>
            <Input
              id="disconnectMessageSingle"
              value={disconnectMessage}
              onChange={(e) => setDisconnectMessage(e.target.value)}
              placeholder="e.g., Maintenance"
            />
          </div>
          <DisconnectDialogFooter>
            <DialogClose asChild>
                <Button variant="outline" disabled={actionLoading}>Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleSingleDisconnectUser} disabled={actionLoading}>
              {actionLoading ? "Disconnecting..." : "Disconnect"}
            </Button>
          </DisconnectDialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Disconnect Dialog */}
      <Dialog open={isBulkDisconnectDialogOpen} onOpenChange={setIsBulkDisconnectDialogOpen}>
        <DialogContent>
          <DisconnectDialogHeader>
            <DisconnectDialogTitle>Bulk Disconnect Users</DisconnectDialogTitle>
            <DisconnectDialogDescription>
              Are you sure you want to disconnect {selectedUsers.length} selected user(s)?
            </DisconnectDialogDescription>
          </DisconnectDialogHeader>
           <div className="py-2">
            <p className="text-sm text-muted-foreground mb-1">Users to disconnect:</p>
            <div className="max-h-32 overflow-y-auto rounded-md border p-2 text-sm">
                {selectedUsers.join(", ")}
            </div>
          </div>
          <div className="space-y-2 py-2">
            <Label htmlFor="disconnectMessageBulk">Optional Message</Label>
            <Input
              id="disconnectMessageBulk"
              value={disconnectMessage}
              onChange={(e) => setDisconnectMessage(e.target.value)}
              placeholder="e.g., Server reboot"
            />
          </div>
          <DisconnectDialogFooter>
             <DialogClose asChild>
                <Button variant="outline" disabled={actionLoading}>Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleBulkDisconnectUsers} disabled={actionLoading}>
              {actionLoading ? "Disconnecting..." : "Disconnect All"}
            </Button>
          </DisconnectDialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Access Confirmation Dialog */}
      <AlertDialog open={isConfirmDenyAccessDialogOpen} onOpenChange={setIsConfirmDenyAccessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deny VPN Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deny VPN access for user "{userToDenyAccess}"? This will prevent them from connecting to the VPN.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmDenyAccessDialogOpen(false)} disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDenyAccessAction}
              disabled={actionLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionLoading ? "Denying Access..." : "Confirm Deny Access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}

    