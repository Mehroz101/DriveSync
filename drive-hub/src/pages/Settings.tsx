import { useState } from 'react';
import { User, Bell, Shield, Monitor, HardDrive, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { currentUser, userPreferences, drives } from '@/data/mockData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StorageBar } from '@/components/shared/StorageBar';
import { StatusBadge } from '@/components/shared/StatusBadge';

export default function Settings() {
  const [preferences, setPreferences] = useState(userPreferences);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and connected drives.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Monitor className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="drives" className="gap-2">
            <HardDrive className="h-4 w-4" />
            Drives
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details and profile picture.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                  <AvatarFallback className="text-xl">
                    {currentUser.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline">Change Photo</Button>
                  <p className="text-xs text-muted-foreground">JPG, GIF or PNG. Max size 2MB.</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue={currentUser.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={currentUser.email} />
                </div>
              </div>
              
              <Button className="gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Display Settings</CardTitle>
              <CardDescription>Customize how content is displayed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Default View Mode</Label>
                  <p className="text-sm text-muted-foreground">Choose list or grid view for files.</p>
                </div>
                <Select
                  value={preferences.viewMode}
                  onValueChange={(value: 'list' | 'grid') =>
                    setPreferences({ ...preferences, viewMode: value })
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="list">List</SelectItem>
                    <SelectItem value="grid">Grid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Items Per Page</Label>
                  <p className="text-sm text-muted-foreground">Number of items to show per page.</p>
                </div>
                <Select
                  value={String(preferences.paginationSize)}
                  onValueChange={(value) =>
                    setPreferences({ ...preferences, paginationSize: Number(value) as 10 | 25 | 50 | 100 })
                  }
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Default Drive</Label>
                  <p className="text-sm text-muted-foreground">Default drive for uploads and searches.</p>
                </div>
                <Select
                  value={preferences.defaultDrive}
                  onValueChange={(value) =>
                    setPreferences({ ...preferences, defaultDrive: value })
                  }
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Drives</SelectItem>
                    {drives.map((drive) => (
                      <SelectItem key={drive.id} value={drive.id}>
                        {drive.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configure notification preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive email updates about your drives.</p>
                </div>
                <Switch
                  checked={preferences.notifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, notifications: checked })
                  }
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Sync</Label>
                  <p className="text-sm text-muted-foreground">Automatically sync drives in the background.</p>
                </div>
                <Switch
                  checked={preferences.autoSync}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, autoSync: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drives Tab */}
        <TabsContent value="drives" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connected Drives</CardTitle>
              <CardDescription>Manage permissions and access for connected drives.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {drives.map((drive) => (
                <div key={drive.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={drive.avatar} alt={drive.name} />
                      <AvatarFallback>{drive.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{drive.name}</p>
                        <StatusBadge status={drive.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">{drive.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 hidden sm:block">
                      <StorageBar used={drive.storageUsed} total={drive.storageTotal} size="sm" />
                    </div>
                    <Button variant="outline" size="sm">Manage</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security and sessions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
                </div>
                <Button variant="outline">Enable</Button>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Change Password</Label>
                  <p className="text-sm text-muted-foreground">Update your account password.</p>
                </div>
                <Button variant="outline">Change</Button>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active Sessions</Label>
                  <p className="text-sm text-muted-foreground">Manage devices where you're logged in.</p>
                </div>
                <Button variant="outline">View Sessions</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible and destructive actions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Delete Account</Label>
                  <p className="text-sm text-muted-foreground">Permanently delete your account and all data.</p>
                </div>
                <Button variant="destructive">Delete Account</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
