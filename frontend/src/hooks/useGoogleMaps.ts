/**
 * Google Maps Hook
 * Lazy-loads Google Maps JavaScript API following bundle-defer-third-party pattern
 */

import { useEffect, useState, useRef } from "react";

interface UseGoogleMapsReturn {
  isLoaded: boolean;
  loadError: Error | null;
}

let isScriptLoaded = false;
let isScriptLoading = false;
let scriptLoadPromise: Promise<void> | null = null;

export function useGoogleMaps(): UseGoogleMapsReturn {
  const [isLoaded, setIsLoaded] = useState(isScriptLoaded);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    // Already loaded
    if (isScriptLoaded) {
      setIsLoaded(true);
      return;
    }

    // Already loading, wait for it
    if (isScriptLoading && scriptLoadPromise) {
      scriptLoadPromise
        .then(() => {
          if (isMounted.current) {
            setIsLoaded(true);
          }
        })
        .catch((error) => {
          if (isMounted.current) {
            setLoadError(error);
          }
        });
      return;
    }

    // Start loading
    isScriptLoading = true;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      const error = new Error("Google Maps API key no configurada");
      setLoadError(error);
      isScriptLoading = false;
      return;
    }

    scriptLoadPromise = new Promise<void>((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.querySelector(
        `script[src^="https://maps.googleapis.com/maps/api/js"]`
      );

      if (existingScript) {
        isScriptLoaded = true;
        isScriptLoading = false;
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=es`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        isScriptLoaded = true;
        isScriptLoading = false;
        resolve();
      };

      script.onerror = () => {
        isScriptLoading = false;
        const error = new Error("Error al cargar Google Maps");
        reject(error);
      };

      document.head.appendChild(script);
    });

    scriptLoadPromise
      .then(() => {
        if (isMounted.current) {
          setIsLoaded(true);
        }
      })
      .catch((error) => {
        if (isMounted.current) {
          setLoadError(error);
        }
      });

    return () => {
      isMounted.current = false;
    };
  }, []);

  return { isLoaded, loadError };
}
