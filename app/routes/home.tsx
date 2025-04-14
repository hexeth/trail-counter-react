import { Link } from "react-router";
import type { Route } from "./+types/home";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "~/components/ui/card";
import { TrailButton } from "~/components/buttons";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Trail Counter - Home" },
    { name: "description", content: "Welcome to Trail Counter - Track and manage trail usage" },
  ];
}

export default function Home() {
  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-amber-800 dark:text-amber-500 mb-4">
          Trail Counter
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-300">
          A simple way to track and manage trail usage
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <Card className="h-full bg-amber-50">
          <CardHeader>
            <CardTitle className="text-2xl text-amber-800 dark:text-amber-500">For Riders</CardTitle>
            <CardDescription>
              When you visit a trail, scan the QR code at the trailhead to log your visit. 
              This helps trail managers track usage and maintain the trails properly.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <TrailButton
              variant="trail"
              animation="bounce"
              size="wide"
              icon="🐎"
              iconPosition="left"
              onClick={() => window.location.href = "/about/riders"}
            >
              Learn More
            </TrailButton>
          </CardFooter>
        </Card>
        
        <Card className="h-full bg-amber-50">
          <CardHeader>
            <CardTitle className="text-2xl text-amber-800 dark:text-amber-500">For Trail Managers</CardTitle>
            <CardDescription>
              Create QR codes for your trails, track usage statistics, and understand 
              how your trails are being used throughout the season.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link to="/admin">
              <TrailButton
                variant="success"
                animation="bounce"
                size="wide"
                icon="👤"
                iconPosition="left"
              >
                Admin Login
              </TrailButton>
            </Link>
          </CardFooter>
        </Card>
      </div>
      
      <Card className="mb-12">
        <CardHeader>
          <CardTitle className="text-2xl text-amber-800 dark:text-amber-500">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-amber-100 dark:bg-amber-900/50 w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">1. Trail Setup</h3>
              <p className="text-card-foreground">
                Trail managers create trails and generate unique QR codes.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-amber-100 dark:bg-amber-900/50 w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">2. Rider Registration</h3>
              <p className="text-card-foreground">
                Riders scan the QR code and fill out a short form.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-amber-100 dark:bg-amber-900/50 w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">3. Analytics</h3>
              <p className="text-card-foreground">
                Trail managers view statistics and usage patterns.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50">
        <CardHeader>
          <CardTitle className="text-2xl text-amber-800 dark:text-amber-500">Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4 text-gray-700 dark:text-gray-300">
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-3 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Understand trail usage patterns and popular times</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-3 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Help prioritize trail maintenance and improvement efforts</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-3 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Support grant applications with accurate usage data</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-3 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Emergency contact information for trail alerts</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
