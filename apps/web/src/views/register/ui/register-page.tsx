import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/ui/card';
import { RegisterForm } from '@/features/auth/register';

export function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">Регистрация</CardTitle>
        <CardDescription>Создайте аккаунт, чтобы начать учёт расходов</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
