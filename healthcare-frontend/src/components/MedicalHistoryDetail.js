// src/components/MedicalHistoryDetail.js
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
  Table,
  Spin,
  Row,
  Col,
} from "antd";
import {
  ArrowLeftOutlined,
  UserOutlined,
  HeartOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useUser } from "../context/UserContext";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const SERVICE_URLS = {
  medicalRecords: "http://localhost:8007/api",
};

// Helper function to format lab results in a readable table
const formatLabResults = (resultData) => {
  if (!resultData || typeof resultData !== "object") {
    return <Text type="secondary">No data available</Text>;
  }

  const dataSource = Object.entries(resultData).map(
    ([paramName, paramData], index) => ({
      key: index,
      parameter: paramName,
      value:
        paramData.value !== undefined
          ? typeof paramData.value === "number"
            ? paramData.value.toLocaleString()
            : paramData.value
          : "N/A",
      unit: paramData.unit || "",
      reference: paramData.reference_range || "Not specified",
    })
  );

  const columns = [
    {
      title: "Test Parameter",
      dataIndex: "parameter",
      key: "parameter",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Result",
      dataIndex: "value",
      key: "value",
      render: (text) => <Text className="font-mono">{text}</Text>,
    },
    {
      title: "Unit",
      dataIndex: "unit",
      key: "unit",
    },
    {
      title: "Reference Range",
      dataIndex: "reference",
      key: "reference",
      render: (text) => <Text type="secondary">{text}</Text>,
    },
  ];

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      pagination={false}
      size="small"
      className="mt-2"
    />
  );
};

const MedicalHistoryDetail = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const { patientId } = useParams();

  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async (targetPatientId) => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(
          `${SERVICE_URLS.medicalRecords}/patients/${targetPatientId}/medical_history/`
        );
        setHistoryData(response.data);
      } catch (err) {
        console.error("Error fetching medical history:", err);
        if (err.response && err.response.data && err.response.data.error) {
          setError(
            `Failed to fetch medical history: ${err.response.data.error}`
          );
        } else if (err.request) {
          setError(
            "Failed to fetch medical history: Network error or service is down."
          );
        } else {
          setError("An unexpected error occurred.");
        }
      } finally {
        setLoading(false);
      }
    };

    const targetPatientId =
      patientId || (user && user.user_type === "patient" ? user.id : null);

    if (targetPatientId) {
      fetchHistory(targetPatientId);
    } else if (!user) {
      navigate("/login");
      setLoading(false);
    } else {
      setError("Invalid access: Patient ID not specified.");
      setLoading(false);
    }
  }, [user, navigate, patientId]);

  const getBackPath = () => {
    if (user && user.user_type === "patient") return "/patient";
    if (user && user.user_type === "doctor") return "/doctor";
    return "/";
  };

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
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate(getBackPath())}
                >
                  Back to Dashboard
                </Button>
              }
            />
          </Card>
        </Content>
      </Layout>
    );
  }

  const {
    patient_user,
    patient_profile,
    vitals_history,
    lab_orders,
    lab_results,
    doctor_reports,
    _patient_user_error,
    _patient_profile_error,
    _vitals_history_error,
    _lab_orders_error,
    _lab_results_error,
    _doctor_reports_error,
  } = historyData || {};

  if (!historyData || Object.keys(historyData).length === 0) {
    return (
      <Layout className="min-h-screen">
        <Content className="p-6">
          <Card className="max-w-4xl mx-auto">
            <Title level={2}>Medical History</Title>
            <Text>No medical history found for this patient.</Text>
            <div className="mt-4">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(getBackPath())}
              >
                Back to Dashboard
              </Button>
            </div>
          </Card>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Header className="bg-blue-600 flex items-center justify-between px-6">
        <Title level={3} className="text-white m-0">
          Medical History for{" "}
          {patient_user
            ? `${patient_user.first_name} ${patient_user.last_name}`
            : `Patient ID: ${patientId || user?.id || "N/A"}`}
        </Title>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(getBackPath())}
        >
          Back to Dashboard
        </Button>
      </Header>

      <Content className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Patient Details Card */}
          <Card
            title={
              <>
                <UserOutlined className="mr-2" />
                Patient Details
              </>
            }
          >
            <Row gutter={[16, 16]}>
              {patient_user ? (
                <>
                  <Col span={8}>
                    <Text strong>Name: </Text>
                    <Text>
                      {patient_user.first_name} {patient_user.last_name}
                    </Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Username: </Text>
                    <Text>{patient_user.username}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Email: </Text>
                    <Text>{patient_user.email}</Text>
                  </Col>
                </>
              ) : (
                <Col span={24}>
                  {_patient_user_error ? (
                    <Alert
                      message="Error loading patient user"
                      description={_patient_user_error}
                      type="error"
                      showIcon
                    />
                  ) : (
                    <Text type="secondary">Patient user not available.</Text>
                  )}
                </Col>
              )}

              {patient_profile ? (
                <>
                  <Col span={8}>
                    <Text strong>Date of Birth: </Text>
                    <Text>{patient_profile.date_of_birth || "N/A"}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Phone: </Text>
                    <Text>{patient_profile.phone_number || "N/A"}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>Address: </Text>
                    <Text>{patient_profile.address || "N/A"}</Text>
                  </Col>
                </>
              ) : (
                <Col span={24}>
                  {_patient_profile_error ? (
                    <Alert
                      message="Error loading patient profile"
                      description={_patient_profile_error}
                      type="error"
                      showIcon
                      className="mt-4"
                    />
                  ) : (
                    <Text type="secondary">Patient profile not available.</Text>
                  )}
                </Col>
              )}
            </Row>
          </Card>

          {/* Vitals History Card */}
          <Card
            title={
              <>
                <HeartOutlined className="mr-2" />
                Vitals History
              </>
            }
          >
            {vitals_history && vitals_history.length > 0 ? (
              <List
                dataSource={vitals_history}
                renderItem={(vital) => (
                  <List.Item>
                    <Card className="w-full shadow-sm border-l-4 border-l-red-500">
                      <div className="mb-3">
                        <Text strong className="text-red-600">
                          <ClockCircleOutlined className="mr-2" />
                          {new Date(vital.timestamp).toLocaleString()}
                        </Text>
                        <Text className="ml-4">
                          by Nurse{" "}
                          {vital.nurse
                            ? `${vital.nurse.first_name} ${vital.nurse.last_name}`
                            : vital._nurse_user_error || "N/A"}
                        </Text>
                      </div>

                      <Row gutter={[16, 8]}>
                        {vital.temperature_celsius !== null && (
                          <Col span={12} lg={8}>
                            <Text type="secondary">Temperature: </Text>
                            <Text strong>{vital.temperature_celsius}°C</Text>
                          </Col>
                        )}
                        {(vital.blood_pressure_systolic !== null ||
                          vital.blood_pressure_diastolic !== null) && (
                          <Col span={12} lg={8}>
                            <Text type="secondary">Blood Pressure: </Text>
                            <Text strong>
                              {vital.blood_pressure_systolic || "?"}/
                              {vital.blood_pressure_diastolic || "?"} mmHg
                            </Text>
                          </Col>
                        )}
                        {vital.heart_rate_bpm !== null && (
                          <Col span={12} lg={8}>
                            <Text type="secondary">Heart Rate: </Text>
                            <Text strong>{vital.heart_rate_bpm} bpm</Text>
                          </Col>
                        )}
                        {vital.respiratory_rate_bpm !== null && (
                          <Col span={12} lg={8}>
                            <Text type="secondary">Respiratory Rate: </Text>
                            <Text strong>{vital.respiratory_rate_bpm} bpm</Text>
                          </Col>
                        )}
                        {vital.oxygen_saturation_percentage !== null && (
                          <Col span={12} lg={8}>
                            <Text type="secondary">O₂ Saturation: </Text>
                            <Text strong>
                              {vital.oxygen_saturation_percentage}%
                            </Text>
                          </Col>
                        )}
                      </Row>

                      {vital.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <Text strong>Notes: </Text>
                          <Text italic>{vital.notes}</Text>
                        </div>
                      )}

                      {/* Display errors if present */}
                      {(vital._patient_user_error ||
                        vital._nurse_user_error) && (
                        <div className="mt-3 space-y-2">
                          {vital._patient_user_error && (
                            <Alert
                              message="Warning"
                              description={`Patient user missing: ${vital._patient_user_error}`}
                              type="warning"
                              showIcon
                              size="small"
                            />
                          )}
                          {vital._nurse_user_error && (
                            <Alert
                              message="Warning"
                              description={`Nurse user missing: ${vital._nurse_user_error}`}
                              type="warning"
                              showIcon
                              size="small"
                            />
                          )}
                        </div>
                      )}
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <div className="text-center py-8">
                {_vitals_history_error ? (
                  <Alert
                    message="Error loading vitals history"
                    description={_vitals_history_error}
                    type="error"
                    showIcon
                  />
                ) : (
                  <Text type="secondary">No vitals history available.</Text>
                )}
              </div>
            )}
          </Card>

          {/* Lab Orders Card */}
          <Card
            title={
              <>
                <ExperimentOutlined className="mr-2" />
                Lab Orders
              </>
            }
          >
            {lab_orders && lab_orders.length > 0 ? (
              <List
                dataSource={lab_orders}
                renderItem={(order) => (
                  <List.Item>
                    <Card className="w-full shadow-sm border-l-4 border-l-green-500">
                      <div className="flex items-center gap-3 mb-2">
                        <Title level={5} className="m-0">
                          {order.test_type}
                        </Title>
                        <Tag
                          color={
                            order.status === "ordered"
                              ? "blue"
                              : order.status === "completed"
                              ? "green"
                              : "orange"
                          }
                        >
                          {order.status.toUpperCase()}
                        </Tag>
                      </div>

                      <Space
                        direction="vertical"
                        size="small"
                        className="w-full"
                      >
                        <div>
                          <Text strong>Ordered on: </Text>
                          <Text>
                            {new Date(order.order_date).toLocaleDateString()}
                          </Text>
                          <Text className="mx-2">by</Text>
                          <Text strong>Dr. </Text>
                          <Text>
                            {order.doctor
                              ? `${order.doctor.first_name} ${order.doctor.last_name}`
                              : order._doctor_user_error || "N/A"}
                          </Text>
                        </div>

                        {order.notes && (
                          <div className="p-3 bg-blue-50 rounded">
                            <Text strong>Doctor's Notes: </Text>
                            <Text italic>{order.notes}</Text>
                          </div>
                        )}
                      </Space>

                      {/* Display errors if present */}
                      <div className="mt-3 space-y-2">
                        {order._patient_user_error && (
                          <Alert
                            message="Warning"
                            description={`Patient user missing for this order: ${order._patient_user_error}`}
                            type="warning"
                            showIcon
                            size="small"
                          />
                        )}
                        {order._doctor_user_error && (
                          <Alert
                            message="Warning"
                            description={`Doctor user missing for this order: ${order._doctor_user_error}`}
                            type="warning"
                            showIcon
                            size="small"
                          />
                        )}
                        {order._order_error && (
                          <Alert
                            message="Error"
                            description={`Error loading order details: ${order._order_error}`}
                            type="error"
                            showIcon
                            size="small"
                          />
                        )}
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <div className="text-center py-8">
                {_lab_orders_error ? (
                  <Alert
                    message="Error loading lab orders"
                    description={_lab_orders_error}
                    type="error"
                    showIcon
                  />
                ) : (
                  <Text type="secondary">No lab orders found.</Text>
                )}
              </div>
            )}
          </Card>

          {/* Lab Results Card */}
          <Card
            title={
              <>
                <ExperimentOutlined className="mr-2" />
                Lab Results
              </>
            }
          >
            {lab_results && lab_results.length > 0 ? (
              <List
                dataSource={lab_results}
                renderItem={(result) => (
                  <List.Item>
                    <Card className="w-full shadow-sm border-l-4 border-l-orange-500">
                      <div className="flex items-center gap-3 mb-3">
                        <Title level={5} className="m-0">
                          {result.order
                            ? result.order.test_type
                            : "Unknown Test"}
                        </Title>
                        <Tag
                          color={
                            result.status === "final"
                              ? "green"
                              : result.status === "preliminary"
                              ? "orange"
                              : "blue"
                          }
                        >
                          {result.status.toUpperCase()}
                        </Tag>
                      </div>

                      <Space
                        direction="vertical"
                        size="small"
                        className="w-full"
                      >
                        <div>
                          <Text strong>Result Date: </Text>
                          <Text>
                            {new Date(result.result_date).toLocaleDateString()}
                          </Text>
                          <Text className="mx-2">by</Text>
                          <Text strong>Lab Tech </Text>
                          <Text>
                            {result.lab_technician
                              ? `${result.lab_technician.first_name} ${result.lab_technician.last_name}`
                              : result._lab_technician_user_error || "N/A"}
                          </Text>
                        </div>

                        {/* Lab Results Table */}
                        <div className="mt-3">
                          <Text strong className="mb-2 block">
                            Test Results:
                          </Text>
                          {formatLabResults(result.result_data)}
                        </div>

                        {result.notes && (
                          <div className="p-3 bg-orange-50 rounded mt-3">
                            <Text strong>Technician's Notes: </Text>
                            <Text italic>{result.notes}</Text>
                          </div>
                        )}

                        {result.order && (
                          <div className="mt-3 p-3 bg-gray-50 rounded">
                            <Text strong>Order Details: </Text>
                            <br />
                            <Text>
                              Order Date:{" "}
                              {new Date(
                                result.order.order_date
                              ).toLocaleDateString()}
                            </Text>
                            <br />
                            <Text>
                              Ordered by Dr.{" "}
                              {result.order.doctor
                                ? `${result.order.doctor.first_name} ${result.order.doctor.last_name}`
                                : result.order._doctor_user_error || "N/A"}
                            </Text>
                          </div>
                        )}
                      </Space>

                      {/* Display errors if present */}
                      <div className="mt-3 space-y-2">
                        {result._order_error && (
                          <Alert
                            message="Error"
                            description={`Error loading associated order: ${result._order_error}`}
                            type="error"
                            showIcon
                            size="small"
                          />
                        )}
                        {result.order && result.order._patient_user_error && (
                          <Alert
                            message="Warning"
                            description={`Patient user missing for this order: ${result.order._patient_user_error}`}
                            type="warning"
                            showIcon
                            size="small"
                          />
                        )}
                        {result.order && result.order._doctor_user_error && (
                          <Alert
                            message="Warning"
                            description={`Doctor user missing for this order: ${result.order._doctor_user_error}`}
                            type="warning"
                            showIcon
                            size="small"
                          />
                        )}
                        {result._lab_technician_user_error && (
                          <Alert
                            message="Warning"
                            description={`Lab Tech user missing: ${result._lab_technician_user_error}`}
                            type="warning"
                            showIcon
                            size="small"
                          />
                        )}
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <div className="text-center py-8">
                {_lab_results_error ? (
                  <Alert
                    message="Error loading lab results"
                    description={_lab_results_error}
                    type="error"
                    showIcon
                  />
                ) : (
                  <Text type="secondary">No lab results found.</Text>
                )}
              </div>
            )}
          </Card>

          {/* Doctor Reports Card */}
          <Card
            title={
              <>
                <FileTextOutlined className="mr-2" />
                Doctor Reports
              </>
            }
          >
            {doctor_reports && doctor_reports.length > 0 ? (
              <List
                dataSource={doctor_reports}
                renderItem={(report) => (
                  <List.Item>
                    <Card className="w-full shadow-sm border-l-4 border-l-blue-500">
                      <div className="mb-3">
                        <Title level={5} className="text-blue-600 m-0">
                          {report.title}
                        </Title>
                        <Text type="secondary" className="block mt-1">
                          {new Date(report.report_date).toLocaleDateString()}
                          <Text className="mx-2">by</Text>
                          <Text strong>Dr. </Text>
                          {report.doctor
                            ? `${report.doctor.first_name} ${report.doctor.last_name}`
                            : report._doctor_user_error || "N/A"}
                        </Text>
                      </div>

                      <div className="p-4 bg-blue-50 rounded">
                        <Text>{report.content}</Text>
                      </div>

                      {/* Display errors if present */}
                      <div className="mt-3 space-y-2">
                        {report._patient_user_error && (
                          <Alert
                            message="Warning"
                            description={`Patient user missing for this report: ${report._patient_user_error}`}
                            type="warning"
                            showIcon
                            size="small"
                          />
                        )}
                        {report._doctor_user_error && (
                          <Alert
                            message="Warning"
                            description={`Doctor user missing for this report: ${report._doctor_user_error}`}
                            type="warning"
                            showIcon
                            size="small"
                          />
                        )}
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <div className="text-center py-8">
                {_doctor_reports_error ? (
                  <Alert
                    message="Error loading doctor reports"
                    description={_doctor_reports_error}
                    type="error"
                    showIcon
                  />
                ) : (
                  <Text type="secondary">No doctor reports found.</Text>
                )}
              </div>
            )}
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default MedicalHistoryDetail;
