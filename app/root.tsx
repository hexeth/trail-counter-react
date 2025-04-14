import {
  isRouteErrorResponse,
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  Link
} from "react-router";
import { TrailButton } from "./components/buttons";
import { ClerkProvider, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import type { Route } from "./+types/root";
import "./app.css";
import AdminNavbar from "./components/admin-navbar";
import { 
  BarChart3, 
  MapPin, 
  FileText, 
  Home,
  Database
} from "lucide-react";

// Define navigation items for the admin area
const adminNavItems = [
  {
    name: "Dashboard",
    icon: <Home className="h-4 w-4" />,
    href: "/admin"
  },
  {
    name: "Trails",
    icon: <MapPin className="h-4 w-4" />,
    href: "/admin/trails"
  },
  {
    name: "Statistics",
    icon: <BarChart3 className="h-4 w-4" />,
    href: "/admin/statistics"
  },
  {
    name: "Data",
    icon: <Database className="h-4 w-4" />,
    href: "/admin/data"
  },
  {
    name: "Templates",
    icon: <FileText className="h-4 w-4" />,
    href: "/admin/templates"
  }
];

// Get Clerk publishable key from environment
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_placeholder_key';

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        <ClerkProvider publishableKey={publishableKey}>
          {children}
        </ClerkProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        {isAdmin ? (
          <SignedIn>
            <AdminNavbar 
              navItems={adminNavItems}
              title="Trail Admin"
            />
          </SignedIn>
        ) : (
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-amber-800 dark:text-amber-500 ">
              <NavLink to="/" className=" text-amber-700 dark:text-amber-400 ">
                Trail Counter
              </NavLink>
            </h1>
            <nav>
              <SignedIn>
                <div className="flex items-center gap-4">
                  <Link to="/admin">
                  <TrailButton 
                    variant="trail"
                    className="cursor-pointer"

                  >
                    Dashboard
                  </TrailButton>
                  </Link>
                  <UserButton afterSignOutUrl="/" />
                </div>
              </SignedIn>
              <SignedOut>
                <Link 
                to="/sign-in" 
              >
                <TrailButton 
                  variant="trail"
                  className="cursor-pointer"
                  >
                    Admin Login
                  </TrailButton>
                </Link>
              </SignedOut>
            </nav>
          </div>
        )}
      </header>
      <main className={`flex-grow container mx-auto px-4 py-8 ${isAdmin ? 'pt-4' : ''}`}>
        <Outlet />
      </main>
      <footer className="bg-white dark:bg-gray-800 shadow-inner py-4">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>© {new Date().getFullYear()} Trail Counter - A solution for equestrian trail registration</p>
        </div>
      </footer>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-red-600 mb-4">{message}</h1>
        <p className="text-gray-700 dark:text-gray-300 mb-6">{details}</p>
        {stack && (
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
            <code>{stack}</code>
          </pre>
        )}
        <div className="mt-8">
          <NavLink 
            to="/" 
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Back to Home
          </NavLink>
        </div>
      </div>
    </div>
  );
}
