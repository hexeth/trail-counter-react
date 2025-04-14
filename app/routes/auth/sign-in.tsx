import { SignIn } from "@clerk/clerk-react";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "Sign In - Trail Counter" },
    { name: "description", content: "Sign in to the Trail Counter admin panel" }
  ];
};

export default function SignInPage() {
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-green-700 dark:text-green-500 mb-6 text-center">
          Admin Sign In
        </h1>
        
        <SignIn 
          routing="hash" 
          redirectUrl="/admin"
          appearance={{
            elements: {
              // Hide the "Sign up" link on the sign-in form
              footerAction: "hidden"
            }
          }}
        />
        
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            For trail administrators only. If you're a rider, you can register your visit by scanning the QR code at the trailhead.
          </p>
        </div>
      </div>
    </div>
  );
}