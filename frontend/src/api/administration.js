import API from './auth';

const API_URL = '/api/administration';

// Vendor management
export const getAdminVendors = async () => {
  const response = await API.get(`${API_URL}/vendors/`);
  return response.data;
};

export const approveVendor = async (vendorProfileId) => {
  const response = await API.post(`${API_URL}/vendors/${vendorProfileId}/approve/`, {});
  return response.data;
};

export const rejectVendor = async (vendorProfileId) => {
  const response = await API.post(`${API_URL}/vendors/${vendorProfileId}/reject/`, {});
  return response.data;
};

// Category management
export const getAdminCategories = async () => {
  const response = await API.get(`${API_URL}/categories/`);
  return response.data;
};

export const createCategory = async (categoryData) => {
  const response = await API.post(`${API_URL}/categories/`, categoryData);
  return response.data;
};

export const updateCategory = async (categoryId, categoryData) => {
  const response = await API.patch(`${API_URL}/categories/${categoryId}/`, categoryData);
  return response.data;
};

export const deleteCategory = async (categoryId) => {
  const response = await API.delete(`${API_URL}/categories/${categoryId}/`);
  return response.data;
};

// Experience management
export const getAdminExperiences = async () => {
  const response = await API.get(`${API_URL}/experiences/`);
  return response.data;
};

export const deactivateExperience = async (experienceId) => {
  const response = await API.patch(`${API_URL}/experiences/${experienceId}/deactivate/`, {});
  return response.data;
};

// Review management
export const getAdminReviews = async () => {
  const response = await API.get(`${API_URL}/reviews/`);
  return response.data;
};

export const deleteReview = async (reviewId) => {
  const response = await API.delete(`${API_URL}/reviews/${reviewId}/`);
  return response.data;
};

// User management
export const getAdminUsers = async () => {
  const response = await API.get(`${API_URL}/users/`);
  return response.data;
};
