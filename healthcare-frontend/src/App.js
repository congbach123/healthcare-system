// src/App.js
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { UserProvider, useUser } from "./context/UserContext";
import { ConfigProvider, App as AntApp } from "antd";
import ChatToggle from "./components/ChatToggle";
// Import components
import Login from "./components/Login";
import PatientDashboard from "./components/PatientDashboard";
import DoctorDashboard from "./components/DoctorDashboard";
import PharmacistDashboard from "./components/PharmacistDashboard";
import NurseDashboard from "./components/NurseDashboard";
import LabTechDashboard from "./components/LabTechDashboard";
import AdminDashboard from "./components/AdminDashboard";
import MedicalHistoryDetail from "./components/MedicalHistoryDetail";

// Helper component for simple route protection
const ProtectedRoute = ({ children }) => {
  const { user } = useUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Another helper component for redirecting from / if logged in
const RedirectIfLoggedIn = ({ children }) => {
  const { user } = useUser();
  if (user) {
    switch (user.user_type) {
      case "patient":
        return <Navigate to="/patient" replace />;
      case "doctor":
        return <Navigate to="/doctor" replace />;
      case "pharmacist":
        return <Navigate to="/pharmacist" replace />;
      case "nurse":
        return <Navigate to="/nurse" replace />;
      case "lab_technician":
        return <Navigate to="/labtech" replace />;
      case "administrator":
        return <Navigate to="/admin" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }
  return children;
};

// 404 Component with new styling
const NotFound = () => (
  <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="text-center p-8 bg-white rounded-2xl shadow-2xl border border-purple-200">
      <h1 className="text-8xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
        404
      </h1>
      <p className="text-2xl text-gray-700 mb-8 font-medium">
        Oops! Page Not Found
      </p>
      <button
        onClick={() => (window.location.href = "/")}
        className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-medium"
      >
        Return Home
      </button>
    </div>
  </div>
);

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          // Modern color palette
          colorPrimary: "#8b5cf6", // Purple primary
          colorSuccess: "#10b981", // Emerald green
          colorWarning: "#f59e0b", // Amber
          colorError: "#ef4444", // Red
          colorInfo: "#6366f1", // Indigo

          // Modern border radius
          borderRadius: 12,
          borderRadiusLG: 16,
          borderRadiusSM: 8,

          // Typography
          fontFamily: '"Poppins", "Inter", "Segoe UI", sans-serif',
          fontSize: 15,
          fontSizeLG: 17,
          fontSizeSM: 13,

          // Enhanced spacing
          padding: 20,
          paddingLG: 28,
          paddingSM: 16,
          margin: 20,
          marginLG: 28,
          marginSM: 16,

          // Modern backgrounds
          colorBgContainer: "#ffffff",
          colorBgElevated: "#fefefe",
          colorBgLayout: "#f8fafc",

          // Enhanced text colors
          colorText: "#1e293b",
          colorTextSecondary: "#64748b",
          colorTextTertiary: "#94a3b8",

          // Modern shadows
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          boxShadowSecondary:
            "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        },
        components: {
          // Layout with gradient header
          Layout: {
            headerBg: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
            headerHeight: 80,
            headerPadding: "0 32px",
            siderBg: "#ffffff",
            bodyBg: "#f8fafc",
          },

          // Modern buttons
          Button: {
            borderRadius: 12,
            controlHeight: 44,
            controlHeightLG: 52,
            controlHeightSM: 36,
            fontWeight: 500,
          },

          // Enhanced cards
          Card: {
            borderRadius: 16,
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            headerBg: "#fafbfc",
          },

          // Modern inputs
          Input: {
            borderRadius: 12,
            controlHeight: 44,
            controlHeightLG: 52,
            controlHeightSM: 36,
          },

          // Enhanced selects
          Select: {
            borderRadius: 12,
            controlHeight: 44,
            controlHeightLG: 52,
            controlHeightSM: 36,
          },

          // Modern table
          Table: {
            borderRadius: 16,
            headerBg: "#f1f5f9",
          },

          // Enhanced tags
          Tag: {
            borderRadius: 8,
            fontWeight: 500,
          },

          // Modern alerts
          Alert: {
            borderRadius: 12,
          },

          // Enhanced modals
          Modal: {
            borderRadius: 16,
          },
        },
      }}
    >
      <AntApp>
        <Router>
          <UserProvider>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
              <Routes>
                {/* Login Page */}
                <Route
                  path="/login"
                  element={
                    <RedirectIfLoggedIn>
                      <Login />
                    </RedirectIfLoggedIn>
                  }
                />

                {/* Protected Routes for Dashboards */}
                <Route
                  path="/patient"
                  element={
                    <ProtectedRoute>
                      <PatientDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/doctor"
                  element={
                    <ProtectedRoute>
                      <DoctorDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pharmacist"
                  element={
                    <ProtectedRoute>
                      <PharmacistDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/nurse"
                  element={
                    <ProtectedRoute>
                      <NurseDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/labtech"
                  element={
                    <ProtectedRoute>
                      <LabTechDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Medical History Detail Routes */}
                <Route
                  path="/patient/medical-history"
                  element={
                    <ProtectedRoute>
                      <MedicalHistoryDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/patients/:patientId/medical-history"
                  element={
                    <ProtectedRoute>
                      <MedicalHistoryDetail />
                    </ProtectedRoute>
                  }
                />

                {/* Default route */}
                <Route
                  path="/"
                  element={
                    <RedirectIfLoggedIn>
                      <Navigate to="/login" replace />
                    </RedirectIfLoggedIn>
                  }
                />

                {/* 404 Not Found page */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <ChatToggle
                position="bottom-right"
                chatbotApiUrl="http://127.0.0.1:8000/api/chatbot"
              />
            </div>
          </UserProvider>
        </Router>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
