// src/components/Login.js
import React, { useState } from "react";
import { Card, Form, Input, Button, Alert, Typography, Space } from "antd";
import {
  UserOutlined,
  LockOutlined,
  HeartOutlined,
  EnterOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { useUser } from "../context/UserContext";
import { useNavigate, Navigate } from "react-router-dom";

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user, login } = useUser();
  const navigate = useNavigate();

  // Redirect if already logged in
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
        return <Navigate to="/" replace />;
    }
  }

  const handleSubmit = async (values) => {
    const { username, password } = values;
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(
        "http://localhost:8000/api/user/login/",
        {
          username,
          password,
        }
      );

      if (response.status === 200) {
        const userData = response.data;
        console.log("Login successful:", userData);
        login(userData);

        switch (userData.user_type) {
          case "patient":
            navigate("/patient");
            break;
          case "doctor":
            navigate("/doctor");
            break;
          case "pharmacist":
            navigate("/pharmacist");
            break;
          case "nurse":
            navigate("/nurse");
            break;
          case "lab_technician":
            navigate("/labtech");
            break;
          case "administrator":
            navigate("/admin");
            break;
          default:
            navigate("/");
        }
      } else {
        setError("Unexpected login response.");
      }
    } catch (error) {
      console.error("Login failed:", error);
      if (error.response) {
        if (error.response.status === 401) {
          setError("Invalid username or password.");
        } else {
          setError(
            `Login failed: ${error.response.status} ${error.response.statusText}`
          );
        }
      } else if (error.request) {
        setError(
          "Login failed: Could not connect to the authentication service."
        );
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-indigo-100 flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-10 animate-pulse"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-400 to-cyan-400 rounded-full opacity-10 animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full opacity-5 animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and branding section */}
        <div className="text-center mb-8 floating-element">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl mb-6 shadow-2xl">
            <HeartOutlined className="text-3xl text-white" />
          </div>
          <Title level={2} className="text-gradient-primary mb-2 font-bold">
            MediCare Portal
          </Title>
          <Text className="text-slate-600 text-lg font-medium">
            Advanced Healthcare Management System
          </Text>
        </div>

        {/* Main login card */}
        <Card
          className="glass-card shadow-2xl border-0"
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: "24px",
            border: "1px solid rgba(255, 255, 255, 0.3)",
          }}
        >
          <div className="text-center mb-6">
            <Title level={3} className="text-slate-700 mb-2 font-semibold">
              Welcome Back
            </Title>
            <Text className="text-slate-500">
              Please sign in to access your dashboard
            </Text>
          </div>

          {error && (
            <Alert
              message="Authentication Error"
              description={error}
              type="error"
              showIcon
              className="mb-6 rounded-xl border-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05))",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            />
          )}

          <Form
            name="login"
            initialValues={{ remember: true }}
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: "Please enter your username!" },
              ]}
            >
              <Input
                prefix={<UserOutlined className="text-slate-400" />}
                placeholder="Enter your username"
                className="h-12 rounded-xl border-2 border-slate-200 hover:border-purple-300 focus:border-purple-500 transition-all duration-300"
                style={{
                  background: "rgba(255, 255, 255, 0.8)",
                  backdropFilter: "blur(10px)",
                }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: "Please enter your password!" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-slate-400" />}
                placeholder="Enter your password"
                className="h-12 rounded-xl border-2 border-slate-200 hover:border-purple-300 focus:border-purple-500 transition-all duration-300"
                style={{
                  background: "rgba(255, 255, 255, 0.8)",
                  backdropFilter: "blur(10px)",
                }}
              />
            </Form.Item>

            <Form.Item className="mb-0">
              <Button
                type="primary"
                htmlType="submit"
                className="w-full h-12 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                loading={loading}
                style={{
                  background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                  border: "none",
                  boxShadow: "0 4px 14px 0 rgba(139, 92, 246, 0.3)",
                }}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* Features section */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white bg-opacity-60 backdrop-blur-sm rounded-xl border border-white border-opacity-30">
            <EnterOutlined className="text-2xl text-purple-600 mb-2" />
            <Text className="text-sm font-medium text-slate-600 block">
              Secure Access
            </Text>
          </div>
          <div className="text-center p-4 bg-white bg-opacity-60 backdrop-blur-sm rounded-xl border border-white border-opacity-30">
            <HeartOutlined className="text-2xl text-purple-600 mb-2" />
            <Text className="text-sm font-medium text-slate-600 block">
              Patient Care
            </Text>
          </div>
          <div className="text-center p-4 bg-white bg-opacity-60 backdrop-blur-sm rounded-xl border border-white border-opacity-30">
            <UserOutlined className="text-2xl text-purple-600 mb-2" />
            <Text className="text-sm font-medium text-slate-600 block">
              Multi-Role
            </Text>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <Text className="text-slate-500 text-sm">
            © 2024 MediCare Portal. Advanced Healthcare Solutions.
          </Text>
        </div>
      </div>
    </div>
  );
};

export default Login;
