import { useRef, useState } from "react";
import { Form, Link, useNavigate } from "react-router";
import type { MetaFunction } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { createTrail } from "@/lib/api";
import { TrailButton } from "@/app/components/buttons";

export const meta: MetaFunction = () => {
  return [
    { title: "Add New Trail - Trail Counter" },
    { name: "description", content: "Add a new trail to the Trail Counter system" },
  ];
}

export async function clientLoader() {
  return {};
}

export function HydrateFallback() {
  return <div>Loading...</div>;
}

export default function NewTrail() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
  
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
  
      await createTrail(data, token);
      
      // Redirect immediately after successful creation
      navigate("/admin/trails");
    } catch (error) {
      console.error("Error submitting form:", error);
      setIsSubmitting(false);
    }
  };

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

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
          Add New Trail
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
            ></textarea>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              name="active"
              defaultChecked
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label htmlFor="active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Trail is active (riders can register)
            </label>
          </div>
          
          <div className="flex gap-4 pt-4">
            <TrailButton
              type="submit"
              variant="success"
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Trail"}
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
    </div>
  );
}