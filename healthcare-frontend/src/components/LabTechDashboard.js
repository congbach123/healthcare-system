// src/components/LabTechDashboard.js
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
  Table,
  Tag,
} from "antd";
import {
  UserOutlined,
  ExperimentOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
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
  lab: "http://localhost:8006/api",
  patient: "http://localhost:8001/api",
};

// Common lab test templates
const TEST_TEMPLATES = {
  "Complete Blood Count": [
    { name: "Hemoglobin", defaultUnit: "g/dL", defaultRange: "13.5-17.5" },
    {
      name: "White Blood Cells",
      defaultUnit: "x10^3/uL",
      defaultRange: "4.0-11.0",
    },
    { name: "Platelets", defaultUnit: "x10^3/uL", defaultRange: "150-400" },
    {
      name: "Red Blood Cells",
      defaultUnit: "x10^6/uL",
      defaultRange: "4.5-5.9",
    },
    { name: "Hematocrit", defaultUnit: "%", defaultRange: "41-50" },
  ],
  "Lipid Panel": [
    { name: "Total Cholesterol", defaultUnit: "mg/dL", defaultRange: "<200" },
    { name: "LDL Cholesterol", defaultUnit: "mg/dL", defaultRange: "<100" },
    { name: "HDL Cholesterol", defaultUnit: "mg/dL", defaultRange: ">40" },
    { name: "Triglycerides", defaultUnit: "mg/dL", defaultRange: "<150" },
  ],
  "Basic Metabolic Panel": [
    { name: "Glucose", defaultUnit: "mg/dL", defaultRange: "70-99" },
    { name: "Calcium", defaultUnit: "mg/dL", defaultRange: "8.5-10.5" },
    { name: "Sodium", defaultUnit: "mmol/L", defaultRange: "135-145" },
    { name: "Potassium", defaultUnit: "mmol/L", defaultRange: "3.5-5.0" },
    { name: "CO2", defaultUnit: "mmol/L", defaultRange: "23-29" },
    { name: "Chloride", defaultUnit: "mmol/L", defaultRange: "96-106" },
    { name: "BUN", defaultUnit: "mg/dL", defaultRange: "7-20" },
    { name: "Creatinine", defaultUnit: "mg/dL", defaultRange: "0.6-1.2" },
  ],
  "Liver Function Tests": [
    { name: "ALT", defaultUnit: "U/L", defaultRange: "7-56" },
    { name: "AST", defaultUnit: "U/L", defaultRange: "5-40" },
    { name: "ALP", defaultUnit: "U/L", defaultRange: "44-147" },
    { name: "Total Bilirubin", defaultUnit: "mg/dL", defaultRange: "0.1-1.2" },
    { name: "Albumin", defaultUnit: "g/dL", defaultRange: "3.4-5.4" },
  ],
};

// Helper function to format lab result data for display
const formatLabResultData = (resultData, testType = "Unknown Test Type") => {
  if (!resultData || typeof resultData !== "object") {
    return (
      <div className="p-3 bg-gray-50 rounded">
        <Text strong>Result Data (Raw):</Text>
        <pre className="mt-2 text-sm">
          {JSON.stringify(resultData, null, 2)}
        </pre>
      </div>
    );
  }

  const dataSource = Object.entries(resultData).map(([key, value], index) => ({
    key: index,
    parameter: key,
    value: value.value !== undefined ? value.value : "N/A",
    unit: value.unit || "",
    reference: value.reference_range || "",
  }));

  const columns = [
    {
      title: "Parameter",
      dataIndex: "parameter",
      key: "parameter",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Value",
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
    <div className="mt-3">
      <Text strong className="block mb-2">
        {testType.toLowerCase().includes("blood count")
          ? "CBC Results:"
          : "Test Results:"}
      </Text>
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        size="small"
      />
    </div>
  );
};

const LabTechDashboard = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  // State for fetched data
  const [labTechProfile, setLabTechProfile] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [recordedResults, setRecordedResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal and form states
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [resultForm] = Form.useForm();
  const [resultLoading, setResultLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Test parameters state
  const [testParameters, setTestParameters] = useState([]);
  const [customParamName, setCustomParamName] = useState("");
  const [selectedTestType, setSelectedTestType] = useState("");

  // Data Fetching
  useEffect(() => {
    const fetchLabTechData = async () => {
      setLoading(true);
      setError(null);

      const labTechUserId = user.id;

      try {
        // 1. Fetch Lab Technician Profile
        const profileResponse = await axios.get(
          `${SERVICE_URLS.lab}/labtechs/${labTechUserId}/`
        );
        setLabTechProfile(profileResponse.data);

        // 2. Fetch Pending Lab Orders
        const ordersResponse = await axios.get(`${SERVICE_URLS.lab}/orders/`, {
          params: { status: "ordered" },
        });
        const sortedOrders = ordersResponse.data.sort(
          (a, b) => new Date(a.order_date) - new Date(b.order_date)
        );
        setPendingOrders(sortedOrders);

        // 3. Fetch Lab Results Recorded by This Lab Technician
        const resultsResponse = await axios.get(
          `${SERVICE_URLS.lab}/results/`,
          {
            params: { lab_technician_user_id: labTechUserId },
          }
        );
        setRecordedResults(resultsResponse.data);
      } catch (err) {
        console.error("Error fetching lab technician data:", err);
        if (err.response && err.response.data && err.response.data.error) {
          setError(
            `Failed to fetch lab technician data: ${err.response.data.error}`
          );
        } else if (err.request) {
          setError(
            "Failed to fetch lab technician data: Network error or service is down."
          );
        } else {
          setError("An unexpected error occurred while fetching data.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (user && user.id && user.user_type === "lab_technician") {
      fetchLabTechData();
    } else {
      setLoading(false);
    }
  }, [user, navigate]);

  // Handle applying a test template
  const applyTestTemplate = (templateName) => {
    if (TEST_TEMPLATES[templateName]) {
      const newParams = TEST_TEMPLATES[templateName].map((param) => ({
        name: param.name,
        value: "",
        unit: param.defaultUnit,
        reference_range: param.defaultRange,
      }));
      setTestParameters(newParams);
      setSelectedTestType(templateName);
    }
  };

  // Handle parameter value changes
  const handleParameterChange = (index, field, value) => {
    const updatedParams = [...testParameters];
    updatedParams[index] = { ...updatedParams[index], [field]: value };
    setTestParameters(updatedParams);
  };

  // Add a custom parameter
  const handleAddCustomParameter = () => {
    if (customParamName.trim()) {
      setTestParameters([
        ...testParameters,
        {
          name: customParamName.trim(),
          value: "",
          unit: "",
          reference_range: "",
        },
      ]);
      setCustomParamName("");
    }
  };

  // Remove a parameter
  const handleRemoveParameter = (index) => {
    const updatedParams = [...testParameters];
    updatedParams.splice(index, 1);
    setTestParameters(updatedParams);
  };

  // Handle Start Record Result
  const handleStartRecordResult = (order = null) => {
    setSelectedOrder(order);
    setTestParameters([]);
    setCustomParamName("");
    setIsResultModalOpen(true);

    resultForm.setFieldsValue({
      lab_order_id: order?.id || "",
      result_date: dayjs(),
      status: "final",
    });

    if (order) {
      const testType = order.test_type;
      setSelectedTestType(testType);

      // If we have a template for this test type, apply it
      if (TEST_TEMPLATES[testType]) {
        applyTestTemplate(testType);
      }
    }
  };

  // Handle Submit Result
  const handleSubmitResult = async (values) => {
    setResultLoading(true);

    const labTechUserId = user.id;

    // Validate test parameters
    if (testParameters.length === 0) {
      message.error("Please add at least one test parameter.");
      setResultLoading(false);
      return;
    }

    const missingValues = testParameters.some((param) => !param.value);
    if (missingValues) {
      message.error("Please enter values for all test parameters.");
      setResultLoading(false);
      return;
    }

    // Convert the structured test parameters to the required result_data JSON format
    const resultData = {};
    testParameters.forEach((param) => {
      resultData[param.name] = {
        value: isNaN(parseFloat(param.value))
          ? param.value
          : parseFloat(param.value),
        unit: param.unit,
        reference_range: param.reference_range,
      };
    });

    const resultPayload = {
      lab_order_id: values.lab_order_id,
      lab_technician_user_id: labTechUserId,
      result_date: values.result_date.toISOString(),
      result_data: resultData,
      status: values.status,
      notes: values.notes || null,
    };

    try {
      const response = await axios.post(
        `${SERVICE_URLS.lab}/results/`,
        resultPayload
      );

      if (response.status === 201) {
        message.success("Lab result recorded successfully!");

        // Refetch pending orders and recorded results
        const ordersResponse = await axios.get(`${SERVICE_URLS.lab}/orders/`, {
          params: { status: "ordered" },
        });
        const sortedOrders = ordersResponse.data.sort(
          (a, b) => new Date(a.order_date) - new Date(b.order_date)
        );
        setPendingOrders(sortedOrders);

        const resultsResponse = await axios.get(
          `${SERVICE_URLS.lab}/results/`,
          {
            params: { lab_technician_user_id: labTechUserId },
          }
        );
        setRecordedResults(resultsResponse.data);

        setIsResultModalOpen(false);
        resultForm.resetFields();
        setTestParameters([]);
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error("Recording result failed:", err);
      if (err.response && err.response.data && err.response.data.error) {
        message.error(`Failed to record result: ${err.response.data.error}`);
      } else {
        message.error("Failed to record result. Please try again.");
      }
    } finally {
      setResultLoading(false);
    }
  };

  // Early return for redirection
  if (!user || user.user_type !== "lab_technician") {
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

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Header className="bg-blue-600 flex items-center justify-between px-4">
        <div>
          <Title level={3} className="text-white m-0">
            Healthcare Management System - Admin
          </Title>
        </div>
        <div>
          <Button onClick={logout}>Logout</Button>
        </div>
      </Header>

      <Content className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Lab Tech Profile Card */}
          {labTechProfile && (
            <Card
              title={
                <>
                  <UserOutlined className="mr-2" />
                  Your Profile
                </>
              }
            >
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Text strong>Name: </Text>
                  <Text>
                    {labTechProfile.first_name} {labTechProfile.last_name}
                  </Text>
                </Col>
                <Col span={8}>
                  <Text strong>Username: </Text>
                  <Text>{labTechProfile.username}</Text>
                </Col>
                <Col span={8}>
                  <Text strong>Employee ID: </Text>
                  <Text>{labTechProfile.employee_id || "N/A"}</Text>
                </Col>
              </Row>
              {labTechProfile._user_error && (
                <Alert
                  message="Warning"
                  description={`Could not load all user data: ${labTechProfile._user_error}`}
                  type="warning"
                  showIcon
                  className="mt-4"
                />
              )}
            </Card>
          )}

          {/* Record Result Card */}
          <Card
            title={
              <>
                <ExperimentOutlined className="mr-2" />
                Record Lab Result
              </>
            }
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleStartRecordResult()}
              >
                Record New Result
              </Button>
            }
          >
            <Text type="secondary">
              Record lab test results for pending orders. You can select from
              predefined test templates or create custom parameters.
            </Text>
          </Card>

          {/* Pending Orders Card */}
          <Card
            title={
              <>
                <ClockCircleOutlined className="mr-2" />
                Pending Lab Orders
              </>
            }
          >
            {pendingOrders.length > 0 ? (
              <List
                dataSource={pendingOrders}
                renderItem={(order) => (
                  <List.Item>
                    <Card className="w-full shadow-sm border-l-4 border-l-blue-500">
                      <div className="flex flex-col lg:flex-row lg:justify-between">
                        <div className="flex-1">
                          <Title level={5} className="text-blue-600 m-0 mb-2">
                            {order.test_type}
                          </Title>

                          <Space
                            direction="vertical"
                            size="small"
                            className="w-full"
                          >
                            <div>
                              <Text strong>Patient: </Text>
                              <Text>
                                {order.patient
                                  ? `${order.patient.first_name} ${order.patient.last_name}`
                                  : order._patient_user_error || "N/A"}
                              </Text>
                            </div>

                            <div>
                              <Text strong>Ordered on: </Text>
                              <Text>
                                {new Date(
                                  order.order_date
                                ).toLocaleDateString()}
                              </Text>
                              <Text className="mx-2">by</Text>
                              <Text strong>Dr. </Text>
                              <Text>
                                {order.doctor
                                  ? `${order.doctor.first_name} ${order.doctor.last_name}`
                                  : order._doctor_user_error || "N/A"}
                              </Text>
                            </div>

                            <div>
                              <Tag color="blue">
                                {order.status.toUpperCase()}
                              </Tag>
                            </div>

                            {order.notes && (
                              <div className="p-3 bg-blue-50 rounded mt-2">
                                <Text strong>Doctor's Notes: </Text>
                                <Text italic>{order.notes}</Text>
                              </div>
                            )}
                          </Space>
                        </div>

                        <div className="mt-4 lg:mt-0 lg:ml-4 flex items-start">
                          <Button
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            onClick={() => handleStartRecordResult(order)}
                          >
                            Record Result
                          </Button>
                        </div>
                      </div>

                      {/* Display errors if present */}
                      <div className="mt-3 space-y-2">
                        {order._patient_user_error && (
                          <Alert
                            message="Warning"
                            description={`Patient user missing: ${order._patient_user_error}`}
                            type="warning"
                            showIcon
                            size="small"
                          />
                        )}
                        {order._doctor_user_error && (
                          <Alert
                            message="Warning"
                            description={`Doctor user missing: ${order._doctor_user_error}`}
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
                <ExperimentOutlined className="text-4xl text-gray-400 mb-4" />
                <Text type="secondary" className="text-lg">
                  No pending lab orders found.
                </Text>
              </div>
            )}
          </Card>

          {/* Recorded Results Card */}
          <Card
            title={
              <>
                <CheckCircleOutlined className="mr-2" />
                Results You Recorded
              </>
            }
          >
            {recordedResults.length > 0 ? (
              <List
                dataSource={recordedResults}
                renderItem={(result) => (
                  <List.Item>
                    <Card className="w-full shadow-sm border-l-4 border-l-green-500">
                      <div className="mb-3">
                        <Title level={5} className="text-green-600 m-0">
                          Result for Order:{" "}
                          {result.order
                            ? result.order.test_type
                            : "Unknown Test Type"}
                        </Title>
                        <Text type="secondary" className="block mt-1">
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
                          <Text className="ml-2">
                            {new Date(result.result_date).toLocaleString()}
                          </Text>
                        </Text>
                      </div>

                      <div>
                        <Text>Recorded by Lab Tech </Text>
                        <Text strong>
                          {result.lab_technician
                            ? `${result.lab_technician.first_name} ${result.lab_technician.last_name}`
                            : result._lab_technician_user_error || "N/A"}
                        </Text>
                      </div>

                      {/* Use the helper function to format result_data */}
                      {formatLabResultData(
                        result.result_data,
                        result.order?.test_type
                      )}

                      {result.notes && (
                        <div className="mt-3 p-3 bg-green-50 rounded">
                          <Text strong>Notes: </Text>
                          <Text italic>{result.notes}</Text>
                        </div>
                      )}

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
                <Text type="secondary">No results recorded yet.</Text>
              </div>
            )}
          </Card>
        </div>
      </Content>

      {/* Record Result Modal */}
      <Modal
        title={`Record Lab Result ${
          selectedOrder ? `for Order ${selectedOrder.id.slice(0, 8)}...` : ""
        }`}
        open={isResultModalOpen}
        onCancel={() => {
          setIsResultModalOpen(false);
          resultForm.resetFields();
          setTestParameters([]);
          setSelectedOrder(null);
        }}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Form form={resultForm} layout="vertical" onFinish={handleSubmitResult}>
          <Form.Item
            name="lab_order_id"
            label="Select Order"
            rules={[{ required: true, message: "Please select an order" }]}
          >
            <Select
              placeholder="Select a pending order"
              disabled={!!selectedOrder}
            >
              {pendingOrders.map((order) => (
                <Option key={order.id} value={order.id}>
                  Order {order.id.slice(0, 8)}...: {order.test_type} for Patient{" "}
                  {order.patient
                    ? `${order.patient.first_name} ${order.patient.last_name}`
                    : order._patient_user_error || "N/A"}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="result_date"
                label="Result Date/Time"
                rules={[
                  { required: true, message: "Please select result date/time" },
                ]}
              >
                <DatePicker
                  showTime
                  className="w-full"
                  format="YYYY-MM-DD HH:mm:ss"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status" initialValue="final">
                <Select>
                  <Option value="final">Final</Option>
                  <Option value="preliminary">Preliminary</Option>
                  <Option value="corrected">Corrected</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider>Test Templates</Divider>

          <div className="mb-4">
            <Text strong className="block mb-2">
              Apply Test Template:
            </Text>
            <Space wrap>
              {Object.keys(TEST_TEMPLATES).map((template) => (
                <Button
                  key={template}
                  type={selectedTestType === template ? "primary" : "default"}
                  size="small"
                  onClick={() => applyTestTemplate(template)}
                >
                  {template}
                </Button>
              ))}
            </Space>
          </div>

          <Divider>Test Parameters</Divider>

          {testParameters.length === 0 ? (
            <Alert
              message="No parameters added yet"
              description="Select a test template above or add custom parameters below."
              type="info"
              showIcon
              className="mb-4"
            />
          ) : (
            <div className="mb-4">
              <Table
                dataSource={testParameters.map((param, index) => ({
                  ...param,
                  key: index,
                }))}
                pagination={false}
                size="small"
                columns={[
                  {
                    title: "Parameter",
                    dataIndex: "name",
                    key: "name",
                    render: (text) => <Text strong>{text}</Text>,
                  },
                  {
                    title: "Value",
                    dataIndex: "value",
                    key: "value",
                    render: (text, record, index) => (
                      <Input
                        value={text}
                        onChange={(e) =>
                          handleParameterChange(index, "value", e.target.value)
                        }
                        placeholder="Enter value"
                        size="small"
                      />
                    ),
                  },
                  {
                    title: "Unit",
                    dataIndex: "unit",
                    key: "unit",
                    render: (text, record, index) => (
                      <Input
                        value={text}
                        onChange={(e) =>
                          handleParameterChange(index, "unit", e.target.value)
                        }
                        placeholder="Unit"
                        size="small"
                      />
                    ),
                  },
                  {
                    title: "Reference Range",
                    dataIndex: "reference_range",
                    key: "reference_range",
                    render: (text, record, index) => (
                      <Input
                        value={text}
                        onChange={(e) =>
                          handleParameterChange(
                            index,
                            "reference_range",
                            e.target.value
                          )
                        }
                        placeholder="Reference range"
                        size="small"
                      />
                    ),
                  },
                  {
                    title: "Action",
                    key: "action",
                    render: (text, record, index) => (
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveParameter(index)}
                        size="small"
                      />
                    ),
                  },
                ]}
              />
            </div>
          )}

          <div className="mb-4">
            <Text strong className="block mb-2">
              Add Custom Parameter:
            </Text>
            <Space.Compact className="w-full">
              <Input
                placeholder="Parameter Name"
                value={customParamName}
                onChange={(e) => setCustomParamName(e.target.value)}
              />
              <Button
                type="primary"
                onClick={handleAddCustomParameter}
                disabled={!customParamName.trim()}
              >
                Add Parameter
              </Button>
            </Space.Compact>
          </div>

          <Form.Item name="notes" label="Notes (Optional)">
            <TextArea
              rows={3}
              placeholder="Additional notes about the test results"
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setIsResultModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={resultLoading}
                disabled={testParameters.length === 0}
              >
                Save Result
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default LabTechDashboard;
