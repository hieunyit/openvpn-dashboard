
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { getOpenVPNConnection, updateOpenVPNConnection, getLdapConnection, updateLdapConnection } from "@/lib/api"
import { getCoreApiErrorMessage } from "@/lib/utils"
import { Network, Save, AlertTriangle, CheckCircle, Shield, Building } from "lucide-react"

interface ConnectionFormProps {
  type: 'openvpn' | 'ldap'
  initialData: any
  onSave: (data: any) => Promise<any>
}

function ConnectionForm({ type, initialData, onSave }: ConnectionFormProps) {
  const [formData, setFormData] = useState(initialData || {})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setFormData(initialData || {})
  }, [initialData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // For LDAP, port should be a number
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
    <Card className="shadow-md border-0">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
            {type === 'openvpn' ? <Shield className="mr-2 h-5 w-5 text-primary"/> : <Building className="mr-2 h-5 w-5 text-primary"/>}
            {type.toUpperCase()} Connection
        </CardTitle>
        <CardDescription>
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
              disabled={saving}
            />
          </div>
        ))}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" disabled>Test Connection</Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function ConnectionsPage() {
  const [openvpnConfig, setOpenvpnConfig] = useState(null)
  const [ldapConfig, setLdapConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchConfigs() {
      try {
        setLoading(true)
        const [ovpnRes, ldapRes] = await Promise.allSettled([
          getOpenVPNConnection(),
          getLdapConnection(),
        ])

        if (ovpnRes.status === 'fulfilled') setOpenvpnConfig(ovpnRes.value)
        if (ldapRes.status === 'fulfilled') setLdapConfig(ldapRes.value)
        
        if (ovpnRes.status === 'rejected' || ldapRes.status === 'rejected') {
            toast({
                title: "Partial Load Error",
                description: "Could not load all connection settings.",
                variant: "warning",
                icon: <AlertTriangle className="h-5 w-5" />
            })
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
    }
    fetchConfigs()
  }, [toast])

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
            {loading ? <p>Loading...</p> : <ConnectionForm type="openvpn" initialData={openvpnConfig} onSave={updateOpenVPNConnection} />}
        </TabsContent>
        <TabsContent value="ldap" className="mt-6">
            {loading ? <p>Loading...</p> : <ConnectionForm type="ldap" initialData={ldapConfig} onSave={updateLdapConnection} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}
