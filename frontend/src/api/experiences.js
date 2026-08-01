import API from './auth';

export const getPublicExperiences = async (params = {}) => {
  const response = await API.get('/api/experiences/public/', { params });
  return response.data;
};

export const getPublicExperienceDetail = async (id) => {
  const response = await API.get(`/api/experiences/public/${id}/`);
  return response.data;
};

export const getCategories = async () => {
  const response = await API.get('/api/experiences/categories/');
  return response.data;
};

export const getLocations = async () => {
  const response = await API.get('/api/experiences/locations/');
  return response.data;
};

export const getVendorExperiences = async () => {
  const response = await API.get('/api/experiences/vendor/');
  return response.data;
};

export const createVendorExperience = async (data) => {
  const response = await API.post('/api/experiences/vendor/', data);
  return response.data;
};

export const getVendorExperienceDetail = async (id) => {
  const response = await API.get(`/api/experiences/vendor/${id}/`);
  return response.data;
};

export const updateVendorExperience = async (id, data) => {
  const response = await API.put(`/api/experiences/vendor/${id}/`, data);
  return response.data;
};

export const deleteVendorExperience = async (id) => {
  const response = await API.delete(`/api/experiences/vendor/${id}/`);
  return response.data;
};

export const createTimeSlot = async (data) => {
  const response = await API.post('/api/experiences/vendor/timeslots/', data);
  return response.data;
};

export const deleteTimeSlot = async (id) => {
  const response = await API.delete(`/api/experiences/vendor/timeslots/${id}/`);
  return response.data;
};

// AI Recommendations (Control 11)
export const getAIRecommendations = async (query) => {
  const response = await API.post('/api/experiences/recommendations/', { query });
  return response.data;
};

