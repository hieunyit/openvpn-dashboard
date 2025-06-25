
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { 
  getPortalUsers, createPortalUser, updatePortalUser, deletePortalUser, 
  activatePortalUser, deactivatePortalUser, resetPortalUserPassword, getPortalGroups 
} from "@/lib/api"
import { BookUser, PlusCircle, MoreHorizontal, Edit, Trash2, KeyRound, CheckCircle, AlertTriangle, UserCheck, UserX, FileText, Power, PowerOff, Search } from "lucide-react"
import PageHeader from "@/components/page-header"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getCoreApiErrorMessage } from "@/lib/utils"
import { Pagination } from "@/components/pagination"
import Link from "next/link"

interface PortalUser {
  id: string
  username: string
  fullName: string
  email: string
  groupId: string
  isActive: boolean
}

interface PortalGroup {
  id: string;
  displayName: string;
}

function UserDialog({ user, groups, open, onOpenChange, onSuccess }: { user?: PortalUser | null, groups: PortalGroup[], open: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({ username: "", fullName: "", email: "", password: "", groupId: "none" })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const isEditing = !!user

  useEffect(() => {
    if (user && open) {
      setFormData({ 
          username: user.username, 
          fullName: user.fullName || "", 
          email: user.email, 
          password: "", 
          groupId: user.groupId || "none"
        })
    } else if (!user && open) {
      setFormData({ username: "", fullName: "", email: "", password: "", groupId: "none" })
    }
  }, [user, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: any = {
          username: formData.username,
          fullName: formData.fullName,
          email: formData.email,
          groupId: formData.groupId === "none" ? undefined : formData.groupId,
      }
      if (formData.password) {
        payload.password = formData.password;
      }

      if (isEditing && user) {
        await updatePortalUser(user.id, payload)
      } else {
        if (!payload.password) {
            toast({ title: "Error", description: "Password is required for new users.", variant: "destructive"});
            setSaving(false);
            return;
        }
        await createPortalUser(payload)
      }
      toast({ title: "Success", description: `User ${formData.username} has been ${isEditing ? 'updated' : 'created'}.`, variant: "success", icon: <CheckCircle /> })
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      if (err.message === "ACCESS_DENIED") {
        router.push('/403');
        return;
      }
      toast({ title: "Error", description: getCoreApiErrorMessage(err), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit User: ${user?.username}` : "Create New Portal User"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the details for this portal user." : "Create a new user to grant access to this portal."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input id="username" value={formData.username} onChange={e => setFormData(p => ({...p, username: e.target.value}))} required />
            </div>
             <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={formData.fullName} onChange={e => setFormData(p => ({...p, fullName: e.target.value}))} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={formData.password} onChange={e => setFormData(p => ({...p, password: e.target.value}))} placeholder={isEditing ? "Leave blank to keep current password" : "Required for new user"} required={!isEditing} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="group">Group</Label>
                <Select value={formData.groupId} onValueChange={value => setFormData(p => ({ ...p, groupId: value }))}>
                    <SelectTrigger id="group">
                        <SelectValue placeholder="Select a group" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">No Group</SelectItem>
                        {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.displayName}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSubmit} disabled={saving}>{saving ? "Saving..." : "Save User"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function PortalUsersPage() {
  const [users, setUsers] = useState<PortalUser[]>([])
  const [groups, setGroups] = useState<PortalGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false)
  const [userToAction, setUserToAction] = useState<{user: PortalUser, action: 'delete'|'activate'|'deactivate'|'reset-password'} | null>(null)
  const [currentUser, setCurrentUser] = useState<PortalUser | null>(null)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const usersResponse = await getPortalUsers(page, limit, searchTerm);
      setUsers(Array.isArray(usersResponse.users) ? usersResponse.users : []);
      setTotal(usersResponse.total || 0);

      const groupsData = await getPortalGroups();
      setGroups(groupsData.groups || []);
    } catch (error: any) {
      if (error.message === "ACCESS_DENIED") {
        router.push('/403');
        return;
      }
      toast({
        title: "Error Fetching Data",
        description: getCoreApiErrorMessage(error),
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      })
    } finally {
      setLoading(false)
    }
  }, [page, limit, searchTerm, toast, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalPages = Math.ceil(total / limit);
  const isAllSelected = users.length > 0 && selectedUsers.length === users.length;

  const handleSelectUser = (userId: string, checked: boolean) => {
    setSelectedUsers(prev => checked ? [...prev, userId] : prev.filter(id => id !== userId));
  };
  
  const handleSelectAll = (checked: boolean) => {
    setSelectedUsers(checked ? users.map(u => u.id) : []);
  };
  
  const handleAdd = () => {
    setCurrentUser(null)
    setIsAddEditDialogOpen(true)
  }

  const handleEdit = (user: PortalUser) => {
    setCurrentUser(user)
    setIsAddEditDialogOpen(true)
  }

  const handleAction = (user: PortalUser, action: 'delete'|'activate'|'deactivate'|'reset-password') => {
    setUserToAction({user, action})
  }

  const executeAction = async () => {
    if (!userToAction) return
    const { user, action } = userToAction
    
    let actionPromise: Promise<any>;
    switch (action) {
      case 'delete': actionPromise = deletePortalUser(user.id); break;
      case 'activate': actionPromise = activatePortalUser(user.id); break;
      case 'deactivate': actionPromise = deactivatePortalUser(user.id); break;
      case 'reset-password': actionPromise = resetPortalUserPassword(user.id); break;
      default: return;
    }
    
    try {
      await actionPromise
      toast({ title: "Success", description: `Action '${action}' completed for user ${user.username}.`, variant: "success" })
      fetchData()
    } catch (err: any) {
      if (err.message === "ACCESS_DENIED") {
        router.push('/403');
        return;
      }
      toast({ title: "Error", description: getCoreApiErrorMessage(err), variant: "destructive" })
    } finally {
      setUserToAction(null)
    }
  }

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    setActionLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const userId of selectedUsers) {
      try {
        switch (action) {
          case 'activate': await activatePortalUser(userId); break;
          case 'deactivate': await deactivatePortalUser(userId); break;
          case 'delete': await deletePortalUser(userId); break;
        }
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    toast({
      title: "Bulk Action Complete",
      description: `${successCount} users updated, ${failCount} failed.`,
      variant: failCount > 0 ? "warning" : "success"
    });

    setActionLoading(false);
    setSelectedUsers([]);
    fetchData();
  };

  const getGroupName = (groupId: string) => {
      return groups.find(g => g.id === groupId)?.displayName || "No Group";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Portal Users"
          description="Manage users who can access this System Portal."
          icon={<BookUser className="h-8 w-8 text-primary" />}
        />
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>All Portal Users</CardTitle>
              <CardDescription>List of all configured portal users and their status.</CardDescription>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedUsers.length > 0 && (
            <div className="p-3 sm:p-4 border-b bg-primary/5 mb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-sm font-medium text-primary">{selectedUsers.length} user(s) selected</span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction("activate")} disabled={actionLoading} className="border-green-500 text-green-700 hover:bg-green-500/10">
                    <Power className="mr-2 h-4 w-4" /> Activate
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction("deactivate")} disabled={actionLoading} className="border-red-500 text-red-700 hover:bg-red-500/10">
                    <PowerOff className="mr-2 h-4 w-4" /> Deactivate
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleBulkAction("delete")} disabled={actionLoading}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedUsers([])} disabled={actionLoading}>
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 px-4">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      disabled={users.length === 0}
                      aria-label="Select all users"
                    />
                  </TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50"/>
                      No portal users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="px-4">
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => handleSelectUser(user.id, Boolean(checked))}
                          aria-label={`Select user ${user.username}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/portal-users/${user.id}`} className="font-medium text-primary hover:underline">
                          {user.username}
                        </Link>
                      </TableCell>
                      <TableCell>{user.fullName || "N/A"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getGroupName(user.groupId)}</TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"} className={user.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" : ""}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu for {user.username}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {user.isActive ? (
                              <DropdownMenuItem onClick={() => handleAction(user, 'deactivate')}>
                                <PowerOff className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleAction(user, 'activate')}>
                                <Power className="mr-2 h-4 w-4" />
                                Activate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleAction(user, 'reset-password')}>
                              <KeyRound className="mr-2 h-4 w-4" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleAction(user, 'delete')}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
           <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            itemsPerPage={limit}
            onPageChange={setPage}
            onItemsPerPageChange={(newLimit) => {
              setLimit(newLimit)
              setPage(1)
            }}
          />
        </CardContent>
      </Card>
      
      <UserDialog user={currentUser} groups={groups} open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen} onSuccess={fetchData} />

      <AlertDialog open={!!userToAction} onOpenChange={(open) => !open && setUserToAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will '{userToAction?.action}' the user "{userToAction?.user.username}".
              {userToAction?.action === 'delete' && " This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction} className={userToAction?.action === 'delete' ? "bg-destructive hover:bg-destructive/90" : ""}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
