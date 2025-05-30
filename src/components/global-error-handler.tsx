"use client";

import { useEffect } from "react";

export function GlobalErrorHandler() {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      
      // In development, show more details
      if (process.env.NODE_ENV === "development") {
        console.error("Promise rejection details:", {
          reason: event.reason,
          promise: event.promise,
          stack: event.reason?.stack,
        });
      }
      
      // Prevent the default handling (which would log to console)
      event.preventDefault();
      
      // You could also send this to an error reporting service here
      // Example: errorReportingService.captureException(event.reason);
    };

    // Handle uncaught errors
    const handleError = (event: ErrorEvent) => {
      console.error("Uncaught error:", event.error);
      
      if (process.env.NODE_ENV === "development") {
        console.error("Error details:", {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error,
        });
      }
      
      // You could also send this to an error reporting service here
      // Example: errorReportingService.captureException(event.error);
    };

    // Add event listeners
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    // Cleanup
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null; // This component doesn't render anything
}
