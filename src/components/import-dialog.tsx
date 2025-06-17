
"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle as PrimitiveDialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { importUsers, importGroups, downloadUserTemplate, downloadGroupTemplate } from "@/lib/api"
import { Upload, FileText, Download, AlertCircle, CheckCircle, XCircle, ListChecks, Info } from "lucide-react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { getCoreApiErrorMessage } from "@/lib/utils"

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "users" | "groups"
  onImportComplete: () => void
}

interface IndividualOperationResult {
  username?: string // For users
  groupName?: string // For groups
  success: boolean
  message: string
  error: string
}

interface BulkOperationOutcome {
  total: number
  success: number
  failed: number
  results: IndividualOperationResult[]
}

interface ImportValidationError {
  row: number
  field: string
  value: string
  message: string
}

interface ImportResult {
  total: number
  validRecords: number
  invalidRecords: number
  processedRecords: number
  successCount: number
  failureCount: number
  dryRun: boolean
  validationErrors?: ImportValidationError[]
  results?: BulkOperationOutcome // For backend-processed individual item results
}


export function ImportDialog({ open, onOpenChange, type, onImportComplete }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [dryRun, setDryRun] = useState(false)
  const [override, setOverride] = useState(false)
  const [importResults, setImportResults] = useState<ImportResult | null>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const validTypes = [
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/json",
      ]

      if (
        validTypes.includes(selectedFile.type) ||
        selectedFile.name.endsWith(".csv") ||
        selectedFile.name.endsWith(".xlsx") ||
        selectedFile.name.endsWith(".xls") ||
        selectedFile.name.endsWith(".json")
      ) {
        setFile(selectedFile)
        setImportResults(null)
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV, Excel, or JSON file.",
          variant: "destructive",
          icon: <AlertCircle className="h-5 w-5" />,
        })
        setFile(null);
      }
    }
  }

  const detectFileFormat = (file: File): string => {
    if (file.name.endsWith(".csv")) return "csv"
    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) return "xlsx"
    if (file.name.endsWith(".json")) return "json"
    // Default to CSV if type is ambiguous but common (e.g. text/plain for a .csv file)
    if (file.type === "text/csv" || file.type === "application/vnd.ms-excel") return "csv";
    if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return "xlsx";
    if (file.type === "application/json") return "json";
    return "csv" // Fallback, backend might re-verify
  }

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to import.",
        variant: "destructive",
        icon: <AlertCircle className="h-5 w-5" />,
      });
      return;
    }

    setImporting(true)
    setImportResults(null)

    try {
      const format = detectFileFormat(file)
      let apiResponse: any

      if (type === "users") {
        apiResponse = await importUsers(file, format, dryRun, override)
      } else { // groups
        apiResponse = await importGroups(file, format, dryRun, override)
      }

      const responseData = apiResponse.success?.data || apiResponse;

      const resultsToSet: ImportResult = {
        total: responseData.total ?? 0,
        validRecords: responseData.validRecords ?? 0,
        invalidRecords: responseData.invalidRecords ?? 0,
        processedRecords: responseData.processedRecords ?? responseData.results?.total ?? 0,
        successCount: responseData.results?.success ?? responseData.successCount ?? 0,
        failureCount: responseData.results?.failed ?? responseData.failureCount ?? 0,
        dryRun: responseData.dryRun ?? dryRun,
        validationErrors: responseData.validationErrors || [],
        results: responseData.results
      };
      setImportResults(resultsToSet)

      const backendValidationIssues = resultsToSet.validRecords < 0; 
      const hasClientValidationErrors = resultsToSet.validationErrors && resultsToSet.validationErrors.length > 0;
      const itemLevelFailures = resultsToSet.failureCount > 0 || (resultsToSet.results && resultsToSet.results.failed > 0);


      if (resultsToSet.dryRun) {
        if (resultsToSet.invalidRecords > 0 || hasClientValidationErrors || backendValidationIssues || itemLevelFailures) {
          toast({
            title: "Dry Run: Validation Issues",
            description: `Validation found ${resultsToSet.invalidRecords + (resultsToSet.validationErrors?.length || 0) + (resultsToSet.results?.failed || 0)} issues. Please review the details.`,
            variant: "warning",
            icon: <AlertCircle className="h-5 w-5" />,
            duration: 5000,
          })
        } else {
          toast({
            title: "Dry Run: Validation Complete",
            description: `All ${resultsToSet.total || 'N/A'} records appear valid for import.`,
            variant: "info", 
            icon: <CheckCircle className="h-5 w-5" />,
            duration: 5000,
          })
        }
      } else { // Actual import
        if (resultsToSet.successCount > 0 && !itemLevelFailures && resultsToSet.invalidRecords === 0 && !hasClientValidationErrors && !backendValidationIssues) {
          toast({
            title: "Import Successful!",
            description: `Successfully imported ${resultsToSet.successCount} of ${resultsToSet.total || resultsToSet.successCount} ${type}.`,
            variant: "success",
            icon: <CheckCircle className="h-5 w-5" />,
            duration: 5000,
          })
          onImportComplete()
           setTimeout(() => { 
            handleClose()
          }, 500);
        } else if (resultsToSet.successCount > 0) {
           toast({
            title: "Import Partially Successful",
            description: `Imported ${resultsToSet.successCount} ${type}. ${itemLevelFailures ? `${resultsToSet.failureCount || resultsToSet.results?.failed} failed. ` : ''}${resultsToSet.invalidRecords > 0 || hasClientValidationErrors ? `${resultsToSet.invalidRecords + (resultsToSet.validationErrors?.length || 0)} had validation issues. ` : ''}${backendValidationIssues ? 'Backend validation issues detected. ': ''}Check details below.`,
            variant: "warning",
            icon: <AlertCircle className="h-5 w-5" />,
            duration: 7000,
          })
          if (resultsToSet.successCount > 0) onImportComplete();
        } else {
          toast({
            title: "Import Failed",
            description: `No ${type} were imported. ${itemLevelFailures ? `${resultsToSet.failureCount || resultsToSet.results?.failed} failed. ` : ''}${resultsToSet.invalidRecords > 0 || hasClientValidationErrors ? `${resultsToSet.invalidRecords + (resultsToSet.validationErrors?.length || 0)} had validation issues. ` : ''}${backendValidationIssues ? 'Backend validation issues. ': ''}Please review errors below.`,
            variant: "destructive",
            icon: <XCircle className="h-5 w-5" />,
            duration: 7000,
          })
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: getCoreApiErrorMessage(error.message) || "Failed to process import. Please check the file and try again.",
        variant: "destructive",
        icon: <XCircle className="h-5 w-5" />,
        duration: 7000,
      })
      setImportResults({
        total: file ? 1 : 0, 
        validRecords: 0,
        invalidRecords: file ? 1 : 0,
        processedRecords: 0,
        successCount: 0,
        failureCount: file ? 1 : 0,
        dryRun: dryRun,
        validationErrors: [{ row: 0, field: 'general', value: '', message: getCoreApiErrorMessage(error.message) || "Unknown API error" }]
      });
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = async (format: "csv" | "xlsx") => {
    try {
      setDownloading(true)
      if (type === "users") {
        await downloadUserTemplate(format)
      } else {
        await downloadGroupTemplate(format)
      }
      toast({
        title: "Template Downloaded",
        description: `${type} template downloaded successfully.`,
        variant: "success",
        icon: <CheckCircle className="h-5 w-5" />,
      })
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: getCoreApiErrorMessage(error.message) || "Failed to download template. Please try again.",
        variant: "destructive",
        icon: <AlertCircle className="h-5 w-5" />,
      })
    } finally {
      setDownloading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setImportResults(null)
    setDryRun(false)
    setOverride(false)
    onOpenChange(false)
  }

  const hasErrorsOrFailures = importResults && (
    importResults.failureCount > 0 ||
    importResults.invalidRecords > 0 ||
    importResults.validRecords < 0 || 
    (importResults.validationErrors && importResults.validationErrors.length > 0) ||
    (importResults.results && importResults.results.failed > 0)
  );


  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <PrimitiveDialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import {type === "users" ? "Users" : "Groups"}
          </PrimitiveDialogTitle>
          <DialogDescription>Upload a CSV, Excel, or JSON file to import {type} in bulk.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload File</TabsTrigger>
            <TabsTrigger value="template">Download Template</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="file-import">Select File</Label>
              <Input id="file-import" type="file" accept=".csv,.xlsx,.xls,.json" onChange={handleFileChange} />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="dryRun" checked={dryRun} onCheckedChange={(checked) => setDryRun(checked === true)} />
                <Label htmlFor="dryRun" className="text-sm">
                  Dry run (validate only, don't import)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="override"
                  checked={override}
                  onCheckedChange={(checked) => setOverride(checked === true)}
                />
                <Label htmlFor="override" className="text-sm">
                  Override existing {type}
                </Label>
              </div>
            </div>

            <Alert variant="info">
              <Info className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Make sure your file follows the correct format. Download a template if you&apos;re unsure.
                {type === "users" && (
                  <>
                    {' '}The API expects dates (like <strong>user_expiration</strong>) in <strong>DD/MM/YYYY</strong> format.
                  </>
                )}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Required columns for {type}:</h4>
              <div className="text-sm text-muted-foreground">
                {type === "users" ? (
                  <ul className="list-disc list-inside space-y-1">
                    <li>username (required)</li>
                    <li>email (required)</li>
                    <li>password (required for local auth_method)</li>
                    <li>auth_method (local/ldap, required)</li>
                    <li>user_expiration (DD/MM/YYYY, required)</li>
                    <li>mac_addresses (comma-separated, required)</li>
                    <li>access_control (comma-separated, optional)</li>
                    <li>group_name (optional)</li>
                  </ul>
                ) : ( // groups
                  <ul className="list-disc list-inside space-y-1">
                    <li>group_name (required)</li>
                    <li>auth_method (local/ldap, required)</li>
                    <li>mfa (true/false, optional, defaults to false)</li>
                    <li>role (User/Admin, optional, defaults to User)</li>
                    <li>access_control (comma-separated, optional)</li>
                    <li>group_range (comma-separated, optional)</li>
                    <li>group_subnet (comma-separated, optional)</li>
                  </ul>
                )}
              </div>
            </div>

            {importResults && (
              <Card className="mt-4">
                <CardHeader>
                  <PrimitiveDialogTitle className="flex items-center gap-2 text-lg">
                    {hasErrorsOrFailures ? (
                      <XCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    Import {importResults.dryRun ? "Validation" : ""} Results
                  </PrimitiveDialogTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div><span className="font-medium">Total in File:</span> {importResults.total || 'N/A'}</div>
                    {importResults.dryRun && <div><span className="font-medium">Client-side Valid:</span> {importResults.validRecords || 'N/A'}</div>}
                    {importResults.dryRun && <div className={importResults.invalidRecords > 0 ? 'text-destructive font-semibold' : ''}><span className="font-medium">Client-side Invalid:</span> {importResults.invalidRecords || 'N/A'}</div>}

                    {!importResults.dryRun && <div><span className="font-medium">Processed by Backend:</span> {importResults.processedRecords || 'N/A'}</div>}
                    {!importResults.dryRun && <div className={importResults.successCount > 0 ? 'text-green-600 font-semibold' : ''}><span className="font-medium">Imported:</span> {importResults.successCount || 'N/A'}</div>}
                    {!importResults.dryRun && <div className={importResults.failureCount > 0 ? 'text-destructive font-semibold' : ''}><span className="font-medium">Failed (Backend):</span> {importResults.failureCount || 'N/A'}</div>}

                    {importResults.validRecords < 0 && (
                         <div><span className="font-medium text-destructive">Backend Validation:</span> <span className="text-destructive font-semibold">Issues Detected ({importResults.validRecords})</span></div>
                    )}
                  </div>

                  {importResults.validationErrors && importResults.validationErrors.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h5 className="font-medium text-destructive flex items-center gap-1"><AlertCircle className="h-4 w-4" />File Validation Errors (Client-side):</h5>
                      <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border border-destructive/50 p-2 bg-destructive/5 text-xs">
                        {importResults.validationErrors.map((error, index) => (
                          <div key={`val-${index}`} className="text-destructive">
                            <strong>Row {error.row || 'N/A'}:</strong> (Field: {error.field || 'N/A'}, Value: &quot;{String(error.value)}&quot;) - {error.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {importResults.results && importResults.results.results && (importResults.results.failed > 0 || importResults.results.results.some(item => !item.success && item.error)) && (
                     <div className="space-y-2 pt-2">
                      <h5 className="font-medium text-destructive flex items-center gap-1"><ListChecks className="h-4 w-4" />Item-Specific Import Errors (Backend):</h5>
                      <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border border-destructive/50 p-2 bg-destructive/5 text-xs">
                        {importResults.results.results.filter(item => !item.success && item.error).map((item, index) => (
                          <div key={`item-err-${index}`} className="text-destructive">
                            <strong>{(type === 'users' ? item.username : item.groupName) || `Item ${index + 1}`}:</strong> {item.error}
                            {item.message && ` (${item.message})`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="template" className="space-y-4 pt-4">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Download a template file to ensure your data is in the correct format.
              </p>

              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => downloadTemplate("csv")} disabled={downloading}>
                  <FileText className="mr-2 h-4 w-4" />
                  {downloading ? "Downloading..." : "CSV Template"}
                </Button>
                <Button variant="outline" onClick={() => downloadTemplate("xlsx")} disabled={downloading}>
                  <Download className="mr-2 h-4 w-4" />
                  {downloading ? "Downloading..." : "Excel Template"}
                </Button>
              </div>

              <div className="text-left space-y-2 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium">Template Format:</h4>
                <div className="text-sm text-muted-foreground">
                  {type === "users" ? (
                    <div>
                      <p className="mb-1">CSV headers (order matters):</p>
                      <code className="text-xs bg-background p-1 rounded block">
                        username,email,password,auth_method,user_expiration,mac_addresses,access_control,group_name
                      </code>
                      <p className="mt-2"><strong>Note:</strong> <code className="text-xs">user_expiration</code> must be in <strong>DD/MM/YYYY</strong> format (e.g., 31/12/2024). All other required fields must be present.</p>
                    </div>
                  ) : ( // groups
                    <div>
                      <p className="mb-1">CSV headers (order matters):</p>
                      <code className="text-xs bg-background p-1 rounded block">group_name,auth_method,mfa,role,access_control,group_range,group_subnet</code>
                       <p className="mt-2"><strong>Note:</strong> <code className="text-xs">mfa</code> should be true/false. <code className="text-xs">role</code> should be User or Admin.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || importing}>
            {importing ? "Processing..." : dryRun ? "Validate File" : "Import File"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

    
