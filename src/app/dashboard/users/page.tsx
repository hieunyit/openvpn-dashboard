
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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
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
  KeyRound as Key, 
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
  UserCheck,
  UserMinus,
  X as XIcon,
  AlertTriangle,
  CheckCircle
} from "lucide-react"
import Link from "next/link"
import { formatDateForDisplay, getExpirationStatus, formatDateForInput, getCoreApiErrorMessage } from "@/lib/utils"
import { getUser as getCurrentAuthUser } from "@/lib/auth"
import { format as formatDateFns } from "date-fns"


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
  onEnableUserAccount: (username: string) => void; 
  onDisableUserAccount: (username: string) => void;
  onDeleteUser: (username: string) => void;
  onChangePassword: (username: string) => void;
  onResetOtp: (username: string) => void;
}

const UserTableRow = memo(({ user, selectedUsers, isCurrentUser, onSelectUser, onUpdateUserAccess, onEnableUserAccount, onDisableUserAccount, onDeleteUser, onChangePassword, onResetOtp }: UserTableRowProps) => {
  
  const getStatusBadge = () => {
    if (user.isEnabled === false) {
      return <Badge variant="outline" className="flex items-center gap-1 text-yellow-600 border-yellow-500 dark:text-yellow-400 dark:border-yellow-600"><UserX className="h-3 w-3" />System Disabled</Badge>;
    }
    if (user.denyAccess) {
      return <Badge variant="secondary" className="flex items-center gap-1 bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30"><LockKeyhole className="h-3 w-3" /> VPN Disabled</Badge>;
    }
    return <Badge variant="default" className="flex items-center gap-1 bg-green-600/10 text-green-700 dark:text-green-400 border border-green-600/30"><UnlockKeyhole className="h-3 w-3" /> VPN Enabled</Badge>;
  };

  const expirationStatus = getExpirationStatus(user.userExpiration);
  const displayedExpirationDate = formatDateForDisplay(user.userExpiration);
  const isExpirationUnknown = expirationStatus === "unknown";
  
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
          {!isExpirationUnknown && expirationStatus === "expired" && <span className="h-2 w-2 rounded-full bg-destructive" title="Expired"></span>}
          {!isExpirationUnknown && expirationStatus === "expiring_soon" && <span className="h-2 w-2 rounded-full bg-orange-500" title="Expiring Soon"></span>}
          {!isExpirationUnknown && expirationStatus === "active" && <span className="h-2 w-2 rounded-full bg-green-500" title="Active"></span>}
          <span className={isExpirationUnknown ? "text-destructive font-medium" : ""}>
            {displayedExpirationDate}
          </span>
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
                Enable User
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onUpdateUserAccess(user.username, true)} disabled={isCurrentUser || user.isEnabled === false}>
                <LockKeyhole className="mr-2 h-4 w-4 text-red-600" />
                Disable User
              </DropdownMenuItem>
            )}

            {user.isEnabled === false ? (
                 <DropdownMenuItem onClick={() => onEnableUserAccount(user.username)} disabled={isCurrentUser}>
                    <UserCheck className="mr-2 h-4 w-4 text-green-600" /> Enable Account
                </DropdownMenuItem>
            ) : (
                 <DropdownMenuItem onClick={() => onDisableUserAccount(user.username)} disabled={isCurrentUser}>
                    <UserMinus className="mr-2 h-4 w-4 text-orange-600" /> Disable Account
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
  
  const [userToEnableAccount, setUserToEnableAccount] = useState<{ username: string } | null>(null); 
  const [isConfirmSingleEnableAccountDialogOpen, setIsConfirmSingleEnableAccountDialogOpen] = useState(false);
  
  const [userToDisableAccount, setUserToDisableAccount] = useState<{ username: string } | null>(null);
  const [isConfirmSingleDisableAccountDialogOpen, setIsConfirmSingleDisableAccountDialogOpen] = useState(false);


  const [bulkAccessActionToConfirm, setBulkAccessActionToConfirm] = useState<"enable" | "disable" | null>(null); // Changed from "allow" | "deny"
  const [isConfirmBulkAccessDialogOpen, setIsConfirmBulkAccessDialogOpen] = useState(false);
  
  const [bulkAccountActionToConfirm, setBulkAccountActionToConfirm] = useState<"enable" | "disable" | null>(null);
  const [isConfirmBulkAccountActionDialogOpen, setIsConfirmBulkAccountActionDialogOpen] = useState(false);
  
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [isExtendExpirationDialogOpen, setIsExtendExpirationDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false)
  
  const [expirationDateFrom, setExpirationDateFrom] = useState<Date | undefined>()
  const [expirationDateTo, setExpirationDateTo] = useState<Date | undefined>()

  const [currentFilters, setCurrentFilters] = useState<any>({ 
    sortBy: "username", 
    sortOrder: "asc",
    userExpirationAfter: undefined,
    userExpirationBefore: undefined,
    mfaEnabled: "any",
    includeExpired: "true", 
    hasAccessControl: "any",
    macAddress: "",
    exactMatch: "false",
    caseSensitive: "false",
  })
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
    let initialFiltersVal = { 
        ...currentFilters, 
        userExpirationAfter: expirationDateFrom ? formatDateForInput(expirationDateFrom.toISOString()) : undefined,
        userExpirationBefore: expirationDateTo ? formatDateForInput(expirationDateTo.toISOString()) : undefined,
    };
    if (groupNameQueryParam) {
        initialFiltersVal = { ...initialFiltersVal, groupName: groupNameQueryParam };
        if (!showFilters) setShowFilters(true); 
    }
    setCurrentFilters(prev => ({...prev, ...initialFiltersVal})); 
    fetchGroupsCallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupNameQueryParam]);


  const fetchUsersCallback = useCallback(async (filtersToApply: any) => {
    try {
      setLoading(true)
      const finalAPIFilters: Record<string, any> = {
        ...filtersToApply, 
      };

      if (searchTerm.trim()) {
        finalAPIFilters.searchText = searchTerm.trim();
      } else if (filtersToApply.searchText && filtersToApply.searchText.trim()) {
        finalAPIFilters.searchText = filtersToApply.searchText.trim();
      } else {
        delete finalAPIFilters.searchText; 
      }
      
      if (expirationDateFrom) {
        finalAPIFilters.userExpirationAfter = formatDateForInput(expirationDateFrom.toISOString());
      } else {
        delete finalAPIFilters.userExpirationAfter;
      }
      if (expirationDateTo) {
        finalAPIFilters.userExpirationBefore = formatDateForInput(expirationDateTo.toISOString());
      } else {
        delete finalAPIFilters.userExpirationBefore;
      }
      
      const data = await getUsers(page, limit, finalAPIFilters)
      setUsers(data.users.map(u => ({...u, denyAccess: u.denyAccess ?? false, isEnabled: typeof u.isEnabled === 'boolean' ? u.isEnabled : true })) || [])
      setTotal(data.total || 0)
    } catch (error: any) {
      toast({
        title: "Error Fetching Users",
        description: getCoreApiErrorMessage(error),
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      })
    } finally {
      setLoading(false)
    }
  }, [page, limit, searchTerm, toast, expirationDateFrom, expirationDateTo]);

  const fetchGroupsCallback = useCallback(async () => {
    try {
      const data = await getGroups(1, 100)
      setAvailableGroups(data.groups?.map((g: any) => g.groupName) || [])
    } catch (error: any) {
      toast({
        title: "Error Fetching Groups",
        description: getCoreApiErrorMessage(error),
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionQueryParam, isAddUserDialogOpen]);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      const filtersWithDates = {
        ...currentFilters,
        userExpirationAfter: expirationDateFrom ? formatDateForInput(expirationDateFrom.toISOString()) : undefined,
        userExpirationBefore: expirationDateTo ? formatDateForInput(expirationDateTo.toISOString()) : undefined,
      };
      if (page !== 1) setPage(1); 
      else fetchUsersCallback(filtersWithDates);
    }, 500); 

    return () => {
      clearTimeout(handler);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, currentFilters, expirationDateFrom, expirationDateTo]); 

  useEffect(() => { 
    const filtersWithDates = {
        ...currentFilters,
        userExpirationAfter: expirationDateFrom ? formatDateForInput(expirationDateFrom.toISOString()) : undefined,
        userExpirationBefore: expirationDateTo ? formatDateForInput(expirationDateTo.toISOString()) : undefined,
      };
    fetchUsersCallback(filtersWithDates)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]); 


  const handleFiltersChangeCallback = useCallback((newFilters: any) => {
    const filtersWithDates = {
      ...newFilters, 
      userExpirationAfter: expirationDateFrom ? formatDateForInput(expirationDateFrom.toISOString()) : undefined,
      userExpirationBefore: expirationDateTo ? formatDateForInput(expirationDateTo.toISOString()) : undefined,
    };
    setCurrentFilters(filtersWithDates);
    if (page !== 1) setPage(1);
    else fetchUsersCallback(filtersWithDates); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, fetchUsersCallback, expirationDateFrom, expirationDateTo]); 

  const handleDateFilterChange = (date: Date | undefined, type: "from" | "to") => {
    if (type === "from") {
      setExpirationDateFrom(date);
    } else {
      setExpirationDateTo(date);
    }
  };

  const clearDateFilters = () => {
    setExpirationDateFrom(undefined);
    setExpirationDateTo(undefined);
     const newFilters = { ...currentFilters, userExpirationAfter: undefined, userExpirationBefore: undefined };
    setCurrentFilters(newFilters);
  };


  const handleDeleteUserCallback = useCallback(async () => {
    if (!userToDelete) return
    try {
      await deleteUser(userToDelete)
      toast({
        title: "Success",
        description: `User ${userToDelete} has been deleted.`,
        variant: "success",
        icon: <CheckCircle className="h-5 w-5" />,
      })
      fetchUsersCallback(currentFilters)
      setSelectedUsers(prev => prev.filter(u => u !== userToDelete));
    } catch (error: any) {
      toast({
        title: "Error Deleting User",
        description: getCoreApiErrorMessage(error),
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      })
    } finally {
      setUserToDelete(null)
      setIsDeleteUserDialogOpen(false)
    }
  }, [userToDelete, fetchUsersCallback, toast, currentFilters]);

  const confirmDeleteUser = useCallback((username: string) => {
    if (username === currentAuthUser?.username) {
      toast({ title: "Action Prevented", description: "You cannot delete your own account.", variant: "warning", icon: <AlertTriangle className="h-5 w-5" /> });
      return;
    }
    setUserToDelete(username);
    setIsDeleteUserDialogOpen(true);
  }, [currentAuthUser, toast]);

  const confirmUpdateUserAccess = useCallback((username: string, deny: boolean) => {
    if (deny && username === currentAuthUser?.username) {
      toast({ title: "Action Prevented", description: "You cannot disable your own VPN access.", variant: "warning", icon: <AlertTriangle className="h-5 w-5" /> });
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
        title: "Success",
        description: `User ${username} has been ${deny ? "disabled" : "enabled"}.`,
        variant: "success",
        icon: <CheckCircle className="h-5 w-5" />,
      });
      fetchUsersCallback(currentFilters);
    } catch (error: any) {
      toast({
        title: `Error ${deny ? "Disabling" : "Enabling"} User`,
        description: getCoreApiErrorMessage(error),
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    } finally {
      setIsConfirmSingleAccessDialogOpen(false);
      setUserToUpdateAccess(null);
    }
  }, [userToUpdateAccess, fetchUsersCallback, toast, currentFilters]);

  const confirmEnableUserAccount = useCallback((username: string) => {
    if (username === currentAuthUser?.username) {
        toast({ title: "Action Prevented", description: `You cannot enable your own account.`, variant: "warning", icon: <AlertTriangle className="h-5 w-5" /> });
        return;
    }
    setUserToEnableAccount({ username });
    setIsConfirmSingleEnableAccountDialogOpen(true);
  }, [currentAuthUser, toast]);
  
  const executeEnableUserAccount = useCallback(async () => {
    if (!userToEnableAccount) return;
    const { username } = userToEnableAccount;
    try {
        await performUserAction(username, "enable");
        toast({
            title: `Success`,
            description: `User account for ${username} has been enabled.`,
            variant: "success",
            icon: <CheckCircle className="h-5 w-5" />,
        });
        fetchUsersCallback(currentFilters);
    } catch (error: any) {
        toast({
            title: `Error Enabling User Account`,
            description: getCoreApiErrorMessage(error),
            variant: "destructive",
            icon: <AlertTriangle className="h-5 w-5" />,
        });
    } finally {
        setIsConfirmSingleEnableAccountDialogOpen(false);
        setUserToEnableAccount(null);
    }
  }, [userToEnableAccount, fetchUsersCallback, toast, currentFilters]);

  const confirmDisableUserAccount = useCallback((username: string) => {
    if (username === currentAuthUser?.username) {
        toast({ title: "Action Prevented", description: `You cannot disable your own account.`, variant: "warning", icon: <AlertTriangle className="h-5 w-5" /> });
        return;
    }
    setUserToDisableAccount({ username });
    setIsConfirmSingleDisableAccountDialogOpen(true);
  }, [currentAuthUser, toast]);

  const executeDisableUserAccount = useCallback(async () => {
    if (!userToDisableAccount) return;
    const { username } = userToDisableAccount;
    try {
        await performUserAction(username, "disable");
        toast({
            title: `Success`,
            description: `User account for ${username} has been disabled.`,
            variant: "success",
            icon: <CheckCircle className="h-5 w-5" />,
        });
        fetchUsersCallback(currentFilters);
    } catch (error: any) {
        toast({
            title: `Error Disabling User Account`,
            description: getCoreApiErrorMessage(error),
            variant: "destructive",
            icon: <AlertTriangle className="h-5 w-5" />,
        });
    } finally {
        setIsConfirmSingleDisableAccountDialogOpen(false);
        setUserToDisableAccount(null);
    }
  }, [userToDisableAccount, fetchUsersCallback, toast, currentFilters]);


  const handleResetOtp = useCallback(async (username: string) => {
     try {
      await performUserAction(username, "reset-otp");
      toast({
        title: "Success",
        description: `OTP has been reset for user ${username}.`,
        variant: "success",
        icon: <CheckCircle className="h-5 w-5" />,
      });
    } catch (error: any) {
      toast({
        title: "Error Resetting OTP",
        description: getCoreApiErrorMessage(error),
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    }
  }, [toast]);


  const confirmBulkUpdateAccess = useCallback((action: "enable" | "disable") => { // Changed from "allow" | "deny"
    if (selectedUsers.length === 0) {
      toast({ title: "No Users Selected", description: "Please select users to perform bulk actions.", variant: "info", icon: <AlertTriangle className="h-5 w-5" /> });
      return;
    }
    if (action === "disable" && selectedUsers.includes(currentAuthUser?.username)) {
        toast({ title: "Action Prevented", description: "You cannot disable your own account in a bulk operation. Please deselect yourself.", variant: "warning", icon: <AlertTriangle className="h-5 w-5" /> });
        return;
    }
    setBulkAccessActionToConfirm(action);
    setIsConfirmBulkAccessDialogOpen(true);
  }, [selectedUsers, currentAuthUser, toast]);

  const executeBulkUpdateAccess = useCallback(async () => {
    if (!bulkAccessActionToConfirm || selectedUsers.length === 0) return;

    const deny = bulkAccessActionToConfirm === "disable"; // "disable" means denyAccess = true
    setBulkActionLoading(true);
    let successCount = 0;
    let failCount = 0;

    toast({ title: "Processing...", description: `Attempting to ${bulkAccessActionToConfirm} ${selectedUsers.length} users...`, variant:"info", icon: <RefreshCcw className="h-5 w-5 animate-spin" />});

    for (const username of selectedUsers) {
      try {
        await updateUser(username, { denyAccess: deny });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    setBulkActionLoading(false);
    setIsConfirmBulkAccessDialogOpen(false);
    setBulkAccessActionToConfirm(null);

    let summaryMessage = `${successCount} users ${deny ? "disabled" : "enabled"}.`;
    if (failCount > 0) {
      summaryMessage += ` ${failCount} users failed to update.`;
    }
    toast({
      title: "Bulk Action Complete",
      description: summaryMessage,
      variant: failCount > 0 && successCount === 0 ? "destructive" : (failCount > 0 ? "warning" : "success"),
      icon: failCount > 0 ? <AlertTriangle className="h-5 w-5"/> : <CheckCircle className="h-5 w-5"/>
    });

    fetchUsersCallback(currentFilters);
    setSelectedUsers([]);
  }, [bulkAccessActionToConfirm, selectedUsers, fetchUsersCallback, toast, currentFilters]);
  
  const confirmBulkAccountAction = useCallback((action: "enable" | "disable") => {
    if (selectedUsers.length === 0) {
      toast({ title: "No Users Selected", description: "Please select users to perform bulk actions.", variant: "info", icon: <AlertTriangle className="h-5 w-5" /> });
      return;
    }
    if (action === "disable" && selectedUsers.includes(currentAuthUser?.username)) {
        toast({ title: "Action Prevented", description: "You cannot disable your own account in a bulk operation. Please deselect yourself.", variant: "warning", icon: <AlertTriangle className="h-5 w-5" /> });
        return;
    }
    setBulkAccountActionToConfirm(action);
    setIsConfirmBulkAccountActionDialogOpen(true);
  }, [selectedUsers, currentAuthUser, toast]);

  const executeBulkAccountAction = useCallback(async () => {
    if (!bulkAccountActionToConfirm || selectedUsers.length === 0) return;

    setBulkActionLoading(true);
    try {
      const result = await bulkUserActions(selectedUsers, bulkAccountActionToConfirm);
      toast({
        title: "Bulk Action Complete",
        description: `${result.success || 0} user accounts ${bulkAccountActionToConfirm}d. ${result.failed || 0} failed.`,
        variant: result.failed > 0 ? "warning" : "success",
        icon: result.failed > 0 ? <AlertTriangle className="h-5 w-5"/> : <CheckCircle className="h-5 w-5"/>
      });
      fetchUsersCallback(currentFilters);
      setSelectedUsers([]);
    } catch (error: any) {
      toast({
        title: `Error Bulk ${bulkAccountActionToConfirm.charAt(0).toUpperCase() + bulkAccountActionToConfirm.slice(1)} Accounts`,
        description: getCoreApiErrorMessage(error),
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    } finally {
      setBulkActionLoading(false);
      setIsConfirmBulkAccountActionDialogOpen(false);
      setBulkAccountActionToConfirm(null);
    }
  }, [bulkAccountActionToConfirm, selectedUsers, fetchUsersCallback, toast, currentFilters]);


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
      variant: "info"
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
                <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="search"
                            placeholder="General search..."
                            className="pl-10 h-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button id="expirationDateFrom" variant="outline" className="h-10 w-full sm:w-auto justify-start text-left font-normal">
                                    <CalendarDays className="mr-2 h-4 w-4" />
                                    {expirationDateFrom ? formatDateFns(expirationDateFrom, "LLL dd, y") : <span>Exp From</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={expirationDateFrom} onSelect={(date) => handleDateFilterChange(date, "from")} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button id="expirationDateTo" variant="outline" className="h-10 w-full sm:w-auto justify-start text-left font-normal">
                                    <CalendarDays className="mr-2 h-4 w-4" />
                                    {expirationDateTo ? formatDateFns(expirationDateTo, "LLL dd, y") : <span>Exp To</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={expirationDateTo} onSelect={(date) => handleDateFilterChange(date, "to")} initialFocus />
                            </PopoverContent>
                        </Popover>
                         {(expirationDateFrom || expirationDateTo) && (
                            <Button variant="ghost" size="icon" onClick={clearDateFilters} className="h-10 w-10" title="Clear date filters">
                                <XIcon className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
                <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 h-10 w-full sm:w-auto">
                    <ListFilter className="h-4 w-4" />
                    {showFilters ? "Hide Filters" : "Show Filters"} ({Object.values(currentFilters).filter(v => v && v !== "any" && v !== "username" && v !== "asc" && v !== undefined && v !== "true" && v !== "false" && v !== "" && !['userExpirationAfter', 'userExpirationBefore'].includes(String(v))).length})
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
                        <Button variant="outline" size="sm" onClick={() => confirmBulkAccountAction("enable")} disabled={bulkActionLoading} className="border-green-500 text-green-700 hover:bg-green-500/10">
                          <UserCheck className="mr-2 h-4 w-4" /> Enable Account
                        </Button>
                         <Button variant="outline" size="sm" onClick={() => confirmBulkAccountAction("disable")} disabled={bulkActionLoading} className="border-orange-500 text-orange-700 hover:bg-orange-500/10">
                          <UserMinus className="mr-2 h-4 w-4" /> Disable Account
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => confirmBulkUpdateAccess("enable")} disabled={bulkActionLoading} className="border-green-500 text-green-700 hover:bg-green-500/10">
                          <UnlockKeyhole className="mr-2 h-4 w-4" /> Enable Users
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => confirmBulkUpdateAccess("disable")} disabled={bulkActionLoading} className="border-red-500 text-red-700 hover:bg-red-500/10">
                          <LockKeyhole className="mr-2 h-4 w-4" /> Disable Users
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
                          onEnableUserAccount={confirmEnableUserAccount} 
                          onDisableUserAccount={confirmDisableUserAccount}
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
            <AlertDialogTitle>Confirm User VPN Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {userToUpdateAccess?.deny ? "disable" : "enable"} user "{userToUpdateAccess?.username}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmSingleAccessDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeUpdateUserAccess}
              className={userToUpdateAccess?.deny ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-600/90 text-white"}
            >
              Confirm {userToUpdateAccess?.deny ? "Disable User" : "Enable User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isConfirmSingleEnableAccountDialogOpen} onOpenChange={setIsConfirmSingleEnableAccountDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Enable User Account</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to enable user account "{userToEnableAccount?.username}"? They will be able to authenticate if their VPN access is allowed.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsConfirmSingleEnableAccountDialogOpen(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={executeEnableUserAccount}
                    className={"bg-green-600 hover:bg-green-600/90 text-white"}
                >
                    Confirm Enable Account
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isConfirmSingleDisableAccountDialogOpen} onOpenChange={setIsConfirmSingleDisableAccountDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Disable User Account</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to disable user account "{userToDisableAccount?.username}"? They will not be able to authenticate.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsConfirmSingleDisableAccountDialogOpen(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={executeDisableUserAccount}
                    className={"bg-orange-500 hover:bg-orange-500/90 text-white"}
                >
                    Confirm Disable Account
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <AlertDialog open={isConfirmBulkAccessDialogOpen} onOpenChange={setIsConfirmBulkAccessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk User VPN Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {bulkAccessActionToConfirm === "disable" ? "disable" : "enable"} {selectedUsers.length} selected user(s)?
              {bulkAccessActionToConfirm === "disable" && selectedUsers.includes(currentAuthUser?.username) && (
                <p className="text-destructive text-sm mt-2">Warning: Your own account is selected and will be disabled.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmBulkAccessDialogOpen(false)} disabled={bulkActionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkUpdateAccess}
              disabled={bulkActionLoading}
              className={bulkAccessActionToConfirm === "disable" ? "bg-destructive hover:bg-destructive/90" : "bg-green-600 hover:bg-green-600/90 text-white"}
            >
              {bulkActionLoading ? "Processing..." : `Confirm ${bulkAccessActionToConfirm === "disable" ? "Disable Users" : "Enable Users"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isConfirmBulkAccountActionDialogOpen} onOpenChange={setIsConfirmBulkAccountActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Account Action: {bulkAccountActionToConfirm?.charAt(0).toUpperCase() + (bulkAccountActionToConfirm || "").slice(1)}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {bulkAccountActionToConfirm} the {selectedUsers.length} selected account(s)?
              {bulkAccountActionToConfirm === "disable" && selectedUsers.includes(currentAuthUser?.username) && (
                <p className="text-destructive text-sm mt-2">Warning: Your own account is selected and will be disabled.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmBulkAccountActionDialogOpen(false)} disabled={bulkActionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkAccountAction}
              disabled={bulkActionLoading}
              className={bulkAccountActionToConfirm === 'enable' ? "bg-green-600 hover:bg-green-600/90 text-white" : "bg-orange-500 hover:bg-orange-500/90 text-white" }
            >
              {bulkActionLoading ? "Processing..." : `Confirm ${bulkAccountActionToConfirm?.charAt(0).toUpperCase() + (bulkAccountActionToConfirm || "").slice(1)} Accounts`}
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

