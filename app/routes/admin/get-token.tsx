import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { TrailButton } from "@/app/components/buttons";
import { Button } from "~/components/ui/button";

export default function GetAuthToken() {
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchToken = async () => {
    const authToken = await getToken();
    setToken(authToken);
    setCopied(false);
  };

  const copyToClipboard = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Get Auth Token for Testing</h1>
      <p className="mb-4 text-gray-600">
        Use this page to get your current authentication token for testing purposes.
        This token is sensitive and should be kept secure.
      </p>
      
      <TrailButton 
        onClick={fetchToken} 
        variant="primary" 
        className="mb-4"
      >
        Show My Auth Token
      </TrailButton>
      
      {token && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Your Bearer Token:</h2>
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 p-3 rounded-md border border-gray-300 overflow-x-auto max-w-full">
              <code className="text-sm break-all">{token}</code>
            </div>
            <TrailButton 
              onClick={copyToClipboard} 
              variant="outline" 
              size="sm"
            >
              {copied ? "Copied!" : "Copy"}
            </TrailButton>
          </div>
          
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="text-md font-semibold text-yellow-800">Usage Instructions:</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Run your security tests with the token by setting the <code>TEST_AUTH_TOKEN</code> environment variable:
            </p>
            <pre className="bg-gray-800 text-white p-2 rounded-md mt-2 overflow-x-auto">
              <code>TEST_AUTH_TOKEN="{token}" npm run test:workers</code>
            </pre>
            <pre className="bg-gray-800 text-white p-2 rounded-md mt-2 overflow-x-auto">
              <code>TRAIL_AUTH_TOKEN="{token}" node scripts/generate-clean-data.js</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}