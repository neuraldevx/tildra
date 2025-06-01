'use client'

import React, { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Settings,
  User,
  Bell,
  Shield,
  CreditCard,
  Download,
  Trash2,
  ExternalLink,
  Loader2
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from 'sonner'

interface UserSettings {
  emailNotifications: boolean
  summaryNotifications: boolean
  marketingEmails: boolean
}

// To manage loading state for individual settings
interface SettingLoadingState {
  emailNotifications?: boolean;
  summaryNotifications?: boolean;
  marketingEmails?: boolean;
}

export default function SettingsPage() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [isLoading, setIsLoading] = useState(true)
  const [isProUser, setIsProUser] = useState(false)
  const [settings, setSettings] = useState<UserSettings>({
    emailNotifications: true,
    summaryNotifications: true,
    marketingEmails: false
  })
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  // const [isSavingSettings, setIsSavingSettings] = useState(false) // Replaced by individual loading
  const [settingLoading, setSettingLoading] = useState<SettingLoadingState>({});


  useEffect(() => {
    checkUserStatus()
    loadUserSettings()
  }, [])

  const checkUserStatus = async () => {
    try {
      const token = await getToken()
      const response = await fetch('/api/user/account', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setIsProUser(data.is_pro || false)
      }
    } catch (error) {
      console.error('Error checking user status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadUserSettings = async () => {
    setIsLoading(true); // Start loading
    try {
      const token = await getToken()
      const response = await fetch('/api/user/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setSettings({
          emailNotifications: data.emailNotifications ?? true,
          summaryNotifications: data.summaryNotifications ?? true,
          marketingEmails: data.marketingEmails ?? false,
        })
      } else {
        toast.error("Failed to load user settings.")
      }
    } catch (error) {
      console.error('Error loading user settings:', error)
      toast.error("Error loading user settings.")
    } finally {
      setIsLoading(false); // End loading
    }
  }

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true)
    try {
      window.open("https://billing.stripe.com/p/login/3cs7sw2s5dSieR224gg", "_blank")
    } catch (error) {
      console.error('Error opening billing portal:', error)
      toast.error('Failed to open billing portal')
    } finally {
      setIsLoadingPortal(false)
    }
  }

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const token = await getToken()
      const response = await fetch('/api/user/export', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = 'tildra-data-export.json'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        toast.success('Data exported successfully')
      } else {
        toast.error('Failed to export data')
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export data')
    } finally {
      setIsExporting(false)
    }
  }

  const updateSetting = async (key: keyof UserSettings, value: boolean) => {
    const originalSettings = { ...settings } // Store original settings for revert
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    setSettingLoading(prev => ({ ...prev, [key]: true })); // Set loading for specific setting
    
    try {
      const token = await getToken()
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings), // Send all settings
      })
      
      if (response.ok) {
        const updatedSettingsFromServer = await response.json();
        setSettings(updatedSettingsFromServer); // Update state with confirmed settings
        toast.success('Settings updated successfully')
      } else {
        setSettings(originalSettings) // Revert to original on failure
        toast.error('Failed to update setting')
      }
    } catch (error) {
      console.error('Error updating setting:', error)
      setSettings(originalSettings) // Revert to original on error
      toast.error('Failed to update setting')
    } finally {
      setSettingLoading(prev => ({ ...prev, [key]: false })); // Clear loading for specific setting
    }
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="space-y-6">
          <div className="h-8 bg-muted rounded w-48 animate-pulse" />
          {/* Skeleton for settings cards */}
          <div className="h-40 bg-muted rounded animate-pulse" />
          <div className="h-60 bg-muted rounded animate-pulse" />
          <div className="h-40 bg-muted rounded animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {/* Account Information */}
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <User className="h-5 w-5 text-primary" />
            Account Information
          </CardTitle>
          <CardDescription>
            Manage your account details and subscription.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{user?.primaryEmailAddress?.emailAddress || 'N/A'}</p>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Subscription Plan</p>
              <div className="text-sm text-muted-foreground">
                {isProUser ? <Badge variant="default">Tildra Plus</Badge> : <Badge variant="secondary">Free</Badge>}
              </div>
            </div>
            <Button 
              onClick={handleManageSubscription} 
              disabled={isLoadingPortal}
              variant="outline"
              size="sm"
            >
              {isLoadingPortal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
              Manage Subscription
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure how you receive notifications from Tildra.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Notifications */}
          <div className="p-4 border rounded-md shadow-sm bg-card flex items-center justify-between hover:bg-muted/50 transition-colors relative">
            {settingLoading.emailNotifications && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="emailNotifications" className="text-base font-medium">
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive important account updates, password reset emails, and security alerts.
              </p>
            </div>
            <Switch
              id="emailNotifications"
              checked={settings.emailNotifications}
              onCheckedChange={(value) => updateSetting('emailNotifications', value)}
              disabled={settingLoading.emailNotifications}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {/* Summary Notifications */}
          <div className="p-4 border rounded-md shadow-sm bg-card flex items-center justify-between hover:bg-muted/50 transition-colors relative">
            {settingLoading.summaryNotifications && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="summaryNotifications" className="text-base font-medium">
                Summary Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified by email when your summaries are ready. (Instant)
              </p>
            </div>
            <Switch
              id="summaryNotifications"
              checked={settings.summaryNotifications}
              onCheckedChange={(value) => updateSetting('summaryNotifications', value)}
              disabled={settingLoading.summaryNotifications}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          
          {/* Marketing Emails */}
          <div className="p-4 border rounded-md shadow-sm bg-card flex items-center justify-between hover:bg-muted/50 transition-colors relative">
            {settingLoading.marketingEmails && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="marketingEmails" className="text-base font-medium">
                Marketing Emails
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive updates about new Tildra features, tips, and occasional promotions.
              </p>
            </div>
            <Switch
              id="marketingEmails"
              checked={settings.marketingEmails}
              onCheckedChange={(value) => updateSetting('marketingEmails', value)}
              disabled={settingLoading.marketingEmails}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-5 w-5 text-primary" />
            Data & Privacy
          </CardTitle>
          <CardDescription>
            Manage your personal data and privacy settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleExportData} 
            disabled={isExporting}
            variant="outline" 
            className="w-full sm:w-auto"
          >
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export My Data
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete your account
                  and remove your data from our servers.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => { /* Close dialog */ }}>Cancel</Button>
                <Button variant="destructive" onClick={() => toast.info('Account deletion requested. (Not implemented)')}>
                  Yes, delete account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
      
      {/* External Links - Optional Section */}
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ExternalLink className="h-5 w-5 text-primary" />
            More
          </CardTitle>
          <CardDescription>
            Find helpful resources and learn more about Tildra.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <a href="/about" target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-primary hover:underline">
            About Tildra
          </a>
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-primary hover:underline">
            Privacy Policy
          </a>
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-primary hover:underline">
            Terms of Service
          </a>
        </CardContent>
      </Card>

    </div>
  )
} 