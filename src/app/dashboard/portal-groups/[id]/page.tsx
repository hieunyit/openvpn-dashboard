
"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { getPortalGroup, getPermissions, updatePortalGroup, updateGroupPermissions } from "@/lib/api"
import {
  ArrowLeft, Edit, Save, X, Users, KeyRound, CheckCircle, AlertTriangle, Settings, PowerOff, Power
} from "lucide-react"
import Link from "next/link"
import { getCoreApiErrorMessage } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

interface Permission {
  ID: string
  Action: string
  Resource: string
  Description: string
}

interface PortalGroup {
  ID: string
  Name: string
  DisplayName: string
  IsActive: boolean
  Permissions?: Permission[]
}

export default function PortalGroupDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { toast } = useToast()

  const [group, setGroup] = useState<PortalGroup | null>(null)
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [initialGroupPermissions, setInitialGroupPermissions] = useState<string[]>([])
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({ DisplayName: "", Name: "" })

  const fetchGroupData = async () => {
    try {
      setLoading(true)
      const groupData = await getPortalGroup(id)
      
      setGroup(groupData)
      setFormData({ DisplayName: groupData.DisplayName, Name: groupData.Name })
      
      const permIds = (groupData.Permissions || []).map((p: Permission) => p.ID)
      setInitialGroupPermissions(permIds)
      setSelectedPermissions(permIds)
    } catch (error) {
      toast({ title: "Error", description: getCoreApiErrorMessage(error), variant: "destructive" })
      router.push("/dashboard/portal-groups")
    } finally {
      setLoading(false)
    }
  }

  const fetchAllPermissions = async () => {
     try {
      const allPermsData = await getPermissions()
      setAllPermissions(allPermsData || [])
    } catch (error) {
      toast({ title: "Error", description: "Could not load available permissions.", variant: "destructive" })
    }
  }

  useEffect(() => {
    if (id) {
      fetchGroupData()
      fetchAllPermissions()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleSaveDetails = async () => {
    if (!group) return
    setSaving(true)
    try {
      await updatePortalGroup(id, { Name: formData.Name, DisplayName: formData.DisplayName })
      toast({ title: "Success", description: "Group details updated.", variant: "success", icon: <CheckCircle /> })
      setEditing(false)
      fetchGroupData()
    } catch (error) {
      toast({ title: "Error", description: getCoreApiErrorMessage(error), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }
  
  const handleSavePermissions = async () => {
    if (!group) return
    setSaving(true)
    try {
      await updateGroupPermissions(id, selectedPermissions)
      toast({ title: "Success", description: "Group permissions updated.", variant: "success", icon: <CheckCircle /> })
      setInitialGroupPermissions(selectedPermissions)
    } catch (error) {
      toast({ title: "Error", description: getCoreApiErrorMessage(error), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }
  
  const handleActivation = async (activate: boolean) => {
    if (!group) return
    setSaving(true)
    try {
        await updatePortalGroup(id, { IsActive: activate });
        toast({ title: "Success", description: `Group has been ${activate ? 'activated' : 'deactivated'}.`, variant: "success" });
        fetchGroupData();
    } catch (error) {
        toast({ title: "Error", description: getCoreApiErrorMessage(error), variant: "destructive" });
    } finally {
        setSaving(false)
    }
  }


  const groupedPermissions = useMemo(() => {
    return allPermissions.reduce((acc, perm) => {
      const resource = perm.Resource.charAt(0).toUpperCase() + perm.Resource.slice(1)
      acc[resource] = acc[resource] || []
      acc[resource].push(perm)
      return acc
    }, {} as Record<string, Permission[]>)
  }, [allPermissions])

  if (loading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-48" />
            <div className="grid gap-6 lg:grid-cols-3">
                <Skeleton className="h-64 lg:col-span-2" />
                <Skeleton className="h-48" />
            </div>
        </div>
    )
  }

  if (!group) {
    return <div>Group not found.</div>
  }

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" asChild>
            <Link href="/dashboard/portal-groups">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
              <Users className="mr-3 h-7 w-7 text-primary" />
              {group.DisplayName}
            </h1>
            <div className="mt-1.5">
               <Badge variant={group.IsActive ? "default" : "secondary"} className={group.IsActive ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" : ""}>
                {group.IsActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Group Details</CardTitle>
                <CardDescription>Edit the group's name.</CardDescription>
              </div>
               {editing ? (
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
                    <Button size="sm" onClick={handleSaveDetails} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
                </div>
               ) : (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
               )}
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input id="displayName" value={formData.DisplayName} onChange={(e) => setFormData(p => ({...p, DisplayName: e.target.value}))} disabled={!editing || saving} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="name">Unique Name (Identifier)</Label>
                    <Input id="name" value={formData.Name} onChange={(e) => setFormData(p => ({...p, Name: e.target.value}))} disabled={!editing || saving} />
                </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><KeyRound className="mr-2 h-5 w-5 text-primary"/>Permissions</CardTitle>
              <CardDescription>
                Assign permissions to this group. Changes are saved when you click the button below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {Object.entries(groupedPermissions).sort(([a],[b]) => a.localeCompare(b)).map(([resource, perms]) => (
                    <div key={resource}>
                        <h4 className="font-semibold text-base mb-2 capitalize border-b pb-1">{resource}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
                            {perms.map(perm => (
                                <div key={perm.ID} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`perm-${perm.ID}`} 
                                        checked={selectedPermissions.includes(perm.ID)}
                                        onCheckedChange={(checked) => {
                                            setSelectedPermissions(prev => checked ? [...prev, perm.ID] : prev.filter(id => id !== perm.ID))
                                        }}
                                    />
                                    <Label htmlFor={`perm-${perm.ID}`} className="font-normal cursor-pointer capitalize">{perm.Action}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </CardContent>
            <CardFooter className="border-t pt-6">
                <Button onClick={handleSavePermissions} disabled={saving || JSON.stringify(initialGroupPermissions.sort()) === JSON.stringify(selectedPermissions.sort())}>
                    <Save className="mr-2 h-4 w-4"/>
                    {saving ? "Saving Permissions..." : "Save Permissions"}
                </Button>
            </CardFooter>
          </Card>
        </div>
         <div className="space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Settings className="mr-2 h-5 w-5 text-primary"/>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {group.IsActive ? (
                        <Button variant="outline" className="w-full justify-start text-red-600 hover:bg-red-50" onClick={() => handleActivation(false)} disabled={saving}>
                            <PowerOff className="mr-2 h-4 w-4" /> Deactivate Group
                        </Button>
                    ) : (
                         <Button variant="outline" className="w-full justify-start text-green-600 hover:bg-green-50" onClick={() => handleActivation(true)} disabled={saving}>
                            <Power className="mr-2 h-4 w-4" /> Activate Group
                        </Button>
                    )}
                </CardContent>
             </Card>
        </div>
      </div>
    </div>
  )
}
