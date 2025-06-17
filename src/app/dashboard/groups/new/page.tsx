
"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createGroup } from "@/lib/api"
import { ArrowLeft, Upload, Users, Network, Shield, Router, KeyRound, CheckCircle, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { getCoreApiErrorMessage } from "@/lib/utils"

export default function NewGroupPage() {
  const [formData, setFormData] = useState({
    groupName: "",
    authMethod: "local",
    role: "User",
    mfa: false,
    accessControl: "",
    groupRange: "",
    groupSubnet: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const groupData = {
        groupName: formData.groupName,
        authMethod: formData.authMethod,
        role: formData.role,
        mfa: formData.mfa,
        accessControl: formData.accessControl.split(",").map((ac) => ac.trim()).filter((ac) => ac),
        groupRange: formData.groupRange.split(",").map((r) => r.trim()).filter((r) => r),
        groupSubnet: formData.groupSubnet.split(",").map((s) => s.trim()).filter((s) => s),
      }

      await createGroup(groupData)

      toast({
        title: "Success",
        description: `Group ${formData.groupName} has been created.`,
        variant: "success",
        icon: <CheckCircle className="h-5 w-5" />,
      })

      router.push("/dashboard/groups")
    } catch (error: any) {
      toast({
        title: "Error Creating Group",
        description: getCoreApiErrorMessage(error.message),
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImportGroups = () => {
    toast({
      title: "Coming Soon",
      description: "Import groups functionality will be available soon.",
      variant: "info",
    })
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" className="mr-2 hover:bg-muted" asChild>
              <Link href="/dashboard/groups">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Create New Group</h1>
          </div>
          <Button variant="outline" onClick={handleImportGroups} className="bg-card hover:bg-muted">
            <Upload className="mr-2 h-4 w-4" />
            Import Groups
          </Button>
        </div>

        <Card className="shadow-lg border-0 bg-card">
          <form onSubmit={handleSubmit}>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center text-xl">
                 <Users className="mr-2 h-5 w-5 text-primary" />
                Group Information
              </CardTitle>
              <CardDescription>Create a new OpenVPN user group. All fields marked with * are required.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-6">
                 <h3 className="text-lg font-semibold text-foreground flex items-center border-b pb-2 mb-4">
                  <Shield className="mr-2 h-5 w-5 text-primary" />
                  Basic Details & Authentication
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="groupName" className="text-sm font-medium text-muted-foreground">Group Name *</Label>
                     <div className="relative">
                      <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="groupName"
                        name="groupName"
                        placeholder="Enter group name"
                        value={formData.groupName}
                        onChange={handleChange}
                        required
                        className="pl-10 border-input focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="authMethod" className="text-sm font-medium text-muted-foreground">Authentication Method *</Label>
                    <Select
                      value={formData.authMethod}
                      onValueChange={(value) => handleSelectChange("authMethod", value)}
                      required
                    >
                      <SelectTrigger className="border-input focus:border-primary">
                        <SelectValue placeholder="Select auth method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">🔐 Local Authentication</SelectItem>
                        <SelectItem value="ldap">🏢 LDAP Authentication</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm font-medium text-muted-foreground">Role *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => handleSelectChange("role", value)}
                      required
                    >
                      <SelectTrigger className="border-input focus:border-primary">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="User">👤 User</SelectItem>
                        <SelectItem value="Admin">👑 Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 flex items-center pt-6">
                     <Checkbox
                        id="mfa"
                        checked={formData.mfa}
                        onCheckedChange={(checked) => handleCheckboxChange("mfa", Boolean(checked))}
                        className="mr-2"
                      />
                      <Label htmlFor="mfa" className="text-sm font-medium text-foreground -mt-1">
                        Require MFA for this Group
                      </Label>
                  </div>
                </div>
              </div>
              

              <div className="space-y-6">
                 <h3 className="text-lg font-semibold text-foreground flex items-center border-b pb-2 mb-4">
                  <Network className="mr-2 h-5 w-5 text-primary" />
                  Network Configuration (Optional)
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="accessControl" className="text-sm font-medium text-muted-foreground">Access Control Rules</Label>
                  <Textarea
                    id="accessControl"
                    name="accessControl"
                    placeholder="Enter access control rules separated by commas (e.g., 192.168.1.0/24, 10.0.0.0/8)"
                    value={formData.accessControl}
                    onChange={handleChange}
                    rows={3}
                    className="border-input focus:border-primary min-h-[80px]"
                  />
                   <p className="text-xs text-muted-foreground">🔒 Define network access restrictions for this group</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="groupRange" className="text-sm font-medium text-muted-foreground">Group IP Range</Label>
                        <Textarea
                            id="groupRange"
                            name="groupRange"
                            placeholder="e.g., 10.8.0.10-10.8.0.100, 10.9.0.10-10.9.0.100"
                            value={formData.groupRange}
                            onChange={handleChange}
                            rows={3}
                            className="border-input focus:border-primary min-h-[80px]"
                        />
                        <p className="text-xs text-muted-foreground flex items-center"><Network className="h-3 w-3 mr-1"/>IP ranges for group-specific addressing.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="groupSubnet" className="text-sm font-medium text-muted-foreground">Group Subnets</Label>
                        <Textarea
                            id="groupSubnet"
                            name="groupSubnet"
                            placeholder="e.g., 10.8.0.0/24, 10.9.0.0/24"
                            value={formData.groupSubnet}
                            onChange={handleChange}
                            rows={3}
                            className="border-input focus:border-primary min-h-[80px]"
                        />
                        <p className="text-xs text-muted-foreground flex items-center"><Router className="h-3 w-3 mr-1"/>Subnets accessible by this group.</p>
                    </div>
                </div>

              </div>

            </CardContent>
            <CardFooter className="flex justify-between p-6 bg-muted/50 border-t rounded-b-lg">
              <Button variant="outline" type="button" asChild className="px-6">
                <Link href="/dashboard/groups">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting} className="px-8 bg-primary hover:bg-primary/90 text-primary-foreground">
                 {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Create Group
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

    
