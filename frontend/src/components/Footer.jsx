import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Thank you for subscribing to our newsletter!');
  };

  return (
    <footer className="sg-footer mt-auto py-5 text-white">
      <div className="container">
        <div className="row g-4">
          {/* Column 1: About */}
          <div className="col-lg-3 col-md-6">
            <h5 className="fw-bold mb-3"><span className="text-warning">Taste</span>Local SG</h5>
            <p className="small text-muted">
              TasteLocal SG is a premium local food tourism platform in Singapore, connecting travelers with authentic culinary experiences and passionate local vendors. Discover the rich food culture of Singapore.
            </p>
          </div>

          {/* Column 2: Help */}
          <div className="col-lg-2 col-md-6">
            <h5 className="text-white fw-bold mb-3">Help</h5>
            <ul className="list-unstyled small">
              <li className="mb-2"><Link to="/" className="text-muted text-decoration-none hover-white">FAQs</Link></li>
              <li className="mb-2"><Link to="/" className="text-muted text-decoration-none hover-white">Booking Guide</Link></li>
              <li className="mb-2"><Link to="/" className="text-muted text-decoration-none hover-white">Cancellation Policy</Link></li>
              <li className="mb-2"><Link to="/" className="text-muted text-decoration-none hover-white">Review Policy</Link></li>
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div className="col-lg-3 col-md-6">
            <h5 className="text-white fw-bold mb-3">Contact</h5>
            <ul className="list-unstyled small text-muted">
              <li className="mb-2">📧 support@tastelocal.sg</li>
              <li className="mb-2">📞 +65 6123 4567</li>
              <li className="mb-2">📍 123 Food Street, #01-01, Singapore 100123</li>
            </ul>
          </div>

          {/* Column 4: Follow Us */}
          <div className="col-lg-2 col-md-6">
            <h5 className="text-white fw-bold mb-3">Follow Us</h5>
            <div className="d-flex gap-3 small">
              <a href="#" className="text-muted text-decoration-none hover-white">🌐 Facebook</a>
              <a href="#" className="text-muted text-decoration-none hover-white">📸 Instagram</a>
              <a href="#" className="text-muted text-decoration-none hover-white">🐦 Twitter</a>
            </div>
          </div>

          {/* Column 5: Stay Updated */}
          <div className="col-lg-2 col-md-6">
            <h5 className="text-white fw-bold mb-3">Stay Updated</h5>
            <p className="small text-muted mb-2">Subscribe to our newsletter for food tips and exciting updates.</p>
            <form onSubmit={handleSubmit} className="d-flex gap-1">
              <input 
                type="email" 
                placeholder="Enter email" 
                className="form-control form-control-sm border-secondary text-dark" 
                required 
              />
              <button type="submit" className="btn btn-sm btn-danger px-2">Subscribe</button>
            </form>
          </div>
        </div>

        <hr className="my-4 border-secondary" />

        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center small text-muted">
          <span>&copy; {new Date().getFullYear()} TasteLocal SG. All rights reserved.</span>
          <div className="d-flex gap-3 mt-2 mt-sm-0">
            <Link to="/" className="text-muted text-decoration-none hover-white">Terms of Use</Link>
            <Link to="/" className="text-muted text-decoration-none hover-white">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
