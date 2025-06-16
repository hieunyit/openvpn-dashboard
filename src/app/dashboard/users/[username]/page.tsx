
"use client"

import type React from "react"
import { User, Eye, EyeOff } from "lucide-react" 

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
import { Checkbox } from "@/components/ui/checkbox" // Keep for editing denyAccess
import { useToast } from "@/components/ui/use-toast"
import { getUser as fetchApiUser, updateUser, getGroups, performUserAction } from "@/lib/api" // performUserAction still needed for OTP/Password
import { getUser as getCurrentAuthUser } from "@/lib/auth"
import { ChangePasswordDialog } from "@/components/change-password-dialog"
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
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  CheckCircle,
  XCircle,
  RefreshCcw,
  Key,
  Calendar,
  Mail,
  Shield,
  Clock,
  Network,
  Users,
  LinkSimple,
  LockKeyhole,
  UnlockKeyhole
} from "lucide-react"
import Link from "next/link"
import { formatDateForDisplay, formatDateForInput } from "@/lib/utils"

interface UserDetail {
  username: string
  email: string
  authMethod: string
  role: string
  groupName?: string
  userExpiration: string
  mfa: boolean
  macAddresses: string[]
  accessControl: string[]
  isEnabled: boolean // Still part of the detailed user object from API
  denyAccess?: boolean
  lastLogin?: string
  createdAt?: string
}

interface Group {
  groupName: string
  authMethod: string
  role: string
}

export default function UserDetailPage() {
  const params = useParams()
  const username = params.username as string
  const router = useRouter()
  const { toast } = useToast()

  const [user, setUser] = useState<UserDetail | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    groupName: "none",
    userExpiration: "",
    macAddresses: "",
    accessControl: "",
    denyAccess: false,
  })
  const [currentAuthUser, setCurrentAuthUser] = useState<any>(null)
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false)
  
  const [isConfirmAccessActionDialogOpen, setIsConfirmAccessActionDialogOpen] = useState(false)
  const [confirmAccessActionDetails, setConfirmAccessActionDetails] = useState<{ action: "allow" | "deny"; username: string } | null>(null)


  useEffect(() => {
    setCurrentAuthUser(getCurrentAuthUser());
    if (username) {
      fetchUser()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username])

  useEffect(() => {
    if (editing && groups.length === 0) {
      fetchGroups()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  const fetchUser = async () => {
    try {
      setLoading(true)
      const userData = await fetchApiUser(username)
      if (userData) {
        const processedUserData = {
          ...userData,
          isEnabled: typeof userData.isEnabled === 'boolean' ? userData.isEnabled : true, // Default isEnabled if not present
          denyAccess: typeof userData.denyAccess === 'boolean' ? userData.denyAccess : false, // Default denyAccess
        };
        setUser(processedUserData);
        setFormData({
          groupName: processedUserData.groupName || "none",
          userExpiration: processedUserData.userExpiration || "",
          macAddresses: processedUserData.macAddresses?.join(", ") || "",
          accessControl: processedUserData.accessControl?.join(", ") || "",
          denyAccess: processedUserData.denyAccess || false,
        })
      } else {
        toast({
          title: "❌ User not found",
          description: `User ${username} could not be found.`,
          variant: "destructive",
        })
        router.push("/dashboard/users")
      }
    } catch (error: any) {
      console.error("Failed to fetch user:", error)
      toast({
        title: "❌ Error loading user",
        description: error.message || "Failed to load user details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchGroups = async () => {
    try {
      setLoadingGroups(true)
      const data = await getGroups(1, 100)
      setGroups(data.groups || [])
    } catch (error: any) {
      console.error("Failed to fetch groups:", error)
      toast({
        title: "Error fetching groups",
        description: error.message || "Could not load groups for selection.",
        variant: "destructive"
      });
    } finally {
      setLoadingGroups(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const userDataToUpdate = {
        groupName: formData.groupName === "none" ? undefined : formData.groupName,
        userExpiration: formData.userExpiration,
        macAddresses: formData.macAddresses
          .split(",")
          .map((mac) => mac.trim())
          .filter((mac) => mac),
        accessControl: formData.accessControl
          .split(",")
          .map((ac) => ac.trim())
          .filter((ac) => ac),
        denyAccess: formData.denyAccess,
      }

      await updateUser(username, userDataToUpdate)

      toast({
        title: "✅ User updated successfully",
        description: `User ${username} has been updated.`,
      })

      setEditing(false)
      fetchUser() 
    } catch (error: any) {
      console.error("Failed to update user:", error)
      toast({
        title: "❌ Update failed",
        description: error.message || "Failed to update user. Please check your input and try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const initiateDenyAccessAction = (action: "allow" | "deny") => {
    if (!user) return;
    if (action === "deny" && user.username === currentAuthUser?.username) {
      toast({
        title: "Action Prevented",
        description: "You cannot deny VPN access to your own account.",
        variant: "destructive",
      });
      return;
    }
    setConfirmAccessActionDetails({ action, username: user.username });
    setIsConfirmAccessActionDialogOpen(true);
  };

  const executeDenyAccessAction = async () => {
    if (!confirmAccessActionDetails || !user) return;
    const { action, username: targetUsername } = confirmAccessActionDetails;

    try {
      const newDenyAccessState = action === "deny";
      await updateUser(targetUsername, { denyAccess: newDenyAccessState });
      toast({
        title: "✅ VPN Access Updated",
        description: `VPN access for user ${targetUsername} has been ${action === "allow" ? "allowed" : "denied"}.`,
      });
      fetchUser(); // Refresh user data
    } catch (error: any) {
      console.error(`Failed to ${action} VPN access:`, error);
      toast({
        title: "❌ Action failed",
        description: error.message || `Failed to ${action} VPN access. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsConfirmAccessActionDialogOpen(false);
      setConfirmAccessActionDetails(null);
    }
  };
  
  const handleOtpReset = async () => {
    if (!user) return;
    try {
      await performUserAction(user.username, "reset-otp");
      toast({
        title: "✅ OTP Reset",
        description: `OTP has been reset for user ${user.username}. They will need to re-configure their OTP on next login.`,
      });
    } catch (error: any) {
      console.error("Failed to reset OTP:", error);
      toast({
        title: "❌ OTP Reset Failed",
        description: error.message || "Could not reset OTP. Please try again.",
        variant: "destructive",
      });
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/users">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Users
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

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/users">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Users
              </Link>
            </Button>
            <h1 className="text-3xl font-bold text-foreground">User Not Found</h1>
          </div>
          <Card className="shadow-lg border-0 bg-card">
            <CardContent className="p-8 text-center">
              <XCircle className="mx-auto h-16 w-16 text-destructive mb-4" />
              <p className="text-muted-foreground text-lg">The requested user could not be found.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const isSelf = user.username === currentAuthUser?.username;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="hover:bg-muted" asChild>
              <Link href="/dashboard/users">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Users
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center">
                <User className="mr-3 h-8 w-8 text-primary" />
                {user.username}
              </h1>
              <p className="text-muted-foreground mt-1">User account details and management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {editing ? (
              <>
                <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Edit className="mr-2 h-4 w-4" />
                Edit User
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* User Information - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0 bg-card">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center text-xl">
                  <User className="mr-2 h-5 w-5" />
                  User Information
                </CardTitle>
                <CardDescription>
                  Basic user account details and configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {/* Basic Info */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-foreground flex items-center border-b border-border pb-2">
                    <User className="mr-2 h-5 w-5 text-primary" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Username</Label>
                      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{user.username}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Email Address</Label>
                      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{user.email}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Authentication Method</Label>
                      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <Badge variant={user.authMethod === "local" ? "default" : "secondary"}>
                          {user.authMethod === "local" ? "🔐 Local" : "🏢 LDAP"}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <Badge variant={user.role === "Admin" ? "default" : "secondary"}>
                          {user.role === "Admin" ? "👑 Admin" : "👤 User"}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">User Group</Label>
                      {editing ? (
                        <Select
                          value={formData.groupName}
                          onValueChange={(value) => handleSelectChange("groupName", value)}
                          disabled={loadingGroups}
                        >
                          <SelectTrigger className="border-input focus:border-primary">
                            <SelectValue placeholder={loadingGroups ? "Loading groups..." : "Select a group"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">👤 No Group</SelectItem>
                            {groups.map((group) => (
                              <SelectItem key={group.groupName} value={group.groupName}>
                                👥 {group.groupName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">
                            {user.groupName && user.groupName !== "none" ? user.groupName : "No group assigned"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Expiration Date</Label>
                      {editing ? (
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            name="userExpiration"
                            type="date"
                            value={formatDateForInput(formData.userExpiration)}
                            onChange={handleChange}
                            className="pl-10 border-input focus:border-primary"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{formatDateForDisplay(user.userExpiration)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Network Configuration */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-foreground flex items-center border-b border-border pb-2">
                    <Network className="mr-2 h-5 w-5 text-primary" />
                    Network Configuration
                  </h3>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">MAC Addresses</Label>
                      {editing ? (
                        <Textarea
                          name="macAddresses"
                          value={formData.macAddresses}
                          onChange={handleChange}
                          placeholder="Enter MAC addresses separated by commas"
                          className="border-input focus:border-primary min-h-[100px]"
                        />
                      ) : (
                        <div className="p-4 border rounded-lg bg-muted">
                          {user.macAddresses && user.macAddresses.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {user.macAddresses.map((mac, index) => (
                                <Badge key={index} variant="outline" className="bg-card">
                                  🔗 {mac}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No MAC addresses configured</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Access Control Rules</Label>
                      {editing ? (
                        <Textarea
                          name="accessControl"
                          value={formData.accessControl}
                          onChange={handleChange}
                          placeholder="Enter access control rules separated by commas"
                          className="border-input focus:border-primary min-h-[100px]"
                        />
                      ) : (
                        <div className="p-4 border rounded-lg bg-muted">
                          {user.accessControl && user.accessControl.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {user.accessControl.map((rule, index) => (
                                <Badge key={index} variant="outline" className="bg-card">
                                  🔒 {rule}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No access control rules defined</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {editing && (
                  <div className="space-y-4 p-4 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="denyAccess"
                        checked={formData.denyAccess}
                        onCheckedChange={(checked) => handleCheckboxChange("denyAccess", checked === true)}
                      />
                      <Label htmlFor="denyAccess" className="text-sm font-medium text-foreground">
                        🚫 Deny VPN Access
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      If checked, this user will be denied access to the VPN service, regardless of group settings.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status & Actions - Takes 1 column */}
          <div className="space-y-6">
            {/* User Status */}
            <Card className="shadow-lg border-0 bg-card">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center text-lg">
                  <Shield className="mr-2 h-5 w-5" />
                  Account Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Removed Account Status (isEnabled) display as per request */}
                {/* VPN Access Status */}
                 <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    {user.denyAccess ? <LockKeyhole className="h-4 w-4 text-destructive" /> : <UnlockKeyhole className="h-4 w-4 text-green-600" />}
                    <span className="text-sm font-medium text-foreground">VPN Access</span>
                  </div>
                  <Badge variant={user.denyAccess ? "destructive" : "default"} className="px-3 py-1">
                    {user.denyAccess ? "🚫 Denied" : "✅ Allowed"}
                  </Badge>
                </div>


                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">MFA Status</span>
                  </div>
                  <Badge variant={user.mfa ? "default" : "outline"} className="px-3 py-1">
                    {user.mfa ? "🔐 Enabled" : "🔓 Disabled"}
                  </Badge>
                </div>

                {user.lastLogin && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Last Login</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{formatDateForDisplay(user.lastLogin)}</span>
                  </div>
                )}

                {user.createdAt && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Created</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{formatDateForDisplay(user.createdAt)}</span>
                  </div>
                )}
                 {!user.isEnabled && (
                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                     <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Overall Account</span>
                      </div>
                      <Badge variant="outline" className="px-3 py-1 border-yellow-500 text-yellow-700 dark:text-yellow-300">
                        System Disabled
                      </Badge>
                   </div>
                )}
              </CardContent>
            </Card>

            {/* User Actions */}
            <Card className="shadow-lg border-0 bg-card">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center text-lg">
                  <RefreshCcw className="mr-2 h-5 w-5" />
                  User Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                 {user.denyAccess ? (
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-card hover:bg-green-500/10 border-green-500 text-green-700 dark:text-green-400 dark:border-green-600 dark:hover:bg-green-700/20"
                    onClick={() => initiateDenyAccessAction("allow")}
                  >
                    <UnlockKeyhole className="mr-2 h-4 w-4" />
                    Allow VPN Access
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-card hover:bg-red-500/10 border-red-500 text-red-700 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-700/20"
                    onClick={() => initiateDenyAccessAction("deny")}
                    disabled={isSelf}
                    title={isSelf ? "You cannot deny VPN access to your own account." : "Deny VPN access for this user"}
                  >
                    <LockKeyhole className="mr-2 h-4 w-4" />
                    Deny VPN Access
                  </Button>
                )}


                <Button
                  variant="outline"
                  className="w-full justify-start bg-card hover:bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-400 dark:border-blue-600 dark:hover:bg-blue-700/20"
                  onClick={handleOtpReset}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Reset OTP
                </Button>

                {user.authMethod === "local" && (
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-card hover:bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 dark:border-amber-600 dark:hover:bg-amber-700/20"
                    onClick={() => setIsChangePasswordDialogOpen(true)}
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {user && (
        <ChangePasswordDialog
          open={isChangePasswordDialogOpen}
          onOpenChange={setIsChangePasswordDialogOpen}
          username={user.username}
          onSuccess={() => {
            setIsChangePasswordDialogOpen(false);
          }}
        />
      )}

      <AlertDialog open={isConfirmAccessActionDialogOpen} onOpenChange={setIsConfirmAccessActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm VPN Access Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmAccessActionDetails?.action === "allow" ? "allow" : "deny"} VPN access for user "{confirmAccessActionDetails?.username}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmAccessActionDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDenyAccessAction}
              className={confirmAccessActionDetails?.action === "deny" ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-600/90"}
            >
              Confirm {confirmAccessActionDetails?.action === "allow" ? "Allow Access" : "Deny Access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
