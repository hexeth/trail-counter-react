interface ComingSoonProps {
  title?: string;
  description?: string;
  featureName?: string;
}

export function ComingSoon({
  title = "Coming Soon",
  description = "This feature is currently under development and will be available soon.",
  featureName,
}: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-6">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-12 w-12 text-blue-600 dark:text-blue-400" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      </div>
      
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
        {featureName ? `${featureName} - ${title}` : title}
      </h1>
      
      <p className="text-gray-600 dark:text-gray-300 max-w-md mb-8">
        {description}
      </p>
      
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-lg p-4 max-w-md">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          We're working hard to bring you this feature. Check back soon for updates!
        </p>
      </div>
    </div>
  );
}