import { Link } from "react-router";
import type { Route } from "../../../.react-router/types/app/routes/admin/+types/index";
import type { MetaFunction } from "react-router";
import { getAllTrails, getStatistics, getRegistrationData } from "@/lib/api";
import { useAuth } from "@clerk/clerk-react";
import { TrailButton } from "@/app/components/buttons";
import * as React from "react";
import type { RegistrationTableItem } from "@/lib/api";
import { DataTable } from "../../components/data-table/data-table";
import { columns } from "../../components/data-table/columns";
import { getCurrentLocalDate } from "@/app/lib/utils";
import { Spinner } from "@/app/components/ui/spinner";

export const meta: MetaFunction = () => {
  return [
    { title: "Admin Dashboard - Trail Counter" },
    { name: "description", content: "Admin dashboard for Trail Counter" },
  ];
}

export async function clientLoader({ context }: Route.ClientLoaderArgs) {
  try {
    // Return empty initial data - we'll load everything in the component
    return {
      stats: {
        totalTrails: 0,
        totalRegistrations: 0,
        registrationsToday: 0,
        activeTrails: 0
      },
      recentRegistrations: [] as RegistrationTableItem[],
      tablePagination: {
        pageIndex: 1,
        pageSize: 10,
        pageCount: 1,
        hasNextPage: false,
        hasPrevPage: false
      },
      error: null
    };
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    return {
      stats: {
        totalTrails: 0,
        totalRegistrations: 0,
        registrationsToday: 0,
        activeTrails: 0
      },
      recentRegistrations: [],
      tablePagination: {
        pageIndex: 1,
        pageSize: 10,
        pageCount: 1,
        hasNextPage: false,
        hasPrevPage: false
      },
      error: error instanceof Error ? error.message : "Failed to load dashboard data"
    };
  }
}

export default function AdminDashboard({ loaderData }: Route.ComponentProps) {
  const { stats, error } = loaderData;
  const { getToken } = useAuth();
  const [dashboardData, setDashboardData] = React.useState({
    stats,
    recentRegistrations: [] as RegistrationTableItem[],
    tablePagination: loaderData.tablePagination,
    error
  });
  const [loading, setLoading] = React.useState(true);
  
  // Reference to handle registration deletion event
  const registrationDeleteListener = React.useRef<((e: any) => void) | null>(null);

  // Fetch detailed statistics and recent registrations when component mounts
  React.useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const token = await getToken();
        
        if (!token) {
          throw new Error("Authentication required");
        }
        
        // Fetch statistics
        const statistics = await getStatistics(token);
        
        // Fetch recent registrations (limit to 10)
        const recentRegistrationsResponse = await getRegistrationData(token, 1, 10);
        
        // Get today's date in local timezone in YYYY-MM-DD format
        const today = getCurrentLocalDate();
        
        // Calculate today's registrations from the recent registrations data
        // This is more reliable than using statistics.registrationsByDate
        const registrationsToday = recentRegistrationsResponse.data.filter(reg => {
          // Compare to the date property (already in local timezone from the backend)
          return reg.date === today;
        }).length;
        
        // Update stats with real data
        setDashboardData({
          stats: {
            totalTrails: statistics.totalTrails,
            totalRegistrations: statistics.totalRegistrations,
            registrationsToday: registrationsToday,
            activeTrails: statistics.activeTrails
          },
          recentRegistrations: recentRegistrationsResponse.data,
          tablePagination: {
            pageIndex: recentRegistrationsResponse.pagination.page,
            pageSize: recentRegistrationsResponse.pagination.limit,
            pageCount: recentRegistrationsResponse.pagination.totalPages,
            hasNextPage: recentRegistrationsResponse.pagination.hasNextPage,
            hasPrevPage: recentRegistrationsResponse.pagination.hasPrevPage
          },
          error: null
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        // Keep the basic stats but show the error
        setDashboardData({
          ...dashboardData,
          error: error instanceof Error ? error.message : "Failed to load dashboard data"
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardData();
    
    // Setup event listener for registration deletion
    registrationDeleteListener.current = async (e: CustomEvent) => {
      if (e.detail && e.detail.registrationId) {
        try {
          // This would handle any delete event from the DataTable
          // We would need to implement an actual deleteRegistration function
          // and then refresh the data
          console.log(`Registration delete requested: ${e.detail.registrationId}`);
          fetchDashboardData();
        } catch (error) {
          console.error("Error deleting registration:", error);
        }
      }
    };
    
    // Add event listener
    document.addEventListener('delete-registration', 
      registrationDeleteListener.current as EventListener);
    
    // Clean up
    return () => {
      if (registrationDeleteListener.current) {
        document.removeEventListener('delete-registration', 
          registrationDeleteListener.current as EventListener);
      }
    };
  }, [getToken]);
  
  // Handle page change for the data table
  const handlePaginationChange = async (pageIndex: number, pageSize: number) => {
    try {
      setLoading(true);
      const token = await getToken();
      
      if (!token) {
        throw new Error("Authentication required");
      }
      
      const response = await getRegistrationData(token, pageIndex, pageSize);
      
      setDashboardData(prev => ({
        ...prev,
        recentRegistrations: response.data        
      }))
    } catch (error) {
      console.error("Error fetching registration data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to format date with local timezone
  const formatDate = (dateString: string) => {
    return formatLocalDateTime(dateString);
  };
  
  // Function to format date and time with local timezone
  const formatLocalDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(navigator.language, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };
  
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Welcome to the Trail Counter administration panel.
        </p>
      </div>
      
      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
          <h3 className="text-sm uppercase font-medium text-gray-500 dark:text-gray-400">Total Trails</h3>
          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{dashboardData.stats.totalTrails}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
          <h3 className="text-sm uppercase font-medium text-gray-500 dark:text-gray-400">Total Registrations</h3>
          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{dashboardData.stats.totalRegistrations}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
          <h3 className="text-sm uppercase font-medium text-gray-500 dark:text-gray-400">Today's Registrations</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-500 mt-2">{dashboardData.stats.registrationsToday}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
          <h3 className="text-sm uppercase font-medium text-gray-500 dark:text-gray-400">Active Trails</h3>
          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{dashboardData.stats.activeTrails}</p>
        </div>
      </div>
      
      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TrailButton
            variant="success"
            size="lg"
            asChild
            className="w-full justify-center"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            }
          >
            <Link to="/admin/trails/new" className="w-full justify-center">Add New Trail</Link>
          </TrailButton>
          
          <TrailButton
            variant="primary"
            size="lg"
            asChild
            className="w-full justify-center"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            }
          >
            <Link to="/admin/statistics" className="w-full justify-center">View Statistics</Link>
          </TrailButton>
          
          {/* Removed the templates link from quick actions */}
        </div>
      </div>
      
      {/* Recent registrations */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Recent Registrations</h2>
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Spinner className="mx-auto mb-2">Loading Registration Data</Spinner>
            </div>
          ) : dashboardData.error ? (
            <div className="p-8 text-center text-red-500">
              {dashboardData.error}
            </div>
          ) : dashboardData.recentRegistrations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No registrations found.
            </div>
          ) : (
            <div className="px-6 py-4">
              <DataTable
                columns={columns}
                data={dashboardData.recentRegistrations}
              />
            </div>
          )}
          
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <Link
              to="/admin/statistics"
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all registrations →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}