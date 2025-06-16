
"use client"

import type React from "react"

import { useState, useEffect, useCallback, memo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { getUsers, deleteUser, updateUser, getGroups, performUserAction } from "@/lib/api"
import { ImportDialog } from "@/components/import-dialog"
import { AdvancedFilters } from "@/components/advanced-filters"
import { Pagination } from "@/components/pagination"
import { AddUserDialog } from "@/components/add-user-dialog"
import { BulkExtendExpirationDialog } from "@/components/bulk-extend-expiration-dialog"
import { ChangePasswordDialog } from "@/components/change-password-dialog"
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCcw,
  Key,
  Calendar,
  UserCog,
  Upload,
  Filter,
  Download,
  CalendarClock,
  LockKeyhole,
  UnlockKeyhole,
} from "lucide-react"
import Link from "next/link"
import { formatDateForDisplay } from "@/lib/utils"
import { getUser as getCurrentAuthUser } from "@/lib/auth"


interface User {
  username: string
  email: string
  authMethod: string
  role: string
  groupName?: string
  userExpiration: string
  mfa: boolean
  denyAccess?: boolean
  lastLogin?: string
  createdAt?: string
}

interface UserTableRowProps {
  user: User;
  selectedUsers: string[];
  isCurrentUser: boolean;
  onSelectUser: (username: string, checked: boolean) => void;
  onUpdateUserAccess: (username: string, deny: boolean) => void;
  onDeleteUser: (username: string) => void;
  onChangePassword: (username: string) => void;
  onResetOtp: (username: string) => void;
}

const UserTableRow = memo(({ user, selectedUsers, isCurrentUser, onSelectUser, onUpdateUserAccess, onDeleteUser, onChangePassword, onResetOtp }: UserTableRowProps) => {
  return (
    <TableRow key={user.username} className={selectedUsers.includes(user.username) ? "bg-muted/60" : "hover:bg-muted/50"}>
      <TableCell>
        <Checkbox
          checked={selectedUsers.includes(user.username)}
          onCheckedChange={(checked) => onSelectUser(user.username, Boolean(checked))}
        />
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <UserCog className="h-4 w-4 text-muted-foreground" />
          <div>
            <Link href={`/dashboard/users/${user.username}`} className="font-medium hover:underline">
              {user.username}
            </Link>
            <div className="text-sm text-muted-foreground">{user.role || "N/A"}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>{user.email || "N/A"}</TableCell>
      <TableCell>
        {user.groupName ? (
          <Badge variant="outline">{user.groupName}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">N/A</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{user.authMethod || "N/A"}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">{formatDateForDisplay(user.userExpiration)}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          {user.denyAccess ? (
            <Badge variant="secondary" className="flex items-center gap-1">
              <LockKeyhole className="h-3 w-3" /> Access Denied
            </Badge>
          ) : (
            <Badge variant="default" className="flex items-center gap-1">
              <UnlockKeyhole className="h-3 w-3" /> Access Allowed
            </Badge>
          )}
          {user.mfa && (
            <Badge variant="outline" className="text-xs">
              MFA
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/users/${user.username}`}>
                <Edit className="mr-2 h-4 w-4" />
                View/Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {user.denyAccess ? (
              <DropdownMenuItem onClick={() => onUpdateUserAccess(user.username, false)}>
                <UnlockKeyhole className="mr-2 h-4 w-4" />
                Allow VPN Access
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onUpdateUserAccess(user.username, true)} disabled={isCurrentUser}>
                <LockKeyhole className="mr-2 h-4 w-4" />
                Deny VPN Access
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onResetOtp(user.username)}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reset OTP
            </DropdownMenuItem>
            {user.authMethod === "local" && (
            <DropdownMenuItem onClick={() => onChangePassword(user.username)}>
              <Key className="mr-2 h-4 w-4" />
              Change Password
            </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDeleteUser(user.username)}
              className="text-red-600 hover:!text-red-600 focus:!text-red-600"
              disabled={isCurrentUser}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
});
UserTableRow.displayName = "UserTableRow";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)

  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false)

  const [userToUpdateAccess, setUserToUpdateAccess] = useState<{ username: string; deny: boolean } | null>(null);
  const [isConfirmSingleAccessDialogOpen, setIsConfirmSingleAccessDialogOpen] = useState(false);

  const [bulkAccessActionToConfirm, setBulkAccessActionToConfirm] = useState<"allow" | "deny" | null>(null);
  const [isConfirmBulkAccessDialogOpen, setIsConfirmBulkAccessDialogOpen] = useState(false);

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [isExtendExpirationDialogOpen, setIsExtendExpirationDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false)
  const [currentFilters, setCurrentFilters] = useState<any>({})
  const [availableGroups, setAvailableGroups] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [currentAuthUser, setCurrentAuthUser] = useState<any>(null);


  const [userForPasswordChange, setUserForPasswordChange] = useState<string | null>(null);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);


  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const actionQueryParam = searchParams.get("action")

  useEffect(() => {
    setCurrentAuthUser(getCurrentAuthUser());
  }, []);


  const fetchUsersCallback = useCallback(async (filtersToApply: any) => {
    try {
      setLoading(true)
      const queryFilters: Record<string, any> = { ...filtersToApply }

      if (searchTerm) {
        if (searchTerm.includes("@")) {
          queryFilters.email = searchTerm
        } else {
          queryFilters.username = searchTerm
        }
      }

      const finalAPIFilters = {
        username: queryFilters.username || undefined,
        email: queryFilters.email || undefined,
        authMethod: queryFilters.authMethod === 'any' ? undefined : queryFilters.authMethod,
        role: queryFilters.role === 'any' ? undefined : queryFilters.role,
        groupName: queryFilters.groupName === 'any' ? undefined : queryFilters.groupName,
        sortBy: queryFilters.sortBy || "username",
        sortOrder: queryFilters.sortOrder || "asc",
      };

      Object.keys(finalAPIFilters).forEach((key) => {
        if (finalAPIFilters[key] === undefined || finalAPIFilters[key] === "") {
          delete finalAPIFilters[key]
        }
      })


      const data = await getUsers(page, limit, finalAPIFilters)
      setUsers(data.users.map(u => ({...u, denyAccess: u.denyAccess ?? false })) || [])
      setTotal(data.total || 0)
    } catch (error: any) {
      console.error("Failed to fetch users:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load users. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [page, limit, searchTerm, toast]);

  const fetchGroupsCallback = useCallback(async () => {
    try {
      const data = await getGroups(1, 100)
      setAvailableGroups(data.groups?.map((g: any) => g.groupName) || [])
    } catch (error: any) {
      console.error("Failed to fetch groups:", error)
      toast({
        title: "Error fetching groups",
        description: error.message || "Could not load groups for filter selection.",
        variant: "destructive"
      });
    }
  }, [toast]);


  useEffect(() => {
    if (actionQueryParam === "new") {
      setIsAddUserDialogOpen(true)
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete("action")
      window.history.replaceState({}, "", newUrl.toString())
    }
    fetchUsersCallback(currentFilters)
    fetchGroupsCallback()
  }, [page, limit, actionQueryParam, fetchUsersCallback, fetchGroupsCallback, currentFilters])


  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchUsersCallback(currentFilters)
  }, [fetchUsersCallback, currentFilters]);

  const handleFiltersChangeCallback = useCallback((newFilters: any) => {
    setCurrentFilters(newFilters);
    setPage(1);
  }, []);


  const handleDeleteUserCallback = useCallback(async () => {
    if (!userToDelete) return

    if (userToDelete === currentAuthUser?.username) {
      toast({ title: "Action Prevented", description: "You cannot delete your own account.", variant: "destructive" });
      setUserToDelete(null);
      setIsDeleteUserDialogOpen(false);
      return;
    }

    try {
      await deleteUser(userToDelete)
      toast({
        title: "User deleted",
        description: `User ${userToDelete} has been deleted successfully.`,
      })
      fetchUsersCallback(currentFilters)
      setSelectedUsers(prev => prev.filter(u => u !== userToDelete));
    } catch (error: any) {
      console.error("Failed to delete user:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUserToDelete(null)
      setIsDeleteUserDialogOpen(false)
    }
  }, [userToDelete, fetchUsersCallback, toast, currentFilters, currentAuthUser]);

  const confirmDeleteUser = useCallback((username: string) => {
    if (username === currentAuthUser?.username) {
      toast({ title: "Action Prevented", description: "You cannot delete your own account.", variant: "destructive" });
      return;
    }
    setUserToDelete(username);
    setIsDeleteUserDialogOpen(true);
  }, [currentAuthUser, toast]);

  const confirmUpdateUserAccess = useCallback((username: string, deny: boolean) => {
    if (deny && username === currentAuthUser?.username) {
      toast({ title: "Action Prevented", description: "You cannot deny VPN access to your own account.", variant: "destructive" });
      return;
    }
    setUserToUpdateAccess({ username, deny });
    setIsConfirmSingleAccessDialogOpen(true);
  }, [currentAuthUser, toast]);

  const executeUpdateUserAccess = useCallback(async () => {
    if (!userToUpdateAccess) return;
    const { username, deny } = userToUpdateAccess;
    try {
      await updateUser(username, { denyAccess: deny });
      toast({
        title: "VPN Access Updated",
        description: `VPN access for user ${username} has been ${deny ? "denied" : "allowed"}.`,
      });
      fetchUsersCallback(currentFilters);
    } catch (error: any) {
      toast({
        title: "Error Updating Access",
        description: error.message || "Failed to update VPN access.",
        variant: "destructive",
      });
    } finally {
      setIsConfirmSingleAccessDialogOpen(false);
      setUserToUpdateAccess(null);
    }
  }, [userToUpdateAccess, fetchUsersCallback, toast, currentFilters]);

  const handleResetOtp = useCallback(async (username: string) => {
     try {
      await performUserAction(username, "reset-otp");
      toast({
        title: "OTP Reset",
        description: `OTP reset for user ${username}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error Resetting OTP",
        description: error.message || "Could not reset OTP.",
        variant: "destructive",
      });
    }
  }, [toast]);


  const confirmBulkUpdateAccess = useCallback((action: "allow" | "deny") => {
    if (selectedUsers.length === 0) {
      toast({ title: "No users selected", description: "Please select users to perform bulk actions.", variant: "destructive" });
      return;
    }
    if (action === "deny" && selectedUsers.includes(currentAuthUser?.username)) {
        toast({ title: "Action Prevented", description: "You cannot deny VPN access to your own account in a bulk operation. Please deselect yourself.", variant: "destructive" });
        return;
    }
    setBulkAccessActionToConfirm(action);
    setIsConfirmBulkAccessDialogOpen(true);
  }, [selectedUsers, currentAuthUser, toast]);

  const executeBulkUpdateAccess = useCallback(async () => {
    if (!bulkAccessActionToConfirm || selectedUsers.length === 0) return;

    const deny = bulkAccessActionToConfirm === "deny";
    setBulkActionLoading(true);
    let successCount = 0;
    let failCount = 0;

    toast({ title: "Bulk Action Started", description: `Attempting to ${bulkAccessActionToConfirm} VPN access for ${selectedUsers.length} users... This may take a moment.`});

    for (const username of selectedUsers) {
      try {
        await updateUser(username, { denyAccess: deny });
        successCount++;
      } catch (error) {
        failCount++;
        console.error(`Failed to update access for ${username}:`, error);
      }
    }

    setBulkActionLoading(false);
    setIsConfirmBulkAccessDialogOpen(false);
    setBulkAccessActionToConfirm(null);

    let summaryMessage = `${successCount} users had VPN access ${deny ? "denied" : "allowed"}.`;
    if (failCount > 0) {
      summaryMessage += ` ${failCount} users failed to update.`;
    }
    toast({
      title: "Bulk Action Complete",
      description: summaryMessage,
      variant: failCount > 0 && successCount === 0 ? "destructive" : (failCount > 0 ? "default" : "default")
    });

    fetchUsersCallback(currentFilters);
    setSelectedUsers([]);
  }, [bulkAccessActionToConfirm, selectedUsers, fetchUsersCallback, toast, currentFilters]);


  const handleSelectUserCallback = useCallback((username: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers((prev) => [...prev, username])
    } else {
      setSelectedUsers((prev) => prev.filter((u) => u !== username))
    }
  }, []);

  const handleSelectAllCallback = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map((user) => user.username))
    } else {
      setSelectedUsers([])
    }
  }, [users]);


  const handleExport = useCallback(() => {
    toast({
      title: "Coming Soon",
      description: "Export functionality will be available soon.",
    })
  }, [toast]);

  const openChangePasswordDialog = useCallback((username: string) => {
    setUserForPasswordChange(username);
    setIsChangePasswordDialogOpen(true);
  }, []);

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Users Management</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setIsAddUserDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {selectedUsers.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{selectedUsers.length} users selected</span>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => confirmBulkUpdateAccess("allow")}
                  disabled={bulkActionLoading}
                >
                  <UnlockKeyhole className="mr-2 h-4 w-4" />
                  Allow Access
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => confirmBulkUpdateAccess("deny")}
                  disabled={bulkActionLoading}
                >
                  <LockKeyhole className="mr-2 h-4 w-4" />
                  Deny Access
                </Button>
                 <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExtendExpirationDialogOpen(true)}
                  disabled={bulkActionLoading || selectedUsers.length === 0}
                >
                  <CalendarClock className="mr-2 h-4 w-4" />
                  Extend Expiration
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUsers([])}  disabled={bulkActionLoading}>
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage OpenVPN users, their permissions, and access settings.</CardDescription>
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex items-center space-x-2 mb-6">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Quick search by username or email..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit">Search</Button>
          </form>

          {showFilters && (
            <div className="mb-6">
              <AdvancedFilters type="users" onFiltersChange={handleFiltersChangeCallback} availableGroups={availableGroups} initialFilters={currentFilters} />
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={users.length > 0 && selectedUsers.length === users.length}
                          onCheckedChange={(checked) => handleSelectAllCallback(Boolean(checked))}
                          disabled={users.length === 0}
                        />
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Auth Method</TableHead>
                      <TableHead>Expiration</TableHead>
                      <TableHead>VPN Access Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No users found matching your criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <UserTableRow
                          key={user.username}
                          user={user}
                          selectedUsers={selectedUsers}
                          isCurrentUser={user.username === currentAuthUser?.username}
                          onSelectUser={handleSelectUserCallback}
                          onUpdateUserAccess={confirmUpdateUserAccess}
                          onDeleteUser={confirmDeleteUser}
                          onChangePassword={openChangePasswordDialog}
                          onResetOtp={handleResetOtp}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                itemsPerPage={limit}
                onPageChange={setPage}
                onItemsPerPageChange={(newLimit) => {
                  setLimit(newLimit)
                  setPage(1)
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete user "{userToDelete}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteUserDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteUserCallback}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isConfirmSingleAccessDialogOpen} onOpenChange={setIsConfirmSingleAccessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm VPN Access Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {userToUpdateAccess?.deny ? "deny" : "allow"} VPN access for user "{userToUpdateAccess?.username}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmSingleAccessDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeUpdateUserAccess}
              className={userToUpdateAccess?.deny ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-600/90"}
            >
              Confirm {userToUpdateAccess?.deny ? "Deny Access" : "Allow Access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isConfirmBulkAccessDialogOpen} onOpenChange={setIsConfirmBulkAccessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk VPN Access Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {bulkAccessActionToConfirm === "deny" ? "deny" : "allow"} VPN access for {selectedUsers.length} selected user(s)?
              {bulkAccessActionToConfirm === "deny" && selectedUsers.includes(currentAuthUser?.username) && (
                <p className="text-destructive text-sm mt-2">Warning: Your own account is selected and will be denied access.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmBulkAccessDialogOpen(false)} disabled={bulkActionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkUpdateAccess}
              disabled={bulkActionLoading}
              className={bulkAccessActionToConfirm === "deny" ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-600/90"}
            >
              {bulkActionLoading ? "Processing..." : `Confirm ${bulkAccessActionToConfirm === "deny" ? "Deny Access" : "Allow Access"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <ImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        type="users"
        onImportComplete={() => fetchUsersCallback(currentFilters)}
      />

      <AddUserDialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen} onSuccess={() => fetchUsersCallback(currentFilters)} />

      <BulkExtendExpirationDialog
        open={isExtendExpirationDialogOpen}
        onOpenChange={setIsExtendExpirationDialogOpen}
        selectedUsernames={selectedUsers}
        onSuccess={() => {
          fetchUsersCallback(currentFilters);
          setSelectedUsers([]);
        }}
      />

      {userForPasswordChange && (
        <ChangePasswordDialog
          open={isChangePasswordDialogOpen}
          onOpenChange={(open) => {
            setIsChangePasswordDialogOpen(open);
            if (!open) {
              setUserForPasswordChange(null);
            }
          }}
          username={userForPasswordChange}
          onSuccess={() => {
            setIsChangePasswordDialogOpen(false);
            setUserForPasswordChange(null);
          }}
        />
      )}

    </div>
  )
}
