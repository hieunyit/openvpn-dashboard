
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
import { getPortalGroups, createPortalGroup, updatePortalGroup, deletePortalGroup, getPermissions, getGroupPermissions, updateGroupPermissions } from "@/lib/api"
import { Users, PlusCircle, MoreHorizontal, Edit, Trash2, KeyRound, CheckCircle, AlertTriangle, FileText } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { getCoreApiErrorMessage } from "@/lib/utils"

interface PortalGroup {
  id: string
  name: string
  displayName: string
  isActive: boolean
}

interface Permission {
  id: string
  action: string
  resource: string
  description: string
}

function ManagePermissionsDialog({ group, open, onOpenChange, onSuccess }: { group: PortalGroup, open: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void }) {
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [groupPermissions, setGroupPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setLoading(true)
      Promise.all([getPermissions(), getGroupPermissions(group.id)])
        .then(([allPerms, groupPerms]) => {
          setAllPermissions(allPerms || [])
          setGroupPermissions((groupPerms || []).map((p: Permission) => p.id))
        })
        .catch(err => {
          toast({ title: "Error", description: getCoreApiErrorMessage(err), variant: "destructive" })
        })
        .finally(() => setLoading(false))
    }
  }, [group.id, open, toast])

  const handlePermissionChange = (permId: string, checked: boolean) => {
    setGroupPermissions(prev => checked ? [...prev, permId] : prev.filter(id => id !== permId))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateGroupPermissions(group.id, groupPermissions)
      toast({ title: "Success", description: "Permissions updated successfully.", variant: "success" })
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: "Error", description: getCoreApiErrorMessage(err), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }
  
  const groupedPermissions = allPermissions.reduce((acc, perm) => {
    acc[perm.resource] = acc[perm.resource] || [];
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Permissions for {group.displayName}</DialogTitle>
          <DialogDescription>Select the permissions this group should have.</DialogDescription>
        </DialogHeader>
        {loading ? (
            <div className="py-8 text-center">Loading permissions...</div>
        ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                {Object.entries(groupedPermissions).map(([resource, perms]) => (
                    <div key={resource}>
                        <h4 className="font-semibold text-base mb-2 capitalize border-b pb-1">{resource}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        {perms.map(perm => (
                            <div key={perm.id} className="flex items-center space-x-2">
                            <Checkbox
                                id={`perm-${perm.id}`}
                                checked={groupPermissions.includes(perm.id)}
                                onCheckedChange={(checked) => handlePermissionChange(perm.id, Boolean(checked))}
                            />
                            <Label htmlFor={`perm-${perm.id}`} className="capitalize font-normal">{perm.action}</Label>
                            </div>
                        ))}
                        </div>
                    </div>
                ))}
            </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save Permissions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function GroupDialog({ group, open, onOpenChange, onSuccess }: { group?: PortalGroup | null, open: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({ name: "", displayName: "" })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const isEditing = !!group

  useEffect(() => {
    if (group && open) {
      setFormData({ name: group.name, displayName: group.displayName })
    } else if (!group && open) {
      setFormData({ name: "", displayName: "" })
    }
  }, [group, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEditing && group) {
        await updatePortalGroup(group.id, formData)
      } else {
        await createPortalGroup(formData)
      }
      toast({ title: "Success", description: `Group ${formData.displayName} has been ${isEditing ? 'updated' : 'created'}.`, variant: "success", icon: <CheckCircle /> })
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
          <DialogTitle>{isEditing ? `Edit Group: ${group?.displayName}` : "Create New Portal Group"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the details for this portal group." : "Create a new group to assign permissions to portal users."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input id="displayName" value={formData.displayName} onChange={e => setFormData(p => ({...p, displayName: e.target.value}))} required />
            </div>
             <div className="space-y-2">
                <Label htmlFor="name">Unique Name *</Label>
                <Input id="name" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} required placeholder="e.g., vpn_admins (no spaces)" />
            </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSubmit} disabled={saving}>{saving ? "Saving..." : "Save Group"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function PortalGroupsPage() {
  const [groups, setGroups] = useState<PortalGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false)
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<PortalGroup | null>(null)
  const [currentGroup, setCurrentGroup] = useState<PortalGroup | null>(null)
  const { toast } = useToast()

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPortalGroups()
      setGroups(data || [])
    } catch (error: any) {
      toast({
        title: "Error Fetching Groups",
        description: getCoreApiErrorMessage(error),
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const handleEdit = (group: PortalGroup) => {
    setCurrentGroup(group)
    setIsAddEditDialogOpen(true)
  }
  
  const handleAdd = () => {
    setCurrentGroup(null)
    setIsAddEditDialogOpen(true)
  }
  
  const handleManagePermissions = (group: PortalGroup) => {
      setCurrentGroup(group)
      setIsPermissionsDialogOpen(true)
  }

  const handleDelete = (group: PortalGroup) => {
    setGroupToDelete(group)
  }

  const executeDelete = async () => {
    if (!groupToDelete) return
    try {
      await deletePortalGroup(groupToDelete.id)
      toast({ title: "Success", description: "Group deleted successfully.", variant: "success" })
      fetchGroups()
    } catch (err: any) {
      toast({ title: "Error", description: getCoreApiErrorMessage(err), variant: "destructive" })
    } finally {
      setGroupToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Portal Groups & Permissions</h1>
            <p className="text-muted-foreground mt-1">Define user groups and assign granular permissions.</p>
          </div>
        </div>
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Group
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Portal Groups</CardTitle>
          <CardDescription>
            List of all configured portal groups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Unique Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : groups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50"/>
                      No groups found.
                    </TableCell>
                  </TableRow>
                ) : (
                  groups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.displayName}</TableCell>
                      <TableCell>{group.name}</TableCell>
                      <TableCell>
                        <Badge variant={group.isActive ? "default" : "secondary"} className={group.isActive ? "bg-green-100 text-green-800" : ""}>
                          {group.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleManagePermissions(group)}>
                          <KeyRound className="mr-2 h-4 w-4" /> Permissions
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(group)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(group)}>
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
      
      {currentGroup && isPermissionsDialogOpen && (
        <ManagePermissionsDialog group={currentGroup} open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen} onSuccess={fetchGroups} />
      )}

      <GroupDialog group={currentGroup} open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen} onSuccess={fetchGroups} />

      <AlertDialog open={!!groupToDelete} onOpenChange={(open) => !open && setGroupToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the group "{groupToDelete?.displayName}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGroupToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
