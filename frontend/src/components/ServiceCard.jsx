import React from 'react';
import { API_BASE } from '../api/client.js';

export default function ServiceCard({ slug, name, owner, detail, health }) {
  return <article className="service-card">
    <div className="card-top"><span className="service-label">{slug.toUpperCase()}</span>
      <span className={`status ${health?.ok === true ? 'ok' : health?.ok === false ? 'failed' : ''}`}>
        {health?.ok === true ? 'API hoạt động' : health?.ok === false ? 'Không kết nối được' : 'Chưa kiểm tra'}
      </span></div>
    <h3>{name}</h3><p>{detail}</p>
    <div className="card-bottom"><span>{owner}</span>
      <a href={`${API_BASE}/services/${slug}/docs`} target="_blank" rel="noreferrer">Swagger ↗</a></div>
  </article>;
}
