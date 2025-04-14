import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "../../../.react-router/types/app/routes/admin/+types/trails";
import { getAllTrails, deleteTrail } from "@/lib/api";
import type { MetaFunction } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { TrailButton } from "@/app/components/buttons";
import { Spinner } from "@/app/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";

// Define Trail interface based on the API responses
interface Trail {
  id: string;
  name: string;
  location: string;
  active: boolean;
  registrationCount?: number;
  horseCount?: number;
  description?: string;
}

export const meta: MetaFunction = () => {
  return [
    { title: "Manage Trails - Trail Counter" },
    { name: "description", content: "Manage trails in the Trail Counter system" },
  ];
}

export async function clientLoader({
  context,
}: Route.ClientLoaderArgs) {
  // We shouldn't try to use React hooks like useAuth() in loader functions
  // The data will be fetched in the component instead
  return {
    trails: [],
    error: null
  };
}

export default function TrailsAdmin({ loaderData }: Route.ComponentProps) {
  const { trails: initialTrails, error: initialError } = loaderData;
  const { getToken } = useAuth();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [trails, setTrails] = useState<Trail[]>(initialTrails);
  const [loading, setLoading] = useState(true); // Set initial loading state to true
  const [error, setError] = useState<string | null>(initialError);
  const navigate = useNavigate();
  
  // State for delete confirmation dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [trailToDelete, setTrailToDelete] = useState<{ id: string, name: string } | null>(null);
  
  // Load trails on component mount
  useEffect(() => {
    async function fetchTrails() {
      try {
        setLoading(true);
        const token = await getToken();
        // Fix the type mismatch by casting token to string | undefined
        const result = await getAllTrails(token || undefined);
        setTrails(result || []);
        setError(null);
      } catch (err) {
        console.error("Error fetching trails:", err);
        // Don't update trails if there's an error to keep existing data
        setError(err instanceof Error ? err.message : "Failed to load trails");
        
        // Specific handling for Durable Object errors
        if (err instanceof Error && err.message.includes("Durable Object ID is not valid")) {
          setError("The trail data could not be loaded due to a system error. This may happen if you've recently reset your database or are missing trails.");
        }
      } finally {
        setLoading(false);
      }
    }
    
    fetchTrails();
  }, [getToken]);
  
  // Open confirmation dialog instead of using browser confirm
  const openDeleteConfirmation = (trailId: string, trailName: string) => {
    setTrailToDelete({ id: trailId, name: trailName });
    setConfirmDialogOpen(true);
  };
  
  // Handle trail deletion with auth token
  const handleDelete = async () => {
    if (!trailToDelete) return;
    
    try {
      setDeleteError(null);
      // Get the Clerk token
      const token = await getToken();
      
      // Use the deleteTrail function from the API library
      if (!token) {
        throw new Error("Authentication required");
      }
      await deleteTrail(trailToDelete.id, token as string);
      
      // Update the UI by removing the deleted trail
      setTrails(prevTrails => prevTrails.filter(trail => trail.id !== trailToDelete.id));
      
      // Close the dialog
      setConfirmDialogOpen(false);
      setTrailToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      
      // Handle Durable Object error specifically
      if (error instanceof Error && error.message.includes("Durable Object ID is not valid")) {
        setDeleteError(`Could not delete the trail "${trailToDelete.name}" due to a system error. Try refreshing the page.`);
      } else {
        setDeleteError(error instanceof Error ? error.message : 'An error occurred while deleting the trail');
      }
      
      // Close the dialog even on error
      setConfirmDialogOpen(false);
      setTrailToDelete(null);
    }
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Manage Trails</h1>
        <TrailButton
          variant="trail"
          size="default"
          asChild
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          }
        >
          <Link to="/admin/trails/new">Add New Trail</Link>
        </TrailButton>
      </div>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 p-4 rounded-md mb-6">
          <h2 className="text-red-800 dark:text-red-200 font-medium">Error Loading Trails</h2>
          <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
        </div>
      )}
      
      {deleteError && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 p-4 rounded-md mb-6">
          <h2 className="text-red-800 dark:text-red-200 font-medium">Error</h2>
          <p className="text-red-700 dark:text-red-300 mt-1">{deleteError}</p>
        </div>
      )}
      
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white dark:bg-gray-800 shadow-sm rounded-lg">
          <div className="flex flex-col items-center">
            <Spinner size="medium" className="mb-4">Loading trails...</Spinner>
          </div>
        </div>
      ) : trails && trails.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Trail Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Location
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Registrations
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Horses
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {trails.map((trail) => (
                  <tr key={trail.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {trail.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {trail.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {trail.active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {trail.registrationCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {trail.horseCount !== undefined ? trail.horseCount : 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                      <div className="flex justify-center space-x-3">
                        <TrailButton
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link
                            to={`/admin/trails/${trail.id}/edit`}
                          >
                            Edit
                          </Link>
                        </TrailButton>
                        
                        <TrailButton
                          variant="secondary"
                          size="sm"
                          asChild
                        >
                          <Link
                            to={`/admin/trails/${trail.id}/qr`}
                          >
                            QR Code
                          </Link>
                        </TrailButton>
                        
                        <TrailButton
                          variant="danger"
                          size="sm"
                          onClick={() => openDeleteConfirmation(trail.id, trail.name)}
                        >
                          Delete
                        </TrailButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No trails have been created yet.</p>
          <TrailButton
            variant="success"
            size="default"
            asChild
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            }
          >
            <Link to="/admin/trails/new">Create Your First Trail</Link>
          </TrailButton>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{trailToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <TrailButton
              variant="outline"
              size="default"
              onClick={() => setConfirmDialogOpen(false)}
            >
              Cancel
            </TrailButton>
            <TrailButton
              variant="danger"
              size="default"
              onClick={handleDelete}
            >
              Delete Trail
            </TrailButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// We're using direct API calls instead of actions since they appear more reliable in this scenario
export async function action({ request }: Route.ActionArgs) {
  // This action is now only used for compatibility, we're handling operations directly in the component
  return { success: true };
}