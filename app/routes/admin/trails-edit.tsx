import { useRef, useState, useEffect } from "react";
import { Form, Link, useNavigate, useParams } from "react-router";
import type { MetaFunction } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { getTrail, updateTrail, type Trail } from "@/lib/api";
import { TrailButton } from "@/app/components/buttons";

export const meta: MetaFunction = () => {
  return [
    { title: "Edit Trail - Trail Counter" },
    { name: "description", content: "Edit trail details in the Trail Counter system" },
  ];
};

export async function clientLoader({ params }: { params: { trailId: string } }) {
  const { trailId } = params;
  
  // We'll load the trail data in the component using the API
  return { trailId };
}

export function HydrateFallback() {
  return <div>Loading...</div>;
}

export default function TrailsEdit() {
  const navigate = useNavigate();
  const { trailId } = useParams<{ trailId: string }>();
  const { getToken } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const [trail, setTrail] = useState<Trail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch trail data when component mounts
  useEffect(() => {
    const fetchTrail = async () => {
      if (!trailId) return;
      
      try {
        const token = await getToken();
        const trailData = await getTrail(trailId, token || undefined);
        setTrail(trailData);
      } catch (err) {
        console.error("Error fetching trail:", err);
        setError("Failed to load trail data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTrail();
  }, [trailId, getToken]);
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!trailId) {
      setError("Trail ID is missing");
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const token = await getToken();
      if (!formRef.current || !token) return;
      
      const form = formRef.current;
      const data = {
        name: (form.elements.namedItem("name") as HTMLInputElement)?.value ?? "",
        location: (form.elements.namedItem("location") as HTMLInputElement)?.value ?? "",
        description: (form.elements.namedItem("description") as HTMLTextAreaElement)?.value ?? "",
        notes: (form.elements.namedItem("notes") as HTMLTextAreaElement)?.value ?? "",
        active: (form.elements.namedItem("active") as HTMLInputElement)?.checked ?? false,
      };
      
      await updateTrail(trailId, data, token);
      
      navigate("/admin/trails");
    } catch (err) {
      console.error("Error updating trail:", err);
      setError(err instanceof Error ? err.message : "Failed to update trail");
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return <div className="p-4 text-center">Loading trail data...</div>;
  }
  
  return (
    <div>
      <div className="mb-6">
        <Link
          to="/admin/trails"
          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 inline-flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Back to Trails
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 p-4 rounded-md mb-6">
          <h2 className="text-red-800 dark:text-red-200 font-medium">Error</h2>
          <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
        </div>
      )}

      {trail && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
            Edit Trail: {trail.name}
          </h1>
          
          <Form method="post" onSubmit={handleSubmit} className="space-y-6" ref={formRef}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Trail Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                defaultValue={trail.name}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location
              </label>
              <input
                type="text"
                id="location"
                name="location"
                required
                defaultValue={trail.location}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={trail.description}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
              ></textarea>
            </div>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Admin Notes (not visible to riders)
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={trail.notes || ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
              ></textarea>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="active"
                name="active"
                defaultChecked={trail.active}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Trail is active (riders can register)
              </label>
            </div>
            
            <div className="flex gap-4 pt-4">
              <TrailButton
                type="submit"
                disabled={isSaving}
                variant="success"
                loading={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </TrailButton>
              <TrailButton
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/trails')}
              >
                Cancel
              </TrailButton>
            </div>
          </Form>
        </div>
      )}
    </div>
  );
}