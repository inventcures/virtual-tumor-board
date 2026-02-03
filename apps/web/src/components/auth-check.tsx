import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function AuthCheck({ children }: { children: React.ReactNode }) {
  const siteAccessToken = process.env.SITE_ACCESS_TOKEN;
  
  if (siteAccessToken) {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('vtb_auth_v2')?.value;
    
    if (authCookie !== siteAccessToken) {
      // Return auth page instead of redirecting to avoid infinite loops
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h1 className="text-3xl font-bold text-white mb-4">Access Restricted</h1>
            <p className="text-slate-400 mb-6">This site is currently private. Please contact the owner for access.</p>
            <p className="text-xs text-slate-600">Add ?token=YOUR_TOKEN to the URL to access</p>
          </div>
        </div>
      );
    }
  }
  
  return <>{children}</>;
}
