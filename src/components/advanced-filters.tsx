
"use client"

import { useState, memo, useCallback, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Filter, X, RotateCcw, Check } from "lucide-react"

interface FilterProps {
  onFiltersChange: (filters: any) => void
  type: "users" | "groups"
  availableGroups?: string[]
  initialFilters?: any 
}

export const AdvancedFilters = memo(({ onFiltersChange, type, availableGroups = [], initialFilters }: FilterProps) => {
  const defaultUserFilters = useMemo(() => ({
    searchText: "", // General text search
    username: "", // Specific username search
    email: "", // Specific email search
    authMethod: "any",
    role: "any",
    groupName: "any",
    isEnabled: "any",
    denyAccess: "any",
    mfaEnabled: "any", // API uses mfaEnabled
    userExpirationAfter: undefined, // Should be handled by UsersPage's date pickers
    userExpirationBefore: undefined, // Should be handled by UsersPage's date pickers
    includeExpired: "true", // API default is true
    expiringInDays: "", 
    hasAccessControl: "any",
    macAddress: "",
    sortBy: "username",
    sortOrder: "asc",
    exactMatch: "false", // API default is false
    caseSensitive: "false", // API default is false
  }), []);

  const defaultGroupFilters = useMemo(() => ({
    groupName: "",
    authMethod: "any",
    role: "any",
  }), []);
  
  const defaultFilters = type === "users" ? defaultUserFilters : defaultGroupFilters;

  const [internalFilters, setInternalFilters] = useState<any>(() => ({
    ...defaultFilters,
    ...(initialFilters || {}),
  }));
  const [activeFilterBadges, setActiveFilterBadges] = useState<string[]>([])

  useEffect(() => {
    // Merge initialFilters carefully, prioritizing its values over defaults
    // but ensuring all default keys are present if not in initialFilters.
    const mergedInitial = { ...defaultFilters, ...(initialFilters || {}) };
    // If initialFilters causes a change, update internalFilters
    if (JSON.stringify(internalFilters) !== JSON.stringify(mergedInitial)) {
        setInternalFilters(mergedInitial);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFilters, defaultFilters]); // internalFilters removed to prevent loop
  
  const updateActiveFilterBadges = useCallback((currentFilters: any) => {
    const active = Object.keys(currentFilters).filter(
      (k) =>
        currentFilters[k] !== "" &&
        currentFilters[k] !== null &&
        currentFilters[k] !== undefined &&
        currentFilters[k] !== "any" &&
        // Exclude default sort orders from badges unless changed
        (k !== 'sortBy' || currentFilters[k] !== (type === "users" ? "username" : "groupName")) && 
        (k !== 'sortOrder' || currentFilters[k] !== "asc") &&
        // Exclude specific defaults that match API behavior if they are "any" or default boolean state
        (k !== 'includeExpired' || currentFilters[k] !== "true") &&
        (k !== 'exactMatch' || currentFilters[k] !== "false") &&
        (k !== 'caseSensitive' || currentFilters[k] !== "false")
    );
    setActiveFilterBadges(active);
  }, [type]);

  useEffect(() => {
    updateActiveFilterBadges(internalFilters);
  }, [internalFilters, updateActiveFilterBadges]);

  const handleInputChange = useCallback((key: string, value: any) => {
    setInternalFilters((prev: any) => ({ ...prev, [key]: value }))
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      const filtersToApply = { ...internalFilters };
      if (filtersToApply.expiringInDays && filtersToApply.expiringInDays !== "") filtersToApply.expiringInDays = Number(filtersToApply.expiringInDays); else delete filtersToApply.expiringInDays;
      if (filtersToApply.minMemberCount && filtersToApply.minMemberCount !== "") filtersToApply.minMemberCount = Number(filtersToApply.minMemberCount); else delete filtersToApply.minMemberCount;
      if (filtersToApply.maxMemberCount && filtersToApply.maxMemberCount !== "") filtersToApply.maxMemberCount = Number(filtersToApply.maxMemberCount); else delete filtersToApply.maxMemberCount;
      
      onFiltersChange(filtersToApply);
      updateActiveFilterBadges(filtersToApply);
    }, 750); // 750ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [internalFilters, onFiltersChange, updateActiveFilterBadges]);


  const handleClearFilters = useCallback(() => {
    setInternalFilters(defaultFilters)
    onFiltersChange(defaultFilters) 
    setActiveFilterBadges([])
  }, [defaultFilters, onFiltersChange]);

  const removeFilterBadge = useCallback((key: string) => {
    const newFilters = { ...internalFilters, [key]: defaultFilters[key] || "any" }
     // Reset specific input fields to empty string instead of "any"
    const inputFields = ["searchText", "username", "email", "expiringInDays", "macAddress", "accessControlPattern", "minMemberCount", "maxMemberCount", "createdAfter", "createdBefore", "groupName"];
    if (inputFields.includes(key)) {
        newFilters[key] = "";
    }
    // Reset specific boolean defaults correctly
    if (key === 'includeExpired') newFilters[key] = "true";
    if (key === 'exactMatch' || key === 'caseSensitive') newFilters[key] = "false";


    setInternalFilters(newFilters)
    onFiltersChange(newFilters); 
    updateActiveFilterBadges(newFilters);
  }, [internalFilters, defaultFilters, onFiltersChange, updateActiveFilterBadges]);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Advanced Filters
        </CardTitle>
        <CardDescription>Filter and sort {type} with advanced criteria. Filters apply automatically.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {activeFilterBadges.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Active Filters:</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeFilterBadges.map((key) => (
                <Badge key={key} variant="secondary" className="flex items-center gap-1">
                  {key}: {String(internalFilters[key])}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilterBadge(key)} />
                </Badge>
              ))}
            </div>
            <Separator />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {type === "users" && (
            <>
              <div className="space-y-2">
                <Label htmlFor={`searchText-${type}`}>General Search Text</Label>
                <Input
                  id={`searchText-${type}`}
                  placeholder={`Search across fields...`}
                  value={internalFilters.searchText || ""}
                  onChange={(e) => handleInputChange("searchText", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`username-filter-${type}`}>Specific Username</Label>
                <Input
                  id={`username-filter-${type}`}
                  placeholder="Filter by username..."
                  value={internalFilters.username || ""}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`email-filter-${type}`}>Specific Email</Label>
                <Input
                  id={`email-filter-${type}`}
                  placeholder="Filter by email..."
                  value={internalFilters.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              </div>
            </>
          )}

          {type === "groups" && (
             <div className="space-y-2">
              <Label htmlFor={`groupName-filter-${type}`}>Group Name</Label>
              <Input
                id={`groupName-filter-${type}`}
                placeholder="Filter by group name..."
                value={internalFilters.groupName || ""}
                onChange={(e) => handleInputChange("groupName", e.target.value)}
              />
            </div>
          )}


          <div className="space-y-2">
            <Label htmlFor={`authMethod-${type}`}>Authentication Method</Label>
            <Select value={internalFilters.authMethod} onValueChange={(value) => handleInputChange("authMethod", value)}>
              <SelectTrigger id={`authMethod-${type}`}>
                <SelectValue placeholder="Any method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any method</SelectItem>
                <SelectItem value="local">Local</SelectItem>
                <SelectItem value="ldap">LDAP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`role-${type}`}>Role</Label>
            <Select value={internalFilters.role} onValueChange={(value) => handleInputChange("role", value)}>
              <SelectTrigger id={`role-${type}`}>
                <SelectValue placeholder="Any role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any role</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="User">User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "users" && (
            <div className="space-y-2">
              <Label htmlFor="groupName-users">Group</Label>
              <Select value={internalFilters.groupName} onValueChange={(value) => handleInputChange("groupName", value)}>
                <SelectTrigger id="groupName-users">
                  <SelectValue placeholder="Any group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any group</SelectItem>
                  <SelectItem value="No Group">No Group</SelectItem>
                  {availableGroups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === "users" && (
            <>
              <div className="space-y-2">
                <Label htmlFor={`isEnabled-${type}`}>System Status</Label>
                <Select value={internalFilters.isEnabled} onValueChange={(value) => handleInputChange("isEnabled", value)}>
                  <SelectTrigger id={`isEnabled-${type}`}>
                    <SelectValue placeholder="Any status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Status</SelectItem>
                    <SelectItem value="true">Enabled</SelectItem>
                    <SelectItem value="false">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`denyAccess-${type}`}>VPN Access</Label>
                <Select value={internalFilters.denyAccess} onValueChange={(value) => handleInputChange("denyAccess", value)}>
                  <SelectTrigger id={`denyAccess-${type}`}>
                    <SelectValue placeholder="Any access state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Access State</SelectItem>
                    <SelectItem value="true">Denied</SelectItem>
                    <SelectItem value="false">Allowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`mfaEnabled-${type}`}>MFA Status</Label>
                <Select value={internalFilters.mfaEnabled} onValueChange={(value) => handleInputChange("mfaEnabled", value)}>
                  <SelectTrigger id={`mfaEnabled-${type}`}>
                    <SelectValue placeholder="Any MFA status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any MFA Status</SelectItem>
                    <SelectItem value="true">MFA Enabled</SelectItem>
                    <SelectItem value="false">MFA Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

        </div>

        {type === "users" && (
          <>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               <div className="space-y-2">
                <Label htmlFor="expiringInDays-users">Expiring in Days (Max)</Label>
                <Input
                  id="expiringInDays-users"
                  type="number"
                  placeholder="e.g., 30"
                  value={internalFilters.expiringInDays || ""}
                  onChange={(e) => handleInputChange("expiringInDays", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`isExpired-users`}>Expiration Status</Label>
                <Select value={internalFilters.isExpired} onValueChange={(value) => handleInputChange("isExpired", value)}>
                  <SelectTrigger id={`isExpired-users`}>
                    <SelectValue placeholder="Any expiration state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Expiration State</SelectItem>
                    <SelectItem value="true">Expired</SelectItem>
                    <SelectItem value="false">Not Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="includeExpired-users">Include Expired Users</Label>
                <Select value={internalFilters.includeExpired} onValueChange={(value) => handleInputChange("includeExpired", value)}>
                  <SelectTrigger id="includeExpired-users"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes (Default)</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                     <SelectItem value="any">Any (API Default)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hasAccessControl-users">Has Custom Access Rules</Label>
                <Select value={internalFilters.hasAccessControl} onValueChange={(value) => handleInputChange("hasAccessControl", value)}>
                  <SelectTrigger id="hasAccessControl-users"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="macAddress-users">Filter by MAC Address</Label>
                <Input
                  id="macAddress-users"
                  placeholder="Enter MAC Address"
                  value={internalFilters.macAddress || ""}
                  onChange={(e) => handleInputChange("macAddress", e.target.value)}
                />
              </div>
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="exactMatch-users">Exact Match (for text searches)</Label>
                    <Select value={internalFilters.exactMatch} onValueChange={(value) => handleInputChange("exactMatch", value)}>
                    <SelectTrigger id="exactMatch-users"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="false">No (Default - Partial)</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="any">Any (API Default)</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="caseSensitive-users">Case Sensitive (for text searches)</Label>
                    <Select value={internalFilters.caseSensitive} onValueChange={(value) => handleInputChange("caseSensitive", value)}>
                    <SelectTrigger id="caseSensitive-users"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="false">No (Default - Insensitive)</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="any">Any (API Default)</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
            </div>
          </>
        )}
        
        {type === "users" && (
          <>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`sortBy-${type}`}>Sort By</Label>
                <Select value={internalFilters.sortBy} onValueChange={(value) => handleInputChange("sortBy", value)}>
                  <SelectTrigger id={`sortBy-${type}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="username">Username</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="authMethod">Auth Method</SelectItem>
                    <SelectItem value="role">Role</SelectItem>
                    <SelectItem value="groupName">Group</SelectItem>
                    <SelectItem value="userExpiration">Expiration</SelectItem>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`sortOrder-${type}`}>Sort Order</Label>
                <Select value={internalFilters.sortOrder} onValueChange={(value) => handleInputChange("sortOrder", value)}>
                  <SelectTrigger id={`sortOrder-${type}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

      </CardContent>
      <CardFooter className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClearFilters}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset Filters
          </Button>
      </CardFooter>
    </Card>
  )
});
AdvancedFilters.displayName = "AdvancedFilters";
