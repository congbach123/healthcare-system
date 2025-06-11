// src/components/PatientDashboard.js
import React, { useState, useEffect } from "react";
import {
  Layout,
  Typography,
  Card,
  Button,
  Tag,
  List,
  Divider,
  Space,
  Skeleton,
  Modal,
  Form,
  Select,
  DatePicker,
  TimePicker,
  message,
  Alert,
  Empty,
  Input,
  Avatar,
} from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  HistoryOutlined,
  PlusOutlined,
  MessageOutlined,
  HeartOutlined,
  ClockCircleOutlined,
  MedicineBoxOutlined,
  DownOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { useUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import dayjs from "dayjs";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

// Service URLs
const SERVICE_URLS = {
  patient: "http://localhost:8001/api",
  doctor: "http://localhost:8002/api",
  appointments: "http://localhost:8004/api",
  medicalRecords: "http://localhost:8007/api",
};

const PatientDashboard = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  // State variables
  const [patientProfile, setPatientProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [bookingForm] = Form.useForm();
  const [bookingLoading, setBookingLoading] = useState(false);

  // State for doctor selection modal
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [tempSelectedDoctor, setTempSelectedDoctor] = useState(null);

  // State for date selection modal
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [tempSelectedDate, setTempSelectedDate] = useState(null);

  // State for time selection modal
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);
  const [tempSelectedTime, setTempSelectedTime] = useState(null);

  // Data fetching
  useEffect(() => {
    const fetchPatientData = async () => {
      setLoading(true);
      setError(null);

      const patientUserId = user.id;

      try {
        // 1. Fetch Patient Profile
        const profileResponse = await axios.get(
          `${SERVICE_URLS.patient}/patients/${patientUserId}/`
        );
        setPatientProfile(profileResponse.data);

        // 2. Fetch Patient Appointments
        const appointmentsResponse = await axios.get(
          `${SERVICE_URLS.appointments}/appointments/`,
          {
            params: { patient_user_id: patientUserId },
          }
        );
        setAppointments(appointmentsResponse.data);
      } catch (err) {
        console.error("Error fetching patient data:", err);
        if (err.response && err.response.data && err.response.data.error) {
          setError(`Failed to fetch patient data: ${err.response.data.error}`);
        } else if (err.request) {
          setError(
            "Failed to fetch patient data: Network error or service is down."
          );
        } else {
          setError("An unexpected error occurred while fetching data.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (user && user.id && user.user_type === "patient") {
      fetchPatientData();
    } else {
      setLoading(false);
    }
  }, [user, navigate]);

  // Doctor fetching
  useEffect(() => {
    if (isBookingModalOpen && doctors.length === 0) {
      const fetchDoctors = async () => {
        try {
          const doctorsResponse = await axios.get(
            `${SERVICE_URLS.doctor}/doctors/`
          );
          setDoctors(doctorsResponse.data);
        } catch (err) {
          console.error("Error fetching doctors:", err);
          message.error("Failed to load doctors list.");
        }
      };
      fetchDoctors();
    }
  }, [isBookingModalOpen, doctors.length]);

  // Handle opening doctor selection modal
  const handleOpenDoctorModal = () => {
    setTempSelectedDoctor(selectedDoctor);
    setIsDoctorModalOpen(true);
  };

  // Handle doctor selection in modal
  const handleDoctorSelection = () => {
    if (tempSelectedDoctor) {
      setSelectedDoctor(tempSelectedDoctor);
      bookingForm.setFieldsValue({ doctorId: tempSelectedDoctor.user_id });
    }
    setIsDoctorModalOpen(false);
    setTempSelectedDoctor(null);
  };

  // Handle closing doctor modal
  const handleCloseDoctorModal = () => {
    setIsDoctorModalOpen(false);
    setTempSelectedDoctor(null);
  };

  // Get doctor display name
  const getDoctorDisplayName = (doctor) => {
    if (!doctor) return "";
    return `Dr. ${doctor.first_name} ${doctor.last_name}`;
  };

  // Get doctor by user_id
  const getDoctorById = (userId) => {
    return doctors.find((doctor) => doctor.user_id === userId);
  };

  // Available time slots
  const TIME_SLOTS = [
    { value: "09:00", label: "9:00 AM", period: "Morning" },
    { value: "09:30", label: "9:30 AM", period: "Morning" },
    { value: "10:00", label: "10:00 AM", period: "Morning" },
    { value: "10:30", label: "10:30 AM", period: "Morning" },
    { value: "11:00", label: "11:00 AM", period: "Morning" },
    { value: "11:30", label: "11:30 AM", period: "Morning" },
    { value: "14:00", label: "2:00 PM", period: "Afternoon" },
    { value: "14:30", label: "2:30 PM", period: "Afternoon" },
    { value: "15:00", label: "3:00 PM", period: "Afternoon" },
    { value: "15:30", label: "3:30 PM", period: "Afternoon" },
    { value: "16:00", label: "4:00 PM", period: "Afternoon" },
    { value: "16:30", label: "4:30 PM", period: "Afternoon" },
    { value: "17:00", label: "5:00 PM", period: "Evening" },
    { value: "17:30", label: "5:30 PM", period: "Evening" },
    { value: "18:00", label: "6:00 PM", period: "Evening" },
  ];

  // Handle opening date modal
  const handleOpenDateModal = () => {
    setTempSelectedDate(selectedDate);
    setIsDateModalOpen(true);
  };

  // Handle date selection in modal
  const handleDateSelection = () => {
    if (tempSelectedDate) {
      setSelectedDate(tempSelectedDate);
      bookingForm.setFieldsValue({ appointmentDate: tempSelectedDate });
    }
    setIsDateModalOpen(false);
    setTempSelectedDate(null);
  };

  // Handle closing date modal
  const handleCloseDateModal = () => {
    setIsDateModalOpen(false);
    setTempSelectedDate(null);
  };

  // Handle opening time modal
  const handleOpenTimeModal = () => {
    setTempSelectedTime(selectedTime);
    setIsTimeModalOpen(true);
  };

  // Handle time selection in modal
  const handleTimeSelection = () => {
    if (tempSelectedTime) {
      setSelectedTime(tempSelectedTime);
      // Convert time string to dayjs time object
      const [hours, minutes] = tempSelectedTime.value.split(":");
      const timeObj = dayjs().hour(parseInt(hours)).minute(parseInt(minutes));
      bookingForm.setFieldsValue({ appointmentTime: timeObj });
    }
    setIsTimeModalOpen(false);
    setTempSelectedTime(null);
  };

  // Handle closing time modal
  const handleCloseTimeModal = () => {
    setIsTimeModalOpen(false);
    setTempSelectedTime(null);
  };

  // Get time slots grouped by period
  const getTimeSlotsByPeriod = () => {
    const grouped = {};
    TIME_SLOTS.forEach((slot) => {
      if (!grouped[slot.period]) {
        grouped[slot.period] = [];
      }
      grouped[slot.period].push(slot);
    });
    return grouped;
  };

  // Check if date is available (not past dates)
  const isDateAvailable = (date) => {
    return date.isAfter(dayjs().subtract(1, "day"));
  };

  // Booking handler
  const handleBookAppointment = async (values) => {
    setBookingLoading(true);

    const patientUserId = user.id;
    const { doctorId } = values;

    // Use selected date and time from state
    if (!selectedDate || !selectedTime) {
      message.error("Please select both date and time for the appointment.");
      setBookingLoading(false);
      return;
    }

    // Combine date and time
    const [hours, minutes] = selectedTime.value.split(":");
    const startDateTime = selectedDate
      .hour(parseInt(hours))
      .minute(parseInt(minutes))
      .second(0)
      .millisecond(0)
      .toDate();

    // End time is 2 hours after start time
    const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);

    const bookingPayload = {
      patient_user_id: patientUserId,
      doctor_user_id: doctorId,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
    };

    try {
      const response = await axios.post(
        `${SERVICE_URLS.appointments}/appointments/`,
        bookingPayload
      );

      if (response.status === 201) {
        message.success("Appointment booked successfully!");

        // Refetch appointments list
        const appointmentsResponse = await axios.get(
          `${SERVICE_URLS.appointments}/appointments/`,
          {
            params: { patient_user_id: patientUserId },
          }
        );
        setAppointments(appointmentsResponse.data);

        setIsBookingModalOpen(false);
        bookingForm.resetFields();
        setSelectedDoctor(null);
        setSelectedDate(null);
        setSelectedTime(null);
      } else {
        message.error("Failed to book appointment: Unexpected response.");
      }
    } catch (err) {
      console.error("Booking failed:", err);
      if (err.response) {
        if (err.response.status === 409) {
          message.error(
            `Booking failed: ${
              err.response.data.error || "Doctor not available."
            }`
          );
        } else if (err.response.data && err.response.data.error) {
          message.error(`Booking failed: ${err.response.data.error}`);
        } else {
          message.error(
            `Booking failed: ${err.response.status} ${err.response.statusText}`
          );
        }
      } else if (err.request) {
        message.error("Booking failed: Network error or service is down.");
      } else {
        message.error("An unexpected error occurred during booking.");
      }
    } finally {
      setBookingLoading(false);
    }
  };

  // Get status configuration
  const getStatusConfig = (status) => {
    switch (status) {
      case "completed":
        return {
          color: "#10b981",
          bgClass: "bg-gradient-to-r from-emerald-50 to-green-50",
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
          bgClass: "bg-gradient-to-r from-blue-50 to-indigo-50",
          textClass: "text-blue-700",
        };
    }
  };

  // Render loading skeleton
  if (loading) {
    return (
      <Layout className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Content className="p-8">
          <div className="max-w-7xl mx-auto">
            <Card className="glass-card shadow-2xl">
              <Skeleton active avatar paragraph={{ rows: 4 }} />
              <Divider />
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
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
          <div className="max-w-7xl mx-auto">
            <Card className="glass-card shadow-2xl">
              <Alert
                message="System Error"
                description={error}
                type="error"
                showIcon
                className="mb-6"
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

  // Render dashboard
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
              <Text className="text-blue-100 text-sm">Patient Dashboard</Text>
            </div>
          </div>
          <Button
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
              Welcome back, {patientProfile?.first_name || "Patient"}! 👋
            </Title>
            <Text className="text-slate-600 text-lg">
              Manage your health journey with our comprehensive platform
            </Text>
          </div>

          {/* Profile Section */}
          {patientProfile && (
            <Card
              className="glass-card shadow-xl border-0 hover:shadow-2xl transition-all duration-300 reveal-up"
              title={
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <UserOutlined className="text-white text-sm" />
                  </div>
                  <span className="text-slate-700 font-semibold">
                    Your Profile Information
                  </span>
                </div>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Text className="text-slate-500 text-sm font-medium">
                    Full Name
                  </Text>
                  <Text className="text-slate-800 font-semibold text-lg">
                    {patientProfile.first_name} {patientProfile.last_name}
                  </Text>
                </div>
                <div className="space-y-2">
                  <Text className="text-slate-500 text-sm font-medium">
                    Username
                  </Text>
                  <Text className="text-slate-800 font-semibold text-lg">
                    {patientProfile.username}
                  </Text>
                </div>
                <div className="space-y-2">
                  <Text className="text-slate-500 text-sm font-medium">
                    Email Address
                  </Text>
                  <Text className="text-slate-800 font-semibold text-lg">
                    {patientProfile.email}
                  </Text>
                </div>
                <div className="space-y-2">
                  <Text className="text-slate-500 text-sm font-medium">
                    Date of Birth
                  </Text>
                  <Text className="text-slate-800 font-semibold text-lg">
                    {patientProfile.date_of_birth || "Not specified"}
                  </Text>
                </div>
                <div className="space-y-2">
                  <Text className="text-slate-500 text-sm font-medium">
                    Phone Number
                  </Text>
                  <Text className="text-slate-800 font-semibold text-lg">
                    {patientProfile.phone_number || "Not specified"}
                  </Text>
                </div>
                <div className="space-y-2">
                  <Text className="text-slate-500 text-sm font-medium">
                    Address
                  </Text>
                  <Text className="text-slate-800 font-semibold text-lg">
                    {patientProfile.address || "Not specified"}
                  </Text>
                </div>
              </div>
              {patientProfile._user_error && (
                <Alert
                  message="Profile Warning"
                  description={`Could not load complete user data: ${patientProfile._user_error}`}
                  type="warning"
                  showIcon
                  className="mt-6 rounded-xl"
                />
              )}
            </Card>
          )}

          {/* Appointments Section */}
          <Card
            className="glass-card shadow-xl border-0 hover:shadow-2xl transition-all duration-300 reveal-up"
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <CalendarOutlined className="text-white text-sm" />
                  </div>
                  <span className="text-slate-700 font-semibold">
                    Your Appointments
                  </span>
                </div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsBookingModalOpen(true)}
                  className="rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                    border: "none",
                  }}
                >
                  Book New Appointment
                </Button>
              </div>
            }
          >
            {appointments.length > 0 ? (
              <List
                dataSource={appointments}
                renderItem={(appointment, index) => {
                  const statusConfig = getStatusConfig(appointment.status);

                  return (
                    <List.Item className="border-0 p-0 mb-4">
                      <Card
                        className={`w-full shadow-lg border-0 hover:shadow-xl transition-all duration-300 ${statusConfig.bgClass}`}
                        style={{
                          borderLeft: `4px solid ${statusConfig.color}`,
                          animationDelay: `${index * 0.1}s`,
                        }}
                      >
                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center">
                          <div className="flex-1 space-y-3">
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
                              <MedicineBoxOutlined className="text-slate-500" />
                              <Text className="text-slate-600">
                                <span className="font-medium">Doctor:</span>{" "}
                                {appointment.doctor
                                  ? `Dr. ${appointment.doctor.first_name} ${appointment.doctor.last_name}`
                                  : "Doctor information unavailable"}
                              </Text>
                            </div>

                            {appointment.doctor?.specialization && (
                              <div className="flex items-center space-x-2">
                                <Text className="text-slate-500 text-sm">
                                  <span className="font-medium">
                                    Specialization:
                                  </span>{" "}
                                  {appointment.doctor.specialization}
                                </Text>
                              </div>
                            )}

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
              <Empty
                description={
                  <div className="text-center py-8">
                    <CalendarOutlined className="text-4xl text-slate-400 mb-4" />
                    <Text className="text-slate-500 text-lg block mb-2">
                      No appointments scheduled
                    </Text>
                    <Text className="text-slate-400">
                      Book your first appointment to get started
                    </Text>
                  </div>
                }
              />
            )}
          </Card>

          {/* Medical History Section */}
          <Card
            className="glass-card shadow-xl border-0 hover:shadow-2xl transition-all duration-300 reveal-up"
            title={
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
                  <HistoryOutlined className="text-white text-sm" />
                </div>
                <span className="text-slate-700 font-semibold">
                  Medical History
                </span>
              </div>
            }
          >
            <div className="text-center py-8">
              <HistoryOutlined className="text-5xl text-slate-300 mb-4" />
              <Text className="text-slate-600 text-lg block mb-6">
                Access your complete medical history and records
              </Text>
              <Button
                type="primary"
                icon={<HistoryOutlined />}
                onClick={() => navigate(`/patient/medical-history`)}
                size="large"
                className="rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  border: "none",
                }}
              >
                View Detailed Medical History
              </Button>
            </div>
          </Card>
        </div>
      </Content>

      {/* Booking Modal */}
      <Modal
        title={
          <div className="flex items-center space-x-3 py-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <PlusOutlined className="text-white text-sm" />
            </div>
            <span className="text-slate-700 font-semibold text-lg">
              Book New Appointment
            </span>
          </div>
        }
        open={isBookingModalOpen}
        onCancel={() => {
          setIsBookingModalOpen(false);
          setSelectedDoctor(null);
          setSelectedDate(null);
          setSelectedTime(null);
          bookingForm.resetFields();
        }}
        footer={null}
        className="rounded-2xl"
        width={600}
      >
        <Form
          form={bookingForm}
          layout="vertical"
          onFinish={handleBookAppointment}
          className="pt-4"
        >
          <Form.Item
            name="doctorId"
            label={
              <Text className="font-medium text-slate-700">Select Doctor</Text>
            }
            rules={[{ required: true, message: "Please select a doctor" }]}
          >
            <Input
              readOnly
              placeholder="Click to select a doctor"
              value={selectedDoctor ? getDoctorDisplayName(selectedDoctor) : ""}
              onClick={handleOpenDoctorModal}
              suffix={<DownOutlined />}
              style={{ cursor: "pointer" }}
              className="rounded-xl"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="appointmentDate"
            label={
              <Text className="font-medium text-slate-700">
                Appointment Date
              </Text>
            }
            rules={[{ required: true, message: "Please select a date" }]}
          >
            <Input
              readOnly
              placeholder="Click to select appointment date"
              value={selectedDate ? selectedDate.format("MMMM DD, YYYY") : ""}
              onClick={handleOpenDateModal}
              suffix={<DownOutlined />}
              style={{ cursor: "pointer" }}
              className="rounded-xl"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="appointmentTime"
            label={
              <Text className="font-medium text-slate-700">Preferred Time</Text>
            }
            rules={[{ required: true, message: "Please select a time" }]}
          >
            <Input
              readOnly
              placeholder="Click to select preferred time"
              value={selectedTime ? selectedTime.label : ""}
              onClick={handleOpenTimeModal}
              suffix={<DownOutlined />}
              style={{ cursor: "pointer" }}
              className="rounded-xl"
              size="large"
            />
          </Form.Item>

          <Form.Item className="mb-0 pt-4">
            <Space className="w-full justify-end">
              <Button
                onClick={() => {
                  setIsBookingModalOpen(false);
                  setSelectedDoctor(null);
                  setSelectedDate(null);
                  setSelectedTime(null);
                  bookingForm.resetFields();
                }}
                className="rounded-xl"
                size="large"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={bookingLoading}
                size="large"
                className="rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                  border: "none",
                }}
              >
                {bookingLoading ? "Booking..." : "Book Appointment"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Doctor Selection Modal */}
      <Modal
        title={
          <div className="flex items-center space-x-3 py-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <UserOutlined className="text-white text-sm" />
            </div>
            <span className="text-slate-700 font-semibold text-lg">
              Select Your Doctor
            </span>
          </div>
        }
        open={isDoctorModalOpen}
        onCancel={handleCloseDoctorModal}
        onOk={handleDoctorSelection}
        okText="Select Doctor"
        cancelText="Cancel"
        width={700}
        className="rounded-2xl"
        okButtonProps={{
          disabled: !tempSelectedDoctor,
          className: "rounded-xl",
          size: "large",
          style: {
            background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
            border: "none",
          },
        }}
        cancelButtonProps={{
          className: "rounded-xl",
          size: "large",
        }}
      >
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {doctors.length > 0 ? (
            doctors.map((doctor) => (
              <Card
                key={doctor.user_id}
                hoverable
                className={`cursor-pointer transition-all duration-300 border-2 ${
                  tempSelectedDoctor?.user_id === doctor.user_id
                    ? "border-blue-500 bg-blue-50 shadow-lg"
                    : "border-gray-200 hover:border-blue-300 hover:shadow-md"
                }`}
                onClick={() => setTempSelectedDoctor(doctor)}
                size="small"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar
                      size={64}
                      icon={<UserOutlined />}
                      className="bg-gradient-to-br from-blue-500 to-indigo-500"
                    />
                    <div className="flex-1">
                      <Text strong className="text-lg text-slate-800 block">
                        Dr. {doctor.first_name} {doctor.last_name}
                      </Text>
                      <Text className="text-slate-600 block mb-2">
                        <span className="font-medium">Specialization:</span>{" "}
                        {doctor.specialization || "General Practice"}
                      </Text>
                      {doctor.phone_number && (
                        <Text className="text-slate-500 text-sm block">
                          <span className="font-medium">Phone:</span>{" "}
                          {doctor.phone_number}
                        </Text>
                      )}
                      {doctor.license_number && (
                        <Text className="text-slate-500 text-sm block">
                          <span className="font-medium">License:</span>{" "}
                          {doctor.license_number}
                        </Text>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    {tempSelectedDoctor?.user_id === doctor.user_id && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <StarOutlined className="text-yellow-500 text-sm" />
                      <Text className="text-slate-600 text-sm">4.8</Text>
                    </div>
                  </div>
                </div>

                {/* Display errors if present */}
                {doctor._user_error && (
                  <Alert
                    message="Warning"
                    description={`Doctor information incomplete: ${doctor._user_error}`}
                    type="warning"
                    showIcon
                    size="small"
                    className="mt-3 rounded-lg"
                  />
                )}
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <UserOutlined className="text-4xl text-slate-400 mb-4" />
              <Text className="text-slate-500 text-lg">
                No doctors available at the moment
              </Text>
            </div>
          )}
        </div>
      </Modal>

      {/* Date Selection Modal */}
      <Modal
        title={
          <div className="flex items-center space-x-3 py-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <CalendarOutlined className="text-white text-sm" />
            </div>
            <span className="text-slate-700 font-semibold text-lg">
              Select Appointment Date
            </span>
          </div>
        }
        open={isDateModalOpen}
        onCancel={handleCloseDateModal}
        onOk={handleDateSelection}
        okText="Select Date"
        cancelText="Cancel"
        width={600}
        className="rounded-2xl"
        okButtonProps={{
          disabled: !tempSelectedDate,
          className: "rounded-xl",
          size: "large",
          style: {
            background: "linear-gradient(135deg, #10b981, #059669)",
            border: "none",
          },
        }}
        cancelButtonProps={{
          className: "rounded-xl",
          size: "large",
        }}
      >
        <div className="py-4">
          <Text className="text-slate-600 mb-4 block">
            Choose your preferred appointment date. Dates in the past are not
            available.
          </Text>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {/* Calendar header */}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center font-medium text-slate-500 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }, (_, index) => {
              const startOfMonth = dayjs().startOf("month");
              const startOfCalendar = startOfMonth.startOf("week");
              const currentDate = startOfCalendar.add(index, "day");
              const isCurrentMonth = currentDate.month() === dayjs().month();
              const isToday = currentDate.isSame(dayjs(), "day");
              const isSelected =
                tempSelectedDate && currentDate.isSame(tempSelectedDate, "day");
              const isAvailable =
                isDateAvailable(currentDate) && isCurrentMonth;

              return (
                <div
                  key={index}
                  className={`
                    h-10 flex items-center justify-center text-sm rounded-lg cursor-pointer transition-all duration-200
                    ${
                      !isCurrentMonth ? "text-slate-300 cursor-not-allowed" : ""
                    }
                    ${
                      !isAvailable
                        ? "text-slate-400 cursor-not-allowed bg-slate-50"
                        : "hover:bg-blue-50"
                    }
                    ${isToday ? "bg-blue-100 text-blue-600 font-semibold" : ""}
                    ${
                      isSelected
                        ? "bg-blue-500 text-white font-semibold shadow-lg"
                        : ""
                    }
                  `}
                  onClick={() => {
                    if (isAvailable) {
                      setTempSelectedDate(currentDate);
                    }
                  }}
                >
                  {currentDate.date()}
                </div>
              );
            })}
          </div>

          {tempSelectedDate && (
            <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
              <Text className="text-blue-700 font-medium">
                Selected Date: {tempSelectedDate.format("MMMM DD, YYYY")} (
                {tempSelectedDate.format("dddd")})
              </Text>
            </div>
          )}
        </div>
      </Modal>

      {/* Time Selection Modal */}
      <Modal
        title={
          <div className="flex items-center space-x-3 py-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <ClockCircleOutlined className="text-white text-sm" />
            </div>
            <span className="text-slate-700 font-semibold text-lg">
              Select Appointment Time
            </span>
          </div>
        }
        open={isTimeModalOpen}
        onCancel={handleCloseTimeModal}
        onOk={handleTimeSelection}
        okText="Select Time"
        cancelText="Cancel"
        width={600}
        className="rounded-2xl"
        okButtonProps={{
          disabled: !tempSelectedTime,
          className: "rounded-xl",
          size: "large",
          style: {
            background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
            border: "none",
          },
        }}
        cancelButtonProps={{
          className: "rounded-xl",
          size: "large",
        }}
      >
        <div className="py-4">
          <Text className="text-slate-600 mb-4 block">
            Choose your preferred appointment time. Select from available time
            slots.
          </Text>

          {Object.entries(getTimeSlotsByPeriod()).map(([period, slots]) => (
            <div key={period} className="mb-6">
              <Text className="font-semibold text-slate-700 mb-3 block">
                {period}
              </Text>
              <div className="grid grid-cols-3 gap-3">
                {slots.map((slot) => (
                  <Card
                    key={slot.value}
                    hoverable
                    className={`cursor-pointer transition-all duration-200 text-center border-2 ${
                      tempSelectedTime?.value === slot.value
                        ? "border-purple-500 bg-purple-50 shadow-lg"
                        : "border-gray-200 hover:border-purple-300 hover:shadow-md"
                    }`}
                    onClick={() => setTempSelectedTime(slot)}
                    size="small"
                  >
                    <div className="py-2">
                      <ClockCircleOutlined
                        className={`text-lg mb-2 ${
                          tempSelectedTime?.value === slot.value
                            ? "text-purple-500"
                            : "text-slate-400"
                        }`}
                      />
                      <Text
                        strong
                        className={`block ${
                          tempSelectedTime?.value === slot.value
                            ? "text-purple-700"
                            : "text-slate-700"
                        }`}
                      >
                        {slot.label}
                      </Text>
                      {tempSelectedTime?.value === slot.value && (
                        <div className="mt-2">
                          <div className="w-4 h-4 bg-purple-500 rounded-full mx-auto"></div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {tempSelectedTime && (
            <div className="mt-4 p-3 bg-purple-50 rounded-xl border border-purple-200">
              <Text className="text-purple-700 font-medium">
                Selected Time: {tempSelectedTime.label} (
                {tempSelectedTime.period})
              </Text>
            </div>
          )}
        </div>
      </Modal>
    </Layout>
  );
};

export default PatientDashboard;
