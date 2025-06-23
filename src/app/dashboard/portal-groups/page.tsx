
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { getPortalGroups, createPortalGroup, updatePortalGroup, deletePortalGroup, getPermissions, getGroupPermissions, updateGroupPermissions } from "@/lib/api"
import { Users, PlusCircle, MoreHorizontal, Edit, Trash2, KeyRound, CheckCircle, AlertTriangle, FileText, Search, Power, PowerOff } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
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

interface PortalGroup {
  ID: string
  Name: string
  DisplayName: string
  IsActive: boolean
}

interface Permission {
  ID: string
  Action: string
  Resource: string
  Description: string
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
      Promise.all([getPermissions(), getGroupPermissions(group.ID)])
        .then(([allPerms, groupPerms]) => {
          setAllPermissions(allPerms || [])
          setGroupPermissions((groupPerms || []).map((p: Permission) => p.ID))
        })
        .catch(err => {
          toast({ title: "Error", description: getCoreApiErrorMessage(err), variant: "destructive" })
        })
        .finally(() => setLoading(false))
    }
  }, [group.ID, open, toast])

  const handlePermissionChange = (permId: string, checked: boolean) => {
    setGroupPermissions(prev => checked ? [...prev, permId] : prev.filter(id => id !== permId))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateGroupPermissions(group.ID, groupPermissions)
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
    const resource = perm.Resource.charAt(0).toUpperCase() + perm.Resource.slice(1);
    acc[resource] = acc[resource] || [];
    acc[resource].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Permissions for {group.DisplayName}</DialogTitle>
          <DialogDescription>Select the permissions this group should have.</DialogDescription>
        </DialogHeader>
        {loading ? (
            <div className="py-8 text-center">Loading permissions...</div>
        ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                {Object.entries(groupedPermissions).sort(([a], [b]) => a.localeCompare(b)).map(([resource, perms]) => (
                    <div key={resource}>
                        <h4 className="font-semibold text-base mb-2 capitalize border-b pb-1">{resource}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        {perms.map(perm => (
                            <div key={perm.ID} className="flex items-center space-x-2">
                            <Checkbox
                                id={`perm-${perm.ID}`}
                                checked={groupPermissions.includes(perm.ID)}
                                onCheckedChange={(checked) => handlePermissionChange(perm.ID, Boolean(checked))}
                            />
                            <Label htmlFor={`perm-${perm.ID}`} className="capitalize font-normal">{perm.Action}</Label>
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
  const [formData, setFormData] = useState({ Name: "", DisplayName: "" })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const isEditing = !!group

  useEffect(() => {
    if (group && open) {
      setFormData({ Name: group.Name, DisplayName: group.DisplayName })
    } else if (!group && open) {
      setFormData({ Name: "", DisplayName: "" })
    }
  }, [group, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEditing && group) {
        await updatePortalGroup(group.ID, { Name: formData.Name, DisplayName: formData.DisplayName })
      } else {
        await createPortalGroup(formData)
      }
      toast({ title: "Success", description: `Group ${formData.DisplayName} has been ${isEditing ? 'updated' : 'created'}.`, variant: "success", icon: <CheckCircle /> })
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
          <DialogTitle>{isEditing ? `Edit Group: ${group?.DisplayName}` : "Create New Portal Group"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the details for this portal group." : "Create a new group to assign permissions to portal users."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input id="displayName" value={formData.DisplayName} onChange={e => setFormData(p => ({...p, DisplayName: e.target.value}))} required />
            </div>
             <div className="space-y-2">
                <Label htmlFor="name">Unique Name *</Label>
                <Input id="name" value={formData.Name} onChange={e => setFormData(p => ({...p, Name: e.target.value}))} required placeholder="e.g., vpn_admins (no spaces)" />
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
  const [groupToAction, setGroupToAction] = useState<{group: PortalGroup, action: 'delete' | 'activate' | 'deactivate'} | null>(null)
  const [currentGroup, setCurrentGroup] = useState<PortalGroup | null>(null)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const { toast } = useToast()

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPortalGroups(page, limit, searchTerm);
      setGroups(data.groups || [])
      setTotal(data.total || 0)
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
  }, [page, limit, searchTerm, toast]);

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])
  
  const totalPages = Math.ceil(total / limit);
  const isAllSelected = groups.length > 0 && selectedGroups.length === groups.length;

  const handleSelectGroup = (groupId: string, checked: boolean) => {
    setSelectedGroups(prev => checked ? [...prev, groupId] : prev.filter(id => id !== groupId));
  };
  
  const handleSelectAll = (checked: boolean) => {
    setSelectedGroups(checked ? groups.map(g => g.ID) : []);
  };

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

  const handleAction = (group: PortalGroup, action: 'delete'|'activate'|'deactivate') => {
    setGroupToAction({group, action})
  }

  const executeAction = async () => {
    if (!groupToAction) return
    const { group, action } = groupToAction
    
    let actionPromise: Promise<any>;
    switch (action) {
      case 'delete': actionPromise = deletePortalGroup(group.ID); break;
      case 'activate': actionPromise = updatePortalGroup(group.ID, { IsActive: true }); break;
      case 'deactivate': actionPromise = updatePortalGroup(group.ID, { IsActive: false }); break;
      default: return;
    }
    
    try {
      await actionPromise
      toast({ title: "Success", description: `Action '${action}' completed for group ${group.DisplayName}.`, variant: "success" })
      fetchGroups()
    } catch (err: any) {
      toast({ title: "Error", description: getCoreApiErrorMessage(err), variant: "destructive" })
    } finally {
      setGroupToAction(null)
    }
  }

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    setActionLoading(true)
    let successCount = 0;
    let failCount = 0;
    
    for (const groupId of selectedGroups) {
        try {
            switch(action) {
                case 'activate': await updatePortalGroup(groupId, {IsActive: true}); break;
                case 'deactivate': await updatePortalGroup(groupId, {IsActive: false}); break;
                case 'delete': await deletePortalGroup(groupId); break;
            }
            successCount++;
        } catch (error) {
            failCount++;
        }
    }
    
    toast({
        title: "Bulk Action Complete",
        description: `${successCount} groups updated, ${failCount} failed.`,
        variant: failCount > 0 ? "warning" : "success"
    });
    
    setActionLoading(false)
    setSelectedGroups([])
    fetchGroups()
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>All Portal Groups</CardTitle>
              <CardDescription>List of all configured portal groups.</CardDescription>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedGroups.length > 0 && (
            <div className="p-3 sm:p-4 border-b bg-primary/5 mb-4 rounded-md">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span className="text-sm font-medium text-primary">{selectedGroups.length} group(s) selected</span>
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
                        <Button variant="ghost" size="sm" onClick={() => setSelectedGroups([])} disabled={actionLoading}>
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
                          disabled={groups.length === 0}
                          aria-label="Select all groups"
                      />
                  </TableHead>
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
                      <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : groups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50"/>
                      {searchTerm ? "No groups found for your search." : "No groups found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  groups.map((group) => (
                    <TableRow key={group.ID}>
                       <TableCell className="px-4">
                        <Checkbox
                          checked={selectedGroups.includes(group.ID)}
                          onCheckedChange={(checked) => handleSelectGroup(group.ID, Boolean(checked))}
                          aria-label={`Select group ${group.DisplayName}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/portal-groups/${group.ID}`} className="font-medium text-primary hover:underline">
                          {group.DisplayName}
                        </Link>
                      </TableCell>
                      <TableCell>{group.Name}</TableCell>
                      <TableCell>
                        <Badge variant={group.IsActive ? "default" : "secondary"} className={group.IsActive ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" : ""}>
                          {group.IsActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                         <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu for {group.DisplayName}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                             <DropdownMenuItem onClick={() => handleManagePermissions(group)}>
                              <KeyRound className="mr-2 h-4 w-4" /> Permissions
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(group)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            {group.IsActive ? (
                              <DropdownMenuItem onClick={() => handleAction(group, 'deactivate')}>
                                <PowerOff className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleAction(group, 'activate')}>
                                <Power className="mr-2 h-4 w-4" />
                                Activate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleAction(group, 'delete')}
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
      
      {currentGroup && isPermissionsDialogOpen && (
        <ManagePermissionsDialog group={currentGroup} open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen} onSuccess={fetchGroups} />
      )}

      <GroupDialog group={currentGroup} open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen} onSuccess={fetchGroups} />

      <AlertDialog open={!!groupToAction} onOpenChange={(open) => !open && setGroupToAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will '{groupToAction?.action}' the group "{groupToAction?.group.DisplayName}".
               {groupToAction?.action === 'delete' && " This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGroupToAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction} className={groupToAction?.action === 'delete' ? "bg-destructive hover:bg-destructive/90" : ""}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
