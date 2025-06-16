
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
import { getGroup, updateGroup, getUsers } from "@/lib/api" // Removed performGroupAction
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
import { ArrowLeft, Edit, Save, X, Shield, Users, Settings, FolderKanban, LockKeyhole, UnlockKeyhole, Activity } from "lucide-react"
import Link from "next/link"

interface Group {
  groupName: string
  authMethod: string
  role: string
  mfa: boolean
  denyAccess: boolean
  accessControl: string[]
  isEnabled?: boolean // From EnhancedGroupResponse if API provides it here
  memberCount?: number
  createdAt?: string
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
    authMethod: "", // Not editable per swagger for update, but kept for display if needed
    role: "", // Not editable per swagger for update
    accessControl: "",
    denyAccess: false, // Added for editing
  })

  const [isConfirmAccessActionDialogOpen, setIsConfirmAccessActionDialogOpen] = useState(false)
  const [confirmAccessActionDetails, setConfirmAccessActionDetails] = useState<{ action: "allow" | "deny"; groupName: string } | null>(null)


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
            denyAccess: groupData.denyAccess ?? false, // Default to false if undefined
            isEnabled: groupData.isEnabled // Keep isEnabled if API provides it
        };
        setGroup(processedGroupData)
        setFormData({
          authMethod: processedGroupData.authMethod || "",
          role: processedGroupData.role || "",
          accessControl: processedGroupData.accessControl?.join(", ") || "",
          denyAccess: processedGroupData.denyAccess,
        })
      } else {
        toast({
          title: "Group not found",
          description: `Group ${groupName} could not be found.`,
          variant: "destructive",
        })
        router.push("/dashboard/groups")
      }
    } catch (error: any) {
      console.error("Failed to fetch group:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load group details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchGroupMembers = async () => {
    try {
      const usersData = await getUsers(1, 100, { groupName }) 
      setMembers(usersData.users || [])
    } catch (error: any) {
      console.error("Failed to fetch group members:", error)
       toast({
        title: "Error fetching members",
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

  const handleSave = async () => {
    try {
      setSaving(true)

      const groupDataToUpdate: { accessControl: string[]; denyAccess: boolean } = {
        accessControl: formData.accessControl
          .split(",")
          .map((ac) => ac.trim())
          .filter((ac) => ac),
        denyAccess: formData.denyAccess,
      }

      await updateGroup(groupName, groupDataToUpdate)

      toast({
        title: "Group updated",
        description: `Group ${groupName} has been updated successfully.`,
      })

      setEditing(false)
      fetchGroup() 
    } catch (error: any) {
      console.error("Failed to update group:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update group. Please check your input and try again.",
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
      setSaving(true); // Use saving state for action button as well
      const newDenyAccessState = action === "deny";
      await updateGroup(targetGroupName, { denyAccess: newDenyAccessState });
      toast({
        title: "VPN Access Updated",
        description: `VPN access for group ${targetGroupName} has been ${action === "allow" ? "allowed" : "denied"}.`,
      });
      fetchGroup(); 
    } catch (error: any) {
      console.error(`Failed to ${action} VPN access for group:`, error);
      toast({
        title: "Action failed",
        description: error.message || `Failed to ${action} VPN access for group. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setIsConfirmAccessActionDialogOpen(false);
      setConfirmAccessActionDetails(null);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/groups">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Groups
              </Link>
            </Button>
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/groups">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Groups
              </Link>
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Group Not Found</h1>
          </div>
          <Card className="shadow-lg border-0 bg-card">
            <CardContent className="p-8 text-center">
              <X className="mx-auto h-16 w-16 text-destructive mb-4" />
              <p className="text-muted-foreground text-lg">The requested group could not be found.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  const getStatusBadge = () => {
    if (group.isEnabled === false) { // Check if isEnabled is explicitly false
      return <Badge variant="outline" className="text-yellow-700 border-yellow-500 dark:text-yellow-300"><Activity className="mr-1 h-3 w-3" />System Disabled</Badge>;
    }
    if (group.denyAccess) {
      return <Badge variant="secondary"><LockKeyhole className="mr-1 h-3 w-3" /> Access Denied</Badge>;
    }
    return <Badge variant="default"><UnlockKeyhole className="mr-1 h-3 w-3" /> Access Allowed</Badge>;
  };


  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" className="mr-2 hover:bg-muted" asChild>
              <Link href="/dashboard/groups">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
            <div className="flex flex-col">
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
                    <FolderKanban className="mr-3 h-8 w-8 text-primary" />
                    Group: {group.groupName}
                </h1>
                <div className="mt-1 ml-12">{getStatusBadge()}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Edit className="mr-2 h-4 w-4" />
                Edit Group
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Group Information - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0 bg-card">
              <CardHeader className="border-b">
                <CardTitle className="text-xl font-semibold text-foreground">Group Information</CardTitle>
                <CardDescription className="text-muted-foreground">Basic group settings and configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="groupName" className="text-sm font-medium text-muted-foreground">Group Name</Label>
                  <Input id="groupName" value={group.groupName} disabled className="bg-muted"/>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="authMethod" className="text-sm font-medium text-muted-foreground">Authentication Method</Label>
                  {/* AuthMethod is not editable in updateGroup per Swagger */}
                  <div className="p-3 border rounded-lg bg-muted">
                      <Badge variant="outline">{group.authMethod}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium text-muted-foreground">Role</Label>
                  {/* Role is not editable in updateGroup per Swagger */}
                   <div className="p-3 border rounded-lg bg-muted">
                      <Badge variant={group.role === "Admin" ? "default" : "secondary"}>{group.role}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accessControl" className="text-sm font-medium text-muted-foreground">Access Control Rules</Label>
                  {editing ? (
                    <Textarea
                      id="accessControl"
                      name="accessControl"
                      value={formData.accessControl}
                      onChange={handleChange}
                      placeholder="Enter access control rules separated by commas"
                      rows={4}
                      className="border-input focus:border-primary min-h-[100px]"
                    />
                  ) : (
                    <div className="p-3 border rounded-lg bg-muted min-h-[40px]">
                      {group.accessControl && group.accessControl.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {group.accessControl.map((rule, index) => (
                            <Badge key={index} variant="outline" className="bg-card">
                              {rule}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No access control rules</span>
                      )}
                    </div>
                  )}
                </div>
                
                {editing && (
                  <div className="space-y-2 p-4 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-center space-x-2">
                       <Checkbox
                        id="denyAccess"
                        checked={formData.denyAccess}
                        onCheckedChange={(checked) => handleCheckboxChange("denyAccess", Boolean(checked))}
                      />
                      <Label htmlFor="denyAccess" className="text-sm font-medium text-foreground">
                        Deny VPN Access to this Group
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      If checked, users in this group (who are not individually allowed) will be denied VPN access.
                    </p>
                  </div>
                )}


                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">MFA Required</span>
                    </div>
                    <Badge variant={group.mfa ? "default" : "outline"}>{group.mfa ? "Yes" : "No"}</Badge>
                  </div>

                   {/* VPN Access Status replaces the old "Status" (isEnabled) field here */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      {group.denyAccess ? <LockKeyhole className="h-4 w-4 text-destructive" /> : <UnlockKeyhole className="h-4 w-4 text-green-600" />}
                      <span className="text-sm font-medium">VPN Access</span>
                    </div>
                    <Badge variant={group.denyAccess ? "destructive" : "default"} className="px-3 py-1">
                      {group.denyAccess ? "Denied" : "Allowed"}
                    </Badge>
                  </div>
                  
                  {/* Display "System Disabled" if applicable */}
                  {group.isEnabled === false && (
                     <div className="col-span-2 flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                        <div className="flex items-center gap-2">
                           <Activity className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                           <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Overall Group Status</span>
                         </div>
                         <Badge variant="outline" className="px-3 py-1 border-yellow-500 text-yellow-700 dark:text-yellow-300">
                           System Disabled
                         </Badge>
                      </div>
                  )}

                </div>
              </CardContent>
            </Card>
          </div>

          {/* Group Actions & Members */}
          <div className="space-y-6">
            <Card className="shadow-lg border-0 bg-card">
              <CardHeader className="border-b">
                <CardTitle className="text-xl font-semibold text-foreground">Group Access Actions</CardTitle>
                <CardDescription className="text-muted-foreground">Manage VPN access for this group</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                {group.denyAccess ? (
                  <Button
                    variant="outline"
                    className="w-full justify-start hover:bg-green-500/10 border-green-500 text-green-700 dark:text-green-400 dark:border-green-600 dark:hover:bg-green-700/20"
                    onClick={() => initiateDenyAccessAction("allow")}
                    disabled={saving || group.isEnabled === false}
                    title={group.isEnabled === false ? "Group is system disabled" : "Allow VPN access for this group"}
                  >
                    <UnlockKeyhole className="mr-2 h-4 w-4" />
                    Allow VPN Access
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full justify-start hover:bg-red-500/10 border-red-500 text-red-700 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-700/20"
                    onClick={() => initiateDenyAccessAction("deny")}
                    disabled={saving || group.isEnabled === false}
                    title={group.isEnabled === false ? "Group is system disabled" : "Deny VPN access for this group"}
                  >
                    <LockKeyhole className="mr-2 h-4 w-4" />
                    Deny VPN Access
                  </Button>
                )}
                {group.isEnabled === false && (
                    <p className="text-xs text-center text-yellow-600 dark:text-yellow-400 pt-1">
                        Access actions are disabled because the group is system disabled.
                    </p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-card">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-xl font-semibold text-foreground">
                  <Users className="h-5 w-5" />
                  Group Members ({members.length})
                </CardTitle>
                <CardDescription className="text-muted-foreground">Users assigned to this group</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members in this group.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {members.slice(0, 10).map((member) => (
                      <div key={member.username} className="flex items-center justify-between p-3 border rounded-md bg-muted hover:bg-muted/80">
                        <div>
                          <p className="text-sm font-medium text-foreground">{member.username}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/users/${member.username}`}>View</Link>
                        </Button>
                      </div>
                    ))}
                    {members.length > 10 && (
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
            <AlertDialogAction
              onClick={executeDenyAccessAction}
              disabled={saving}
              className={confirmAccessActionDetails?.action === "deny" ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-600/90"}
            >
              {saving ? "Processing..." : `Confirm ${confirmAccessActionDetails?.action === "allow" ? "Allow Access" : "Deny Access"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
