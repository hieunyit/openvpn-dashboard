
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getPortalUser, getPortalGroups, updatePortalUser, activatePortalUser, deactivatePortalUser, resetPortalUserPassword } from "@/lib/api"
import {
  ArrowLeft, Edit, Save, X, UserCircle2, Mail, Users, KeyRound, CheckCircle, AlertTriangle, Settings, Power, PowerOff
} from "lucide-react"
import Link from "next/link"
import { getCoreApiErrorMessage } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

interface PortalUser {
  id: string
  username: string
  fullName: string
  email: string
  groupId: string
  isActive: boolean
}

interface PortalGroup {
  ID: string
  DisplayName: string
}

export default function PortalUserDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { toast } = useToast()

  const [user, setUser] = useState<PortalUser | null>(null)
  const [groups, setGroups] = useState<PortalGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    groupId: "none",
  })

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const data = await getPortalUser(id);
      setUser(data);
      setFormData({
        fullName: data.fullName || "",
        email: data.email || "",
        groupId: data.groupId || "none",
      });
    } catch (error) {
      if (error.message === "ACCESS_DENIED") {
        router.push('/403');
        return;
      }
      toast({ title: "Error", description: getCoreApiErrorMessage(error), variant: "destructive" });
      router.push("/dashboard/portal-users");
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupsData = async () => {
    try {
      const data = await getPortalGroups();
      setGroups(data.groups || []);
    } catch (error) {
      if (error.message === "ACCESS_DENIED") {
        router.push('/403');
        return;
      }
      toast({ title: "Error", description: "Could not load groups for selection.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (id) {
      fetchUserData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (editing) {
      fetchGroupsData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload: { fullName: string; groupId: string; email?: string } = {
        fullName: formData.fullName,
        groupId: formData.groupId === "none" ? "" : formData.groupId,
      };
      
      await updatePortalUser(user.id, payload);
      toast({ title: "Success", description: "User updated successfully.", variant: "success", icon: <CheckCircle /> });
      setEditing(false);
      fetchUserData();
    } catch (error) {
      if (error.message === "ACCESS_DENIED") {
        router.push('/403');
        return;
      }
      toast({ title: "Error", description: getCoreApiErrorMessage(error), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleActivation = async (activate: boolean) => {
    if (!user) return;
    setSaving(true);
    try {
      if (activate) {
        await activatePortalUser(user.id);
      } else {
        await deactivatePortalUser(user.id);
      }
      toast({ title: "Success", description: `User has been ${activate ? 'activated' : 'deactivated'}.`, variant: "success" });
      fetchUserData();
    } catch (error) {
      if (error.message === "ACCESS_DENIED") {
        router.push('/403');
        return;
      }
      toast({ title: "Error", description: getCoreApiErrorMessage(error), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };
  
  const handleResetPassword = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await resetPortalUserPassword(user.id);
      toast({ title: "Success", description: "A password reset link has been sent to the user's email.", variant: "success" });
    } catch (error) {
      if (error.message === "ACCESS_DENIED") {
        router.push('/403');
        return;
      }
      toast({ title: "Error", description: getCoreApiErrorMessage(error), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }


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

  if (!user) {
    return <div>User not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" asChild>
            <Link href="/dashboard/portal-users">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
              <UserCircle2 className="mr-3 h-7 w-7 text-primary" />
              {user.username}
            </h1>
            <div className="mt-1.5">
               <Badge variant={user.isActive ? "default" : "secondary"} className={user.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" : ""}>
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>User Details</CardTitle>
                    <CardDescription>View and edit user information.</CardDescription>
                </div>
                {editing ? (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
                        <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
                    </div>
                ) : (
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                )}
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" value={user.username} disabled />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={user.email} disabled />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input id="fullName" value={editing ? formData.fullName : user.fullName} onChange={(e) => setFormData(p => ({...p, fullName: e.target.value}))} disabled={!editing || saving} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="group">Group</Label>
                        {editing ? (
                            <Select value={formData.groupId} onValueChange={value => setFormData(p => ({ ...p, groupId: value }))} disabled={saving}>
                                <SelectTrigger id="group"><SelectValue placeholder="Select a group" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Group</SelectItem>
                                    {groups.map(g => <SelectItem key={g.ID} value={g.ID}>{g.DisplayName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        ) : (
                             <Input id="group-display" value={groups.find(g => g.ID === user.groupId)?.DisplayName || "No Group"} disabled />
                        )}
                    </div>
                </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Settings className="mr-2 h-5 w-5 text-primary"/>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {user.isActive ? (
                        <Button variant="outline" className="w-full justify-start text-red-600 hover:bg-red-50" onClick={() => handleActivation(false)} disabled={saving}>
                            <PowerOff className="mr-2 h-4 w-4" /> Deactivate User
                        </Button>
                    ) : (
                         <Button variant="outline" className="w-full justify-start text-green-600 hover:bg-green-50" onClick={() => handleActivation(true)} disabled={saving}>
                            <Power className="mr-2 h-4 w-4" /> Activate User
                        </Button>
                    )}
                    <Button variant="outline" className="w-full justify-start" onClick={handleResetPassword} disabled={saving}>
                        <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}
