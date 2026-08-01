import API from './auth';

export const submitReview = async (data) => {
  const response = await API.post('/api/reviews/', data);
  return response.data;
};
