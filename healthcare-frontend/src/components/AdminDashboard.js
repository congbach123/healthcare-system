// src/components/AdminDashboard.js
import React, { useState, useEffect } from "react";
import {
  Layout,
  Typography,
  Card,
  Button,
  Form,
  Input,
  Select,
  Alert,
  Space,
  List,
  Avatar,
  Tag,
  Modal,
  Divider,
  Row,
  Col,
  Spin,
  message,
  Switch,
} from "antd";
import {
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { useUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { confirm } = Modal;

// Define service ports for all microservices
const SERVICE_URLS = {
  admin: "http://localhost:8009/api",
  user: "http://localhost:8000/api/user",
  patient: "http://localhost:8001/api",
  doctor: "http://localhost:8002/api",
  pharmacist: "http://localhost:8003/api",
  nurse: "http://localhost:8005/api",
  labtech: "http://localhost:8006/api",
};

const AdminDashboard = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  // State for fetched data
  const [adminProfile, setAdminProfile] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for creating user functionality
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createUserForm] = Form.useForm();
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState("patient");

  // State for editing user functionality
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUserForm] = Form.useForm();
  const [editUserLoading, setEditUserLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // State for user type selection modal
  const [isUserTypeModalOpen, setIsUserTypeModalOpen] = useState(false);
  const [userTypeModalContext, setUserTypeModalContext] = useState(null); // 'create' or 'edit'
  const [tempSelectedUserType, setTempSelectedUserType] = useState(null);

  // Available user types
  const USER_TYPES = [
    {
      value: "patient",
      label: "Patient",
      description: "Healthcare service recipients",
    },
    {
      value: "doctor",
      label: "Doctor",
      description: "Medical practitioners and physicians",
    },
    {
      value: "pharmacist",
      label: "Pharmacist",
      description: "Medication and pharmacy specialists",
    },
    {
      value: "nurse",
      label: "Nurse",
      description: "Healthcare support and patient care",
    },
    {
      value: "lab_technician",
      label: "Lab Technician",
      description: "Laboratory testing and analysis",
    },
    {
      value: "administrator",
      label: "Administrator",
      description: "System and user management",
    },
  ];

  // Data Fetching
  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      setError(null);

      const adminUserId = user.id;

      try {
        // 1. Fetch Administrator Profile
        const profileResponse = await axios.get(
          `${SERVICE_URLS.admin}/admins/${adminUserId}/`
        );
        setAdminProfile(profileResponse.data);

        // 2. Fetch List of All Users
        const usersResponse = await axios.get(`${SERVICE_URLS.admin}/users/`);
        setAllUsers(usersResponse.data);
      } catch (err) {
        console.error("Error fetching admin data:", err);
        if (err.response && err.response.data && err.response.data.error) {
          setError(`Failed to fetch admin data: ${err.response.data.error}`);
        } else if (err.request) {
          setError(
            "Failed to fetch admin data: Network error or service is down."
          );
        } else {
          setError("An unexpected error occurred while fetching data.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (user && user.id && user.user_type === "administrator") {
      fetchAdminData();
    } else {
      setLoading(false);
    }
  }, [user, navigate]);

  // Handle opening user type modal
  const handleOpenUserTypeModal = (context) => {
    setUserTypeModalContext(context);

    // Set initial selection based on context
    if (context === "create") {
      setTempSelectedUserType(selectedUserType);
    } else if (context === "edit") {
      setTempSelectedUserType(editUserForm.getFieldValue("user_type"));
    }

    setIsUserTypeModalOpen(true);
  };

  // Handle user type selection in modal
  const handleUserTypeSelection = () => {
    if (tempSelectedUserType) {
      if (userTypeModalContext === "create") {
        setSelectedUserType(tempSelectedUserType);
        createUserForm.setFieldsValue({ userType: tempSelectedUserType });
      } else if (userTypeModalContext === "edit") {
        editUserForm.setFieldsValue({ user_type: tempSelectedUserType });
      }
    }
    setIsUserTypeModalOpen(false);
    setTempSelectedUserType(null);
    setUserTypeModalContext(null);
  };

  // Handle closing user type modal
  const handleCloseUserTypeModal = () => {
    setIsUserTypeModalOpen(false);
    setTempSelectedUserType(null);
    setUserTypeModalContext(null);
  };

  // Get user type label by value
  const getUserTypeLabel = (value) => {
    const userType = USER_TYPES.find((type) => type.value === value);
    return userType ? userType.label : value;
  };

  // Create user service profile based on user type
  const createUserServiceProfile = async (userId, userType, serviceData) => {
    try {
      let serviceResponse = null;

      switch (userType) {
        case "patient":
          serviceResponse = await axios.post(
            `${SERVICE_URLS.patient}/patients/`,
            {
              user_id: userId,
              date_of_birth: serviceData.date_of_birth || null,
              phone_number: serviceData.phone_number || null,
              address: serviceData.address || null,
            }
          );
          break;

        case "doctor":
          serviceResponse = await axios.post(
            `${SERVICE_URLS.doctor}/doctors/`,
            {
              user_id: userId,
              specialization: serviceData.specialization || null,
              license_number: serviceData.license_number || null,
              phone_number: serviceData.phone_number || null,
            }
          );
          break;

        case "pharmacist":
          serviceResponse = await axios.post(
            `${SERVICE_URLS.pharmacist}/pharmacists/`,
            {
              user_id: userId,
              pharmacy_name: serviceData.pharmacy_name || null,
              pharmacy_license_number:
                serviceData.pharmacy_license_number || null,
              phone_number: serviceData.phone_number || null,
              address: serviceData.address || null,
            }
          );
          break;

        case "nurse":
          serviceResponse = await axios.post(`${SERVICE_URLS.nurse}/nurses/`, {
            user_id: userId,
            employee_id: serviceData.employee_id || null,
          });
          break;

        case "lab_technician":
          serviceResponse = await axios.post(
            `${SERVICE_URLS.labtech}/labtechs/`,
            {
              user_id: userId,
              employee_id: serviceData.employee_id || null,
            }
          );
          break;

        case "administrator":
          serviceResponse = await axios.post(`${SERVICE_URLS.admin}/admins/`, {
            user_id: userId,
            internal_admin_id: serviceData.internal_admin_id || null,
          });
          break;

        default:
          return {
            success: true,
            message: "No service profile needed for this user type",
          };
      }

      return { success: true, data: serviceResponse.data };
    } catch (err) {
      console.error(`Error creating ${userType} profile:`, err);
      let errorMsg = `Failed to create ${userType} profile.`;

      if (err.response && err.response.data && err.response.data.error) {
        errorMsg = `Failed to create ${userType} profile: ${err.response.data.error}`;
      }

      return { success: false, error: errorMsg };
    }
  };

  // Handle Submit Create User
  const handleSubmitCreateUser = async (values) => {
    setCreateUserLoading(true);

    const { userType, ...userData } = values;
    const basicUserData = {
      username: userData.username,
      password: userData.password,
      email: userData.email || null,
      first_name: userData.first_name || null,
      last_name: userData.last_name || null,
      user_type: userType,
    };

    try {
      // Step 1: Create the user user
      const response = await axios.post(
        `${SERVICE_URLS.admin}/users/create/`,
        basicUserData
      );

      if (response.status === 201) {
        const userId = response.data.id;

        // Step 2: Create service-specific profile
        const serviceResult = await createUserServiceProfile(
          userId,
          userType,
          userData
        );

        if (serviceResult.success) {
          message.success(`User "${userData.username}" created successfully!`);

          // Refetch users list
          const usersResponse = await axios.get(`${SERVICE_URLS.admin}/users/`);
          setAllUsers(usersResponse.data);

          setIsCreateModalOpen(false);
          createUserForm.resetFields();
        } else {
          message.warning(
            `User "${userData.username}" created, but ${serviceResult.error}`
          );
        }
      }
    } catch (err) {
      console.error("User creation failed:", err);
      if (err.response) {
        if (err.response.status === 409) {
          message.error("User creation failed: Username already exists.");
        } else if (err.response.data && err.response.data.error) {
          message.error(`Failed to create user: ${err.response.data.error}`);
        } else {
          message.error(
            `Failed to create user: ${err.response.status} ${err.response.statusText}`
          );
        }
      } else {
        message.error(
          "Failed to create user: Could not connect to the administrator service."
        );
      }
    } finally {
      setCreateUserLoading(false);
    }
  };

  // Handle Edit User
  const handleEditUser = async (userId) => {
    try {
      // Fetch user details from user service
      const response = await axios.get(`${SERVICE_URLS.user}/users/${userId}/`);
      const userData = response.data;

      setEditingUser(userData);

      // Populate the edit form with current user data
      editUserForm.setFieldsValue({
        username: userData.username,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        user_type: userData.user_type,
        is_active: userData.is_active,
      });

      setIsEditModalOpen(true);
    } catch (err) {
      console.error("Error fetching user details:", err);
      message.error("Failed to load user details for editing.");
    }
  };

  // Handle Submit Edit User
  const handleSubmitEditUser = async (values) => {
    setEditUserLoading(true);

    try {
      // Update user via user service
      const response = await axios.patch(
        `${SERVICE_URLS.user}/users/${editingUser.id}/`,
        {
          username: values.username,
          email: values.email,
          first_name: values.first_name,
          last_name: values.last_name,
          user_type: values.user_type,
          is_active: values.is_active,
        }
      );

      if (response.status === 200) {
        message.success(`User "${values.username}" updated successfully!`);

        // Refetch users list
        const usersResponse = await axios.get(`${SERVICE_URLS.admin}/users/`);
        setAllUsers(usersResponse.data);

        setIsEditModalOpen(false);
        editUserForm.resetFields();
        setEditingUser(null);
      }
    } catch (err) {
      console.error("User update failed:", err);
      if (err.response && err.response.data) {
        // Handle validation errors
        if (err.response.data.username) {
          message.error(
            `Update failed: Username ${err.response.data.username[0]}`
          );
        } else if (err.response.data.email) {
          message.error(`Update failed: Email ${err.response.data.email[0]}`);
        } else if (err.response.data.error) {
          message.error(`Update failed: ${err.response.data.error}`);
        } else {
          message.error("Failed to update user. Please check your input.");
        }
      } else {
        message.error("Failed to update user. Please try again.");
      }
    } finally {
      setEditUserLoading(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = (userId, username) => {
    confirm({
      title: "Are you sure you want to delete this user?",
      icon: <ExclamationCircleOutlined />,
      content: `This will permanently delete user: ${username}`,
      okText: "Yes",
      okType: "danger",
      cancelText: "No",
      onOk: async () => {
        try {
          const response = await axios.delete(
            `${SERVICE_URLS.admin}/users/${userId}/`
          );

          if (response.status === 200 || response.status === 204) {
            message.success(`User ${username} deleted successfully!`);

            // Refetch users list
            const usersResponse = await axios.get(
              `${SERVICE_URLS.admin}/users/`
            );
            setAllUsers(usersResponse.data);
          }
        } catch (err) {
          console.error("User deletion failed:", err);
          let errorMessage = "Failed to delete user.";
          if (err.response && err.response.data && err.response.data.error) {
            errorMessage = `Failed to delete user: ${err.response.data.error}`;
          }
          message.error(errorMessage);
        }
      },
    });
  };

  // Render user type specific fields for create form
  const renderUserTypeFields = () => {
    switch (selectedUserType) {
      case "patient":
        return (
          <>
            <Form.Item name="date_of_birth" label="Date of Birth">
              <Input type="date" />
            </Form.Item>
            <Form.Item name="phone_number" label="Phone Number">
              <Input placeholder="Phone Number" />
            </Form.Item>
            <Form.Item name="address" label="Address">
              <TextArea rows={2} placeholder="Address" />
            </Form.Item>
          </>
        );

      case "doctor":
        return (
          <>
            <Form.Item name="specialization" label="Specialization">
              <Input placeholder="e.g., Cardiology, Neurology" />
            </Form.Item>
            <Form.Item
              name="license_number"
              label="License Number"
              rules={[
                {
                  required: true,
                  message: "License number is required for doctors",
                },
              ]}
            >
              <Input placeholder="Medical License Number" />
            </Form.Item>
            <Form.Item name="phone_number" label="Phone Number">
              <Input placeholder="Phone Number" />
            </Form.Item>
          </>
        );

      case "pharmacist":
        return (
          <>
            <Form.Item name="pharmacy_name" label="Pharmacy Name">
              <Input placeholder="Pharmacy Name" />
            </Form.Item>
            <Form.Item
              name="pharmacy_license_number"
              label="Pharmacy License"
              rules={[
                { required: true, message: "Pharmacy license is required" },
              ]}
            >
              <Input placeholder="Pharmacy License Number" />
            </Form.Item>
            <Form.Item name="phone_number" label="Phone Number">
              <Input placeholder="Phone Number" />
            </Form.Item>
            <Form.Item name="address" label="Address">
              <TextArea rows={2} placeholder="Pharmacy Address" />
            </Form.Item>
          </>
        );

      case "nurse":
        return (
          <Form.Item
            name="employee_id"
            label="Employee ID"
            rules={[
              { required: true, message: "Employee ID is required for nurses" },
            ]}
          >
            <Input placeholder="Employee ID" />
          </Form.Item>
        );

      case "lab_technician":
        return (
          <Form.Item
            name="employee_id"
            label="Employee ID"
            rules={[
              {
                required: true,
                message: "Employee ID is required for lab technicians",
              },
            ]}
          >
            <Input placeholder="Employee ID" />
          </Form.Item>
        );

      case "administrator":
        return (
          <Form.Item
            name="internal_admin_id"
            label="Internal Admin ID"
            rules={[
              { required: true, message: "Internal Admin ID is required" },
            ]}
          >
            <Input placeholder="Internal Admin ID" />
          </Form.Item>
        );

      default:
        return null;
    }
  };

  // Early return for redirection
  if (!user || user.user_type !== "administrator") {
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
      <Header className="bg-blue-600 flex items-center justify-between px-6">
        <Title level={3} className="text-white m-0">
          Healthcare Management System - Admin
        </Title>
        <Button danger onClick={logout}>
          Logout
        </Button>
      </Header>

      <Content className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Admin Profile Card */}
          {adminProfile && (
            <Card
              title={
                <>
                  <UserOutlined className="mr-2" />
                  Your Profile
                </>
              }
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text strong>Name: </Text>
                  <Text>
                    {adminProfile.first_name} {adminProfile.last_name}
                  </Text>
                </Col>
                <Col span={12}>
                  <Text strong>Username: </Text>
                  <Text>{adminProfile.username}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Email: </Text>
                  <Text>{adminProfile.email}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Internal Admin ID: </Text>
                  <Text>{adminProfile.internal_admin_id || "N/A"}</Text>
                </Col>
              </Row>
              {adminProfile._user_error && (
                <Alert
                  message="Warning"
                  description={`Could not load all user data: ${adminProfile._user_error}`}
                  type="warning"
                  showIcon
                  className="mt-4"
                />
              )}
            </Card>
          )}

          {/* Users Management Card */}
          <Card
            title={
              <>
                <UserOutlined className="mr-2" />
                All Users
              </>
            }
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Create New User
              </Button>
            }
          >
            {allUsers.length > 0 ? (
              <List
                dataSource={allUsers}
                renderItem={(userItem) => (
                  <List.Item
                    actions={[
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleEditUser(userItem.id)}
                      >
                        Edit
                      </Button>,
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() =>
                          handleDeleteUser(userItem.id, userItem.username)
                        }
                      >
                        Delete
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={
                        <Space>
                          <Text strong>{userItem.username}</Text>
                          <Tag color="blue">
                            {userItem.user_type.replace("_", " ").toUpperCase()}
                          </Tag>
                          {userItem.is_active === false && (
                            <Tag color="red">INACTIVE</Tag>
                          )}
                        </Space>
                      }
                      description={
                        <div>
                          <Text>
                            {userItem.first_name} {userItem.last_name} (
                            {userItem.email})
                          </Text>
                          <br />
                          <Text type="secondary">User ID: {userItem.id}</Text>
                        </div>
                      }
                    />
                    {userItem._user_error && (
                      <Alert
                        message="Warning"
                        description={`Could not load user data: ${userItem._user_error}`}
                        type="warning"
                        showIcon
                        className="mt-2"
                        size="small"
                      />
                    )}
                  </List.Item>
                )}
              />
            ) : (
              <div className="text-center py-8">
                <Text type="secondary">No users found.</Text>
              </div>
            )}
          </Card>
        </div>
      </Content>

      {/* Create User Modal */}
      <Modal
        title="Create New User"
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          createUserForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={createUserForm}
          layout="vertical"
          onFinish={handleSubmitCreateUser}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="Username"
                rules={[{ required: true, message: "Username is required" }]}
              >
                <Input placeholder="Username" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, message: "Password is required" }]}
              >
                <Input.Password placeholder="Password" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="first_name" label="First Name">
                <Input placeholder="First Name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label="Last Name">
                <Input placeholder="Last Name" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="email" label="Email">
            <Input placeholder="Email Address" type="email" />
          </Form.Item>

          <Form.Item
            name="userType"
            label="User Type"
            rules={[{ required: true, message: "Please select a user type" }]}
            initialValue="patient"
          >
            <Input
              readOnly
              placeholder="Click to select user type"
              value={getUserTypeLabel(selectedUserType)}
              onClick={() => handleOpenUserTypeModal("create")}
              suffix={<DownOutlined />}
              style={{ cursor: "pointer" }}
            />
          </Form.Item>

          <Divider />

          {renderUserTypeFields()}

          <Form.Item className="mb-0 mt-6">
            <Space className="w-full justify-end">
              <Button onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createUserLoading}
              >
                Create User
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title={`Edit User: ${editingUser?.username || ""}`}
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          editUserForm.resetFields();
          setEditingUser(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editUserForm}
          layout="vertical"
          onFinish={handleSubmitEditUser}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="Username"
                rules={[{ required: true, message: "Username is required" }]}
              >
                <Input placeholder="Username" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input placeholder="Email Address" type="email" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="first_name" label="First Name">
                <Input placeholder="First Name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label="Last Name">
                <Input placeholder="Last Name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="user_type"
                label="User Type"
                rules={[
                  { required: true, message: "Please select a user type" },
                ]}
              >
                <Input
                  readOnly
                  placeholder="Click to select user type"
                  onClick={() => handleOpenUserTypeModal("edit")}
                  suffix={<DownOutlined />}
                  style={{ cursor: "pointer" }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="is_active"
                label="Account Status"
                valuePropName="checked"
              >
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </Col>
          </Row>

          {editingUser && (
            <Alert
              message="User Information"
              description={
                <div>
                  <Text>User ID: {editingUser.id}</Text>
                  <br />
                  <Text>
                    Date Joined:{" "}
                    {new Date(editingUser.date_joined).toLocaleString()}
                  </Text>
                  <br />
                  <Text>
                    Last Login:{" "}
                    {editingUser.last_login
                      ? new Date(editingUser.last_login).toLocaleString()
                      : "Never"}
                  </Text>
                </div>
              }
              type="info"
              className="mb-4"
            />
          )}

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={editUserLoading}
              >
                Update User
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* User Type Selection Modal */}
      <Modal
        title="Select User Type"
        open={isUserTypeModalOpen}
        onCancel={handleCloseUserTypeModal}
        onOk={handleUserTypeSelection}
        okText="Select"
        cancelText="Cancel"
        width={500}
        okButtonProps={{ disabled: !tempSelectedUserType }}
      >
        <div className="space-y-3">
          {USER_TYPES.map((userType) => (
            <Card
              key={userType.value}
              hoverable
              className={`cursor-pointer transition-all ${
                tempSelectedUserType === userType.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200"
              }`}
              onClick={() => setTempSelectedUserType(userType.value)}
              size="small"
            >
              <div className="flex items-center justify-between">
                <div>
                  <Text strong className="text-base">
                    {userType.label}
                  </Text>
                  <br />
                  <Text type="secondary" className="text-sm">
                    {userType.description}
                  </Text>
                </div>
                <div>
                  {tempSelectedUserType === userType.value && (
                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Modal>
    </Layout>
  );
};

export default AdminDashboard;
