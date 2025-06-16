
"use client"

import { useState, memo, useCallback, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Filter, X, RotateCcw, Check } from "lucide-react"

interface FilterProps {
  onFiltersChange: (filters: any) => void
  type: "users" | "groups"
  availableGroups?: string[]
  initialFilters?: any // For parent components to control/reset filters
}

export const AdvancedFilters = memo(({ onFiltersChange, type, availableGroups = [], initialFilters }: FilterProps) => {
  const defaultFilters = useMemo(() => ({
    searchText: "",
    authMethod: "any",
    role: "any",
    groupName: "any",
    isEnabled: "any",
    hasMFA: "any",
    isExpired: "any",
    expiringInDays: "", // Ensure this is an empty string
    sortBy: type === "users" ? "username" : "groupName",
    sortOrder: "asc",
  }), [type]);

  const [internalFilters, setInternalFilters] = useState<any>(() => ({
    ...defaultFilters,
    ...(initialFilters || {}),
  }));
  const [activeFilterBadges, setActiveFilterBadges] = useState<string[]>([])

  useEffect(() => {
    // When initialFilters prop changes (e.g., parent wants to reset/update filters)
    // Re-initialize internalFilters by merging defaultFilters with the new initialFilters
    setInternalFilters({
      ...defaultFilters,
      ...(initialFilters || {}),
    });
  }, [initialFilters, defaultFilters]);
  
  const updateActiveFilterBadges = useCallback((currentFilters: any) => {
    const active = Object.keys(currentFilters).filter(
      (k) =>
        currentFilters[k] !== "" &&
        currentFilters[k] !== null &&
        currentFilters[k] !== undefined &&
        currentFilters[k] !== "any" &&
        (k !== 'sortBy' || currentFilters[k] !== (type === "users" ? "username" : "groupName")) && 
        (k !== 'sortOrder' || currentFilters[k] !== "asc") 
    );
    setActiveFilterBadges(active);
  }, [type]);

  useEffect(() => {
    updateActiveFilterBadges(internalFilters);
  }, [internalFilters, updateActiveFilterBadges]);

  const handleInputChange = useCallback((key: string, value: any) => {
    setInternalFilters((prev: any) => ({ ...prev, [key]: value }))
  }, []);

  const handleApplyFilters = useCallback(() => {
    onFiltersChange(internalFilters)
    updateActiveFilterBadges(internalFilters)
  }, [internalFilters, onFiltersChange, updateActiveFilterBadges]);

  const handleClearFilters = useCallback(() => {
    setInternalFilters(defaultFilters)
    onFiltersChange(defaultFilters) 
    setActiveFilterBadges([])
  }, [defaultFilters, onFiltersChange]);

  const removeFilterBadge = useCallback((key: string) => {
    const newFilters = { ...internalFilters, [key]: defaultFilters[key] || "any" }
    if (key === "searchText" || key === "expiringInDays") {
        newFilters[key] = "";
    }
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
        <CardDescription>Filter and sort {type} with advanced criteria</CardDescription>
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
                  {key}: {typeof internalFilters[key] === 'boolean' ? (internalFilters[key] ? 'Yes' : 'No') : internalFilters[key]}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilterBadge(key)} />
                </Badge>
              ))}
            </div>
            <Separator />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`searchText-${type}`}>Search Text</Label>
            <Input
              id={`searchText-${type}`}
              placeholder={`Search ${type}...`}
              value={internalFilters.searchText || ""}
              onChange={(e) => handleInputChange("searchText", e.target.value)}
            />
          </div>

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
        </div>

        {type === "users" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role-users">Role</Label>
                <Select value={internalFilters.role} onValueChange={(value) => handleInputChange("role", value)}>
                  <SelectTrigger id="role-users">
                    <SelectValue placeholder="Any role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any role</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="User">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiringInDays-users">Expiring in Days</Label>
                <Input
                  id="expiringInDays-users"
                  type="number"
                  placeholder="e.g., 30"
                  value={internalFilters.expiringInDays || ""}
                  onChange={(e) => handleInputChange("expiringInDays", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Status Filters</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`isEnabled-${type}`}
                      checked={internalFilters.isEnabled === "true"}
                      onCheckedChange={(checked) => handleInputChange("isEnabled", checked ? "true" : "any")}
                    />
                    <Label htmlFor={`isEnabled-${type}`}>Only Enabled</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                       id={`hasMFA-${type}`}
                      checked={internalFilters.hasMFA === "true"}
                      onCheckedChange={(checked) => handleInputChange("hasMFA", checked ? "true" : "any")}
                    />
                    <Label htmlFor={`hasMFA-${type}`}>Has MFA</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`isExpired-${type}`}
                      checked={internalFilters.isExpired === "true"}
                      onCheckedChange={(checked) => handleInputChange("isExpired", checked ? "true" : "any")}
                    />
                    <Label htmlFor={`isExpired-${type}`}>Is Expired</Label>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`sortBy-${type}`}>Sort By</Label>
            <Select value={internalFilters.sortBy} onValueChange={(value) => handleInputChange("sortBy", value)}>
              <SelectTrigger id={`sortBy-${type}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {type === "users" ? (
                  <>
                    <SelectItem value="username">Username</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="authMethod">Auth Method</SelectItem>
                    <SelectItem value="role">Role</SelectItem>
                    <SelectItem value="groupName">Group</SelectItem>
                    <SelectItem value="userExpiration">Expiration</SelectItem>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="groupName">Group Name</SelectItem>
                    <SelectItem value="authMethod">Auth Method</SelectItem>
                    <SelectItem value="role">Role</SelectItem>
                    <SelectItem value="memberCount">Member Count</SelectItem>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                  </>
                )}
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
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClearFilters}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset Filters
          </Button>
          <Button onClick={handleApplyFilters}>
            <Check className="mr-2 h-4 w-4" /> Apply Filters
          </Button>
      </CardFooter>
    </Card>
  )
});
AdvancedFilters.displayName = "AdvancedFilters";
