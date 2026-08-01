import React from 'react';

export function KpiCard({ icon, label, value, tone = 'default', helper }) {
  return (
    <div className={`sg-kpi-card sg-kpi-card--${tone}`}>
      {icon && <span className="sg-kpi-card__icon" aria-hidden="true">{icon}</span>}
      <div>
        <span className="sg-kpi-card__label">{label}</span>
        <strong className="sg-kpi-card__value">{value}</strong>
        {helper && <span className="sg-kpi-card__helper">{helper}</span>}
      </div>
    </div>
  );
}

export function InfoPanel({ title, icon, tone = 'neutral', children, className = '' }) {
  return (
    <section className={`sg-info-panel sg-info-panel--${tone} ${className}`.trim()}>
      <div className="sg-info-panel__heading">
        {icon && <span className="sg-info-panel__icon" aria-hidden="true">{icon}</span>}
        <h5>{title}</h5>
      </div>
      <div className="sg-info-panel__body">{children}</div>
    </section>
  );
}

export function StatusBadge({ status, children }) {
  const normalized = String(status || 'neutral').toLowerCase().replace(/\s+/g, '-');
  return <span className={`sg-status-badge sg-status-badge--${normalized}`}>{children || status}</span>;
}

export function AlertPanel({ tone = 'info', title, children, className = '' }) {
  const symbol = tone === 'success' ? '✓' : tone === 'info' ? 'i' : '!';
  return (
    <div className={`sg-alert-panel sg-alert-panel--${tone} ${className}`.trim()} role="alert">
      <span className="sg-alert-panel__icon" aria-hidden="true">{symbol}</span>
      <div>
        {title && <strong className="d-block mb-1">{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}
