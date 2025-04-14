import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Link } from 'react-router';
import { getRegistrationData, deleteRegistration, flushAllRegistrations } from '@/lib/api';
import type { RegistrationTableItem } from '@/lib/api';
import { DataTable } from '../../components/data-table/data-table';
import { columns } from '../../components/data-table/columns';
import { ConfirmDialog } from '../../components/confirm-dialog';
import { TrailButton } from '@/app/components/buttons';
import { formatLocalDate, formatLocalDateTime } from '@/app/lib/utils';
import { Spinner } from '@/app/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

export default function Data() {
  const { getToken } = useAuth();
  const [registrations, setRegistrations] = useState<RegistrationTableItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  
  // Available page size options
  const pageSizeOptions = [10, 25, 50, 100];
  
  // Filters
  const [trailFilter, setTrailFilter] = useState<string | undefined>(undefined);
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  
  // Loading state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  
  // Confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  
  // Flush all confirmation dialog state
  const [flushAllConfirmOpen, setFlushAllConfirmOpen] = useState(false);
  const [flushLoading, setFlushLoading] = useState(false);
  
  // Load registration data with pagination
  const loadRegistrationData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      
      const response = await getRegistrationData(
        token, 
        pagination.page, 
        pagination.limit, 
        trailFilter, 
        startDate, 
        endDate
      );
      
      // Transform the timestamps to localized format for display
      const localizedRegistrations = response.data.map(reg => ({
        ...reg,
        formattedDate: formatLocalDate(reg.timestamp),
        formattedTimestamp: formatLocalDateTime(reg.timestamp),
      }));
      
      setRegistrations(localizedRegistrations);
      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      console.error("Failed to load registration data:", err);
      setError("Failed to load registration data. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Handle showing delete confirmation dialog
  const openDeleteConfirmation = (registrationId: string) => {
    setDeleteTarget(registrationId);
    setDeleteConfirmOpen(true);
  };
  
  // Handle registration deletion
  const handleDeleteRegistration = async (registrationId: string) => {
    setDeleteLoading(registrationId);
    try {
      const token = await getToken();
      if (!token) return;
      
      await deleteRegistration(registrationId, token);
      
      // Reload the data after successful deletion
      loadRegistrationData();
    } catch (err) {
      console.error("Error deleting registration:", err);
      setError("Failed to delete registration. Please try again.");
    } finally {
      setDeleteLoading(null);
    }
  };
  
  // Handle flush all registrations
  const handleFlushAllRegistrations = async () => {
    setFlushLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      
      await flushAllRegistrations(token);
      
      // Reset to page 1 and reload data
      setPagination(prev => ({ ...prev, page: 1 }));
      loadRegistrationData();
      setError(null);
    } catch (err) {
      console.error("Error flushing all registrations:", err);
      setError("Failed to flush all registrations. Please try again.");
    } finally {
      setFlushLoading(false);
      setFlushAllConfirmOpen(false);
    }
  };
  
  useEffect(() => {
    loadRegistrationData();
  }, [pagination.page, pagination.limit]);
  
  // Add event listener for delete registration events
  useEffect(() => {
    const handleDeleteEvent = (event: CustomEvent<{ registrationId: string }>) => {
      // Prevent default behavior to avoid system confirmation dialog
      event.preventDefault();
      openDeleteConfirmation(event.detail.registrationId);
    };
    
    // Add event listener
    document.addEventListener('delete-registration', handleDeleteEvent as EventListener);
    
    // Cleanup
    return () => {
      document.removeEventListener('delete-registration', handleDeleteEvent as EventListener);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Handle filter form submission
  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset to page 1 when applying filters
    setPagination(prev => ({ ...prev, page: 1 }));
    loadRegistrationData();
  };
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };
  
  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    setPagination(prev => ({ 
      ...prev, 
      page: 1, // Reset to first page when changing page size
      limit: newPageSize 
    }));
  };
  
  // Handle pagination change from the DataTable component
  const handlePaginationChange = (newPage: number, newPageSize?: number) => {
    if (newPageSize && newPageSize !== pagination.limit) {
      handlePageSizeChange(newPageSize);
    } else {
      handlePageChange(newPage);
    }
  };
  
  // Reset filters
  const resetFilters = () => {
    setTrailFilter(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    setPagination(prev => ({ ...prev, page: 1 }));
    // Reload data without filters
    loadRegistrationData();
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Registration Data</h1>
        <div className="flex flex-wrap gap-2">
          <TrailButton 
            variant="primary" 
            asChild
          >
            <Link to="/admin/trails">View Trails</Link>
          </TrailButton>
          <TrailButton
            variant="secondary"
            asChild
          >
            <Link to="/admin/statistics">View Statistics</Link>
          </TrailButton>
          <TrailButton
            variant="danger"
            onClick={() => setFlushAllConfirmOpen(true)}
            disabled={flushLoading}
            loading={flushLoading}
          >
            Flush All Registrations
          </TrailButton>
        </div>
      </div>
      
      {/* Filter Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Filter Registrations</h2>
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="trailFilter" className="block text-sm font-medium mb-1">
              Trail Name
            </label>
            <input
              type="text"
              id="trailFilter"
              value={trailFilter || ''}
              onChange={(e) => setTrailFilter(e.target.value || undefined)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Filter by trail"
            />
          </div>
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium mb-1">
              Start Date (Local Timezone)
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate || ''}
              onChange={(e) => setStartDate(e.target.value || undefined)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium mb-1">
              End Date (Local Timezone)
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate || ''}
              onChange={(e) => setEndDate(e.target.value || undefined)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div className="flex items-end gap-2">
            <TrailButton
              variant="primary"
              type="submit"
            >
              Apply Filters
            </TrailButton>
            <TrailButton
              variant="outline"
              type="button"
              onClick={resetFilters}
            >
              Reset
            </TrailButton>
          </div>
        </form>
      </div>
      
      {/* Registration Table */}
      <div className="bg-white rounded-lg shadow p-6">
        {loading ? (
          <div className="p-8 text-center">
            <Spinner className="mx-auto mb-2">Loading registration data...</Spinner>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            {error}
          </div>
        ) : registrations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No registrations found. Try adjusting your filters.
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
              <div className="text-sm text-gray-500">
                {pagination.totalItems > 0 ? (
                  <>Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.totalItems)} to {Math.min(pagination.page * pagination.limit, pagination.totalItems)} of {pagination.totalItems} registrations</>
                ) : (
                  <>No registrations found</>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 whitespace-nowrap">Rows per page:</span>
                <Select
                  value={pagination.limit.toString()}
                  onValueChange={(value) => handlePageSizeChange(Number(value))}
                >
                  <SelectTrigger className="w-[70px]">
                    <SelectValue placeholder={pagination.limit.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    {pageSizeOptions.map((option) => (
                      <SelectItem key={option} value={option.toString()}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DataTable 
              columns={columns} 
              data={registrations}
              pagination={{
                pageIndex: pagination.page,
                pageSize: pagination.limit,
                pageCount: pagination.totalPages,
                hasNextPage: pagination.hasNextPage,
                hasPrevPage: pagination.hasPrevPage,
                totalItems: pagination.totalItems
              }}
              onPaginationChange={handlePaginationChange}
            />
          </>
        )}
      </div>
      
      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          if (deleteTarget) {
            handleDeleteRegistration(deleteTarget);
            setDeleteConfirmOpen(false);
          }
        }}
        title="Delete Registration"
        description="Are you sure you want to delete this registration? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
      
      {/* Flush All Confirmation Dialog */}
      <ConfirmDialog
        isOpen={flushAllConfirmOpen}
        onClose={() => setFlushAllConfirmOpen(false)}
        onConfirm={handleFlushAllRegistrations}
        title="⚠️ Flush All Registrations ⚠️"
        description="WARNING: This action will permanently delete ALL registration data from all trails. This is irreversible and cannot be undone. Are you absolutely sure you want to proceed? This will delete all historical data."
        confirmText="Yes, Delete All Registration Data"
        variant="destructive"
      />
    </div>
  );
}