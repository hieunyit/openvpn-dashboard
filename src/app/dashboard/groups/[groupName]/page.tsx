
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { getGroup, updateGroup, getUsers, performGroupAction } from "@/lib/api"
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
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Edit, Save, X, Shield, Users, Settings, FolderKanban, LockKeyhole, UnlockKeyhole, Activity, Power, Network, Router, KeyRound, Info } from "lucide-react"
import Link from "next/link"

interface Group {
  groupName: string
  authMethod: string
  role: string
  mfa: boolean
  denyAccess: boolean
  accessControl: string[]
  groupRange?: string[]
  groupSubnet?: string[]
  isEnabled?: boolean
  memberCount?: number
  createdAt?: string
  lastModified?: string;
  lastUsed?: string;
}

interface User {
  username: string
  email: string
  groupName?: string
}

export default function GroupDetailPage() {
  const params = useParams()
  const groupName = params.groupName as string
  const router = useRouter()
  const { toast } = useToast()

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    role: "",
    accessControl: "",
    denyAccess: false,
    mfa: false,
    groupRange: "",
    groupSubnet: "",
  })

  const [isConfirmAccessActionDialogOpen, setIsConfirmAccessActionDialogOpen] = useState(false)
  const [confirmAccessActionDetails, setConfirmAccessActionDetails] = useState<{ action: "allow" | "deny"; groupName: string } | null>(null)

  const [isConfirmEnableActionDialogOpen, setIsConfirmEnableActionDialogOpen] = useState(false);
  const [enableActionDetails, setEnableActionDetails] = useState<{ groupName: string } | null>(null);


  useEffect(() => {
    if (groupName) {
      fetchGroup()
      fetchGroupMembers()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupName])

  const fetchGroup = async () => {
    try {
      setLoading(true)
      const groupData = await getGroup(groupName)
      if (groupData) {
        const processedGroupData = {
            ...groupData,
            denyAccess: groupData.denyAccess ?? false,
            mfa: groupData.mfa ?? false,
            isEnabled: typeof groupData.isEnabled === 'boolean' ? groupData.isEnabled : true 
        };
        setGroup(processedGroupData)
        setFormData({
          role: processedGroupData.role || "User",
          accessControl: processedGroupData.accessControl?.join(", ") || "",
          denyAccess: processedGroupData.denyAccess,
          mfa: processedGroupData.mfa,
          groupRange: processedGroupData.groupRange?.join(", ") || "",
          groupSubnet: processedGroupData.groupSubnet?.join(", ") || "",
        })
      } else {
        toast({
          title: "Group not found",
          description: `Group ${groupName} could not be found. Redirecting...`,
          variant: "destructive",
        })
        router.push("/dashboard/groups")
      }
    } catch (error: any) {
      toast({
        title: "Error Loading Group",
        description: error.message || "Failed to load group details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchGroupMembers = async () => {
    try {
      const usersData = await getUsers(1, 100, { groupName }) // Fetch up to 100 members for preview
      setMembers(usersData.users || [])
    } catch (error: any) {
       toast({
        title: "Error Fetching Members",
        description: error.message || "Could not load group members.",
        variant: "destructive"
      });
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }
  
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    if (!group) return;
    try {
      setSaving(true)
      const groupDataToUpdate: {
        role?: string;
        mfa?: boolean;
        accessControl?: string[];
        denyAccess?: boolean;
        groupRange?: string[];
        groupSubnet?: string[];
      } = {
        role: formData.role,
        mfa: formData.mfa,
        accessControl: formData.accessControl.split(",").map((ac) => ac.trim()).filter((ac) => ac),
        denyAccess: formData.denyAccess,
        groupRange: formData.groupRange.split(",").map((r) => r.trim()).filter((r) => r),
        groupSubnet: formData.groupSubnet.split(",").map((s) => s.trim()).filter((s) => s),
      }

      await updateGroup(group.groupName, groupDataToUpdate)

      toast({
        title: "✅ Group Updated Successfully",
        description: `Group ${group.groupName} has been updated.`,
      })

      setEditing(false)
      fetchGroup() 
    } catch (error: any) {
      toast({
        title: "❌ Failed to Update Group",
        description: error.message || "An unexpected error occurred. Please check your input and try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const initiateDenyAccessAction = (action: "allow" | "deny") => {
    if (!group) return;
    setConfirmAccessActionDetails({ action, groupName: group.groupName });
    setIsConfirmAccessActionDialogOpen(true);
  };

  const executeDenyAccessAction = async () => {
    if (!confirmAccessActionDetails || !group) return;
    const { action, groupName: targetGroupName } = confirmAccessActionDetails;

    try {
      setSaving(true);
      const newDenyAccessState = action === "deny";
      await updateGroup(targetGroupName, { denyAccess: newDenyAccessState });
      toast({
        title: `✅ VPN Access ${action === "allow" ? "Allowed" : "Denied"}`,
        description: `VPN access for group ${targetGroupName} has been ${action === "allow" ? "allowed" : "denied"}.`,
      });
      fetchGroup(); 
    } catch (error: any) {
      console.error(`Failed to ${action} VPN access for group:`, error); // Keep specific log
      toast({
        title: `❌ Failed to ${action.charAt(0).toUpperCase() + action.slice(1)} VPN Access`,
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setIsConfirmAccessActionDialogOpen(false);
      setConfirmAccessActionDetails(null);
    }
  };

  const initiateEnableAction = () => {
    if (!group) return;
    setEnableActionDetails({ groupName: group.groupName });
    setIsConfirmEnableActionDialogOpen(true);
  };

  const executeEnableAction = async () => {
    if (!enableActionDetails || !group) return;
    const { groupName: targetGroupName } = enableActionDetails;

    try {
      setSaving(true);
      await performGroupAction(targetGroupName, "enable");
      toast({
        title: `✅ Group Enabled Successfully`,
        description: `Group ${targetGroupName} has been enabled.`,
      });
      fetchGroup(); 
    } catch (error: any) {
      console.error(`Failed to enable group:`, error); // Keep specific log
      toast({
        title: "❌ Failed to Enable Group",
        description: error.message || `An unexpected error occurred. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setIsConfirmEnableActionDialogOpen(false);
      setEnableActionDetails(null);
    }
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/groups"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-96 md:col-span-2 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="space-y-6">
         <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/groups"><ArrowLeft className="h-4 w-4 mr-1" />Back to Groups</Link>
          </Button>
        <Card className="shadow-lg border-destructive bg-destructive/10">
          <CardContent className="p-8 text-center">
            <X className="mx-auto h-12 w-12 text-destructive mb-4" />
            <CardTitle className="text-xl text-destructive">Group Not Found</CardTitle>
            <CardDescription className="text-destructive/80">The requested group could not be found or you do not have permission to view it.</CardDescription>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const getStatusBadge = () => {
    if (group.isEnabled === false) {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-500 dark:text-yellow-400 dark:border-yellow-600"><Activity className="mr-1.5 h-3 w-3" />System Disabled</Badge>;
    }
    if (group.denyAccess) {
      return <Badge variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30"><LockKeyhole className="mr-1.5 h-3 w-3" /> Access Denied</Badge>;
    }
    return <Badge variant="default" className="bg-green-600/10 text-green-700 dark:text-green-400 border border-green-600/30"><UnlockKeyhole className="mr-1.5 h-3 w-3" /> Access Allowed</Badge>;
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" asChild>
            <Link href="/dashboard/groups">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to Groups</span>
            </Link>
          </Button>
          <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center">
                  <FolderKanban className="mr-3 h-7 w-7 text-primary flex-shrink-0" />
                  {group.groupName}
              </h1>
              <div className="mt-1.5">{getStatusBadge()}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving} className="w-full sm:w-auto">
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
              <Edit className="mr-2 h-4 w-4" />
              Edit Group
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-md border-0">
            <CardHeader className="border-b">
              <CardTitle className="text-xl font-semibold text-foreground flex items-center"><Info className="mr-2 h-5 w-5 text-primary"/>Group Information</CardTitle>
              <CardDescription className="text-muted-foreground">View and edit group settings and configuration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="groupName" className="text-sm font-medium text-muted-foreground">Group Name</Label>
                  <Input id="groupName" value={group.groupName} disabled className="bg-muted/70 cursor-not-allowed"/>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="authMethod" className="text-sm font-medium text-muted-foreground">Authentication Method</Label>
                  <div className="p-2.5 border rounded-md bg-muted/70 text-sm">
                      <Badge variant="outline">{group.authMethod}</Badge>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="role" className="text-sm font-medium text-muted-foreground">Role</Label>
                  {editing ? (
                    <Select value={formData.role} onValueChange={(value) => handleSelectChange("role", value)}>
                      <SelectTrigger id="role"><SelectValue placeholder="Select role" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="User">👤 User</SelectItem>
                        <SelectItem value="Admin">👑 Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                   <div className="p-2.5 border rounded-md bg-muted/70 text-sm">
                      <Badge variant={group.role === "Admin" ? "default" : "secondary"}>{group.role}</Badge>
                  </div>
                  )}
                </div>
                
                 <div className="flex items-center space-x-3 pt-3 md:pt-5">
                    <Checkbox
                        id="mfa"
                        checked={editing ? formData.mfa : group.mfa}
                        onCheckedChange={(checked) => editing && handleCheckboxChange("mfa", Boolean(checked))}
                        disabled={!editing}
                    />
                    <Label htmlFor="mfa" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <KeyRound className="h-4 w-4 text-muted-foreground" /> Require MFA
                    </Label>
                </div>

              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="accessControl" className="text-sm font-medium text-muted-foreground">Access Control Rules</Label>
                {editing ? (
                  <Textarea id="accessControl" name="accessControl" value={formData.accessControl} onChange={handleChange} placeholder="e.g., 192.168.1.0/24, 10.0.0.0/8" rows={3} className="min-h-[70px]" />
                ) : (
                  <div className="p-3 border rounded-md bg-muted/70 min-h-[40px] text-sm">
                    {group.accessControl && group.accessControl.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {group.accessControl.map((rule, index) => ( <Badge key={index} variant="outline" className="bg-background">{rule}</Badge> ))}
                      </div>
                    ) : (<span className="text-muted-foreground italic">No access control rules</span>)}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                    <Label htmlFor="groupRange" className="text-sm font-medium text-muted-foreground">Group IP Range</Label>
                    {editing ? (
                        <Textarea id="groupRange" name="groupRange" value={formData.groupRange} onChange={handleChange} placeholder="e.g., 10.8.0.10-10.8.0.100" rows={3} className="min-h-[70px]" />
                    ) : (
                        <div className="p-3 border rounded-md bg-muted/70 min-h-[40px] text-sm">
                        {group.groupRange && group.groupRange.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                            {group.groupRange.map((range, index) => ( <Badge key={index} variant="outline" className="bg-background flex items-center"><Network className="h-3.5 w-3.5 mr-1.5" /> {range}</Badge> ))}
                            </div>
                        ) : (<span className="text-muted-foreground italic">No group ranges defined</span>)}
                        </div>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="groupSubnet" className="text-sm font-medium text-muted-foreground">Group Subnet</Label>
                    {editing ? (
                        <Textarea id="groupSubnet" name="groupSubnet" value={formData.groupSubnet} onChange={handleChange} placeholder="e.g., 10.8.0.0/24" rows={3} className="min-h-[70px]" />
                    ) : (
                        <div className="p-3 border rounded-md bg-muted/70 min-h-[40px] text-sm">
                        {group.groupSubnet && group.groupSubnet.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                            {group.groupSubnet.map((subnet, index) => ( <Badge key={index} variant="outline" className="bg-background flex items-center"><Router className="h-3.5 w-3.5 mr-1.5" /> {subnet}</Badge> ))}
                            </div>
                        ) : (<span className="text-muted-foreground italic">No group subnets defined</span>)}
                        </div>
                    )}
                </div>
              </div>
              
              {editing && (
                <div className="p-4 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border space-y-1.5">
                    <div className="flex items-center space-x-3">
                        <Checkbox id="denyAccess" checked={formData.denyAccess} onCheckedChange={(checked) => handleCheckboxChange("denyAccess", Boolean(checked))} />
                        <Label htmlFor="denyAccess" className="text-sm font-medium text-foreground">Deny VPN Access to this Group</Label>
                    </div>
                    <p className="text-xs text-muted-foreground pl-7">If checked, users in this group (not individually allowed) will be denied VPN access.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-md border-0">
            <CardHeader className="border-b">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center"><Settings className="mr-2 h-5 w-5 text-primary"/>Group Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              {group.denyAccess ? (
                <Button variant="outline" className="w-full justify-start hover:bg-green-500/10 border-green-500 text-green-700 dark:text-green-400 dark:border-green-600 dark:hover:bg-green-700/20" onClick={() => initiateDenyAccessAction("allow")} disabled={saving || group.isEnabled === false} title={group.isEnabled === false ? "Group is system disabled" : "Allow VPN access for this group"}>
                  <UnlockKeyhole className="mr-2 h-4 w-4" /> Allow VPN Access
                </Button>
              ) : (
                <Button variant="outline" className="w-full justify-start hover:bg-red-500/10 border-red-500 text-red-700 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-700/20" onClick={() => initiateDenyAccessAction("deny")} disabled={saving || group.isEnabled === false} title={group.isEnabled === false ? "Group is system disabled" : "Deny VPN access for this group"}>
                  <LockKeyhole className="mr-2 h-4 w-4" /> Deny VPN Access
                </Button>
              )}

              {group.isEnabled === false && (
                 <Button variant="outline" className="w-full justify-start hover:bg-green-500/10 border-green-500 text-green-700 dark:text-green-400 dark:border-green-600 dark:hover:bg-green-700/20" onClick={initiateEnableAction} disabled={saving} title="Enable this group system-wide">
                  <Power className="mr-2 h-4 w-4" /> Enable Group
                </Button>
              )}
              
              {group.isEnabled === false && (
                  <p className="text-xs text-center text-yellow-600 dark:text-yellow-400 pt-1">
                      VPN access actions are disabled because the group is system disabled.
                  </p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md border-0">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Users className="h-5 w-5 text-primary" />
                Group Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No members in this group.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {members.slice(0, 5).map((member) => ( // Show up to 5 members initially
                    <div key={member.username} className="flex items-center justify-between p-2.5 border rounded-md bg-muted/50 hover:bg-muted/80">
                      <div>
                        <p className="text-sm font-medium text-foreground">{member.username}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/users/${member.username}`}>View</Link>
                      </Button>
                    </div>
                  ))}
                  {members.length > 5 && (
                    <div className="text-center pt-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/users?groupName=${groupName}`}>View All {members.length} Members</Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={isConfirmAccessActionDialogOpen} onOpenChange={setIsConfirmAccessActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm VPN Access Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmAccessActionDetails?.action === "allow" ? "allow" : "deny"} VPN access for group "{confirmAccessActionDetails?.groupName}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmAccessActionDialogOpen(false)} disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDenyAccessAction} disabled={saving} className={confirmAccessActionDetails?.action === "deny" ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-600/90 text-white"}>
              {saving ? "Processing..." : `Confirm ${confirmAccessActionDetails?.action === "allow" ? "Allow Access" : "Deny Access"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isConfirmEnableActionDialogOpen} onOpenChange={setIsConfirmEnableActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Enable Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to enable the group "{enableActionDetails?.groupName}"? This will allow users in this group to connect if not individually denied.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmEnableActionDialogOpen(false)} disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeEnableAction} disabled={saving} className={"bg-primary hover:bg-primary/90"}>
              {saving ? "Processing..." : `Confirm Enable Group`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
