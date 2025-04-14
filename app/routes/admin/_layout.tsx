import { Outlet, useNavigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { Spinner } from "@/app/components/ui/spinner";

// This loader will check if the user is authenticated on all admin routes
export async function loader({ request }: { request: Request }) {
  // For server-side authentication checking, we'll rely on the Clerk middleware
  // which will be set up in the Cloudflare Worker
  return null;
}

export default function Layout() {
  const navigate = useNavigate();
  // Use Clerk's useAuth hook to check if user is authenticated
  const { isLoaded, isSignedIn } = useAuth();
  
  // When auth state changes, redirect if needed
  useEffect(() => {
    // If Clerk has loaded and the user is not signed in, redirect to sign-in page
    if (isLoaded && !isSignedIn) {
      // Get the current path to create a returnTo parameter
      const returnToParam = new URLSearchParams();
      returnToParam.set('returnTo', window.location.pathname);
      
      // Redirect to sign-in page (fixed path)
      navigate(`/sign-in?${returnToParam.toString()}`);
    }
  }, [isLoaded, isSignedIn, navigate]);
  
  // Add a loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="xl">Loading...</Spinner>
      </div>
    );
  }
  
  // If not signed in, show nothing while redirecting
  if (!isSignedIn) {
    return null;
  }
  
  // User is authenticated, render the admin layout without the navbar
  // since it's now in the root.tsx file
  return (
    <div className="admin-layout">
      <main className="flex-grow">
        <Outlet />
      </main>
    </div>
  );
}