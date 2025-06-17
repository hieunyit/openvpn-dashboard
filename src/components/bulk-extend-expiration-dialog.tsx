
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
import { useToast } from "@/hooks/use-toast" // Corrected import path
import { bulkExtendUserExpiration } from "@/lib/api"
import { CalendarClock, AlertTriangle, CheckCircle } from "lucide-react"
import { formatDateForInput, getCoreApiErrorMessage } from "@/lib/utils" 

interface BulkExtendExpirationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedUsernames: string[]
  onSuccess: () => void
}

export function BulkExtendExpirationDialog({
  open,
  onOpenChange,
  selectedUsernames,
  onSuccess,
}: BulkExtendExpirationDialogProps) {
  const [newExpirationDate, setNewExpirationDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newExpirationDate) {
      toast({
        title: "Validation Error",
        description: "Please select a new expiration date.",
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      })
      return
    }

    setIsSubmitting(true)
    try {
      await bulkExtendUserExpiration(selectedUsernames, newExpirationDate)
      toast({
        title: "Expiration Dates Extended Successfully",
        description: `Extended expiration for ${selectedUsernames.length} user(s) to ${formatDateForInput(newExpirationDate)}.`,
        variant: "success",
        icon: <CheckCircle className="h-5 w-5" />,
      })
      onSuccess()
      onOpenChange(false)
      setNewExpirationDate("") 
    } catch (error: any) {
      toast({
        title: "Failed to Extend Expiration Dates",
        description: getCoreApiErrorMessage(error.message) || "An unexpected error occurred. Please try again.",
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (open) {
      setNewExpirationDate(formatDateForInput(new Date().toISOString()))
    }
  }, [open])


  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) setNewExpirationDate(formatDateForInput(new Date().toISOString())); 
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CalendarClock className="mr-2 h-5 w-5 text-primary" />
            Bulk Extend User Expiration
          </DialogTitle>
          <DialogDescription>
            Select a new expiration date for the selected {selectedUsernames.length} user(s). This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newExpirationDate">New Expiration Date</Label>
            <Input
              id="newExpirationDate"
              type="date"
              value={newExpirationDate}
              onChange={(e) => setNewExpirationDate(e.target.value)}
              className="w-full"
              min={formatDateForInput(new Date().toISOString())} 
            />
          </div>
           {selectedUsernames.length > 0 && (
            <div className="text-sm text-muted-foreground">
                <p>Users affected: {selectedUsernames.join(", ")}</p>
            </div>
            )}
           <div className="flex items-start space-x-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-yellow-900/30">
              <AlertTriangle className="h-5 w-5 text-yellow-500 dark:text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Important Note</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Extending expiration will apply the new date to all selected users.
                  Ensure this is the intended action.
                </p>
              </div>
            </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting || selectedUsernames.length === 0}>
            {isSubmitting ? "Extending..." : "Extend Expiration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

    