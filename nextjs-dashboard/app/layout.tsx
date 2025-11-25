import '@/app/ui/global.css';
import { AuthProvider } from '@/app/lib/auth-context';
import { UserHeader } from '@/app/ui/user-header';
import { ThemeProvider } from '@/app/lib/theme-provider';
import { ThemeToggle } from '@/app/ui/theme-toggle';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-50">
        <ThemeProvider>
          <ThemeToggle />
          <AuthProvider>
            <UserHeader />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}