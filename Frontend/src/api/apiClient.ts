// src/api/apiClient.ts
import axios from "axios";

// Create a service factory function
const createServiceClient = (serviceUrl: string) => {
  const client = axios.create({
    baseURL: serviceUrl,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Add request interceptor for authentication
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Add response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Handle unauthorized access
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );

  return client;
};

// Create clients for each service
export const identityService = createServiceClient(
  import.meta.env.VITE_IDENTITY_SERVICE_URL || "http://localhost:8000"
);

export const patientService = createServiceClient(
  import.meta.env.VITE_PATIENT_SERVICE_URL || "http://localhost:8001"
);

export const doctorService = createServiceClient(
  import.meta.env.VITE_DOCTOR_SERVICE_URL || "http://localhost:8002"
);

export const pharmacistService = createServiceClient(
  import.meta.env.VITE_PHARMACIST_SERVICE_URL || "http://localhost:8003"
);

export const nurseService = createServiceClient(
  import.meta.env.VITE_NURSE_SERVICE_URL || "http://localhost:8005"
);

export const labService = createServiceClient(
  import.meta.env.VITE_LAB_SERVICE_URL || "http://localhost:8006"
);

export const medicalRecordsService = createServiceClient(
  import.meta.env.VITE_MEDICAL_RECORDS_SERVICE_URL || "http://localhost:8007"
);

export const prescriptionService = createServiceClient(
  import.meta.env.VITE_PRESCRIPTION_SERVICE_URL || "http://localhost:8008"
);

export const administratorService = createServiceClient(
  import.meta.env.VITE_ADMINISTRATOR_SERVICE_URL || "http://localhost:8009"
);
