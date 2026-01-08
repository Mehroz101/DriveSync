import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, HardDrive, Mail, Database, Folder, Copy } from 'lucide-react';
import { formatBytes } from '@/lib/formatters';
import type { DriveAccount } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileCardProps {
  drive?: DriveAccount;
}

export function ProfileCard({ drive }: ProfileCardProps) {
  const { user } = useAuth();

  // If no drive prop is provided, fall back to the user's auth data
  if (!drive) {
    const activeDrives = 4; // You might want to calculate this from your drives data
    
    return (
      <div className="rounded-xl border bg-card p-6 shadow-card">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border-2 border-accent/20">
            <AvatarImage src={user?.picture} alt={user?.name} />
            <AvatarFallback className="text-lg">
              {user?.name?.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold truncate">{user?.name || 'User'}</h2>
              <Badge variant="secondary" className="bg-success/10 text-success border-0">
                Active
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {user?.email || 'No email available'}
            </p>
            
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span>
                  <strong>{activeDrives}</strong> drives connected
                </span>
              </div>
            </div>
          </div>

          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }
}