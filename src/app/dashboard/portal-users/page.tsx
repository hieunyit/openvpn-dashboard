
"use client"

import { useState, useEffect, useCallback } from "react"
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
import { BookUser, PlusCircle, MoreHorizontal, Edit, Trash2, KeyRound, CheckCircle, AlertTriangle, UserCheck, UserX, FileText, Power, PowerOff } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCoreApiErrorMessage } from "@/lib/utils"

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
  const [formData, setFormData] = useState({ username: "", fullName: "", email: "", password: "", groupId: "" })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const isEditing = !!user

  useEffect(() => {
    if (user && open) {
      setFormData({ 
          username: user.username, 
          fullName: user.fullName || "", 
          email: user.email, 
          password: "", 
          groupId: user.groupId || ""
        })
    } else if (!user && open) {
      setFormData({ username: "", fullName: "", email: "", password: "", groupId: "" })
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
          groupId: formData.groupId || undefined,
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
                        <SelectItem value="">No Group</SelectItem>
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
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [usersData, groupsData] = await Promise.all([getPortalUsers(), getPortalGroups()])
      setUsers(usersData || [])
      setGroups(groupsData || [])
    } catch (error: any) {
      toast({
        title: "Error Fetching Data",
        description: getCoreApiErrorMessage(error),
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])
  
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
      toast({ title: "Error", description: getCoreApiErrorMessage(err), variant: "destructive" })
    } finally {
      setUserToAction(null)
    }
  }

  const getGroupName = (groupId: string) => {
      return groups.find(g => g.id === groupId)?.displayName || "No Group";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookUser className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Portal Users</h1>
            <p className="text-muted-foreground mt-1">Manage users who can access this System Portal.</p>
          </div>
        </div>
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Portal Users</CardTitle>
          <CardDescription>
            List of all configured portal users and their status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
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
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50"/>
                      No portal users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.fullName || "N/A"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getGroupName(user.groupId)}</TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"} className={user.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" : ""}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        {user.isActive ? (
                             <Button variant="ghost" size="sm" onClick={() => handleAction(user, 'deactivate')}>
                                <PowerOff className="mr-2 h-4 w-4" /> Deactivate
                            </Button>
                        ) : (
                             <Button variant="ghost" size="sm" onClick={() => handleAction(user, 'activate')}>
                                <Power className="mr-2 h-4 w-4" /> Activate
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleAction(user, 'reset-password')}>
                          <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleAction(user, 'delete')}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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
