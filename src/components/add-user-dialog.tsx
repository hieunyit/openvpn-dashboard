
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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createUser, getGroups } from "@/lib/api"
import { User, Mail, Lock, Calendar, Network, Shield, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react"
import { generateRandomPassword, getCoreApiErrorMessage } from "@/lib/utils"

interface Group {
  groupName: string
  authMethod: string
  role: string
}

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddUserDialog({ open, onOpenChange, onSuccess }: AddUserDialogProps) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    authMethod: "local",
    groupName: "No Group",
    userExpiration: "",
    macAddresses: "",
    accessControl: "",
  })
  const [groups, setGroups] = useState<Group[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingGroups, setLoadingGroups] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchGroups()
      // Reset form data when dialog opens
      setFormData({
        username: "",
        email: "",
        password: "",
        authMethod: "local",
        groupName: "No Group",
        userExpiration: "",
        macAddresses: "",
        accessControl: "",
      })
    }
  }, [open])

  const fetchGroups = async () => {
    try {
      setLoadingGroups(true)
      const data = await getGroups(1, 100)
      setGroups(data.groups || [])
    } catch (error) {
      // console.error("Failed to fetch groups for dialog:", error)
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
      title: "Đã Tạo Mật Khẩu",
      description: "Một mật khẩu ngẫu nhiên mới đã được tạo và điền vào.",
      variant: "info",
      icon: <RefreshCw className="h-5 w-5" />,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

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
      }
      if (formData.authMethod === "local") {
        userData.password = formData.password
      }

      await createUser(userData)

      toast({
        title: "Thành Công",
        description: `Người dùng ${formData.username} đã được tạo.`,
        variant: "success",
        icon: <CheckCircle className="h-5 w-5" />,
        duration: 3000,
      })

      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      const apiErrorMessage = getCoreApiErrorMessage(error.message);
      console.log("Attempting to display error toast. Title: Lỗi Tạo Người Dùng, Description:", apiErrorMessage);
      toast({
        title: "Lỗi Tạo Người Dùng",
        description: apiErrorMessage,
        variant: "destructive",
        duration: 5000,
        icon: <AlertTriangle className="h-5 w-5" />,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <User className="mr-2 h-5 w-5 text-primary" />
            Tạo Người Dùng Mới
          </DialogTitle>
          <DialogDescription>
            Thêm người dùng OpenVPN mới vào hệ thống của bạn. Điền các thông tin được yêu cầu dưới đây.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center">
              <User className="mr-2 h-5 w-5 text-primary" />
              Thông Tin Cơ Bản
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username-dialog" className="text-sm font-medium">
                  Tên người dùng *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username-dialog"
                    name="username"
                    placeholder="Nhập tên người dùng"
                    value={formData.username}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-dialog" className="text-sm font-medium">
                  Địa chỉ Email *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email-dialog"
                    name="email"
                    type="email"
                    placeholder="Nhập địa chỉ email"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              {formData.authMethod === 'local' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password-dialog" className="text-sm font-medium">
                      Mật khẩu *
                    </Label>
                    <Button type="button" variant="link" size="sm" onClick={handleGeneratePassword} className="p-0 h-auto text-xs">
                       <RefreshCw className="mr-1 h-3 w-3"/> Tạo mật khẩu
                    </Button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password-dialog"
                      name="password"
                      type="text" 
                      placeholder="Nhập hoặc tạo mật khẩu"
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-10"
                      required={formData.authMethod === 'local'}
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="userExpiration-dialog" className="text-sm font-medium">
                  Ngày hết hạn *
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="userExpiration-dialog"
                    name="userExpiration"
                    type="date"
                    value={formData.userExpiration}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Authentication & Group */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center">
              <Shield className="mr-2 h-5 w-5 text-primary" />
              Xác Thực & Truy Cập
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="authMethod-dialog" className="text-sm font-medium">
                  Phương thức xác thực *
                </Label>
                <Select
                  value={formData.authMethod}
                  onValueChange={(value) => handleSelectChange("authMethod", value)}
                  required
                >
                  <SelectTrigger id="authMethod-dialog">
                    <SelectValue placeholder="Chọn phương thức xác thực" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">🔐 Xác thực Local</SelectItem>
                    <SelectItem value="ldap">🏢 Xác thực LDAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="groupName-dialog" className="text-sm font-medium">
                  Nhóm người dùng
                </Label>
                <Select
                  value={formData.groupName}
                  onValueChange={(value) => handleSelectChange("groupName", value)}
                  disabled={loadingGroups}
                >
                  <SelectTrigger id="groupName-dialog">
                    <SelectValue placeholder={loadingGroups ? "Đang tải nhóm..." : "Chọn nhóm (tùy chọn)"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No Group">👤 Không thuộc nhóm nào</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.groupName} value={group.groupName}>
                        👥 {group.groupName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Network Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center">
              <Network className="mr-2 h-5 w-5 text-primary" />
              Cấu Hình Mạng
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="macAddresses-dialog" className="text-sm font-medium">
                  Địa chỉ MAC *
                </Label>
                <Textarea
                  id="macAddresses-dialog"
                  name="macAddresses"
                  placeholder="Nhập các địa chỉ MAC, cách nhau bằng dấu phẩy&#10;Ví dụ: 00:11:22:33:44:55, AA:BB:CC:DD:EE:FF"
                  value={formData.macAddresses}
                  onChange={handleChange}
                  className="min-h-[80px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessControl-dialog" className="text-sm font-medium">
                  Quy tắc kiểm soát truy cập
                </Label>
                <Textarea
                  id="accessControl-dialog"
                  name="accessControl"
                  placeholder="Nhập các quy tắc kiểm soát truy cập, cách nhau bằng dấu phẩy&#10;Ví dụ: 192.168.1.0/24, 10.0.0.0/8"
                  value={formData.accessControl}
                  onChange={handleChange}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Đang tạo...
                </>
              ) : (
                <>
                  <User className="mr-2 h-4 w-4" />
                  Tạo Người Dùng
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
