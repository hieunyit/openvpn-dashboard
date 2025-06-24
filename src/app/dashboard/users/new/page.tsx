
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createUser, getGroups } from "@/lib/api"
import { formatDateForInput, generateRandomPassword, getCoreApiErrorMessage } from "@/lib/utils"
import { ArrowLeft, Upload, User, Mail, Lock, Calendar, Network, Shield, RefreshCw, CheckCircle, AlertTriangle, Globe, SlidersHorizontal } from "lucide-react"
import Link from "next/link"

interface Group {
  groupName: string
  authMethod: string
  role: string
  isEnabled?: boolean
  denyAccess?: boolean
}

export default function NewUserPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    authMethod: "local",
    groupName: "No Group",
    userExpiration: formatDateForInput(new Date().toISOString()),
    macAddresses: "",
    accessControl: "",
    ipAddress: "",
    ipAssignMode: "none",
  })
  const [groups, setGroups] = useState<Group[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingGroups, setLoadingGroups] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    try {
      setLoadingGroups(true)
      const data = await getGroups(1, 100) // Fetch up to 100 groups
      const processedGroups = (data.groups || []).map((g: any) => ({
        ...g,
        isEnabled: typeof g.isEnabled === 'boolean' ? g.isEnabled : true, // Default to true if undefined
        denyAccess: typeof g.denyAccess === 'boolean' ? g.denyAccess : false, // Default to false if undefined
      }))
      const enabledGroups = processedGroups.filter(
        (g: Group) => g.isEnabled === true && g.denyAccess === false
      )
      setGroups(enabledGroups)
    } catch (error: any) {
      if (error.message === "ACCESS_DENIED") {
        router.push('/403');
        return;
      }
      toast({
        title: "Error Fetching Groups",
        description: getCoreApiErrorMessage(error.message) || "Could not load groups for selection.",
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
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

  const handleGeneratePassword = () => {
    const newPassword = generateRandomPassword();
    setFormData((prev) => ({ ...prev, password: newPassword }));
    toast({
      title: "Password Generated",
      description: "A new random password has been generated and filled.",
      variant: "info",
      icon: <RefreshCw className="h-5 w-5" />,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!formData.userExpiration) {
      toast({
        title: "Validation Error",
        description: "User Expiration date is required.",
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      });
      setIsSubmitting(false);
      return;
    }


    try {
      const userData: any = {
        username: formData.username,
        email: formData.email,
        authMethod: formData.authMethod,
        groupName: formData.groupName === "No Group" ? undefined : formData.groupName,
        userExpiration: formData.userExpiration,
        macAddresses: formData.macAddresses
          .split(",")
          .map((mac) => mac.trim())
          .filter((mac) => mac),
        accessControl: formData.accessControl
          .split(",")
          .map((ac) => ac.trim())
          .filter((ac) => ac),
        ipAddress: formData.ipAddress || undefined,
        ipAssignMode: formData.ipAssignMode === "none" ? undefined : formData.ipAssignMode,
      }
      if (formData.authMethod === "local") {
        userData.password = formData.password
      }


      await createUser(userData)

      toast({
        title: "User Created Successfully",
        description: `User ${formData.username} has been created.`,
        variant: "success",
        icon: <CheckCircle className="h-5 w-5" />,
      })

      router.push("/dashboard/users")
    } catch (error: any) {
      if (error.message === "ACCESS_DENIED") {
        router.push('/403');
        return;
      }
      toast({
        title: "Error Creating User",
        description: getCoreApiErrorMessage(error.message),
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImportUsers = () => {
    toast({
      title: "Coming Soon",
      description: "Import users functionality will be available soon.",
      variant: "info",
    })
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
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
              <h1 className="text-3xl font-bold text-foreground">Create New User</h1>
              <p className="text-muted-foreground mt-1">Add a new OpenVPN user to your system</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleImportUsers} className="bg-card hover:bg-muted">
            <Upload className="mr-2 h-4 w-4" />
            Import Users
          </Button>
        </div>

        {/* Main Form */}
        <Card className="shadow-lg border-0 bg-card backdrop-blur-sm">
          <form onSubmit={handleSubmit}>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center text-xl">
                <User className="mr-2 h-5 w-5 text-primary" />
                User Information
              </CardTitle>
              <CardDescription>
                Fill in the details below to create a new user account. Fields marked with * are required.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-8 space-y-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground flex items-center border-b pb-2 mb-4">
                  <User className="mr-2 h-5 w-5 text-primary" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium text-muted-foreground">
                      Username *
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="username"
                        name="username"
                        placeholder="Enter username"
                        value={formData.username}
                        onChange={handleChange}
                        className="pl-10 border-input focus:border-primary focus:ring-primary"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                      Email Address *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter email address"
                        value={formData.email}
                        onChange={handleChange}
                        className="pl-10 border-input focus:border-primary focus:ring-primary"
                        required
                      />
                    </div>
                  </div>

                  {formData.authMethod === 'local' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                          Password *
                        </Label>
                        <Button type="button" variant="link" size="sm" onClick={handleGeneratePassword} className="p-0 h-auto text-xs">
                          <RefreshCw className="mr-1 h-3 w-3"/> Generate
                        </Button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          name="password"
                          type="text"
                          placeholder="Enter or generate password"
                          value={formData.password}
                          onChange={handleChange}
                          className="pl-10 border-input focus:border-primary focus:ring-primary"
                          required={formData.authMethod === 'local'}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="userExpiration" className="text-sm font-medium text-muted-foreground">
                      Expiration Date *
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="userExpiration"
                        name="userExpiration"
                        type="date"
                        value={formData.userExpiration}
                        onChange={handleChange}
                        className="pl-10 border-input focus:border-primary focus:ring-primary"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Authentication & Group */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground flex items-center border-b pb-2 mb-4">
                  <Shield className="mr-2 h-5 w-5 text-primary" />
                  Authentication & Access
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="authMethod" className="text-sm font-medium text-muted-foreground">
                      Authentication Method *
                    </Label>
                    <Select
                      value={formData.authMethod}
                      onValueChange={(value) => handleSelectChange("authMethod", value)}
                      required
                    >
                      <SelectTrigger className="border-input focus:border-primary focus:ring-primary">
                        <SelectValue placeholder="Select authentication method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">🔐 Local Authentication</SelectItem>
                        <SelectItem value="ldap">🏢 LDAP Authentication</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="groupName" className="text-sm font-medium text-muted-foreground">
                      User Group
                    </Label>
                    <Select
                      value={formData.groupName}
                      onValueChange={(value) => handleSelectChange("groupName", value)}
                      disabled={loadingGroups}
                    >
                      <SelectTrigger className="border-input focus:border-primary focus:ring-primary">
                        <SelectValue placeholder={loadingGroups ? "Loading groups..." : "Select a group (optional)"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No Group">👤 No Group</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.groupName} value={group.groupName}>
                            👥 {group.groupName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {groups.length === 0 && !loadingGroups && (
                       <p className="text-xs text-muted-foreground mt-1">
                        No enabled groups available. You can create one
                        <Link href="/dashboard/groups/new" className="text-primary hover:underline font-medium ml-1">
                          here
                        </Link>.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Network Configuration */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground flex items-center border-b pb-2 mb-4">
                  <Network className="mr-2 h-5 w-5 text-primary" />
                  Network Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="ipAssignMode" className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <SlidersHorizontal className="h-4 w-4"/> IP Assignment Mode
                    </Label>
                    <Select
                      value={formData.ipAssignMode}
                      onValueChange={(value) => handleSelectChange("ipAssignMode", value)}
                    >
                      <SelectTrigger className="border-input focus:border-primary focus:ring-primary">
                        <SelectValue placeholder="Select IP assignment mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Default)</SelectItem>
                        <SelectItem value="dhcp">DHCP</SelectItem>
                        <SelectItem value="static">Static</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ipAddress" className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                       <Globe className="h-4 w-4"/> Static IP Address
                    </Label>
                     <div className="relative">
                       <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="ipAddress"
                          name="ipAddress"
                          placeholder="Enter static IP"
                          value={formData.ipAddress}
                          onChange={handleChange}
                          disabled={formData.ipAssignMode !== "static"}
                          className="pl-10 border-input focus:border-primary focus:ring-primary"
                        />
                     </div>
                     <p className="text-xs text-muted-foreground">ⓘ Only applicable if IP Assignment Mode is 'Static'.</p>
                  </div>
                </div>
                <div className="space-y-6 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="macAddresses" className="text-sm font-medium text-muted-foreground">
                      MAC Addresses *
                    </Label>
                    <Textarea
                      id="macAddresses"
                      name="macAddresses"
                      placeholder="Enter MAC addresses separated by commas&#10;Example: 00:11:22:33:44:55, AA:BB:CC:DD:EE:FF"
                      value={formData.macAddresses}
                      onChange={handleChange}
                      className="border-input focus:border-primary focus:ring-primary min-h-[100px]"
                      required
                    />
                    <p className="text-xs text-muted-foreground">💡 Separate multiple MAC addresses with commas</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accessControl" className="text-sm font-medium text-muted-foreground">
                      Access Control Rules
                    </Label>
                    <Textarea
                      id="accessControl"
                      name="accessControl"
                      placeholder="Enter access control rules separated by commas&#10;Example: 192.168.1.0/24, 10.0.0.0/8"
                      value={formData.accessControl}
                      onChange={handleChange}
                      className="border-input focus:border-primary focus:ring-primary min-h-[100px]"
                    />
                    <p className="text-xs text-muted-foreground">🔒 Optional: Define network access restrictions</p>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="bg-muted/50 rounded-b-lg p-6 flex justify-between border-t">
              <Button variant="outline" type="button" asChild className="px-6">
                <Link href="/dashboard/users">Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-8 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    Creating User...
                  </>
                ) : (
                  <>
                    <User className="mr-2 h-4 w-4" />
                    Create User
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
