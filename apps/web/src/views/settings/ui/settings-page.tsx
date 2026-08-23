import { Header } from '@/widgets/header';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { siteConfig } from '@/shared/config/site';

export function SettingsPage() {
  return (
    <>
      <Header title="Настройки" description="Параметры аккаунта и приложения." />
      <main className="p-8 pt-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Валюта по умолчанию</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{siteConfig.defaultCurrency}</CardContent>
        </Card>
      </main>
    </>
  );
}
