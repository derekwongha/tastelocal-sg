import API from './auth';

export const getBookings = async () => {
  const response = await API.get('/api/bookings/');
  return response.data;
};

export const createBooking = async (data) => {
  const response = await API.post('/api/bookings/', data);
  return response.data;
};

export const cancelBooking = async (id) => {
  const response = await API.post(`/api/bookings/${id}/cancel/`);
  return response.data;
};

export const getVendorBookings = async () => {
  const response = await API.get('/api/bookings/vendor/');
  return response.data;
};

export const vendorApproveBooking = async (id) => {
  const response = await API.post(`/api/bookings/vendor/${id}/approve/`);
  return response.data;
};

export const vendorRejectBooking = async (id) => {
  const response = await API.post(`/api/bookings/vendor/${id}/reject/`);
  return response.data;
};

export const vendorCancelBooking = async (id) => {
  const response = await API.post(`/api/bookings/vendor/${id}/cancel/`);
  return response.data;
};

export const vendorCompleteBooking = async (id) => {
  const response = await API.post(`/api/bookings/vendor/${id}/complete/`);
  return response.data;
};

