
"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { 
  getOpenVPNConnection, updateOpenVPNConnection, deleteOpenVPNConnection,
  getLdapConnection, updateLdapConnection, deleteLdapConnection,
  testOpenVPNConnection, testLdapConnection
} from "@/lib/api"
import { getCoreApiErrorMessage } from "@/lib/utils"
import { Network, Save, AlertTriangle, CheckCircle, Shield, Building, Trash2, Activity, Power } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface ConnectionFormProps {
  type: 'openvpn' | 'ldap'
  initialData: any
  onSave: (data: any) => Promise<any>
  onDelete: () => Promise<any>
  onTest: () => Promise<any>
  onConfigChange: () => void;
}

function ConnectionForm({ type, initialData, onSave, onDelete, onTest, onConfigChange }: ConnectionFormProps) {
  const [formData, setFormData] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const { toast } = useToast()

  const connectionExists = initialData && initialData.ID;

  useEffect(() => {
    if (initialData) {
      if (type === 'openvpn') {
        setFormData({
          id: initialData.ID,
          host: initialData.Host,
          port: initialData.Port,
          username: initialData.Username,
          password: initialData.Password || '',
        });
      } else { // ldap
        setFormData({
          id: initialData.ID,
          host: initialData.Host,
          port: initialData.Port,
          bindDN: initialData.BindDN,
          bindPassword: initialData.BindPassword || '',
          baseDN: initialData.BaseDN,
        });
      }
    } else {
        setFormData({})
    }
  }, [initialData, type]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleTest = async () => {
    setTesting(true);
    try {
      const testFunction = type === 'openvpn' ? testOpenVPNConnection : testLdapConnection;
      await testFunction();
      toast({
        title: "Connection Successful",
        description: `Successfully connected to the ${type.toUpperCase()} server.`,
        variant: "success",
        icon: <CheckCircle className="h-5 w-5" />,
      });
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: getCoreApiErrorMessage(error),
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    } finally {
      setTesting(false);
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const dataToSave = { ...formData }
      if (type === 'ldap' && dataToSave.port) {
        dataToSave.port = Number(dataToSave.port)
      }

      await onSave(dataToSave)
      toast({
        title: "Success",
        description: `${type.toUpperCase()} connection settings have been saved.`,
        variant: "success",
        icon: <CheckCircle className="h-5 w-5" />,
      })
      onConfigChange();
    } catch (error: any) {
      toast({
        title: "Error Saving Settings",
        description: getCoreApiErrorMessage(error),
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
        await onDelete()
        toast({
            title: "Success",
            description: `${type.toUpperCase()} connection has been deleted.`,
            variant: "success",
            icon: <CheckCircle className="h-5 w-5" />,
        })
        onConfigChange();
    } catch (error: any) {
        toast({
            title: `Error Deleting ${type.toUpperCase()} Connection`,
            description: getCoreApiErrorMessage(error),
            variant: "destructive",
            icon: <AlertTriangle className="h-5 w-5" />,
        })
    } finally {
        setSaving(false)
        setIsDeleteConfirmOpen(false)
    }
  }
  
  const fields = type === 'openvpn' ?
    [
      { name: 'host', label: 'Host Address', placeholder: 'e.g., vpn.example.com' },
      { name: 'port', label: 'Port', placeholder: 'e.g., 943' },
      { name: 'username', label: 'Admin Username', placeholder: 'e.g., openvpn' },
      { name: 'password', label: 'Admin Password', type: 'password', placeholder: 'Enter password' },
    ] :
    [
      { name: 'host', label: 'LDAP Host', placeholder: 'e.g., ldap.example.com' },
      { name: 'port', label: 'LDAP Port', placeholder: 'e.g., 389 or 636' },
      { name: 'bindDN', label: 'Bind DN', placeholder: 'e.g., cn=admin,dc=example,dc=com' },
      { name: 'bindPassword', label: 'Bind Password', type: 'password', placeholder: 'Enter bind password' },
      { name: 'baseDN', label: 'Base DN', placeholder: 'e.g., dc=example,dc=com' },
    ]

  return (
    <>
    <Card className="shadow-md border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-xl">
                {type === 'openvpn' ? <Shield className="mr-2 h-5 w-5 text-primary"/> : <Building className="mr-2 h-5 w-5 text-primary"/>}
                {type.toUpperCase()} Connection
            </CardTitle>
            {connectionExists ? (
              <div className="flex items-center gap-1.5 text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 px-2.5 py-1 rounded-full">
                <Activity className="h-4 w-4"/> Configured
              </div>
            ) : (
               <div className="flex items-center gap-1.5 text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400 px-2.5 py-1 rounded-full">
                <AlertTriangle className="h-4 w-4"/> Not Configured
              </div>
            )}
        </div>
        <CardDescription className="pt-2">
          Configure the connection settings for your {type.toUpperCase()} server.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map(field => (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={`${type}-${field.name}`}>{field.label}</Label>
            <Input
              id={`${type}-${field.name}`}
              name={field.name}
              value={formData[field.name] || ""}
              onChange={handleChange}
              type={field.type || 'text'}
              placeholder={field.placeholder}
              disabled={saving || testing}
            />
          </div>
        ))}
      </CardContent>
      <CardFooter className="flex justify-between items-center">
         <div>
          {connectionExists && (
            <Button variant="destructive" onClick={() => setIsDeleteConfirmOpen(true)} disabled={saving || testing}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleTest} disabled={saving || testing || !connectionExists}>
              <Power className="mr-2 h-4 w-4" />
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button onClick={handleSave} disabled={saving || testing}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
            </Button>
        </div>
      </CardFooter>
    </Card>
     <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the {type.toUpperCase()} connection configuration. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    {saving ? "Deleting..." : "Delete"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  )
}

export default function ConnectionsPage() {
  const [openvpnConfig, setOpenvpnConfig] = useState(null)
  const [ldapConfig, setLdapConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true)
      const [ovpnRes, ldapRes] = await Promise.allSettled([
        getOpenVPNConnection(),
        getLdapConnection(),
      ])

      if (ovpnRes.status === 'fulfilled') setOpenvpnConfig(ovpnRes.value)
      if (ldapRes.status === 'fulfilled') setLdapConfig(ldapRes.value)
      
      if (ovpnRes.status === 'rejected' || ldapRes.status === 'rejected') {
          // This toast might be too noisy if one is configured and the other is not (which returns a 404 rejected promise).
          // Only show toast for non-404 errors. This requires more complex error handling in api.ts
          // For now, let's keep it simple.
      }
    } catch (error: any) {
       toast({
          title: "Error",
          description: getCoreApiErrorMessage(error),
          variant: "destructive",
          icon: <AlertTriangle className="h-5 w-5" />
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
         <Network className="h-8 w-8 text-primary flex-shrink-0" />
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">System Connections</h1>
            <p className="text-muted-foreground mt-1">Manage external service connections for the portal.</p>
        </div>
      </div>
      
      <Tabs defaultValue="openvpn" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="openvpn">OpenVPN Server</TabsTrigger>
          <TabsTrigger value="ldap">LDAP Server</TabsTrigger>
        </TabsList>
        <TabsContent value="openvpn" className="mt-6">
            {loading ? <p>Loading...</p> : <ConnectionForm type="openvpn" initialData={openvpnConfig} onSave={updateOpenVPNConnection} onDelete={deleteOpenVPNConnection} onTest={testOpenVPNConnection} onConfigChange={fetchConfigs} />}
        </TabsContent>
        <TabsContent value="ldap" className="mt-6">
            {loading ? <p>Loading...</p> : <ConnectionForm type="ldap" initialData={ldapConfig} onSave={updateLdapConnection} onDelete={deleteLdapConnection} onTest={testLdapConnection} onConfigChange={fetchConfigs} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}
