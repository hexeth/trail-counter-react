import { Link, useParams } from "react-router";
import { useState } from "react";
import type { Route } from "../../.react-router/types/app/routes/+types/register";
import type { MetaFunction } from "react-router";
import { getPublicTrailInfo, createPublicRegistration } from "@/lib/api";
import HorseRegistration from "~/components/registration";

export const meta: MetaFunction = () => {
  return [
    { title: "Trail Registration - Trail Counter" },
    { name: "description", content: "Register your visit to the trail" },
  ];
}

export async function clientLoader({
  params,
  context,
}: Route.ClientLoaderArgs) {
  const { trailId } = params;
  
  if (!trailId) {
    return {
      error: "Trail ID is required",
      trail: null
    };
  }

  try {
    // Get only public trail data from the API - this endpoint returns minimal data needed for registration
    const trailData = await getPublicTrailInfo(trailId);
    
    // Check if the trail is active before allowing registration
    if (!trailData.active) {
      return {
        error: "This trail is not currently active for registration",
        trail: null
      };
    }
    
    return {
      trail: trailData
    };
  } catch (error) {
    console.error("Error loading trail:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to load trail information",
      trail: null
    };
  }
}

export default function TrailRegistration({ loaderData }: Route.ComponentProps) {
  const { trail, error } = loaderData;
  const { trailId } = useParams<{ trailId: string }>();
  const [apiError, setApiError] = useState<string | null>(null);
  
  const handleRegistration = async (horseCount: number) => {
    if (!trailId) {
      return { success: false, error: "Trail ID is required" };
    }
    
    try {
      const registrationData = {
        trailId,
        riderName: "Trail User", // Using a default name since the HorseRegistration component doesn't collect names
        horseCount: horseCount,
        notes: ""
      };
      
      // Use the public registration endpoint instead
      await createPublicRegistration(registrationData);
      return { success: true };
    } catch (err) {
      console.error("Error creating registration:", err);
      let errorMessage = "Failed to register visit";
      
      if (err instanceof Error) {
        if (err.message.includes('Trail not found')) {
          errorMessage = `The trail with ID '${trailId}' does not exist or is no longer active. Please scan a valid QR code or contact the trail administrator.`;
        } else if (err.message.includes('Durable Object ID is not valid')) {
          errorMessage = `There was a problem with the trail ID '${trailId}'. This may be because the QR code is outdated or the trail has been removed.`;
        } else {
          errorMessage = err.message;
        }
      }
      
      setApiError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };
  
  if (error || apiError) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-red-700 dark:text-red-500 mb-4">
            Error Loading Trail
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error || apiError}</p>
          <Link 
            to="/" 
            className="inline-block bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }
  
  if (!trail) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-4">
            Loading Trail Information...
          </h1>
        </div>
      </div>
    );
  }
  
  // Pass the registration handler to the HorseRegistration component
  return <HorseRegistration onSubmitRegistration={handleRegistration} trailInfo={trail} />;
}