import React from 'react';
import { NavLink } from 'react-router-dom';
import { StatusBadge } from './UIPrimitives';

export default function PortalSidebar({ icon, title, status, statusTone, items, onLogout }) {
  return (
    <aside className="sg-portal-sidebar mb-4" aria-label={`${title} navigation`}>
      <div className="sg-portal-sidebar__profile">
        <div className="sg-portal-sidebar__avatar" aria-hidden="true">{icon}</div>
        <h6 className="fw-bold mb-2 text-truncate" title={title}>{title}</h6>
        <StatusBadge status={statusTone}>{status}</StatusBadge>
      </div>
      <div className="sg-portal-sidebar__nav">
        <nav className="nav flex-column nav-pills gap-1">
          {items.map((item) => (
            <NavLink key={`${item.path}-${item.label}`} to={item.path} className="nav-link py-2 px-3 text-start">
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={onLogout} className="btn btn-outline-danger btn-sm mt-3 w-100 py-2 fw-semibold">
          Log out
        </button>
      </div>
    </aside>
  );
}
