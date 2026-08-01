import API from './auth';

export const getItinerary = async () => {
  const response = await API.get('/api/itinerary/');
  return response.data;
};

export const addItemToItinerary = async (foodExperienceId, plannedDate = null, plannedTime = null) => {
  const response = await API.post('/api/itinerary/items/', {
    food_experience_id: foodExperienceId,
    planned_date: plannedDate,
    planned_time: plannedTime
  });
  return response.data;
};

export const updateItineraryItem = async (id, data) => {
  const response = await API.patch(`/api/itinerary/items/${id}/`, data);
  return response.data;
};

export const removeItemFromItinerary = async (id) => {
  const response = await API.delete(`/api/itinerary/items/${id}/`);
  return response.data;
};
