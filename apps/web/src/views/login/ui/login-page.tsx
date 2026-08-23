import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/ui/card';
import { LoginForm } from '@/features/auth/login';

export function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">Вход</CardTitle>
        <CardDescription>Введите email и пароль, чтобы продолжить</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
