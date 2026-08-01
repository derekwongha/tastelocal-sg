import React from 'react';
import { Link } from 'react-router-dom';

export default function Breadcrumb({ items = [] }) {
  if (!items.length) return null;

  return (
    <nav aria-label="breadcrumb" className="sg-breadcrumb">
      <ol className="breadcrumb mb-0">
        <li className="breadcrumb-item">
          <Link to="/" className="text-decoration-none text-muted">🏠 Home</Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return isLast ? (
            <li key={index} className="breadcrumb-item active text-dark fw-bold" aria-current="page">
              {item.label}
            </li>
          ) : (
            <li key={index} className="breadcrumb-item">
              <Link to={item.path} className="text-decoration-none text-muted">
                {item.label}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
