
"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { createGroup } from "@/lib/api"
import { Users, Network, Shield } from "lucide-react" // Added Shield

interface AddGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddGroupDialog({ open, onOpenChange, onSuccess }: AddGroupDialogProps) {
  const [formData, setFormData] = useState({
    groupName: "",
    authMethod: "local",
    // role: "User", // Removed role as per Swagger for create
    accessControl: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

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
        title: "✅ Group created successfully",
        description: `Group ${formData.groupName} has been created and is ready to use.`,
      })

      // Reset form
      setFormData({
        groupName: "",
        authMethod: "local",
        // role: "User", // Removed role
        accessControl: "",
      })

      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      console.error("Failed to create group:", error)
      toast({
        title: "❌ Failed to create group",
        description: error.message || "Please check your input and try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Users className="mr-2 h-5 w-5 text-primary" />
            Create New Group
          </DialogTitle>
          <DialogDescription>Add a new user group to organize and manage user permissions.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" />
              Group Information
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="groupName-dialog" className="text-sm font-medium">
                  Group Name *
                </Label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="groupName-dialog"
                    name="groupName"
                    placeholder="Enter group name"
                    value={formData.groupName}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4"> 
                <div className="space-y-2">
                  <Label htmlFor="authMethod-group-dialog" className="text-sm font-medium">
                    Authentication Method *
                  </Label>
                  <Select
                    value={formData.authMethod}
                    onValueChange={(value) => handleSelectChange("authMethod", value)}
                    required
                  >
                    <SelectTrigger id="authMethod-group-dialog">
                      <SelectValue placeholder="Select auth method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">🔐 Local</SelectItem>
                      <SelectItem value="ldap">🏢 LDAP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Role field removed from here as it's not in CreateGroupRequest per Swagger */}
              </div>
            </div>
          </div>

          {/* Network Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center">
              <Network className="mr-2 h-5 w-5 text-primary" />
              Network Configuration
            </h3>
            <div className="space-y-2">
              <Label htmlFor="accessControl-group-dialog" className="text-sm font-medium">
                Access Control Rules
              </Label>
              <Textarea
                id="accessControl-group-dialog"
                name="accessControl"
                placeholder="Enter access control rules separated by commas&#10;Example: 192.168.1.0/24, 10.0.0.0/8"
                value={formData.accessControl}
                onChange={handleChange}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">🔒 Optional: Define network access restrictions for this group</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
