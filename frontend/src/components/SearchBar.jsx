import React, { useState } from 'react';

const SearchBar = ({ categories, locations, onSearch, onReset }) => {
  const [q, setQ]             = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch({ q, category, location, min_price: minPrice, max_price: maxPrice });
  };

  const handleReset = () => {
    setQ('');
    setCategory('');
    setLocation('');
    setMinPrice('');
    setMaxPrice('');
    onReset();
  };

  return (
    <div className="glass-card mb-4 text-start">
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          {/* Keyword Search */}
          <div className="col-md-4">
            <label className="form-label">🔍 Search Keywords</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Satay, Hawker, Chicken Rice..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="col-md-2">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.category_name}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div className="col-md-2">
            <label className="form-label">Location</label>
            <select
              className="form-select"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.location_id} value={loc.location_id}>
                  {loc.address}
                </option>
              ))}
            </select>
          </div>

          {/* Min Price */}
          <div className="col-md-2">
            <label className="form-label">Min Price (S$)</label>
            <input
              type="number"
              min="0"
              className="form-control"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
          </div>

          {/* Max Price */}
          <div className="col-md-2">
            <label className="form-label">Max Price (S$)</label>
            <input
              type="number"
              min="0"
              className="form-control"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-4">
          <button
            type="button"
            className="btn btn-outline-danger px-4"
            onClick={handleReset}
          >
            Clear Filters
          </button>
          <button type="submit" className="btn btn-danger px-4">
            🔍 Search Experiences
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchBar;
