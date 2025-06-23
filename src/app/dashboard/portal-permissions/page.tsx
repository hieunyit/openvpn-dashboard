
"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { getPermissions, createPermission, updatePermission, deletePermission } from "@/lib/api"
import { KeyRound, PlusCircle, MoreHorizontal, Edit, Trash2, CheckCircle, AlertTriangle, FileText } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getCoreApiErrorMessage } from "@/lib/utils"

interface Permission {
  ID: string
  Resource: string
  Action: string
  Description: string
}

function PermissionDialog({ permission, open, onOpenChange, onSuccess }: { permission?: Permission | null, open: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({ Resource: "", Action: "", Description: "" })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const isEditing = !!permission

  useEffect(() => {
    if (permission && open) {
      setFormData({ Resource: permission.Resource, Action: permission.Action, Description: permission.Description })
    } else if (!permission && open) {
      setFormData({ Resource: "", Action: "", Description: "" })
    }
  }, [permission, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEditing && permission) {
        await updatePermission(permission.ID, formData)
      } else {
        await createPermission(formData)
      }
      toast({ title: "Success", description: `Permission has been ${isEditing ? 'updated' : 'created'}.`, variant: "success", icon: <CheckCircle /> })
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
          <DialogTitle>{isEditing ? `Edit Permission` : "Create New Permission"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the details for this permission." : "Create a new permission for the system."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="resource">Resource *</Label>
                <Input id="resource" value={formData.Resource} onChange={e => setFormData(p => ({...p, Resource: e.target.value}))} required placeholder="e.g., openvpn"/>
            </div>
            <div className="space-y-2">
                <Label htmlFor="action">Action *</Label>
                <Input id="action" value={formData.Action} onChange={e => setFormData(p => ({...p, Action: e.target.value}))} required placeholder="e.g., view_users" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={formData.Description} onChange={e => setFormData(p => ({...p, Description: e.target.value}))} placeholder="e.g., View OpenVPN users"/>
            </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSubmit} disabled={saving}>{saving ? "Saving..." : "Save Permission"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function PortalPermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [permissionToAction, setPermissionToAction] = useState<{permission: Permission, action: 'delete'} | null>(null)
  const [currentPermission, setCurrentPermission] = useState<Permission | null>(null)
  const { toast } = useToast()

  const fetchPermissions = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPermissions()
      setPermissions(data || [])
    } catch (error: any) {
      toast({
        title: "Error Fetching Permissions",
        description: getCoreApiErrorMessage(error),
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  const handleEdit = (permission: Permission) => {
    setCurrentPermission(permission)
    setIsDialogOpen(true)
  }
  
  const handleAdd = () => {
    setCurrentPermission(null)
    setIsDialogOpen(true)
  }

  const handleDelete = (permission: Permission) => {
    setPermissionToAction({permission, action: 'delete'})
  }

  const executeDelete = async () => {
    if (!permissionToAction) return
    const { permission } = permissionToAction
    
    try {
      await deletePermission(permission.ID)
      toast({ title: "Success", description: `Permission '${permission.Action}' on '${permission.Resource}' has been deleted.`, variant: "success" })
      fetchPermissions()
    } catch (err: any) {
      toast({ title: "Error", description: getCoreApiErrorMessage(err), variant: "destructive" })
    } finally {
      setPermissionToAction(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KeyRound className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Portal Permissions</h1>
            <p className="text-muted-foreground mt-1">Manage system-wide permissions for user groups.</p>
          </div>
        </div>
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Permission
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Permissions</CardTitle>
          <CardDescription>List of all available permissions in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : permissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50"/>
                      No permissions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  permissions.map((permission) => (
                    <TableRow key={permission.ID}>
                      <TableCell className="font-mono">{permission.Resource}</TableCell>
                      <TableCell className="font-mono">{permission.Action}</TableCell>
                      <TableCell>{permission.Description}</TableCell>
                      <TableCell className="text-right">
                         <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu for {permission.Action}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(permission)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(permission)}
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
        </CardContent>
      </Card>
      
      <PermissionDialog permission={currentPermission} open={isDialogOpen} onOpenChange={setIsDialogOpen} onSuccess={fetchPermissions} />

      <AlertDialog open={!!permissionToAction} onOpenChange={(open) => !open && setPermissionToAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the permission "{permissionToAction?.permission.Action}" on resource "{permissionToAction?.permission.Resource}". This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPermissionToAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className={"bg-destructive hover:bg-destructive/90"}>
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
