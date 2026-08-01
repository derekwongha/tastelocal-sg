import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import RegisterTourist from './pages/RegisterTourist';
import RegisterVendor from './pages/RegisterVendor';
import PendingVendor from './pages/PendingVendor';
import Profile from './pages/Profile';
import ExperienceDetails from './pages/ExperienceDetails';
import VendorDashboard from './pages/VendorDashboard';
import VendorListings from './pages/VendorListings';
import VendorExperienceForm from './pages/VendorExperienceForm';
import VendorAvailability from './pages/VendorAvailability';
import TouristBookings from './pages/TouristBookings';
import VendorBookings from './pages/VendorBookings';
import SubmitReview from './pages/SubmitReview';
import MyItinerary from './pages/MyItinerary';
import AdminDashboard from './pages/AdminDashboard';
import AdminVendors from './pages/AdminVendors';
import AdminCategories from './pages/AdminCategories';
import AdminModeration from './pages/AdminModeration';
import DiscoverMap from './pages/DiscoverMap';
import AIRecommendations from './pages/AIRecommendations';
import BookingRequest from './pages/BookingRequest';
import './App.css';

const protectedPage = (Component, allowedRoles) => (
  <ProtectedRoute allowedRoles={allowedRoles}><Component /></ProtectedRoute>
);

function MainApp() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--sg-cream)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div className="flex-grow-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/discover" element={<DiscoverMap />} />
          <Route path="/recommendations" element={<AIRecommendations />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register/tourist" element={<RegisterTourist />} />
          <Route path="/register/vendor" element={<RegisterVendor />} />
          <Route path="/experiences/:id" element={<ExperienceDetails />} />
          <Route path="/experiences/:id/book" element={protectedPage(BookingRequest, ['Tourist'])} />
          <Route path="/profile" element={protectedPage(Profile)} />
          <Route path="/pending-vendor" element={protectedPage(PendingVendor)} />
          <Route path="/vendor/dashboard" element={protectedPage(VendorDashboard, ['Vendor'])} />
          <Route path="/vendor/listings" element={protectedPage(VendorListings, ['Vendor'])} />
          <Route path="/vendor/experiences/new" element={protectedPage(VendorExperienceForm, ['Vendor'])} />
          <Route path="/vendor/experiences/:id/edit" element={protectedPage(VendorExperienceForm, ['Vendor'])} />
          <Route path="/vendor/availability" element={protectedPage(VendorAvailability, ['Vendor'])} />
          <Route path="/vendor/bookings" element={protectedPage(VendorBookings, ['Vendor'])} />
          <Route path="/tourist/bookings" element={protectedPage(TouristBookings, ['Tourist'])} />
          <Route path="/bookings/:bookingId/review" element={protectedPage(SubmitReview, ['Tourist'])} />
          <Route path="/tourist/itinerary" element={protectedPage(MyItinerary, ['Tourist'])} />
          <Route path="/admin/dashboard" element={protectedPage(AdminDashboard, ['Administrator'])} />
          <Route path="/admin/vendors" element={protectedPage(AdminVendors, ['Administrator'])} />
          <Route path="/admin/categories" element={protectedPage(AdminCategories, ['Administrator'])} />
          <Route path="/admin/moderation" element={protectedPage(AdminModeration, ['Administrator'])} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return <AuthProvider><Router><MainApp /></Router></AuthProvider>;
}

export default App;
