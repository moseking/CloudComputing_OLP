import React, { useState } from 'react';
import { getJson } from './api/client.js';
import ServiceCard from './components/ServiceCard.jsx';

const services = [
  { slug: 'users', name: 'Tài khoản', owner: 'Người 1', detail: 'Đăng ký, đăng nhập và hồ sơ. API nghiệp vụ hiện trả về 501.' },
  { slug: 'courses', name: 'Khóa học', owner: 'Người 2', detail: 'Hai khóa học demo để thử API đọc. Đăng ký học chưa triển khai.' },
  { slug: 'quizzes', name: 'Bài kiểm tra', owner: 'Người 2', detail: 'Một bài trắc nghiệm demo. Nộp bài và chấm điểm chưa triển khai.' },
  { slug: 'payments', name: 'Thanh toán mô phỏng', owner: 'Người 3', detail: 'API khung trả về 501. Chưa tạo giao dịch hoặc xử lý thanh toán.' },
];

export default function App() {
  const [health, setHealth] = useState({});
  const [checking, setChecking] = useState(false);
  const [courses, setCourses] = useState(null);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [error, setError] = useState('');

  async function checkHealth() {
    setChecking(true);
    const results = await Promise.all(services.map(async ({ slug }) => {
      try {
        const data = await getJson(`/services/${slug}/health`);
        return [slug, { ok: data.status === 'ok' }];
      } catch { return [slug, { ok: false }]; }
    }));
    setHealth(Object.fromEntries(results));
    setChecking(false);
  }

  async function loadCourses() {
    setLoadingCourses(true); setError('');
    try { setCourses((await getJson('/api/courses')).items); }
    catch (err) { setError(err.message); setCourses(null); }
    finally { setLoadingCourses(false); }
  }

  return <div className="page">
    <header><a className="brand" href="#home"><span className="brand-mark">C</span> Cloud Learning</a>
      <span className="project-tag">Cloud Computing · Nhóm 03 thành viên</span></header>
    <main id="home">
      <section className="hero"><div className="eyebrow">ONLINE LEARNING PLATFORM / 0.1</div>
        <h1>Nền tảng học trực tuyến.<br /><span>Bắt đầu từ kiến trúc rõ ràng.</span></h1>
        <p className="intro">Bộ khung Microservices cho dự án cuối kỳ Điện toán đám mây.
          Bốn dịch vụ độc lập, một điểm truy cập qua Nginx và môi trường Docker Compose dùng chung.</p>
        <div className="hero-actions"><button disabled={checking} onClick={checkHealth}>
          {checking ? 'Đang kiểm tra…' : 'Kiểm tra kết nối API'} <span aria-hidden="true">↗</span></button>
          <a className="text-link" href="#services">Khám phá các dịch vụ ↓</a></div>
      </section>
      <aside className="notice"><strong>Giai đoạn khởi tạo</strong><span>Dữ liệu khóa học và bài kiểm tra là demo.
        Xác thực, đăng ký học, chấm điểm và giao dịch chưa triển khai. Health chỉ kiểm tra tiến trình API.</span></aside>
      <section id="services" className="services"><div className="section-title"><h2>Các dịch vụ</h2><span>04 microservices / REST API</span></div>
        <div className="service-grid" aria-live="polite">{services.map(service =>
          <ServiceCard key={service.slug} {...service} health={health[service.slug]} />)}</div></section>
      <section className="demo"><div><div className="eyebrow">DỮ LIỆU MẪU</div><h2>Thử kết nối Course Service</h2>
        <p>Lấy danh sách demo qua <code>/api/courses</code>. Dữ liệu chưa lưu vào PostgreSQL.</p></div>
        <button className="secondary" disabled={loadingCourses} onClick={loadCourses}>{loadingCourses ? 'Đang tải…' : 'Tải khóa học demo'}</button>
        {error && <p role="alert" className="error">{error}</p>}
        {courses && <ul className="course-list">{courses.map(course => <li key={course.id}>
          <span>DEMO / {String(course.id).padStart(2, '0')}</span><h3>{course.title}</h3><p>{course.description}</p></li>)}</ul>}
      </section>
    </main><footer><span>CloudComputing_OLP</span><span>React + FastAPI + PostgreSQL · Chưa triển khai cloud</span></footer>
  </div>;
}
