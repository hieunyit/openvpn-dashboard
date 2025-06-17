
"use client"

import type React from "react"
import { UserCircle2, Eye, EyeOff, Settings } from "lucide-react" 

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
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { getUser as fetchApiUser, updateUser, getGroups, performUserAction } from "@/lib/api"
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
  XCircle,
  RefreshCcw,
  KeyRound, 
  CalendarDays, 
  Mail,
  Shield,
  Clock,
  Network,
  Users,
  Link as LinkIcon, 
  LockKeyhole,
  UnlockKeyhole,
  Info,
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
  isEnabled: boolean
  denyAccess?: boolean
  lastLogin?: string
  createdAt?: string
}

interface Group {
  groupName: string
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
          isEnabled: typeof userData.isEnabled === 'boolean' ? userData.isEnabled : true,
          denyAccess: typeof userData.denyAccess === 'boolean' ? userData.denyAccess : false,
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
          title: "User Not Found",
          description: `User ${username} could not be found. Redirecting...`,
          variant: "destructive",
        })
        router.push("/dashboard/users")
      }
    } catch (error: any) {
      toast({
        title: "Error Loading User",
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
      const data = await getGroups(1, 100) // Fetch up to 100 groups
      setGroups(data.groups || [])
    } catch (error: any) {
      toast({
        title: "Error Fetching Groups",
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
    if (!user) return;
    try {
      setSaving(true)
      const userDataToUpdate = {
        groupName: formData.groupName === "none" ? undefined : formData.groupName,
        userExpiration: formData.userExpiration,
        macAddresses: formData.macAddresses.split(",").map((mac) => mac.trim()).filter((mac) => mac),
        accessControl: formData.accessControl.split(",").map((ac) => ac.trim()).filter((ac) => ac),
        denyAccess: formData.denyAccess,
      }
      await updateUser(user.username, userDataToUpdate)
      toast({
        title: "✅ User Updated Successfully",
        description: `User ${user.username} has been updated.`,
      })
      setEditing(false)
      fetchUser() 
    } catch (error: any) {
      toast({
        title: "❌ Failed to Update User",
        description: error.message || "An unexpected error occurred. Please check input and try again.",
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
    setSaving(true);
    try {
      const newDenyAccessState = action === "deny";
      await updateUser(targetUsername, { denyAccess: newDenyAccessState });
      toast({
        title: `✅ VPN Access ${action === "allow" ? "Allowed" : "Denied"}`,
        description: `VPN access for user ${targetUsername} has been ${action === "allow" ? "allowed" : "denied"}.`,
      });
      fetchUser(); 
    } catch (error: any) {
      console.error(`Failed to ${action} VPN access for user ${targetUsername}:`, error); // Keep specific log
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
  
  const handleOtpReset = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await performUserAction(user.username, "reset-otp");
      toast({
        title: "✅ OTP Reset Successful",
        description: `OTP for user ${user.username} has been reset.`,
      });
    } catch (error: any) {
      toast({
        title: "❌ OTP Reset Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/users"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-96 md:col-span-2 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6">
         <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/users"><ArrowLeft className="h-4 w-4 mr-1" />Back to Users</Link>
          </Button>
        <Card className="shadow-lg border-destructive bg-destructive/10">
          <CardContent className="p-8 text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <CardTitle className="text-xl text-destructive">User Not Found</CardTitle>
            <CardDescription className="text-destructive/80">The requested user could not be found.</CardDescription>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isSelf = user.username === currentAuthUser?.username;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" asChild>
              <Link href="/dashboard/users">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back to Users</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center">
                <UserCircle2 className="mr-3 h-8 w-8 text-primary flex-shrink-0" />
                {user.username}
              </h1>
              <p className="text-muted-foreground mt-1">Manage user account details and configurations.</p>
            </div>
          </div>
        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving} className="w-full sm:w-auto">
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
              <Edit className="mr-2 h-4 w-4" /> Edit User
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-md border-0">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center text-xl"><Info className="mr-2 h-5 w-5 text-primary"/>User Information</CardTitle>
              <CardDescription>View and edit basic user details and network settings.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center"><UserCircle2 className="mr-2 h-5 w-5 text-muted-foreground"/>Basic Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-muted-foreground">Username</Label>
                    <div className="flex items-center gap-2 p-2.5 border rounded-md bg-muted/70 text-sm">
                      <span className="font-medium text-foreground">{user.username}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <div className="flex items-center gap-2 p-2.5 border rounded-md bg-muted/70 text-sm">
                      <span className="text-foreground">{user.email}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-muted-foreground">Auth Method</Label>
                    <div className="p-2.5 border rounded-md bg-muted/70 text-sm">
                      <Badge variant={user.authMethod === "local" ? "default" : "secondary"}>{user.authMethod === "local" ? "Local" : "LDAP"}</Badge>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                     <div className="p-2.5 border rounded-md bg-muted/70 text-sm">
                      <Badge variant={user.role === "Admin" ? "default" : "secondary"}>{user.role}</Badge>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-muted-foreground">User Group</Label>
                    {editing ? (
                      <Select value={formData.groupName} onValueChange={(value) => handleSelectChange("groupName", value)} disabled={loadingGroups}>
                        <SelectTrigger><SelectValue placeholder={loadingGroups ? "Loading groups..." : "Select a group"} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Group</SelectItem>
                          {groups.map((g) => (<SelectItem key={g.groupName} value={g.groupName}>{g.groupName}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2 p-2.5 border rounded-md bg-muted/70 text-sm">
                        <span className="text-foreground">{user.groupName && user.groupName !== "none" ? user.groupName : "No group"}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-muted-foreground">Expiration Date</Label>
                    {editing ? (
                      <Input name="userExpiration" type="date" value={formatDateForInput(formData.userExpiration)} onChange={handleChange} />
                    ) : (
                      <div className="flex items-center gap-2 p-2.5 border rounded-md bg-muted/70 text-sm">
                        <span className="text-foreground">{formatDateForDisplay(user.userExpiration)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center"><Network className="mr-2 h-5 w-5 text-muted-foreground"/>Network Configuration</h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-muted-foreground">MAC Addresses</Label>
                    {editing ? (
                      <Textarea name="macAddresses" value={formData.macAddresses} onChange={handleChange} placeholder="Enter MAC addresses, comma-separated" className="min-h-[70px]" />
                    ) : (
                      <div className="p-3 border rounded-md bg-muted/70 min-h-[40px] text-sm">
                        {user.macAddresses && user.macAddresses.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {user.macAddresses.map((mac, index) => (<Badge key={index} variant="outline" className="bg-background"><LinkIcon className="h-3.5 w-3.5 mr-1.5"/>{mac}</Badge>))}
                          </div>
                        ) : (<span className="text-muted-foreground italic">No MAC addresses</span>)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-muted-foreground">Access Control Rules</Label>
                    {editing ? (
                      <Textarea name="accessControl" value={formData.accessControl} onChange={handleChange} placeholder="Enter access rules, comma-separated" className="min-h-[70px]" />
                    ) : (
                      <div className="p-3 border rounded-md bg-muted/70 min-h-[40px] text-sm">
                        {user.accessControl && user.accessControl.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {user.accessControl.map((rule, index) => (<Badge key={index} variant="outline" className="bg-background">{rule}</Badge>))}
                          </div>
                        ) : (<span className="text-muted-foreground italic">No custom rules</span>)}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {editing && (
                <div className="p-4 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border space-y-1.5">
                  <div className="flex items-center space-x-3">
                    <Checkbox id="denyAccess" checked={formData.denyAccess} onCheckedChange={(checked) => handleCheckboxChange("denyAccess", checked === true)} disabled={isSelf}/>
                    <Label htmlFor="denyAccess" className="text-sm font-medium text-foreground">Deny VPN Access</Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-7">If checked, this user will be denied VPN access, regardless of group settings. {isSelf && "(Cannot deny self)"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-md border-0">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center text-lg"><Shield className="mr-2 h-5 w-5 text-primary"/>Account Status</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {user.denyAccess ? <LockKeyhole className="h-4 w-4 text-destructive" /> : <UnlockKeyhole className="h-4 w-4 text-green-600" />} VPN Access
                </div>
                <Badge variant={user.denyAccess ? "destructive" : "default"} className={user.denyAccess ? "bg-destructive/80 text-destructive-foreground" : "bg-green-600/10 text-green-700 dark:text-green-400 border-green-600/30"}>
                  {user.denyAccess ? "Denied" : (user.isEnabled ? "Allowed" : "Allowed (Account Disabled)")}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <KeyRound className="h-4 w-4" /> MFA Status
                </div>
                <Badge variant={user.mfa ? "default" : "outline"} className={user.mfa ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-blue-600/30" : ""}>
                  {user.mfa ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              {user.lastLogin && (
                <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground"><Clock className="h-4 w-4" />Last Login</div>
                  <span className="text-sm text-muted-foreground">{formatDateForDisplay(user.lastLogin)}</span>
                </div>
              )}
              {user.createdAt && (
                <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground"><CalendarDays className="h-4 w-4" />Created</div>
                  <span className="text-sm text-muted-foreground">{formatDateForDisplay(user.createdAt)}</span>
                </div>
              )}
               {!user.isEnabled && (
                <div className="p-2.5 bg-yellow-500/10 rounded-md text-center">
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        Note: This user account is currently system-disabled. VPN access actions might be restricted until enabled.
                    </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md border-0">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center text-lg"><Settings className="mr-2 h-5 w-5 text-primary"/>User Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {user.denyAccess ? (
                <Button variant="outline" className="w-full justify-start hover:bg-green-500/10 border-green-500 text-green-700 dark:text-green-400" onClick={() => initiateDenyAccessAction("allow")} disabled={saving || !user.isEnabled} title={!user.isEnabled ? "User account is system disabled" : "Allow VPN access"}>
                  <UnlockKeyhole className="mr-2 h-4 w-4" /> Allow VPN Access
                </Button>
              ) : (
                <Button variant="outline" className="w-full justify-start hover:bg-red-500/10 border-red-500 text-red-700 dark:text-red-400" onClick={() => initiateDenyAccessAction("deny")} disabled={saving || isSelf || !user.isEnabled} title={isSelf ? "Cannot deny self" : (!user.isEnabled ? "User account is system disabled" : "Deny VPN access")}>
                  <LockKeyhole className="mr-2 h-4 w-4" /> Deny VPN Access
                </Button>
              )}
              <Button variant="outline" className="w-full justify-start hover:bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-400" onClick={handleOtpReset} disabled={saving}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Reset OTP
              </Button>
              {user.authMethod === "local" && (
                <Button variant="outline" className="w-full justify-start hover:bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400" onClick={() => setIsChangePasswordDialogOpen(true)} disabled={saving}>
                  <KeyRound className="mr-2 h-4 w-4" /> Change Password
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {user && (
        <ChangePasswordDialog
          open={isChangePasswordDialogOpen}
          onOpenChange={setIsChangePasswordDialogOpen}
          username={user.username}
          onSuccess={() => setIsChangePasswordDialogOpen(false)}
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
            <AlertDialogCancel onClick={() => setIsConfirmAccessActionDialogOpen(false)} disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDenyAccessAction} disabled={saving} className={confirmAccessActionDetails?.action === "deny" ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-600/90 text-white"}>
              {saving ? "Processing..." : `Confirm ${confirmAccessActionDetails?.action === "allow" ? "Allow Access" : "Deny Access"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
