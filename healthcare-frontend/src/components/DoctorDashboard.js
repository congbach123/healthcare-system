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
  Tag,
  Modal,
  Divider,
  Row,
  Col,
  Spin,
  message,
} from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  ExperimentOutlined,
  EyeOutlined,
  HeartOutlined,
  ClockCircleOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { useUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

// Service URLs
const SERVICE_URLS = {
  doctor: "http://localhost:8002/api",
  appointments: "http://localhost:8004/api",
  medicalRecords: "http://localhost:8007/api",
  prescription: "http://localhost:8008/api",
  lab: "http://localhost:8006/api",
};

const DoctorDashboard = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  // State for fetched data
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isLabOrderModalOpen, setIsLabOrderModalOpen] = useState(false);

  // Forms
  const [reportForm] = Form.useForm();
  const [prescriptionForm] = Form.useForm();
  const [labOrderForm] = Form.useForm();

  // Loading states for actions
  const [reportLoading, setReportLoading] = useState(false);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [labOrderLoading, setLabOrderLoading] = useState(false);

  // Current patient info for forms
  const [currentPatient, setCurrentPatient] = useState(null);

  // Data Fetching
  useEffect(() => {
    const fetchDoctorData = async () => {
      setLoading(true);
      setError(null);

      const doctorUserId = user.id;

      try {
        // 1. Fetch Doctor Profile
        const profileResponse = await axios.get(
          `${SERVICE_URLS.doctor}/doctors/${doctorUserId}/`
        );
        setDoctorProfile(profileResponse.data);

        // 2. Fetch Doctor's Appointments
        const appointmentsResponse = await axios.get(
          `${SERVICE_URLS.appointments}/appointments/`,
          {
            params: { doctor_user_id: doctorUserId },
          }
        );
        const sortedAppointments = appointmentsResponse.data.sort(
          (a, b) => new Date(a.start_time) - new Date(b.start_time)
        );
        setAppointments(sortedAppointments);
      } catch (err) {
        console.error("Error fetching doctor data:", err);
        if (err.response && err.response.data && err.response.data.error) {
          setError(`Failed to fetch doctor data: ${err.response.data.error}`);
        } else if (err.request) {
          setError(
            "Failed to fetch doctor data: Network error or service is down."
          );
        } else {
          setError("An unexpected error occurred while fetching data.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (user && user.id && user.user_type === "doctor") {
      fetchDoctorData();
    } else {
      setLoading(false);
    }
  }, [user, navigate]);

  // Handle View Patient History
  const handleViewPatientHistory = (patientUserId) => {
    navigate(`/patients/${patientUserId}/medical-history`);
  };

  // Handle Start Report Writing
  const handleStartWriteReport = (appointment) => {
    const patient = appointment.patient;
    setCurrentPatient({
      id: appointment.patient_user_id,
      name: patient
        ? `${patient.first_name} ${patient.last_name}`
        : "Unknown Patient",
    });
    setIsReportModalOpen(true);
    reportForm.resetFields();
  };

  // Handle Submit Report
  const handleSubmitReport = async (values) => {
    setReportLoading(true);

    const reportPayload = {
      patient_user_id: currentPatient.id,
      doctor_user_id: user.id,
      title: values.title,
      content: values.content,
      report_date: new Date().toISOString(),
    };

    try {
      const response = await axios.post(
        `${SERVICE_URLS.medicalRecords}/reports/`,
        reportPayload
      );

      if (response.status === 201) {
        message.success("Medical report saved successfully!");
        setIsReportModalOpen(false);
        reportForm.resetFields();
      }
    } catch (err) {
      console.error("Saving report failed:", err);
      if (err.response && err.response.data && err.response.data.error) {
        message.error(`Failed to save report: ${err.response.data.error}`);
      } else {
        message.error("Failed to save report. Please try again.");
      }
    } finally {
      setReportLoading(false);
    }
  };

  // Handle Start Prescribing
  const handleStartPrescribing = (appointment) => {
    const patient = appointment.patient;
    setCurrentPatient({
      id: appointment.patient_user_id,
      name: patient
        ? `${patient.first_name} ${patient.last_name}`
        : "Unknown Patient",
    });
    setIsPrescriptionModalOpen(true);
    prescriptionForm.resetFields();
  };

  // Handle Submit Prescription
  const handleSubmitPrescription = async (values) => {
    setPrescriptionLoading(true);

    const prescriptionPayload = {
      patient_user_id: currentPatient.id,
      doctor_user_id: user.id,
      medication_name: values.medication_name,
      dosage: values.dosage,
      frequency: values.frequency,
      duration: values.duration,
      notes: values.notes || null,
      prescription_date: new Date().toISOString(),
    };

    try {
      const response = await axios.post(
        `${SERVICE_URLS.prescription}/prescriptions/`,
        prescriptionPayload
      );

      if (response.status === 201) {
        message.success("Prescription saved successfully!");
        setIsPrescriptionModalOpen(false);
        prescriptionForm.resetFields();
      }
    } catch (err) {
      console.error("Saving prescription failed:", err);
      if (err.response && err.response.data && err.response.data.error) {
        message.error(
          `Failed to save prescription: ${err.response.data.error}`
        );
      } else {
        message.error("Failed to save prescription. Please try again.");
      }
    } finally {
      setPrescriptionLoading(false);
    }
  };

  // Handle Start Lab Order
  const handleStartOrderLabTest = (appointment) => {
    const patient = appointment.patient;
    setCurrentPatient({
      id: appointment.patient_user_id,
      name: patient
        ? `${patient.first_name} ${patient.last_name}`
        : "Unknown Patient",
    });
    setIsLabOrderModalOpen(true);
    labOrderForm.resetFields();
  };

  // Handle Submit Lab Order
  const handleSubmitOrderLabTest = async (values) => {
    setLabOrderLoading(true);

    const orderPayload = {
      patient_user_id: currentPatient.id,
      doctor_user_id: user.id,
      test_type: values.test_type,
      notes: values.notes || null,
      order_date: new Date().toISOString(),
    };

    try {
      const response = await axios.post(
        `${SERVICE_URLS.lab}/orders/`,
        orderPayload
      );

      if (response.status === 201) {
        message.success("Lab order created successfully!");
        setIsLabOrderModalOpen(false);
        labOrderForm.resetFields();
      }
    } catch (err) {
      console.error("Ordering lab test failed:", err);
      if (err.response && err.response.data && err.response.data.error) {
        message.error(`Failed to create lab order: ${err.response.data.error}`);
      } else {
        message.error("Failed to create lab order. Please try again.");
      }
    } finally {
      setLabOrderLoading(false);
    }
  };

  // Early return for redirection
  if (!user || user.user_type !== "doctor") {
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

  // Get status color for appointments
  const getStatusConfig = (status) => {
    switch (status) {
      case "completed":
        return {
          color: "#10b981",
          bgClass: "medical-vitals",
          textClass: "text-emerald-700",
        };
      case "cancelled":
        return {
          color: "#ef4444",
          bgClass: "bg-gradient-to-r from-red-50 to-rose-50",
          textClass: "text-red-700",
        };
      default:
        return {
          color: "#6366f1",
          bgClass: "medical-report",
          textClass: "text-blue-700",
        };
    }
  };

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
              <Text className="text-blue-100 text-sm">Doctor Dashboard</Text>
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
              Welcome, Dr. {doctorProfile?.first_name || "Doctor"}! 👨‍⚕️
            </Title>
            <Text className="text-slate-600 text-lg">
              Manage your patients and provide excellent healthcare
            </Text>
          </div>

          {/* Doctor Profile Card */}
          {doctorProfile && (
            <Card
              className="glass-card shadow-xl border-0 hover:shadow-2xl transition-all duration-300 reveal-up"
              title={
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
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
                      Dr. {doctorProfile.first_name} {doctorProfile.last_name}
                    </Text>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="space-y-2">
                    <Text className="text-slate-500 text-sm font-medium">
                      Username
                    </Text>
                    <Text className="text-slate-800 font-semibold text-lg block">
                      {doctorProfile.username}
                    </Text>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="space-y-2">
                    <Text className="text-slate-500 text-sm font-medium">
                      Email
                    </Text>
                    <Text className="text-slate-800 font-semibold text-lg block">
                      {doctorProfile.email}
                    </Text>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="space-y-2">
                    <Text className="text-slate-500 text-sm font-medium">
                      Specialization
                    </Text>
                    <div className="flex items-center space-x-2">
                      <StarOutlined className="text-yellow-500" />
                      <Text className="text-slate-800 font-semibold text-lg">
                        {doctorProfile.specialization || "General Practice"}
                      </Text>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="space-y-2">
                    <Text className="text-slate-500 text-sm font-medium">
                      License Number
                    </Text>
                    <Text className="text-slate-800 font-semibold text-lg block">
                      {doctorProfile.license_number || "Not specified"}
                    </Text>
                  </div>
                </Col>
              </Row>
              {doctorProfile._user_error && (
                <Alert
                  message="Profile Warning"
                  description={`Could not load complete user data: ${doctorProfile._user_error}`}
                  type="warning"
                  showIcon
                  className="mt-6 rounded-xl"
                />
              )}
            </Card>
          )}

          {/* Appointments Card */}
          <Card
            className="glass-card shadow-xl border-0 hover:shadow-2xl transition-all duration-300 reveal-up"
            title={
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
                  <CalendarOutlined className="text-white text-sm" />
                </div>
                <span className="text-slate-700 font-semibold">
                  Your Appointments
                </span>
              </div>
            }
          >
            {appointments.length > 0 ? (
              <List
                dataSource={appointments}
                renderItem={(appointment, index) => {
                  const statusConfig = getStatusConfig(appointment.status);

                  return (
                    <List.Item className="border-0 p-0 mb-6">
                      <Card
                        className={`w-full shadow-lg border-0 hover:shadow-xl transition-all duration-300 ${statusConfig.bgClass}`}
                        style={{
                          borderLeft: `4px solid ${statusConfig.color}`,
                          animationDelay: `${index * 0.1}s`,
                        }}
                      >
                        <div className="flex flex-col lg:flex-row lg:justify-between">
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center space-x-3">
                              <ClockCircleOutlined
                                className={`text-lg ${statusConfig.textClass}`}
                              />
                              <Text className="font-bold text-lg text-slate-800">
                                {new Date(
                                  appointment.start_time
                                ).toLocaleDateString()}{" "}
                                at{" "}
                                {new Date(
                                  appointment.start_time
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </Text>
                            </div>

                            <div className="flex items-center space-x-2">
                              <UserOutlined className="text-slate-500" />
                              <Text className="text-slate-600">
                                <span className="font-medium">Patient:</span>{" "}
                                {appointment.patient
                                  ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
                                  : "Patient information unavailable"}
                              </Text>
                            </div>

                            <div>
                              <Tag
                                color={statusConfig.color}
                                className="px-3 py-1 rounded-lg font-medium border-0 text-sm"
                                style={{
                                  background: statusConfig.color + "20",
                                  color: statusConfig.color,
                                }}
                              >
                                {appointment.status.toUpperCase()}
                              </Tag>
                            </div>
                          </div>

                          {appointment.patient_user_id && (
                            <div className="mt-6 lg:mt-0 lg:ml-6">
                              <Space
                                direction="vertical"
                                size="small"
                                className="w-full lg:w-auto"
                              >
                                <Button
                                  icon={<EyeOutlined />}
                                  onClick={() =>
                                    handleViewPatientHistory(
                                      appointment.patient_user_id
                                    )
                                  }
                                  className="w-full lg:w-auto rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                                >
                                  View History
                                </Button>
                                <Button
                                  icon={<FileTextOutlined />}
                                  onClick={() =>
                                    handleStartWriteReport(appointment)
                                  }
                                  type="default"
                                  className="w-full lg:w-auto rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                                >
                                  Write Report
                                </Button>
                                <Button
                                  icon={<MedicineBoxOutlined />}
                                  onClick={() =>
                                    handleStartPrescribing(appointment)
                                  }
                                  type="default"
                                  className="w-full lg:w-auto rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                                >
                                  Prescribe
                                </Button>
                                <Button
                                  icon={<ExperimentOutlined />}
                                  onClick={() =>
                                    handleStartOrderLabTest(appointment)
                                  }
                                  type="default"
                                  className="w-full lg:w-auto rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                                >
                                  Order Lab Test
                                </Button>
                              </Space>
                            </div>
                          )}
                        </div>

                        {/* Display errors if present */}
                        {(appointment._patient_user_error ||
                          appointment._doctor_user_error) && (
                          <div className="mt-4 space-y-2">
                            {appointment._patient_user_error && (
                              <Alert
                                message="Warning"
                                description={`Patient information incomplete: ${appointment._patient_user_error}`}
                                type="warning"
                                showIcon
                                size="small"
                                className="rounded-lg"
                              />
                            )}
                            {appointment._doctor_user_error && (
                              <Alert
                                message="Warning"
                                description={`Doctor information incomplete: ${appointment._doctor_user_error}`}
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
                  );
                }}
              />
            ) : (
              <div className="text-center py-12">
                <CalendarOutlined className="text-5xl text-slate-300 mb-4" />
                <Text className="text-slate-500 text-lg block">
                  No appointments scheduled
                </Text>
                <Text className="text-slate-400">
                  Your appointment schedule is clear
                </Text>
              </div>
            )}
          </Card>
        </div>
      </Content>

      {/* Write Report Modal */}
      <Modal
        title={
          <div className="flex items-center space-x-3 py-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <FileTextOutlined className="text-white text-sm" />
            </div>
            <span className="text-slate-700 font-semibold text-lg">
              Write Medical Report for {currentPatient?.name || "Patient"}
            </span>
          </div>
        }
        open={isReportModalOpen}
        onCancel={() => setIsReportModalOpen(false)}
        footer={null}
        width={700}
        className="rounded-2xl"
      >
        <Form
          form={reportForm}
          layout="vertical"
          onFinish={handleSubmitReport}
          className="pt-4"
        >
          <Form.Item
            name="title"
            label={
              <Text className="font-medium text-slate-700">Report Title</Text>
            }
            rules={[{ required: true, message: "Please enter a title" }]}
          >
            <Input
              placeholder="Enter report title"
              className="rounded-xl"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="content"
            label={
              <Text className="font-medium text-slate-700">Report Content</Text>
            }
            rules={[{ required: true, message: "Please enter report content" }]}
          >
            <TextArea
              rows={8}
              placeholder="Enter detailed report content"
              className="rounded-xl"
            />
          </Form.Item>

          <Form.Item className="mb-0 pt-4">
            <Space className="w-full justify-end">
              <Button
                onClick={() => setIsReportModalOpen(false)}
                className="rounded-xl"
                size="large"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={reportLoading}
                size="large"
                className="rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Save Report
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Prescription Modal */}
      <Modal
        title={
          <div className="flex items-center space-x-3 py-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <MedicineBoxOutlined className="text-white text-sm" />
            </div>
            <span className="text-slate-700 font-semibold text-lg">
              Prescribe Medication for {currentPatient?.name || "Patient"}
            </span>
          </div>
        }
        open={isPrescriptionModalOpen}
        onCancel={() => setIsPrescriptionModalOpen(false)}
        footer={null}
        width={700}
        className="rounded-2xl"
      >
        <Form
          form={prescriptionForm}
          layout="vertical"
          onFinish={handleSubmitPrescription}
          className="pt-4"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="medication_name"
                label={
                  <Text className="font-medium text-slate-700">
                    Medication Name
                  </Text>
                }
                rules={[
                  { required: true, message: "Please enter medication name" },
                ]}
              >
                <Input
                  placeholder="e.g., Aspirin"
                  className="rounded-xl"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dosage"
                label={
                  <Text className="font-medium text-slate-700">Dosage</Text>
                }
                rules={[{ required: true, message: "Please enter dosage" }]}
              >
                <Input
                  placeholder="e.g., 100mg"
                  className="rounded-xl"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="frequency"
                label={
                  <Text className="font-medium text-slate-700">Frequency</Text>
                }
                rules={[{ required: true, message: "Please enter frequency" }]}
              >
                <Input
                  placeholder="e.g., Once daily"
                  className="rounded-xl"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="duration"
                label={
                  <Text className="font-medium text-slate-700">Duration</Text>
                }
                rules={[{ required: true, message: "Please enter duration" }]}
              >
                <Input
                  placeholder="e.g., 7 days"
                  className="rounded-xl"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label={
              <Text className="font-medium text-slate-700">
                Notes (Optional)
              </Text>
            }
          >
            <TextArea
              rows={4}
              placeholder="Additional instructions or notes"
              className="rounded-xl"
            />
          </Form.Item>

          <Form.Item className="mb-0 pt-4">
            <Space className="w-full justify-end">
              <Button
                onClick={() => setIsPrescriptionModalOpen(false)}
                className="rounded-xl"
                size="large"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={prescriptionLoading}
                size="large"
                className="rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Save Prescription
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Lab Order Modal */}
      <Modal
        title={
          <div className="flex items-center space-x-3 py-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <ExperimentOutlined className="text-white text-sm" />
            </div>
            <span className="text-slate-700 font-semibold text-lg">
              Order Lab Test for {currentPatient?.name || "Patient"}
            </span>
          </div>
        }
        open={isLabOrderModalOpen}
        onCancel={() => setIsLabOrderModalOpen(false)}
        footer={null}
        width={600}
        className="rounded-2xl"
      >
        <Form
          form={labOrderForm}
          layout="vertical"
          onFinish={handleSubmitOrderLabTest}
          className="pt-4"
        >
          <Form.Item
            name="test_type"
            label={
              <Text className="font-medium text-slate-700">Test Type</Text>
            }
            rules={[{ required: true, message: "Please enter test type" }]}
          >
            <Input
              placeholder="e.g., Complete Blood Count, Urinalysis"
              className="rounded-xl"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label={
              <Text className="font-medium text-slate-700">
                Notes (Optional)
              </Text>
            }
          >
            <TextArea
              rows={4}
              placeholder="Doctor notes for the lab"
              className="rounded-xl"
            />
          </Form.Item>

          <Form.Item className="mb-0 pt-4">
            <Space className="w-full justify-end">
              <Button
                onClick={() => setIsLabOrderModalOpen(false)}
                className="rounded-xl"
                size="large"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={labOrderLoading}
                size="large"
                className="rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Create Order
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default DoctorDashboard;
