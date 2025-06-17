
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { useTheme } from "next-themes"
import { Sun, Moon, Bell, FileText, Info, Check, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getCoreApiErrorMessage } from "@/lib/utils"


export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()

  const [settings, setSettings] = useState({
    notifications: true,
    apiLogging: true,
  })

  const handleSwitchChange = (name: string, checked: boolean) => {
    setSettings((prev) => ({ ...prev, [name]: checked }))
  }

  const handleSaveSettings = (section: string) => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      // Example of how you might handle an error from a real API
      // const simulateError = Math.random() < 0.2; // 20% chance of error
      const simulateError = false;

      if (simulateError) {
        toast({
          title: `❌ Failed to Save ${section} Settings`,
          description: getCoreApiErrorMessage("Server error: Simulated API error saving settings."), // Example of using the helper
          variant: "destructive",
        });
      } else {
        toast({
          title: `✅ ${section} Settings Saved`,
          description: `Your ${section.toLowerCase()} settings have been updated. (Simulated)`,
          className: "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300",
          icon: <Check className="h-5 w-5 text-green-600" />
        });
      }
      setIsLoading(false);
    }, 1000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Application Settings</h1>
          <p className="text-muted-foreground mt-1">Configure general preferences and view system information.</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 max-w-md">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="system">System Info</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="shadow-md border-0">
            <CardHeader>
              <CardTitle className="text-xl">Appearance & Notifications</CardTitle>
              <CardDescription>Customize the look and feel, and manage notification settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="darkMode" className="text-base font-medium">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Toggle between light and dark themes for the dashboard.</p>
                </div>
                <div className="flex items-center">
                  <Sun className={`mr-2 h-5 w-5 transition-opacity ${theme === 'light' ? 'opacity-100' : 'opacity-50'}`} />
                  <Switch
                    id="darkMode"
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    aria-label="Toggle dark mode"
                  />
                  <Moon className={`ml-2 h-5 w-5 transition-opacity ${theme === 'dark' ? 'opacity-100' : 'opacity-50'}`} />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications" className="text-base font-medium">Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive browser notifications for critical events and updates.</p>
                </div>
                <Switch
                  id="notifications"
                  checked={settings.notifications}
                  onCheckedChange={(checked) => handleSwitchChange("notifications", checked)}
                  aria-label="Toggle notifications"
                />
              </div>

               <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="apiLogging" className="text-base font-medium">API Request Logging</Label>
                  <p className="text-sm text-muted-foreground">Enable logging of API requests for debugging (simulated).</p>
                </div>
                <Switch
                  id="apiLogging"
                  checked={settings.apiLogging}
                  onCheckedChange={(checked) => handleSwitchChange("apiLogging", checked)}
                  aria-label="Toggle API logging"
                />
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button onClick={() => handleSaveSettings("General")} disabled={isLoading} className="bg-primary hover:bg-primary/90">
                {isLoading ? "Saving..." : "Save General Settings"}
              </Button>
            </CardFooter>
          </Card>
           <Alert className="bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300">
            <Info className="h-5 w-5 text-blue-600" />
            <AlertTitle className="font-semibold">Feature Update</AlertTitle>
            <AlertDescription>
              More customization options and advanced settings will be available in future updates.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
           <Card className="shadow-md border-0">
            <CardHeader>
              <CardTitle className="text-xl">System & API Information</CardTitle>
              <CardDescription>Key details about the OpenVPN Access Server and its API integration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="font-medium text-muted-foreground">API Version</p>
                  <p className="text-foreground font-semibold">1.1.0</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="font-medium text-muted-foreground">Service Name</p>
                  <p className="text-foreground font-semibold">GoVPN API Enhanced</p>
                </div>
                 <div className="p-3 bg-muted/50 rounded-md">
                  <p className="font-medium text-muted-foreground">UI Version</p>
                  <p className="text-foreground font-semibold">1.0.0</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="font-medium text-muted-foreground">Key Features</p>
                  <p className="text-foreground">Bulk Ops, Adv. Search, Real-time Status</p>
                </div>
                <div className="md:col-span-2 p-3 bg-muted/50 rounded-md">
                  <p className="font-medium text-muted-foreground">API Documentation</p>
                  <a
                    href="https://rncfl-13-229-130-65.a.free.pinggy.link/swagger/index.html" // Example URL, update if needed
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    <FileText className="h-4 w-4"/> View Swagger Docs
                  </a>
                </div>
              </div>
            </CardContent>
             <CardFooter className="border-t pt-6">
                <p className="text-xs text-muted-foreground">
                    This information is provided for administrative and debugging purposes.
                </p>
             </CardFooter>
          </Card>
          <Alert variant="destructive" className="bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <AlertTitle className="font-semibold">Experimental Features</AlertTitle>
            <AlertDescription>
              Some features on this dashboard might be experimental. Use with caution and report any issues.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  )
}
