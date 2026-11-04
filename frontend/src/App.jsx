import React from 'react';
import { AuthProvider, useAuth } from './auth.jsx';
import {
  AccessDenied,
  Button,
  Empty,
  Loading,
  SignInRequired,
} from './components/UI.jsx';
import useHashRoute from './hooks/useHashRoute.js';
import AppLayout, { PublicLayout } from './layouts/AppLayout.jsx';
import Home from './pages/Home.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { CourseDetail, Courses, MyLearning } from './pages/Courses.jsx';
import { AccountForm, Profile } from './pages/Account.jsx';
import { Lesson, Quiz, Results } from './pages/Learning.jsx';
import Library from './pages/Library.jsx';
import ProgressPage from './pages/Progress.jsx';
import Payments from './pages/Payments.jsx';
import Admin from './pages/Admin.jsx';

function Shell() {
  const { user, loading } = useAuth();
  const route = useHashRoute();
  const { path, query } = route;
  const course = path.match(/^\/courses\/(\d+)$/);
  const lesson = path.match(/^\/lessons\/(\d+)$/);
  const quiz = path.match(/^\/quizzes\/(\d+)$/);
  const protectedRoute =
    [
      '/profile',
      '/my-learning',
      '/results',
      '/payments',
      '/learn',
      '/quizzes',
      '/progress',
      '/admin',
    ].includes(path) ||
    lesson ||
    quiz;
  let page;
  if (loading)
    return (
      <div className="mx-auto max-w-5xl p-8">
        <Loading />
      </div>
    );
  if (protectedRoute && !user) page = <SignInRequired />;
  else if (path === '/') page = user ? <Dashboard /> : <Home />;
  else if (path === '/courses')
    page = (
      <Courses
        initialQuery={query.get('q')}
        initialLevel={query.get('level')}
      />
    );
  else if (course) page = <CourseDetail id={course[1]} />;
  else if (path === '/register' || path === '/login')
    page = user ? (
      <Empty
        title="Bạn đã đăng nhập"
        action={<Button href="#/">Về Dashboard</Button>}
      >
        Tiếp tục hành trình học của bạn.
      </Empty>
    ) : (
      <AccountForm register={path === '/register'} />
    );
  else if (path === '/profile') page = <Profile />;
  else if (path === '/my-learning') page = <MyLearning />;
  else if (path === '/learn') page = <Library section={query.get('section')} />;
  else if (path === '/quizzes') page = <Library quizzes />;
  else if (path === '/progress') page = <ProgressPage />;
  else if (lesson)
    page = <Lesson id={lesson[1]} initialSection={query.get('section')} />;
  else if (quiz) page = <Quiz id={quiz[1]} />;
  else if (path === '/results') page = <Results quizId={query.get('quiz')} />;
  else if (path === '/payments')
    page = <Payments initialCourse={query.get('course')} />;
  else if (path === '/admin')
    page = user.role === 'admin' ? <Admin /> : <AccessDenied />;
  else
    page = (
      <Empty
        title="Không tìm thấy trang"
        action={<Button href="#/">Về trang chủ</Button>}
      >
        Đường dẫn này chưa có trên OELP.
      </Empty>
    );
  return user ? (
    <AppLayout route={route}>{page}</AppLayout>
  ) : (
    <PublicLayout location={route.location}>{page}</PublicLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
