import '@/app/ui/global.css';
import { AuthProvider } from '@/app/lib/auth-context';
import { UserHeader } from '@/app/ui/user-header';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <UserHeader />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}