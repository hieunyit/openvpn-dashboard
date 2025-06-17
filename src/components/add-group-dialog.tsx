
"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast" // Changed from @/hooks/use-toast
import { createGroup } from "@/lib/api"
import { Users, Network, Shield, Router, KeyRound, CheckCircle, AlertTriangle } from "lucide-react"
import { getCoreApiErrorMessage } from "@/lib/utils"

interface AddGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddGroupDialog({ open, onOpenChange, onSuccess }: AddGroupDialogProps) {
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

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setFormData({
        groupName: "",
        authMethod: "local",
        role: "User",
        mfa: false,
        accessControl: "",
        groupRange: "",
        groupSubnet: "",
      });
    }
  }, [open]);

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
        title: "Thành Công",
        description: `Nhóm ${formData.groupName} đã được tạo.`,
        variant: "success",
        icon: <CheckCircle className="h-5 w-5" />,
        duration: 3000,
      })

      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      const apiErrorMessage = getCoreApiErrorMessage(error.message);
      console.log("Attempting to display error toast. Title: Lỗi Tạo Nhóm, Description:", apiErrorMessage);
      toast({
        title: "Lỗi Tạo Nhóm",
        description: apiErrorMessage,
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
        duration: 5000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Users className="mr-2 h-5 w-5 text-primary" />
            Tạo Nhóm Mới
          </DialogTitle>
          <DialogDescription>Thêm một nhóm người dùng mới để tổ chức và quản lý quyền của người dùng.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center">
              <Shield className="mr-2 h-5 w-5 text-primary" />
              Chi Tiết Cơ Bản & Xác Thực
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="groupName-dialog" className="text-sm font-medium">
                  Tên Nhóm *
                </Label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="groupName-dialog"
                    name="groupName"
                    placeholder="Nhập tên nhóm"
                    value={formData.groupName}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="authMethod-group-dialog" className="text-sm font-medium">
                  Phương Thức Xác Thực *
                </Label>
                <Select
                  value={formData.authMethod}
                  onValueChange={(value) => handleSelectChange("authMethod", value)}
                  required
                >
                  <SelectTrigger id="authMethod-group-dialog">
                    <SelectValue placeholder="Chọn phương thức xác thực" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">🔐 Local</SelectItem>
                    <SelectItem value="ldap">🏢 LDAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                  <Label htmlFor="role-dialog" className="text-sm font-medium">Vai Trò *</Label>
                  <Select value={formData.role} onValueChange={(value) => handleSelectChange("role", value)} required>
                      <SelectTrigger id="role-dialog"><SelectValue placeholder="Chọn vai trò" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="User">👤 User</SelectItem>
                          <SelectItem value="Admin">👑 Admin</SelectItem>
                      </SelectContent>
                  </Select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="mfa-dialog"
                  checked={formData.mfa}
                  onCheckedChange={(checked) => handleCheckboxChange("mfa", Boolean(checked))}
                />
                <Label htmlFor="mfa-dialog" className="text-sm font-medium">
                  <KeyRound className="inline h-4 w-4 mr-1" /> Yêu Cầu MFA
                </Label>
              </div>
            </div>
          </div>

          {/* Network Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center">
              <Network className="mr-2 h-5 w-5 text-primary" />
              Cấu Hình Mạng (Tùy Chọn)
            </h3>
            <div className="space-y-2">
              <Label htmlFor="accessControl-group-dialog" className="text-sm font-medium">
                Quy Tắc Kiểm Soát Truy Cập
              </Label>
              <Textarea
                id="accessControl-group-dialog"
                name="accessControl"
                placeholder="Nhập các quy tắc kiểm soát truy cập, cách nhau bằng dấu phẩy (vd: 192.168.1.0/24)"
                value={formData.accessControl}
                onChange={handleChange}
                rows={2}
                className="min-h-[60px]"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="groupRange-dialog" className="text-sm font-medium">Dải IP Nhóm</Label>
                <Textarea
                  id="groupRange-dialog"
                  name="groupRange"
                  placeholder="vd: 10.8.0.10-10.8.0.100"
                  value={formData.groupRange}
                  onChange={handleChange}
                  rows={2}
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupSubnet-dialog" className="text-sm font-medium">Subnet Nhóm</Label>
                <Textarea
                  id="groupSubnet-dialog"
                  name="groupSubnet"
                  placeholder="vd: 10.8.0.0/24"
                  value={formData.groupSubnet}
                  onChange={handleChange}
                  rows={2}
                  className="min-h-[60px]"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                  Đang Tạo...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Tạo Nhóm
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
