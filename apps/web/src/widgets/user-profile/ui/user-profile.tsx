import { Card, CardContent } from '@/shared/ui/card';

interface UserProfileProps {
  name: string;
  email: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export function UserProfile({ name, email }: UserProfileProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {getInitials(name)}
        </div>
        <div>
          <p className="font-semibold">Здравствуйте, {name}</p>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </CardContent>
    </Card>
  );
}
