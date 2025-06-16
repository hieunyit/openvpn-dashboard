
"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { createGroup } from "@/lib/api"
import { ArrowLeft, Upload, Users, Network, Shield } from "lucide-react" // Added Users, Network, Shield
import Link from "next/link"

export default function NewGroupPage() {
  const [formData, setFormData] = useState({
    groupName: "",
    authMethod: "local",
    // role: "User", // Removed role
    accessControl: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Format the data for the API
      const groupData = {
        groupName: formData.groupName,
        authMethod: formData.authMethod,
        // role: formData.role, // Removed role
        accessControl: formData.accessControl
          .split(",")
          .map((ac) => ac.trim())
          .filter((ac) => ac),
      }

      await createGroup(groupData)

      toast({
        title: "Group created",
        description: `Group ${formData.groupName} has been created successfully.`,
      })

      router.push("/dashboard/groups")
    } catch (error: any) {
      console.error("Failed to create group:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create group. Please check your input and try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImportGroups = () => {
    // TODO: Implement import functionality
    toast({
      title: "Coming Soon",
      description: "Import groups functionality will be available soon.",
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
                  Basic Details
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
                </div>
              </div>
              
              {/* Role field removed */}

              <div className="space-y-6">
                 <h3 className="text-lg font-semibold text-foreground flex items-center border-b pb-2 mb-4">
                  <Network className="mr-2 h-5 w-5 text-primary" />
                  Network Configuration
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="accessControl" className="text-sm font-medium text-muted-foreground">Access Control</Label>
                  <Textarea
                    id="accessControl"
                    name="accessControl"
                    placeholder="Enter access control rules separated by commas (e.g., 192.168.1.0/24, 10.0.0.0/8)"
                    value={formData.accessControl}
                    onChange={handleChange}
                    rows={4}
                    className="border-input focus:border-primary min-h-[100px]"
                  />
                   <p className="text-xs text-muted-foreground">🔒 Optional: Define network access restrictions for this group</p>
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
