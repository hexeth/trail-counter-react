import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router";
import { getTrail } from "@/lib/api";
import { useAuth } from "@clerk/clerk-react";
import { TrailButton } from "@/app/components/buttons";
import type { MetaFunction } from "react-router";
import { regenerateQRCode, type Trail } from "@/lib/api";

export const meta: MetaFunction = () => {
  return [
    { title: "Trail QR Code - Trail Counter" },
    { name: "description", content: "Generate and print QR codes for trail registration" },
  ];
}

export function HydrateFallback() {
  return <div className="p-4 text-center">Loading QR code...</div>;
}

export default function TrailQRCode() {
  const { trailId } = useParams<{ trailId: string }>();
  const { getToken } = useAuth();
  const [trail, setTrail] = useState<Trail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("1");
  const [templates, setTemplates] = useState([
    { id: '1', name: 'Standard Template', description: 'Basic QR code with trail name' },
    { id: '2', name: 'Detailed Template', description: 'Includes trail name, location, and description' },
    { id: '3', name: 'Weatherproof Template', description: 'Optimized for outdoor printing and lamination' }
  ]);
  
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
  
  // Fallback QR code URL if no QR code is stored with the trail
  const getFallbackQRUrl = () => {
    if (!trailId) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/register/${trailId}`)}`;
  };
  
  // Get the registration URL for this trail
  const getRegistrationUrl = () => {
    return `${window.location.origin}/register/${trailId}`;
  };
  
  if (isLoading) {
    return <div className="p-4 text-center">Loading QR code...</div>;
  }
  
  if (error || !trail) {
    return (
      <div className="p-4">
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
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 p-4 rounded-md">
          <h2 className="text-red-800 dark:text-red-200 font-medium">Error</h2>
          <p className="text-red-700 dark:text-red-300 mt-1">{error || "Failed to load trail"}</p>
        </div>
      </div>
    );
  }
  
  // Use stored QR code if available, otherwise use fallback
  const qrCodeUrl = trail.qrCodeBase64 || getFallbackQRUrl();
  const registrationUrl = getRegistrationUrl();
  
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            QR Code for {trail.name}
          </h1>
          
          <div className="mb-4">
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              <strong>Location:</strong> {trail.location}
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              {trail.description}
            </p>
          </div>
          
          <div className="flex flex-col items-center bg-white p-6 rounded-lg border border-gray-200 dark:border-gray-700 mx-auto">
            {trail.qrCodeSvg ? (
              <div 
                className="w-64 h-64 mb-4 mx-auto"
                dangerouslySetInnerHTML={{ __html: trail.qrCodeSvg }}
              />
            ) : (
              <img 
                src={qrCodeUrl} 
                alt={`QR Code for ${trail.name}`} 
                className="w-64 h-64 mb-4 mx-auto"
              />
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2 w-full">
              Scan this QR code to register for {trail.name}
            </p>
            <a 
              href={registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline break-all text-center w-full"
            >
              {registrationUrl}
            </a>
          </div>
          
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <TrailButton
              variant="primary"
              className="w-full sm:flex-1 min-w-[140px]"
              onClick={() => {
                // Create a new window with just the QR code and trail info
                const printWindow = window.open('', '_blank');
                if (!printWindow) return;
                
                printWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>QR Code - ${trail.name}</title>
                                <style>
                        body {
                          font-family: Arial, sans-serif;
                          padding: 20px;
                          text-align: center;
                        }
                        .container {
                          max-width: 500px;
                          margin: 0 auto;
                          padding: 20px;
                          border: 1px solid #ccc;
                          border-radius: 8px;
                        }
                        h1 {
                          margin-bottom: 10px;
                          font-size: 24px;
                        }
                        .qr-code {
                          margin: 20px 0;
                        }
                        .qr-code img {
                          width: 300px;
                          height: 300px;
                        }
                        .url {
                          margin-top: 10px;
                          word-break: break-all;
                          color: #333;
                        }
                        .footer {
                          margin-top: 20px;
                          font-size: 12px;
                          color: #666;
                        }
                        @media print {
                          .no-print {
                            display: none;
                          }
                        }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <h1>${trail.name}</h1>
                        <p>${trail.location}</p>
                        <div class="qr-code">
                          ${trail.qrCodeSvg || `<img src="${qrCodeUrl}" alt="QR Code" />`}
                        </div>
                        <p>Scan to register for this trail</p>
                        <p class="url">${registrationUrl}</p>
                        <p class="footer">Generated by Trail Counter on ${new Date().toLocaleDateString()}</p>
                      </div>
                      <div class="no-print" style="margin-top: 20px;">
                        <button onclick="window.print()">Print</button>
                        <button onclick="window.close()">Close</button>
                      </div>
                    </body>
                  </html>
                `);
                printWindow.document.close();
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
              </svg>
              Print QR Code
            </TrailButton>
            <TrailButton
              variant="success"
              className="w-full sm:flex-1 min-w-[140px]"
              onClick={() => {
                // If we have base64 data, use that for download
                if (trail.qrCodeBase64) {
                  const link = document.createElement('a');
                  link.href = trail.qrCodeBase64;
                  link.download = `trail-${trailId}-qr-code.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } else {
                  // Fallback to the QR code service
                  const link = document.createElement('a');
                  link.href = qrCodeUrl;
                  link.download = `trail-${trailId}-qr-code.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Download QR Code
            </TrailButton>
            <TrailButton
              variant="secondary"
              className="w-full sm:flex-1 min-w-[140px]"
              onClick={async () => {
                if (!trailId) return;
                
                try {
                  setRegenerating(true);
                  const token = await getToken();
                  const updatedTrail = await regenerateQRCode(trailId, token || undefined);
                  setTrail(updatedTrail);
                } catch (err) {
                  console.error("Error regenerating QR code:", err);
                  setError("Failed to regenerate QR code");
                } finally {
                  setRegenerating(false);
                }
              }}
              disabled={regenerating}
              loading={regenerating}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Regenerate QR Code
            </TrailButton>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            Print with Template
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Select a template to use when printing your QR code. Templates can include
            additional information and styling optimized for different uses.
          </p>
          
          <div className="space-y-4 mb-6">
            {templates.map(template => (
              <div 
                key={template.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => setSelectedTemplate(template.id)}
              >
                <div className="flex items-start">
                  <input 
                    type="radio" 
                    name="template" 
                    id={`template-${template.id}`} 
                    value={template.id}
                    checked={selectedTemplate === template.id}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                  />
                  <label htmlFor={`template-${template.id}`} className="ml-3 block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{template.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 block mt-1">{template.description}</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <TrailButton
              variant="primary"
              className="w-full justify-center"
              onClick={() => {
                // Create a templated print based on the selected template
                const printWindow = window.open('', '_blank');
                if (!printWindow) return;
                
                let templateHtml = '';
                
                if (selectedTemplate === '1') {
                  // Standard Template
                  templateHtml = `
                    <div class="container standard">
                      <h1>${trail.name}</h1>
                      <div class="qr-code">
                        ${trail.qrCodeSvg || `<img src="${qrCodeUrl}" alt="QR Code" />`}
                      </div>
                      <p>Scan to register</p>
                      <p class="url">${registrationUrl}</p>
                    </div>
                  `;
                } else if (selectedTemplate === '2') {
                  // Detailed Template
                  templateHtml = `
                    <div class="container detailed">
                      <h1>${trail.name}</h1>
                      <p class="location"><strong>Location:</strong> ${trail.location}</p>
                      <p class="description">${trail.description}</p>
                      <div class="qr-code">
                        ${trail.qrCodeSvg || `<img src="${qrCodeUrl}" alt="QR Code" />`}
                      </div>
                      <p class="instructions">Scan this code to register your ride on this trail</p>
                      <p class="url">${registrationUrl}</p>
                      <p class="footer">Please leave no trace and enjoy your ride!</p>
                    </div>
                  `;
                } else if (selectedTemplate === '3') {
                  // Weatherproof Template
                  templateHtml = `
                    <div class="container weatherproof">
                      <h1>${trail.name}</h1>
                      <div class="qr-code large">
                        ${trail.qrCodeSvg || `<img src="${qrCodeUrl}" alt="QR Code" />`}
                      </div>
                      <div class="weatherproof-instructions">
                        <h2>REGISTER YOUR RIDE</h2>
                        <p>SCAN THIS QR CODE</p>
                        <p class="or">OR</p>
                        <p class="url">${registrationUrl}</p>
                      </div>
                    </div>
                  `;
                }
                
                printWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>QR Code - ${trail.name}</title>
                      <style>
                        body {
                          font-family: Arial, sans-serif;
                          padding: 20px;
                          text-align: center;
                        }
                        .container {
                          max-width: 500px;
                          margin: 0 auto;
                          padding: 20px;
                          border: 1px solid #ccc;
                          border-radius: 8px;
                        }
                        h1 {
                          margin-bottom: 10px;
                          font-size: 24px;
                        }
                        .qr-code {
                          margin: 20px 0;
                        }
                        .qr-code img {
                          width: 300px;
                          height: 300px;
                        }
                        .url {
                          margin-top: 10px;
                          word-break: break-all;
                          color: #333;
                        }
                        .footer {
                          margin-top: 20px;
                          font-size: 12px;
                          color: #666;
                        }
                        
                        /* Detailed Template Styles */
                        .detailed .location {
                          font-size: 16px;
                          margin-bottom: 5px;
                        }
                        .detailed .description {
                          font-size: 14px;
                          margin-bottom: 15px;
                        }
                        .detailed .instructions {
                          font-weight: bold;
                          margin-top: 10px;
                        }
                        
                        /* Weatherproof Template Styles */
                        .weatherproof {
                          background-color: #f8f8f8;
                          border: 3px solid #000;
                          max-width: 600px;
                        }
                        .weatherproof h1 {
                          font-size: 28px;
                          background-color: #333;
                          color: white;
                          padding: 10px;
                          margin: -20px -20px 20px -20px;
                        }
                        .weatherproof .large img {
                          width: 350px;
                          height: 350px;
                        }
                        .weatherproof-instructions {
                          margin-top: 20px;
                          background-color: #eee;
                          padding: 15px;
                          border-radius: 8px;
                        }
                        .weatherproof-instructions h2 {
                          margin: 0 0 10px 0;
                          font-size: 22px;
                        }
                        .weatherproof-instructions .or {
                          font-weight: bold;
                          margin: 10px 0;
                        }
                        
                        @media print {
                          .no-print {
                            display: none;
                          }
                        }
                      </style>
                    </head>
                    <body>
                      ${templateHtml}
                      <div class="no-print" style="margin-top: 20px;">
                        <button onclick="window.print()">Print</button>
                        <button onclick="window.close()">Close</button>
                      </div>
                    </body>
                  </html>
                `);
                printWindow.document.close();
              }}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                </svg>
              }
            >
              Print with Template
            </TrailButton>
          </div>
          
          {/* Removed the link to template management, replacing with a coming soon message */}
          <div className="mt-6 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-600 dark:text-gray-300">
            Advanced template management coming soon
          </div>
        </div>
      </div>
    </div>
  );
}