// src/components/PharmacistDashboard.js
import React, { useState, useEffect } from "react";
import {
  Layout,
  Typography,
  Card,
  Button,
  Alert,
  Space,
  List,
  Tag,
  Spin,
  message,
  Modal,
} from "antd";
import {
  UserOutlined,
  MedicineBoxOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { confirm } = Modal;

// Service URLs
const SERVICE_URLS = {
  pharmacist: "http://localhost:8003/api",
  prescription: "http://localhost:8008/api",
};

const PharmacistDashboard = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  // State for fetched data
  const [pharmacistProfile, setPharmacistProfile] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for fulfillment action
  const [fulfillingId, setFulfillingId] = useState(null);

  // Data Fetching
  useEffect(() => {
    const fetchPharmacistData = async () => {
      setLoading(true);
      setError(null);

      const pharmacistUserId = user.id;

      try {
        // 1. Fetch Pharmacist Profile
        const profileResponse = await axios.get(
          `${SERVICE_URLS.pharmacist}/pharmacists/${pharmacistUserId}/`
        );
        setPharmacistProfile(profileResponse.data);

        // 2. Fetch Prescriptions
        const prescriptionsResponse = await axios.get(
          `${SERVICE_URLS.prescription}/prescriptions/`,
          {
            params: { status: "active" },
          }
        );
        const sortedPrescriptions = prescriptionsResponse.data.sort(
          (a, b) =>
            new Date(b.prescription_date) - new Date(a.prescription_date)
        );
        setPrescriptions(sortedPrescriptions);
      } catch (err) {
        console.error("Error fetching pharmacist data:", err);
        if (err.response && err.response.data && err.response.data.error) {
          setError(
            `Failed to fetch pharmacist data: ${err.response.data.error}`
          );
        } else if (err.request) {
          setError(
            "Failed to fetch pharmacist data: Network error or service is down."
          );
        } else {
          setError("An unexpected error occurred while fetching data.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (user && user.id && user.user_type === "pharmacist") {
      fetchPharmacistData();
    } else {
      setLoading(false);
    }
  }, [user, navigate]);

  // Handle Fulfill Prescription
  const handleFulfillPrescription = (prescriptionId, medicationName) => {
    confirm({
      title: "Fulfill Prescription",
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to fulfill this prescription for ${medicationName}?`,
      okText: "Yes, Fulfill",
      okType: "primary",
      cancelText: "Cancel",
      onOk: async () => {
        setFulfillingId(prescriptionId);

        const pharmacistUserId = user.id;
        const fulfillmentPayload = {
          prescription_id: prescriptionId,
          pharmacist_user_id: pharmacistUserId,
        };

        try {
          const response = await axios.post(
            `${SERVICE_URLS.pharmacist}/pharmacists/fulfill/`,
            fulfillmentPayload
          );

          if (response.status === 200) {
            message.success("Prescription fulfilled successfully!");

            // Refetch active prescriptions
            const prescriptionsResponse = await axios.get(
              `${SERVICE_URLS.prescription}/prescriptions/`,
              {
                params: { status: "active" },
              }
            );
            const sortedPrescriptions = prescriptionsResponse.data.sort(
              (a, b) =>
                new Date(b.prescription_date) - new Date(a.prescription_date)
            );
            setPrescriptions(sortedPrescriptions);
          }
        } catch (err) {
          console.error("Fulfillment failed:", err);
          if (err.response && err.response.data && err.response.data.error) {
            message.error(`Fulfillment failed: ${err.response.data.error}`);
          } else {
            message.error("Fulfillment failed. Please try again.");
          }
        } finally {
          setFulfillingId(null);
        }
      },
    });
  };

  // Early return for redirection
  if (!user || user.user_type !== "pharmacist") {
    navigate("/login");
    return <div>Redirecting...</div>;
  }

  // Render loading state
  if (loading) {
    return (
      <Layout className="min-h-screen">
        <Content className="flex items-center justify-center">
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  // Render error state
  if (error) {
    return (
      <Layout className="min-h-screen">
        <Content className="p-6">
          <Card className="max-w-4xl mx-auto">
            <Alert
              message="Error"
              description={error}
              type="error"
              showIcon
              action={
                <Button danger onClick={logout}>
                  Logout
                </Button>
              }
            />
          </Card>
        </Content>
      </Layout>
    );
  }

  // Get status color and text
  const getStatusConfig = (status) => {
    switch (status) {
      case "active":
        return { color: "blue", text: "Active" };
      case "fulfilled":
        return { color: "green", text: "Fulfilled" };
      case "expired":
        return { color: "red", text: "Expired" };
      default:
        return { color: "default", text: status };
    }
  };

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Header className="bg-purple-600 flex items-center justify-between px-6">
        <Title level={3} className="text-white m-0">
          Healthcare Management System - Pharmacist
        </Title>
        <Button danger onClick={logout}>
          Logout
        </Button>
      </Header>

      <Content className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Pharmacist Profile Card */}
          {pharmacistProfile && (
            <Card
              title={
                <>
                  <UserOutlined className="mr-2" />
                  Your Profile
                </>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Text strong>Name: </Text>
                  <Text>
                    {pharmacistProfile.first_name} {pharmacistProfile.last_name}
                  </Text>
                </div>
                <div>
                  <Text strong>Username: </Text>
                  <Text>{pharmacistProfile.username}</Text>
                </div>
                <div>
                  <Text strong>Email: </Text>
                  <Text>{pharmacistProfile.email}</Text>
                </div>
                <div>
                  <Text strong>Pharmacy Name: </Text>
                  <Text>{pharmacistProfile.pharmacy_name || "N/A"}</Text>
                </div>
                <div>
                  <Text strong>Pharmacy License: </Text>
                  <Text>
                    {pharmacistProfile.pharmacy_license_number || "N/A"}
                  </Text>
                </div>
                <div>
                  <Text strong>Phone: </Text>
                  <Text>{pharmacistProfile.phone_number || "N/A"}</Text>
                </div>
              </div>
              {pharmacistProfile._user_error && (
                <Alert
                  message="Warning"
                  description={`Could not load all user data: ${pharmacistProfile._user_error}`}
                  type="warning"
                  showIcon
                  className="mt-4"
                />
              )}
            </Card>
          )}

          {/* Active Prescriptions Card */}
          <Card
            title={
              <>
                <MedicineBoxOutlined className="mr-2" />
                Active Prescriptions
              </>
            }
          >
            {prescriptions.length > 0 ? (
              <List
                dataSource={prescriptions}
                renderItem={(prescription) => {
                  const statusConfig = getStatusConfig(prescription.status);

                  return (
                    <List.Item>
                      <Card className="w-full shadow-sm border-l-4 border-l-purple-500">
                        <div className="flex flex-col lg:flex-row lg:justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <Title level={5} className="m-0">
                                {prescription.medication_name}
                              </Title>
                              <Tag color={statusConfig.color}>
                                {statusConfig.text}
                              </Tag>
                            </div>

                            <Space
                              direction="vertical"
                              size="small"
                              className="w-full"
                            >
                              <div>
                                <Text strong>Dosage: </Text>
                                <Text>{prescription.dosage}</Text>
                                <Text className="mx-2">•</Text>
                                <Text strong>Frequency: </Text>
                                <Text>{prescription.frequency}</Text>
                                <Text className="mx-2">•</Text>
                                <Text strong>Duration: </Text>
                                <Text>{prescription.duration}</Text>
                              </div>

                              <div>
                                <Text strong>Prescribed on: </Text>
                                <Text>
                                  {new Date(
                                    prescription.prescription_date
                                  ).toLocaleDateString()}
                                </Text>
                                <Text className="mx-2">by</Text>
                                <Text strong>Dr. </Text>
                                <Text>
                                  {prescription.doctor
                                    ? `${prescription.doctor.first_name} ${prescription.doctor.last_name}`
                                    : prescription._doctor_user_error || "N/A"}
                                </Text>
                              </div>

                              <div>
                                <Text strong>For Patient: </Text>
                                <Text>
                                  {prescription.patient
                                    ? `${prescription.patient.first_name} ${prescription.patient.last_name}`
                                    : prescription._patient_user_error || "N/A"}
                                </Text>
                              </div>

                              {prescription.notes && (
                                <div className="p-3 bg-gray-50 rounded mt-2">
                                  <Text strong>Notes: </Text>
                                  <Text italic>{prescription.notes}</Text>
                                </div>
                              )}

                              {prescription.fulfilled_by_pharmacist && (
                                <div className="p-3 bg-green-50 rounded mt-2 border border-green-200">
                                  <Text strong>Fulfilled by: </Text>
                                  <Text>
                                    {
                                      prescription.fulfilled_by_pharmacist
                                        .first_name
                                    }{" "}
                                    {
                                      prescription.fulfilled_by_pharmacist
                                        .last_name
                                    }
                                  </Text>
                                  <Text className="mx-2">on</Text>
                                  <Text>
                                    {new Date(
                                      prescription.fulfilled_date
                                    ).toLocaleDateString()}
                                  </Text>
                                </div>
                              )}
                            </Space>
                          </div>

                          {/* Action button */}
                          {prescription.status === "active" && (
                            <div className="mt-4 lg:mt-0 lg:ml-4 flex items-start">
                              <Button
                                type="primary"
                                icon={<CheckCircleOutlined />}
                                loading={fulfillingId === prescription.id}
                                onClick={() =>
                                  handleFulfillPrescription(
                                    prescription.id,
                                    prescription.medication_name
                                  )
                                }
                                size="large"
                              >
                                {fulfillingId === prescription.id
                                  ? "Fulfilling..."
                                  : "Fulfill"}
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Display errors if present */}
                        <div className="mt-3 space-y-2">
                          {prescription._patient_user_error && (
                            <Alert
                              message="Warning"
                              description={`Patient user missing: ${prescription._patient_user_error}`}
                              type="warning"
                              showIcon
                              size="small"
                            />
                          )}
                          {prescription._doctor_user_error && (
                            <Alert
                              message="Warning"
                              description={`Doctor user missing: ${prescription._doctor_user_error}`}
                              type="warning"
                              showIcon
                              size="small"
                            />
                          )}
                          {prescription._pharmacist_user_error && (
                            <Alert
                              message="Warning"
                              description={`Pharmacist user missing: ${prescription._pharmacist_user_error}`}
                              type="warning"
                              showIcon
                              size="small"
                            />
                          )}
                        </div>
                      </Card>
                    </List.Item>
                  );
                }}
              />
            ) : (
              <div className="text-center py-8">
                <MedicineBoxOutlined className="text-4xl text-gray-400 mb-4" />
                <Text type="secondary" className="text-lg">
                  No active prescriptions found.
                </Text>
              </div>
            )}
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default PharmacistDashboard;
