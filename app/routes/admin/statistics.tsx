import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Link } from 'react-router';
import { getAnalyticsData } from '@/lib/api';
import type { AnalyticsData, AnalyticsTimeEntry } from '@/lib/api';
import { TrailButton } from '@/app/components/buttons';
import { Spinner } from '@/app/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { formatLocalDate } from '@/app/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

// Helper function to create date filters for time periods
function getDateRangeForPeriod(period: string): { startDate?: string, endDate?: string } {
  const today = new Date();
  let startDate: Date | undefined;
  
  switch (period) {
    case 'last7days':
      startDate = new Date();
      startDate.setDate(today.getDate() - 6); // Last 7 days including today
      break;
    case 'last30days':
      startDate = new Date();
      startDate.setDate(today.getDate() - 29); // Last 30 days including today
      break;
    case 'last90days':
      startDate = new Date();
      startDate.setDate(today.getDate() - 89); // Last 90 days including today
      break;
    case 'thisYear':
      startDate = new Date(today.getFullYear(), 0, 1); // Jan 1st of current year
      break;
    case 'all':
      return { startDate: undefined, endDate: undefined };
    default:
      return { startDate: undefined, endDate: undefined };
  }
  
  return {
    startDate: startDate ? formatLocalDate(startDate.toISOString()) : undefined,
    endDate: formatLocalDate(today.toISOString())
  };
}

export default function Statistics() {
  const { getToken } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  
  // Filters
  const [trailFilter, setTrailFilter] = useState<string | undefined>(undefined);
  const [timePeriod, setTimePeriod] = useState('last30days'); // Default to last 30 days
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [selectedView, setSelectedView] = useState('daily'); // 'daily', 'weekly', 'monthly'
  
  // Available trails for filtering
  const [availableTrails, setAvailableTrails] = useState<string[]>([]);
  
  // Loading state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Reference to store if component is mounted
  const isMounted = React.useRef(true);

  // Set initial date range based on default time period
  useEffect(() => {
    const { startDate: start, endDate: end } = getDateRangeForPeriod(timePeriod);
    setStartDate(start);
    setEndDate(end);
  }, [timePeriod]);
  
  // Load analytics data only - we can extract trail names from it
  useEffect(() => {
    let isCancelled = false;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = await getToken();
        if (!token) {
          if (!isCancelled) {
            setError("Authentication error. Please sign in again.");
            setLoading(false);
          }
          return;
        }
        
        try {
          const analytics = await getAnalyticsData(token);
          
          if (isCancelled) return;
          
          if (!analytics) {
            setError("No statistics data available.");
            setLoading(false);
            return;
          }
          
          // Set analytics data
          setAnalyticsData(analytics);
          
          // Extract trail names from the analytics data
          if (analytics.byTrail && Object.keys(analytics.byTrail).length > 0) {
            const trailNames = Object.keys(analytics.byTrail);
            setAvailableTrails(trailNames);
            
            // Default to "all" for trail filter
            setTrailFilter('all');
          } else {
            setAvailableTrails([]);
          }
          
          // Done loading
          setLoading(false);
        } catch (apiError) {
          if (!isCancelled) {
            setError(`Failed to load statistics: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
            setLoading(false);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setError(`Failed to load statistics: ${err instanceof Error ? err.message : String(err)}`);
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    // Cleanup
    return () => {
      isCancelled = true;
    };
  }, []);
  
  // Ensure trailFilter is properly set
  useEffect(() => {
    // Make sure trail filter is properly set when availableTrails changes
    if (availableTrails.length > 0 && (!trailFilter || trailFilter === undefined)) {
      setTrailFilter('all');
    }
  }, [availableTrails, trailFilter]);
  
  // Filter data whenever filters or analytics data changes
  useEffect(() => {
    if (!analyticsData) {
      return;
    }
    
    try {
      // Get the correct time period data
      let timeEntries: AnalyticsTimeEntry[] = [];
      
      switch (selectedView) {
        case 'daily':
          timeEntries = analyticsData.daily ? [...analyticsData.daily] : [];
          break;
        case 'weekly':
          timeEntries = analyticsData.weekly ? [...analyticsData.weekly] : [];
          break;
        case 'monthly':
          timeEntries = analyticsData.monthly ? [...analyticsData.monthly] : [];
          break;
      }
      
      // Helper function to convert date strings to timestamp for comparison
      const parseDate = (dateStr: string): number => {
        try {
          // Check if this is a week key (YYYY-W##)
          if (/^\d{4}-W\d{1,2}$/.test(dateStr)) {
            // Extract year and week number
            const [year, weekPart] = dateStr.split('-');
            const weekNum = parseInt(weekPart.substring(1), 10);
            
            // Create a date for Jan 1 of that year
            const januaryFirst = new Date(parseInt(year, 10), 0, 1);
            
            // Calculate days to add (weeks * 7 - adjustment for first day of year)
            // Adjust for day of week of January 1
            const dayOfWeek = januaryFirst.getDay(); // 0 = Sunday, 1 = Monday, etc.
            const daysToAdd = weekNum * 7 - (dayOfWeek || 7) + 1;
            
            // Create the date for the first day of the requested week
            const resultDate = new Date(parseInt(year, 10), 0, daysToAdd);
            return resultDate.getTime();
          }
          
          // Check if the date is in ISO format (YYYY-MM-DD from API)
          if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            return new Date(dateStr).getTime();
          }
          
          // Check if this is a month key (YYYY-MM)
          if (/^\d{4}-\d{2}$/.test(dateStr)) {
            const [year, month] = dateStr.split('-');
            return new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1).getTime();
          }
          
          // Handle formatted date strings like "Mar 15, 2025"
          return new Date(dateStr).getTime();
        } catch (err) {
          return 0;
        }
      };
      
      // Helper function to format a Date object to YYYY-MM-DD
      const formatDateToYYYYMMDD = (date: Date): string => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // Apply date filtering if specified
      let filteredByDate = [...timeEntries];
      
      if (startDate) {
        const startTimestamp = parseDate(startDate);
        
        filteredByDate = filteredByDate.filter(entry => {
          // For weekly data with "This year" filter, check the actual year in the timeKey
          if (selectedView === 'weekly' && timePeriod === 'thisYear') {
            const [entryYear] = entry.timeKey.split('-');
            const currentYear = new Date().getFullYear().toString();
            // Only include weeks from the current year
            if (entryYear !== currentYear) {
              return false;
            }
          }
          
          const entryTimestamp = parseDate(entry.timeKey);
          return entryTimestamp >= startTimestamp;
        });
      }
      
      if (endDate) {
        const endTimestamp = parseDate(endDate);
        
        filteredByDate = filteredByDate.filter(entry => {
          const entryTimestamp = parseDate(entry.timeKey);
          return entryTimestamp <= endTimestamp;
        });
      }
      
      // For daily view with specific date range, create entries for all days in the range
      if (selectedView === 'daily' && startDate && endDate && 
          (timePeriod === 'last7days' || timePeriod === 'last30days' || timePeriod === 'last90days')) {
        
        // Create Map of existing entries by date for quick lookup
        const entriesByDate = new Map<string, AnalyticsTimeEntry>();
        filteredByDate.forEach(entry => {
          entriesByDate.set(entry.timeKey, entry);
        });
        
        // Generate entries for all days in the date range
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        const completeEntries: AnalyticsTimeEntry[] = [];
        
        // Get trail names to include in empty entries
        let trailNames: string[] = [];
        if (trailFilter && trailFilter !== 'all') {
          trailNames = [trailFilter];
        } else if (availableTrails.length > 0) {
          trailNames = [...availableTrails];
        }
        
        // Iterate through all days in the range
        for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
          const dateKey = formatDateToYYYYMMDD(d);
          
          // If we have an entry for this date, use it
          if (entriesByDate.has(dateKey)) {
            completeEntries.push(entriesByDate.get(dateKey)!);
          } else {
            // Otherwise create an empty entry
            const emptyEntry: AnalyticsTimeEntry = {
              timeKey: dateKey,
              label: dateKey,
              totalRegistrations: 0,
              totalHorses: 0,
              byTrail: {}
            };
            
            // Add empty data for each trail
            trailNames.forEach(trail => {
              emptyEntry.byTrail[trail] = {
                horseCount: 0,
                registrationCount: 0
              };
            });
            
            completeEntries.push(emptyEntry);
          }
        }
        
        // Replace the filtered entries with our complete set
        filteredByDate = completeEntries;
      }
      
      // Process the data for visualization
      const processedEntries = filteredByDate.map(entry => {
        // Start with the base entry properties
        const result: any = {
          date: entry.timeKey,
          label: entry.label,
          horseCount: entry.totalHorses || 0,
          registrationCount: entry.totalRegistrations || 0
        };
        
        // Add trail-specific data
        if (trailFilter && trailFilter !== 'all') {
          // If a specific trail is selected, only include that trail's data
          const trailData = entry.byTrail ? entry.byTrail[trailFilter] : null;
          if (trailData) {
            const safeTrailKey = encodeURIComponent(trailFilter).replace(/%/g, '_');
            result[`${safeTrailKey}_horses`] = trailData.horseCount || 0;
            result[`${safeTrailKey}_registrations`] = trailData.registrationCount || 0;
          }
        } else {
          // Otherwise, include data for all trails
          if (entry.byTrail) {
            Object.entries(entry.byTrail).forEach(([trailName, trailData]) => {
              if (trailData) {
                const safeTrailKey = encodeURIComponent(trailName).replace(/%/g, '_');
                result[`${safeTrailKey}_horses`] = trailData.horseCount || 0;
                result[`${safeTrailKey}_registrations`] = trailData.registrationCount || 0;
              }
            });
          }
        }
        
        return result;
      });
      
      // Sort by date/key - ensure chronological sorting especially for weekly data
      if (selectedView === 'weekly') {
        // For weekly data, sort by year and week number
        processedEntries.sort((a, b) => {
          // Extract year and week number from timeKey format YYYY-W##
          const [yearA, weekPartA] = a.date.split('-');
          const [yearB, weekPartB] = b.date.split('-');
          
          // Get the week numbers
          const weekNumA = parseInt(weekPartA.substring(1), 10);
          const weekNumB = parseInt(weekPartB.substring(1), 10);
          
          // First, compare years
          const yearDiff = parseInt(yearA, 10) - parseInt(yearB, 10);
          if (yearDiff !== 0) {
            return yearDiff;
          }
          
          // If same year, compare week numbers
          return weekNumA - weekNumB;
        });
      } else {
        // For daily and monthly data, lexicographical sort is fine
        processedEntries.sort((a, b) => a.date.localeCompare(b.date));
      }
      
      setFilteredData(processedEntries);
    } catch (error) {
      // Set empty data but don't crash
      setFilteredData([]);
    }
  }, [analyticsData, selectedView, startDate, endDate, trailFilter, availableTrails]);
  
  // Handle filter submission (now just updates state variables)
  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filtering is handled reactively in useEffect
  };
  
  // Reset filters
  const resetFilters = () => {
    setTrailFilter(undefined);
    setTimePeriod('last30days');
    const { startDate: start, endDate: end } = getDateRangeForPeriod('last30days');
    setStartDate(start);
    setEndDate(end);
  };
  
  // Handle time period change
  const handleTimePeriodChange = (value: string) => {
    setTimePeriod(value);
    const { startDate: start, endDate: end } = getDateRangeForPeriod(value);
    setStartDate(start);
    setEndDate(end);
  };
  
  // Calculate summary statistics based on filtered data
  const statistics = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        totalHorses: 0,
        totalRegistrations: 0,
        avgHorsesPerRegistration: 0,
        uniqueTrails: []
      };
    }
    
    // Calculate totals
    const totalHorses = filteredData.reduce((sum, entry) => sum + entry.horseCount, 0);
    const totalRegistrations = filteredData.reduce((sum, entry) => sum + entry.registrationCount, 0);
    
    // Get unique trails
    const uniqueTrailsSet = new Set<string>();
    
    filteredData.forEach(entry => {
      // Extract trail names from the properties
      Object.keys(entry).forEach(key => {
        if (key.includes('_horses')) {
          const trailName = key.replace('_horses', '');
          uniqueTrailsSet.add(trailName);
        }
      });
    });
    
    return {
      totalHorses,
      totalRegistrations,
      avgHorsesPerRegistration: totalRegistrations ? totalHorses / totalRegistrations : 0,
      uniqueTrails: Array.from(uniqueTrailsSet)
    };
  }, [filteredData]);
  
  // Get the appropriate dataset based on selected view
  const getViewData = () => filteredData;
  
  // Get the appropriate label for X axis based on selected view
  const getXAxisDataKey = () => {
    switch (selectedView) {
      case 'daily':
        return 'date';
      case 'weekly':
      case 'monthly':
        return 'label';
      default:
        return 'date';
    }
  };
  
  // Get chart title based on filter selections
  const getChartTitle = () => {
    let title = 'Horse Trail Usage';
    
    if (trailFilter && trailFilter !== 'all') {
      title += ` - ${trailFilter}`;
    }
    
    switch (selectedView) {
      case 'daily':
        title += ' (Daily)';
        break;
      case 'weekly':
        title += ' (Weekly)';
        break;
      case 'monthly':
        title += ' (Monthly)';
        break;
    }
    
    return title;
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Trail Usage Statistics</h1>
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
            <Link to="/admin/data">View Raw Data</Link>
          </TrailButton>
        </div>
      </div>
      
      {/* Statistics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-amber-800">Total Horses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statistics.totalHorses}</div>
            <p className="text-sm text-muted-foreground">During selected period</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-amber-800">Total Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statistics.totalRegistrations}</div>
            <p className="text-sm text-muted-foreground">During selected period</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-amber-800">Avg. Horses per Registration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statistics.avgHorsesPerRegistration.toFixed(1)}</div>
            <p className="text-sm text-muted-foreground">During selected period</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Filter Statistics</h2>
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="trailFilter" className="block text-sm font-medium mb-1">
              Trail
            </label>
            <Select value={trailFilter ?? "all"} onValueChange={(value) => setTrailFilter(value === "all" ? "all" : value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Trails" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trails</SelectItem>
                {availableTrails.map((trail) => (
                  <SelectItem key={trail} value={trail}>{trail}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label htmlFor="timePeriod" className="block text-sm font-medium mb-1">
              Time Period
            </label>
            <Select value={timePeriod} onValueChange={handleTimePeriodChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
                <SelectItem value="last90days">Last 90 Days</SelectItem>
                <SelectItem value="thisYear">This Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label htmlFor="viewType" className="block text-sm font-medium mb-1">
              View
            </label>
            <Select value={selectedView} onValueChange={setSelectedView}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
      </div>
      
      {/* Charts */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{getChartTitle()}</h2>
        
        {loading ? (
          <Spinner size="medium" className="mx-auto">
            Loading statistics...
          </Spinner>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            {error}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No data available for the selected filters.
          </div>
        ) : (
          <div className="space-y-8">
            {/* Horse Count Chart */}
            <div>
              <h3 className="text-lg font-medium mb-4">Horse Count</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={filteredData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey={getXAxisDataKey()} 
                      angle={-45} 
                      textAnchor="end" 
                      height={70}
                    />
                    <YAxis label={{ value: 'Horse Count', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        // Format tooltip based on whether it's a trail-specific bar
                        if (name.includes('_horses')) {
                          const trailName = decodeURIComponent(name.replace('_horses', '').replace(/_/g, '%'));
                          return [`${value} horses`, trailName];
                        }
                        return [value, name === 'horseCount' ? 'Total Horses' : name];
                      }}
                    />
                    <Legend 
                      formatter={(value: string) => {
                        // Format legend labels for trail-specific bars
                        if (value.includes('_horses')) {
                          return decodeURIComponent(value.replace('_horses', '').replace(/_/g, '%'));
                        }
                        return value === 'horseCount' ? 'Total Horses' : value;
                      }}
                      verticalAlign="top"
                      height={36}
                    />
                    
                    {/* Always show the total horses bar */}
                    <Bar dataKey="horseCount" name="horseCount" fill="#d97706" />
                    
                    {/* If viewing all trails, also show individual trail bars */}
                    {trailFilter === 'all' && statistics.uniqueTrails.map((trail, index) => {
                      // Generate a unique color for each trail
                      const hue = (index * 30) % 360;
                      // Create safe property key
                      const safeTrailKey = encodeURIComponent(trail).replace(/%/g, '_');
                      // Only add if the key exists in the data
                      const keyExists = filteredData.some(entry => `${safeTrailKey}_horses` in entry);
                      if (keyExists) {
                        return (
                          <Bar 
                            key={trail} 
                            dataKey={`${safeTrailKey}_horses`} 
                            name={`${safeTrailKey}_horses`}
                            fill={`hsl(${hue}, 70%, 50%)`}
                          />
                        );
                      }
                      return null;
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Registration Count Chart */}
            <div>
              <h3 className="text-lg font-medium mb-4">Registration Count</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={filteredData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey={getXAxisDataKey()} 
                      angle={-45} 
                      textAnchor="end" 
                      height={70}
                    />
                    <YAxis label={{ value: 'Registration Count', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        // Format tooltip based on whether it's a trail-specific line
                        if (name.includes('_registrations')) {
                          const trailName = decodeURIComponent(name.replace('_registrations', '').replace(/_/g, '%'));
                          return [`${value} registrations`, trailName];
                        }
                        return [value, name === 'registrationCount' ? 'Total Registrations' : name];
                      }}
                    />
                    <Legend 
                      formatter={(value: string) => {
                        // Format legend labels for trail-specific lines
                        if (value.includes('_registrations')) {
                          return decodeURIComponent(value.replace('_registrations', '').replace(/_/g, '%'));
                        }
                        return value === 'registrationCount' ? 'Total Registrations' : value;
                      }}
                    />
                    
                    {/* Always show the total registrations line */}
                    <Line 
                      type="monotone" 
                      dataKey="registrationCount" 
                      name="registrationCount" 
                      stroke="#78350f" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    
                    {/* If viewing all trails, also show individual trail lines */}
                    {trailFilter === 'all' && statistics.uniqueTrails.map((trail, index) => {
                      // Generate a unique color for each trail
                      const hue = (index * 30) % 360;
                      // Create safe property key
                      const safeTrailKey = encodeURIComponent(trail).replace(/%/g, '_');
                      // Only add if the key exists in the data
                      const keyExists = filteredData.some(entry => `${safeTrailKey}_registrations` in entry);
                      if (keyExists) {
                        return (
                          <Line 
                            key={trail} 
                            type="monotone"
                            dataKey={`${safeTrailKey}_registrations`} 
                            name={`${safeTrailKey}_registrations`}
                            stroke={`hsl(${hue}, 70%, 50%)`}
                            strokeWidth={1.5}
                            dot={{ r: 3 }}
                          />
                        );
                      }
                      return null;
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}