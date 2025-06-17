
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
import { getUsers, deleteUser, updateUser, getGroups, performUserAction, bulkUserActions } from "@/lib/api"
import { ImportDialog } from "@/components/import-dialog"
import { AdvancedFilters } from "@/components/advanced-filters"
import { Pagination } from "@/components/pagination"
import { AddUserDialog } from "@/components/add-user-dialog"
import { BulkExtendExpirationDialog } from "@/components/bulk-extend-expiration-dialog"
import { ChangePasswordDialog } from "@/components/change-password-dialog"
import {
  Search,
  PlusCircle,
  MoreHorizontal,
  Trash2,
  RefreshCcw,
  KeyRound as Key, // Renamed to avoid conflict with React's key prop
  CalendarDays,
  UserCog,
  Upload,
  Download,
  CalendarClock,
  LockKeyhole,
  UnlockKeyhole,
  ListFilter,
  FileText,
  Eye,
  UserX, 
  UserCheck
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
  isEnabled?: boolean;
  lastLogin?: string
  createdAt?: string
}

interface UserTableRowProps {
  user: User;
  selectedUsers: string[];
  isCurrentUser: boolean;
  onSelectUser: (username: string, checked: boolean) => void;
  onUpdateUserAccess: (username: string, deny: boolean) => void;
  onEnableUser: (username: string) => void; 
  onDeleteUser: (username: string) => void;
  onChangePassword: (username: string) => void;
  onResetOtp: (username: string) => void;
}

const UserTableRow = memo(({ user, selectedUsers, isCurrentUser, onSelectUser, onUpdateUserAccess, onEnableUser, onDeleteUser, onChangePassword, onResetOtp }: UserTableRowProps) => {
  
  const getStatusBadge = () => {
    if (user.isEnabled === false) {
      return <Badge variant="outline" className="flex items-center gap-1 text-yellow-600 border-yellow-500 dark:text-yellow-400 dark:border-yellow-600"><UserX className="h-3 w-3" />System Disabled</Badge>;
    }
    if (user.denyAccess) {
      return <Badge variant="secondary" className="flex items-center gap-1 bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30"><LockKeyhole className="h-3 w-3" /> Access Denied</Badge>;
    }
    return <Badge variant="default" className="flex items-center gap-1 bg-green-600/10 text-green-700 dark:text-green-400 border border-green-600/30"><UnlockKeyhole className="h-3 w-3" /> Access Allowed</Badge>;
  };
  
  return (
    <TableRow key={user.username} className={selectedUsers.includes(user.username) ? "bg-muted hover:bg-muted/80" : "hover:bg-muted/50 transition-colors"}>
      <TableCell className="w-12 px-4">
        <Checkbox
          checked={selectedUsers.includes(user.username)}
          onCheckedChange={(checked) => onSelectUser(user.username, Boolean(checked))}
          aria-label={`Select group ${user.username}`}
          className="border-primary"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
           <UserCog className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <div>
            <Link href={`/dashboard/users/${user.username}`} className="font-medium text-primary hover:underline">
              {user.username}
            </Link>
            <div className="text-xs text-muted-foreground">{user.role || "N/A"}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell text-sm">{user.email || "N/A"}</TableCell>
      <TableCell className="hidden lg:table-cell text-sm">
        {user.groupName && user.groupName !== "No Group" ? (
          <Badge variant="outline" className="bg-muted/50">{user.groupName}</Badge>
        ) : (
          <span className="text-muted-foreground text-xs italic">No Group</span>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Badge variant={user.authMethod === 'local' ? "secondary" : "outline"} className="text-xs">{user.authMethod || "N/A"}</Badge>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <div className="flex items-center gap-1.5 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          {formatDateForDisplay(user.userExpiration)}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1.5 items-start">
          {getStatusBadge()}
          {user.mfa && (
            <Badge variant="outline" className="text-xs bg-blue-600/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-600/30">
              MFA Enabled
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <MoreHorizontal className="h-4.5 w-4.5" />
              <span className="sr-only">Open menu for {user.username}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>User Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/users/${user.username}`}>
                <Eye className="mr-2 h-4 w-4" />
                View/Edit Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
             {user.denyAccess ? (
              <DropdownMenuItem onClick={() => onUpdateUserAccess(user.username, false)} disabled={user.isEnabled === false}>
                <UnlockKeyhole className="mr-2 h-4 w-4 text-green-600" />
                Allow VPN Access
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onUpdateUserAccess(user.username, true)} disabled={isCurrentUser || user.isEnabled === false}>
                <LockKeyhole className="mr-2 h-4 w-4 text-red-600" />
                Deny VPN Access
              </DropdownMenuItem>
            )}
            {user.isEnabled === false && (
                 <DropdownMenuItem onClick={() => onEnableUser(user.username)} disabled={isCurrentUser}>
                    <UserCheck className="mr-2 h-4 w-4 text-green-600" /> Enable User Account
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
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
              disabled={isCurrentUser}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete User
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
  
  const [userToEnable, setUserToEnable] = useState<{ username: string } | null>(null); 
  const [isConfirmSingleEnableDialogOpen, setIsConfirmSingleEnableDialogOpen] = useState(false);


  const [bulkAccessActionToConfirm, setBulkAccessActionToConfirm] = useState<"allow" | "deny" | null>(null);
  const [isConfirmBulkAccessDialogOpen, setIsConfirmBulkAccessDialogOpen] = useState(false);
  
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [isExtendExpirationDialogOpen, setIsExtendExpirationDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false)
  const [currentFilters, setCurrentFilters] = useState<any>({ sortBy: "username", sortOrder: "asc" })
  const [availableGroups, setAvailableGroups] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [currentAuthUser, setCurrentAuthUser] = useState<any>(null);

  const [userForPasswordChange, setUserForPasswordChange] = useState<string | null>(null);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);

  const { toast } = useToast()
  const searchParams = useSearchParams()
  const actionQueryParam = searchParams.get("action")
  const groupNameQueryParam = searchParams.get("groupName")

  useEffect(() => {
    setCurrentAuthUser(getCurrentAuthUser());
  }, []);

  useEffect(() => {
    let initialFilters = { sortBy: "username", sortOrder: "asc" };
    if (groupNameQueryParam) {
        initialFilters = { ...initialFilters, groupName: groupNameQueryParam };
        setShowFilters(true); 
    }
    setCurrentFilters(initialFilters);
    fetchGroupsCallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupNameQueryParam]);


  const fetchUsersCallback = useCallback(async (filtersToApply: any) => {
    try {
      setLoading(true)
      const queryFilters: Record<string, any> = { ...filtersToApply }

      if (searchTerm.trim()) {
        if (searchTerm.includes("@")) {
          queryFilters.email = searchTerm.trim()
        } else {
          queryFilters.username = searchTerm.trim()
        }
      }

      const finalAPIFilters: Record<string, any> = {
        username: queryFilters.username || undefined,
        email: queryFilters.email || undefined,
        authMethod: queryFilters.authMethod === 'any' ? undefined : queryFilters.authMethod,
        role: queryFilters.role === 'any' ? undefined : queryFilters.role,
        groupName: queryFilters.groupName === 'any' ? undefined : queryFilters.groupName,
        isEnabled: queryFilters.isEnabled === 'any' ? undefined : (queryFilters.isEnabled === 'true'),
        denyAccess: queryFilters.denyAccess === 'any' ? undefined : (queryFilters.denyAccess === 'true'),
        sortBy: queryFilters.sortBy || "username",
        sortOrder: queryFilters.sortOrder || "asc",
      };

      Object.keys(finalAPIFilters).forEach((key) => {
        if (finalAPIFilters[key] === undefined || finalAPIFilters[key] === "") {
          delete finalAPIFilters[key]
        }
      })

      const data = await getUsers(page, limit, finalAPIFilters)
      setUsers(data.users.map(u => ({...u, denyAccess: u.denyAccess ?? false, isEnabled: typeof u.isEnabled === 'boolean' ? u.isEnabled : true })) || [])
      setTotal(data.total || 0)
    } catch (error: any) {
      console.error("Failed to fetch users:", error)
      toast({
        title: "Error Fetching Users",
        description: error.message || "Could not load users. Please try again.",
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
      toast({
        title: "Error Fetching Groups",
        description: error.message || "Could not load groups for filter selection.",
        variant: "destructive"
      });
    }
  }, [toast]);


  useEffect(() => {
    if (actionQueryParam === "new" && !isAddUserDialogOpen) {
      setIsAddUserDialogOpen(true)
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete("action")
      window.history.replaceState({}, "", newUrl.toString())
    }
    fetchUsersCallback(currentFilters)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, actionQueryParam, currentFilters, isAddUserDialogOpen]);


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
    try {
      await deleteUser(userToDelete)
      toast({
        title: "User Deleted",
        description: `User ${userToDelete} has been successfully deleted.`,
      })
      fetchUsersCallback(currentFilters)
      setSelectedUsers(prev => prev.filter(u => u !== userToDelete));
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUserToDelete(null)
      setIsDeleteUserDialogOpen(false)
    }
  }, [userToDelete, fetchUsersCallback, toast, currentFilters]);

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

  const confirmEnableUser = useCallback((username: string) => {
    if (username === currentAuthUser?.username) {
        toast({ title: "Action Prevented", description: `You cannot re-enable your own account.`, variant: "destructive" });
        return;
    }
    setUserToEnable({ username });
    setIsConfirmSingleEnableDialogOpen(true);
  }, [currentAuthUser, toast]);
  
  const executeEnableUser = useCallback(async () => {
    if (!userToEnable) return;
    const { username } = userToEnable;
    try {
        await performUserAction(username, "enable");
        toast({
            title: `User Enabled`,
            description: `User ${username} has been enabled.`,
        });
        fetchUsersCallback(currentFilters);
    } catch (error: any) {
        toast({
            title: `Error Enabling User`,
            description: error.message || `Failed to enable user.`,
            variant: "destructive",
        });
    } finally {
        setIsConfirmSingleEnableDialogOpen(false);
        setUserToEnable(null);
    }
  }, [userToEnable, fetchUsersCallback, toast, currentFilters]);


  const handleResetOtp = useCallback(async (username: string) => {
     try {
      await performUserAction(username, "reset-otp");
      toast({
        title: "OTP Reset Successful",
        description: `OTP has been reset for user ${username}. They will need to re-configure on next login.`,
      });
    } catch (error: any) {
      toast({
        title: "Error Resetting OTP",
        description: error.message || "Could not reset OTP for the user.",
        variant: "destructive",
      });
    }
  }, [toast]);


  const confirmBulkUpdateAccess = useCallback((action: "allow" | "deny") => {
    if (selectedUsers.length === 0) {
      toast({ title: "No Users Selected", description: "Please select users to perform bulk actions.", variant: "destructive" });
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

    toast({ title: "Bulk Action Started", description: `Attempting to ${bulkAccessActionToConfirm} VPN access for ${selectedUsers.length} users...`});

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
    setSelectedUsers(prev => checked ? [...prev, username] : prev.filter(u => u !== username));
  }, []);

  const handleSelectAllCallback = useCallback((checked: boolean) => {
    setSelectedUsers(checked ? users.map(user => user.username) : []);
  }, [users]);


  const handleExport = useCallback(() => {
    toast({
      title: "Export Coming Soon",
      description: "This feature will be available in a future update.",
    })
  }, [toast]);

  const openChangePasswordDialog = useCallback((username: string) => {
    setUserForPasswordChange(username);
    setIsChangePasswordDialogOpen(true);
  }, []);

  const totalPages = Math.ceil(total / limit)
  const isAllSelected = users.length > 0 && selectedUsers.length === users.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage OpenVPN users, their permissions, and access settings.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} className="h-10">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExport} className="h-10">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setIsAddUserDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 h-10">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      <Card className="shadow-md border-0">
        <CardHeader className="border-b px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="search"
                        placeholder="Search by username or email..."
                        className="pl-10 h-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    </div>
                    <Button type="submit" variant="outline" className="h-10">Search</Button>
                </form>
                <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 h-10 w-full sm:w-auto">
                    <ListFilter className="h-4 w-4" />
                    {showFilters ? "Hide Filters" : "Show Filters"} ({Object.values(currentFilters).filter(v => v && v !== "any" && v !== "username" && v !== "asc").length})
                </Button>
            </div>
        </CardHeader>
        <CardContent className="p-0">
          {showFilters && (
            <div className="p-4 sm:p-6 border-b bg-muted/30">
              <AdvancedFilters type="users" onFiltersChange={handleFiltersChangeCallback} availableGroups={availableGroups} initialFilters={currentFilters} />
            </div>
          )}
          
          {selectedUsers.length > 0 && (
            <div className="p-3 sm:p-4 border-b bg-primary/5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span className="text-sm font-medium text-primary">{selectedUsers.length} user(s) selected</span>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => confirmBulkUpdateAccess("allow")} disabled={bulkActionLoading} className="border-green-500 text-green-700 hover:bg-green-500/10">
                          <UnlockKeyhole className="mr-2 h-4 w-4" /> Allow VPN Access
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => confirmBulkUpdateAccess("deny")} disabled={bulkActionLoading} className="border-red-500 text-red-700 hover:bg-red-500/10">
                          <LockKeyhole className="mr-2 h-4 w-4" /> Deny VPN Access
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setIsExtendExpirationDialogOpen(true)} disabled={bulkActionLoading}>
                          <CalendarClock className="mr-2 h-4 w-4" /> Extend Expiration
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedUsers([])}  disabled={bulkActionLoading}>
                          Clear
                        </Button>
                    </div>
                </div>
            </div>
           )}

          {loading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 px-4">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAllCallback}
                          disabled={users.length === 0}
                          aria-label="Select all users"
                          className="border-primary"
                        />
                      </TableHead>
                      <TableHead>User (Role)</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden lg:table-cell">Group</TableHead>
                      <TableHead className="hidden md:table-cell">Auth</TableHead>
                      <TableHead className="hidden sm:table-cell">Expiration</TableHead>
                      <TableHead>Status (VPN/MFA)</TableHead>
                      <TableHead className="text-right px-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          <FileText className="mx-auto h-10 w-10 opacity-50 mb-2" />
                          No users found matching your criteria.
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
                          onEnableUser={confirmEnableUser} 
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
              Delete User
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
              className={userToUpdateAccess?.deny ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-600/90 text-white"}
            >
              Confirm {userToUpdateAccess?.deny ? "Deny Access" : "Allow Access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isConfirmSingleEnableDialogOpen} onOpenChange={setIsConfirmSingleEnableDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Enable User Account</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to enable user account "{userToEnable?.username}"? They will be able to authenticate if their VPN access is allowed.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsConfirmSingleEnableDialogOpen(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={executeEnableUser}
                    className={"bg-green-600 hover:bg-green-600/90 text-white"}
                >
                    Confirm Enable Account
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
              className={bulkAccessActionToConfirm === "deny" ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-600/90 text-white"}
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

    

    