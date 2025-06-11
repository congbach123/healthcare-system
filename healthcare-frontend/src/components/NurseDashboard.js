// src/components/NurseDashboard.js
import React, { useState, useEffect } from "react";
import {
  Layout,
  Typography,
  Card,
  Button,
  Form,
  Input,
  Alert,
  Space,
  List,
  Select,
  Modal,
  Divider,
  Row,
  Col,
  Spin,
  message,
  InputNumber,
  DatePicker,
} from "antd";
import {
  UserOutlined,
  HeartOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  MedicineBoxOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { useUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import dayjs from "dayjs";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Service URLs
const SERVICE_URLS = {
  nurse: "http://localhost:8005/api",
  patient: "http://localhost:8001/api",
};

const NurseDashboard = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  // State for fetched data
  const [nurseProfile, setNurseProfile] = useState(null);
  const [recordedVitals, setRecordedVitals] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal and form states
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [vitalsForm] = Form.useForm();
  const [vitalsLoading, setVitalsLoading] = useState(false);

  // Data Fetching
  useEffect(() => {
    const fetchNurseData = async () => {
      setLoading(true);
      setError(null);

      const nurseUserId = user.id;

      try {
        // 1. Fetch Nurse Profile
        const profileResponse = await axios.get(
          `${SERVICE_URLS.nurse}/nurses/${nurseUserId}/`
        );
        setNurseProfile(profileResponse.data);

        // 2. Fetch Vitals Recorded by This Nurse
        const vitalsResponse = await axios.get(
          `${SERVICE_URLS.nurse}/vitals/`,
          {
            params: { nurse_user_id: nurseUserId },
          }
        );
        setRecordedVitals(vitalsResponse.data);
      } catch (err) {
        console.error("Error fetching nurse data:", err);
        if (err.response && err.response.data && err.response.data.error) {
          setError(`Failed to fetch nurse data: ${err.response.data.error}`);
        } else if (err.request) {
          setError(
            "Failed to fetch nurse data: Network error or service is down."
          );
        } else {
          setError("An unexpected error occurred while fetching data.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (user && user.id && user.user_type === "nurse") {
      fetchNurseData();
    } else {
      setLoading(false);
    }
  }, [user, navigate]);

  // Fetch Patients when modal opens
  useEffect(() => {
    if (isVitalsModalOpen && patients.length === 0) {
      const fetchPatients = async () => {
        try {
          const patientsResponse = await axios.get(
            `${SERVICE_URLS.patient}/patients/`
          );
          setPatients(patientsResponse.data);
        } catch (err) {
          console.error("Error fetching patients:", err);
          message.error("Failed to load patients list.");
        }
      };
      fetchPatients();
    }
  }, [isVitalsModalOpen, patients.length]);

  // Handle Submit Vitals
  const handleSubmitVitals = async (values) => {
    setVitalsLoading(true);

    const nurseUserId = user.id;

    // Prepare timestamp
    let timestampToSend = values.timestamp.toISOString();

    const vitalsPayload = {
      patient_user_id: values.patient_user_id,
      nurse_user_id: nurseUserId,
      timestamp: timestampToSend,
      temperature_celsius: values.temperature_celsius || null,
      blood_pressure_systolic: values.blood_pressure_systolic || null,
      blood_pressure_diastolic: values.blood_pressure_diastolic || null,
      heart_rate_bpm: values.heart_rate_bpm || null,
      respiratory_rate_bpm: values.respiratory_rate_bpm || null,
      oxygen_saturation_percentage: values.oxygen_saturation_percentage || null,
      notes: values.notes || null,
    };

    try {
      const response = await axios.post(
        `${SERVICE_URLS.nurse}/vitals/`,
        vitalsPayload
      );

      if (response.status === 201) {
        message.success("Vitals recorded successfully!");

        // Refetch recorded vitals list
        const vitalsResponse = await axios.get(
          `${SERVICE_URLS.nurse}/vitals/`,
          {
            params: { nurse_user_id: nurseUserId },
          }
        );
        setRecordedVitals(vitalsResponse.data);

        setIsVitalsModalOpen(false);
        vitalsForm.resetFields();
      }
    } catch (err) {
      console.error("Recording vitals failed:", err);
      if (err.response && err.response.data && err.response.data.error) {
        message.error(`Failed to record vitals: ${err.response.data.error}`);
      } else {
        message.error("Failed to record vitals. Please try again.");
      }
    } finally {
      setVitalsLoading(false);
    }
  };

  // Early return for redirection
  if (!user || user.user_type !== "nurse") {
    navigate("/login");
    return <div>Redirecting...</div>;
  }

  // Render loading state
  if (loading) {
    return (
      <Layout className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Content className="flex items-center justify-center">
          <div className="text-center">
            <div className="loading-spinner mx-auto mb-4"></div>
            <Text className="text-slate-600">Loading your dashboard...</Text>
          </div>
        </Content>
      </Layout>
    );
  }

  // Render error state
  if (error) {
    return (
      <Layout className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Content className="p-8">
          <div className="max-w-4xl mx-auto">
            <Card className="glass-card shadow-2xl border-0">
              <Alert
                message="System Error"
                description={error}
                type="error"
                showIcon
                className="rounded-xl"
                action={
                  <Button danger onClick={logout} className="rounded-xl">
                    Logout
                  </Button>
                }
              />
            </Card>
          </div>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header className="bg-gradient-primary shadow-lg border-0 h-20">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-10 h-10 bg-white bg-opacity-20 rounded-xl">
              <HeartOutlined className="text-xl text-white" />
            </div>
            <div>
              <Title level={3} className="text-white m-0 font-bold">
                MediCare Portal
              </Title>
              <Text className="text-blue-100 text-sm">Nurse Dashboard</Text>
            </div>
          </div>
          <Button
            danger
            onClick={logout}
            className="bg-white bg-opacity-20 border-white border-opacity-30 text-white hover:bg-opacity-30 rounded-xl"
          >
            Logout
          </Button>
        </div>
      </Header>

      <Content className="p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <Title level={2} className="text-gradient-primary mb-2">
              Welcome, Nurse {nurseProfile?.first_name || "Care Provider"}! 👩‍⚕️
            </Title>
            <Text className="text-slate-600 text-lg">
              Monitor patient health and provide compassionate care
            </Text>
          </div>

          {/* Nurse Profile Card */}
          {nurseProfile && (
            <Card
              className="glass-card shadow-xl border-0 hover:shadow-2xl transition-all duration-300 reveal-up"
              title={
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
                    <UserOutlined className="text-white text-sm" />
                  </div>
                  <span className="text-slate-700 font-semibold">
                    Your Professional Profile
                  </span>
                </div>
              }
            >
              <Row gutter={[24, 16]}>
                <Col span={8}>
                  <div className="space-y-2">
                    <Text className="text-slate-500 text-sm font-medium">
                      Full Name
                    </Text>
                    <Text className="text-slate-800 font-semibold text-lg block">
                      {nurseProfile.first_name} {nurseProfile.last_name}
                    </Text>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="space-y-2">
                    <Text className="text-slate-500 text-sm font-medium">
                      Username
                    </Text>
                    <Text className="text-slate-800 font-semibold text-lg block">
                      {nurseProfile.username}
                    </Text>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="space-y-2">
                    <Text className="text-slate-500 text-sm font-medium">
                      Employee ID
                    </Text>
                    <div className="flex items-center space-x-2">
                      <StarOutlined className="text-yellow-500" />
                      <Text className="text-slate-800 font-semibold text-lg">
                        {nurseProfile.employee_id || "Not specified"}
                      </Text>
                    </div>
                  </div>
                </Col>
              </Row>
              {nurseProfile._user_error && (
                <Alert
                  message="Profile Warning"
                  description={`Could not load complete user data: ${nurseProfile._user_error}`}
                  type="warning"
                  showIcon
                  className="mt-6 rounded-xl"
                />
              )}
            </Card>
          )}

          {/* Record Vitals Card */}
          <Card
            className="glass-card shadow-xl border-0 hover:shadow-2xl transition-all duration-300 reveal-up"
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                    <ThunderboltOutlined className="text-white text-sm" />
                  </div>
                  <span className="text-slate-700 font-semibold">
                    Patient Vitals Management
                  </span>
                </div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsVitalsModalOpen(true)}
                  size="large"
                  className="rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    border: "none",
                  }}
                >
                  Record New Vitals
                </Button>
              </div>
            }
          >
            {recordedVitals.length > 0 ? (
              <List
                dataSource={recordedVitals}
                renderItem={(vital, index) => (
                  <List.Item className="border-0 p-0 mb-6">
                    <Card
                      className="w-full shadow-lg border-0 hover:shadow-xl transition-all duration-300 medical-vitals"
                      style={{
                        animationDelay: `${index * 0.1}s`,
                      }}
                    >
                      <div className="flex flex-col lg:flex-row lg:justify-between">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center space-x-3">
                            <ClockCircleOutlined className="text-lg text-red-600" />
                            <Text className="font-bold text-lg text-slate-800">
                              {new Date(vital.timestamp).toLocaleDateString()}{" "}
                              at{" "}
                              {new Date(vital.timestamp).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </Text>
                          </div>

                          <div className="flex items-center space-x-2">
                            <UserOutlined className="text-slate-500" />
                            <Text className="text-slate-600">
                              <span className="font-medium">Patient:</span>{" "}
                              {vital.patient
                                ? `${vital.patient.first_name} ${vital.patient.last_name}`
                                : "Patient information unavailable"}
                            </Text>
                          </div>

                          {/* Vitals Details Grid */}
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl">
                            {vital.temperature_celsius !== null && (
                              <div className="text-center">
                                <Text className="text-slate-500 text-sm font-medium block">
                                  Temperature
                                </Text>
                                <Text className="text-red-600 font-bold text-lg">
                                  {vital.temperature_celsius}°C
                                </Text>
                              </div>
                            )}
                            {(vital.blood_pressure_systolic !== null ||
                              vital.blood_pressure_diastolic !== null) && (
                              <div className="text-center">
                                <Text className="text-slate-500 text-sm font-medium block">
                                  Blood Pressure
                                </Text>
                                <Text className="text-red-600 font-bold text-lg">
                                  {vital.blood_pressure_systolic || "?"}/
                                  {vital.blood_pressure_diastolic || "?"}
                                </Text>
                                <Text className="text-slate-400 text-xs">
                                  mmHg
                                </Text>
                              </div>
                            )}
                            {vital.heart_rate_bpm !== null && (
                              <div className="text-center">
                                <Text className="text-slate-500 text-sm font-medium block">
                                  Heart Rate
                                </Text>
                                <Text className="text-red-600 font-bold text-lg">
                                  {vital.heart_rate_bpm}
                                </Text>
                                <Text className="text-slate-400 text-xs">
                                  bpm
                                </Text>
                              </div>
                            )}
                            {vital.respiratory_rate_bpm !== null && (
                              <div className="text-center">
                                <Text className="text-slate-500 text-sm font-medium block">
                                  Respiratory Rate
                                </Text>
                                <Text className="text-red-600 font-bold text-lg">
                                  {vital.respiratory_rate_bpm}
                                </Text>
                                <Text className="text-slate-400 text-xs">
                                  bpm
                                </Text>
                              </div>
                            )}
                            {vital.oxygen_saturation_percentage !== null && (
                              <div className="text-center">
                                <Text className="text-slate-500 text-sm font-medium block">
                                  O₂ Saturation
                                </Text>
                                <Text className="text-red-600 font-bold text-lg">
                                  {vital.oxygen_saturation_percentage}%
                                </Text>
                              </div>
                            )}
                          </div>

                          {vital.notes && (
                            <div className="p-4 bg-slate-50 rounded-xl">
                              <Text className="text-slate-500 text-sm font-medium">
                                Notes:
                              </Text>
                              <Text className="text-slate-700 italic block mt-1">
                                {vital.notes}
                              </Text>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Display errors if present */}
                      {(vital._patient_user_error ||
                        vital._nurse_user_error) && (
                        <div className="mt-4 space-y-2">
                          {vital._patient_user_error && (
                            <Alert
                              message="Warning"
                              description={`Patient information incomplete: ${vital._patient_user_error}`}
                              type="warning"
                              showIcon
                              size="small"
                              className="rounded-lg"
                            />
                          )}
                          {vital._nurse_user_error && (
                            <Alert
                              message="Warning"
                              description={`Nurse information incomplete: ${vital._nurse_user_error}`}
                              type="warning"
                              showIcon
                              size="small"
                              className="rounded-lg"
                            />
                          )}
                        </div>
                      )}
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <div className="text-center py-12">
                <ThunderboltOutlined className="text-5xl text-slate-300 mb-4" />
                <Text className="text-slate-500 text-lg block mb-2">
                  No vitals recorded yet
                </Text>
                <Text className="text-slate-400">
                  Start recording patient vitals to track their health
                </Text>
              </div>
            )}
          </Card>
        </div>
      </Content>

      {/* Record Vitals Modal */}
      <Modal
        title={
          <div className="flex items-center space-x-3 py-2">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
              <HeartOutlined className="text-white text-sm" />
            </div>
            <span className="text-slate-700 font-semibold text-lg">
              Record Patient Vitals
            </span>
          </div>
        }
        open={isVitalsModalOpen}
        onCancel={() => {
          setIsVitalsModalOpen(false);
          vitalsForm.resetFields();
        }}
        footer={null}
        width={800}
        className="rounded-2xl"
      >
        <Form
          form={vitalsForm}
          layout="vertical"
          onFinish={handleSubmitVitals}
          initialValues={{
            timestamp: dayjs(),
          }}
          className="pt-4"
        >
          <Form.Item
            name="patient_user_id"
            label={
              <Text className="font-medium text-slate-700">Select Patient</Text>
            }
            rules={[{ required: true, message: "Please select a patient" }]}
          >
            <Select
              placeholder="Select a patient"
              loading={patients.length === 0}
              className="rounded-xl"
              size="large"
            >
              {patients.map((patient) => (
                <Option key={patient.user_id} value={patient.user_id}>
                  <div className="py-1">
                    <Text strong>
                      {patient.first_name} {patient.last_name}
                    </Text>
                    <br />
                    <Text type="secondary" className="text-sm">
                      @{patient.username}
                    </Text>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="timestamp"
            label={
              <Text className="font-medium text-slate-700">Recording Time</Text>
            }
            rules={[{ required: true, message: "Please select timestamp" }]}
          >
            <DatePicker
              showTime
              className="w-full rounded-xl"
              size="large"
              format="YYYY-MM-DD HH:mm:ss"
            />
          </Form.Item>

          <Divider>
            <div className="flex items-center space-x-2">
              <MedicineBoxOutlined className="text-slate-500" />
              <Text className="text-slate-600 font-medium">Vital Signs</Text>
            </div>
          </Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="temperature_celsius"
                label={
                  <Text className="font-medium text-slate-700">
                    Temperature (°C)
                  </Text>
                }
              >
                <InputNumber
                  placeholder="36.5"
                  step={0.1}
                  min={30}
                  max={45}
                  className="w-full rounded-xl"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="heart_rate_bpm"
                label={
                  <Text className="font-medium text-slate-700">
                    Heart Rate (bpm)
                  </Text>
                }
              >
                <InputNumber
                  placeholder="75"
                  min={30}
                  max={200}
                  className="w-full rounded-xl"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="blood_pressure_systolic"
                label={
                  <Text className="font-medium text-slate-700">
                    Systolic BP (mmHg)
                  </Text>
                }
              >
                <InputNumber
                  placeholder="120"
                  min={50}
                  max={250}
                  className="w-full rounded-xl"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="blood_pressure_diastolic"
                label={
                  <Text className="font-medium text-slate-700">
                    Diastolic BP (mmHg)
                  </Text>
                }
              >
                <InputNumber
                  placeholder="80"
                  min={30}
                  max={150}
                  className="w-full rounded-xl"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="respiratory_rate_bpm"
                label={
                  <Text className="font-medium text-slate-700">
                    Respiratory Rate (bpm)
                  </Text>
                }
              >
                <InputNumber
                  placeholder="18"
                  min={5}
                  max={50}
                  className="w-full rounded-xl"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="oxygen_saturation_percentage"
                label={
                  <Text className="font-medium text-slate-700">
                    O₂ Saturation (%)
                  </Text>
                }
              >
                <InputNumber
                  placeholder="98"
                  step={0.1}
                  min={70}
                  max={100}
                  className="w-full rounded-xl"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label={
              <Text className="font-medium text-slate-700">Clinical Notes</Text>
            }
          >
            <TextArea
              rows={4}
              placeholder="Additional observations or notes"
              className="rounded-xl"
            />
          </Form.Item>

          <Form.Item className="mb-0 pt-4">
            <Space className="w-full justify-end">
              <Button
                onClick={() => setIsVitalsModalOpen(false)}
                className="rounded-xl"
                size="large"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={vitalsLoading}
                disabled={patients.length === 0}
                size="large"
                className="rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "none",
                }}
              >
                Save Vitals
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default NurseDashboard;
