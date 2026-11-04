import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Filter,
  LockKeyhole,
  Search,
} from 'lucide-react';
import { api, message } from '../api/client.js';
import { useAuth } from '../auth.jsx';
import {
  ASSETS,
  Badge,
  Button,
  Card,
  CourseCard,
  Empty,
  ErrorBox,
  Input,
  Loading,
  PageTitle,
  Progress,
  Select,
  money,
  navigate,
  useResource,
} from '../components/UI.jsx';
import { LEVELS, filterCourses } from '../lib/learning.js';

export function Courses({ initialQuery = '', initialLevel = '' }) {
  const { user } = useAuth();
  const [level, setLevel] = useState(initialLevel || '');
  const [search, setSearch] = useState(initialQuery || '');
  const catalog = useResource(
    `/api/courses${level ? `?level=${encodeURIComponent(level)}` : ''}`,
  );
  const own = useResource(user ? '/api/enrollments/my-courses' : null);
  const rows = filterCourses(catalog.data?.items, search);
  const owned = new Set(own.data?.items.map((item) => item.course_id));
  return (
    <>
      <PageTitle eyebrow="FIND YOUR NEXT ADVENTURE" title="Khóa học tiếng Anh">
        Chọn trình độ, tìm cảm hứng và bắt đầu hành trình học tập của riêng bạn.
      </PageTitle>
      <Card className="mb-6">
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_230px]">
          <Input
            label="Tìm khóa học"
            placeholder="Tên khóa học, trình độ, chủ đề…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            type="search"
            maxLength={150}
          />
          <Select
            label="Trình độ CEFR"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          >
            <option value="">Tất cả trình độ</option>
            {LEVELS.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} — {item.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <span>
            {catalog.loading
              ? 'Đang tìm khóa học…'
              : `${rows.length} khóa học phù hợp`}
          </span>
          <span className="flex items-center gap-1.5">
            <Filter size={14} />
            Tìm trong danh mục thực tế của OELP
          </span>
        </div>
      </Card>
      {catalog.loading && <Loading />}
      <ErrorBox onRetry={catalog.reload}>{catalog.error}</ErrorBox>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 min-[1380px]:grid-cols-3">
        {rows.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            enrolled={owned.has(course.id)}
          />
        ))}
      </div>
      {!catalog.loading && !catalog.error && rows.length === 0 && (
        <Empty title="Chưa tìm thấy khóa học phù hợp">
          <p>
            {search.trim()
              ? 'Không có khóa học khớp từ khóa trong danh mục đã tải.'
              : 'Chưa có khóa học ở trình độ này.'}
          </p>
          <p className="mt-2">
            Thử một từ khóa khác hoặc chọn tất cả trình độ.
          </p>
          <Button
            variant="soft"
            className="mt-5"
            onClick={() => {
              setLevel('');
              setSearch('');
            }}
          >
            Xem toàn bộ khóa học
          </Button>
        </Empty>
      )}
    </>
  );
}

export function CourseDetail({ id }) {
  const { user } = useAuth();
  const course = useResource(`/api/courses/${id}`);
  const lessons = useResource(`/api/courses/${id}/lessons`);
  const own = useResource(user ? '/api/enrollments/my-courses' : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const enrolled = own.data?.items.find(
    (item) => String(item.course_id) === String(id),
  );
  async function enroll() {
    if (!user) return navigate('/login');
    setSaving(true);
    setError('');
    try {
      await api('/api/enrollments', {
        method: 'POST',
        body: { course_id: Number(id) },
      });
      own.reload();
    } catch (error) {
      setError(message(error));
    } finally {
      setSaving(false);
    }
  }
  if (course.loading) return <Loading />;
  if (course.error)
    return <ErrorBox onRetry={course.reload}>{course.error}</ErrorBox>;
  const item = course.data?.course;
  if (!item) return null;
  const accessible = Boolean(enrolled) || user?.role === 'admin';
  return (
    <>
      <a
        href="#/courses"
        className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-primary-hover"
      >
        <ArrowLeft size={15} />
        Danh sách khóa học
      </a>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="min-w-0 space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-navy">
            <img
              src={ASSETS.background}
              alt="Học tiếng Anh cùng Tama"
              className="h-55 w-full object-cover object-[65%_50%] sm:h-65"
              width="900"
              height="320"
            />
            <div className="absolute inset-0 bg-linear-to-t from-navy/70 to-transparent" />
            <Badge className="absolute bottom-5 left-5 bg-white text-navy">
              {item.language} · CEFR {item.level}
            </Badge>
          </div>
          <PageTitle title={item.title}>{item.description}</PageTitle>
          <Card>
            <h2 className="text-lg font-bold">Bạn sẽ học được gì?</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {item.learning_goals ||
                'Khám phá kiến thức và thực hành theo từng bài học.'}
            </p>
            <h3 className="mt-6 text-sm font-semibold">Trước khi bắt đầu</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {item.prerequisites || 'Không có yêu cầu đầu vào bổ sung.'}
            </p>
          </Card>
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Nội dung khóa học</h2>
              {lessons.data && (
                <Badge tone="neutral">
                  {lessons.data.items.length} bài học
                </Badge>
              )}
            </div>
            {lessons.loading && <Loading />}
            <ErrorBox onRetry={lessons.reload}>{lessons.error}</ErrorBox>
            <ol className="divide-y divide-border">
              {lessons.data?.items.map((lesson) => (
                <li className="flex items-center gap-3 py-4" key={lesson.id}>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-light text-sm font-bold text-primary-hover">
                    {String(lesson.position).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block text-sm">{lesson.title}</strong>
                    <span className="mt-1 block text-[11px] text-muted">
                      Theory · Vocabulary · Grammar
                      {lesson.quiz_id ? ' · Quiz' : ''}
                    </span>
                  </div>
                  {accessible ? (
                    <a
                      className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-hover"
                      href={`#/lessons/${lesson.id}`}
                    >
                      Học bài
                      <ArrowRight size={15} />
                    </a>
                  ) : (
                    <LockKeyhole
                      size={17}
                      className="shrink-0 text-slate-400"
                      aria-label="Cần đăng ký"
                    />
                  )}
                </li>
              ))}
            </ol>
            {lessons.data?.items.length === 0 && (
              <Empty compact title="Nội dung đang được chuẩn bị">
                Khóa học chưa có bài học.
              </Empty>
            )}
          </Card>
        </div>
        <Card className="xl:sticky xl:top-26">
          <span className="text-xs font-medium text-muted">
            ĐẦU TƯ CHO HÀNH TRÌNH CỦA BẠN
          </span>
          <h2 className="mt-3 text-3xl font-bold">
            {money(item.price, item.currency)}
          </h2>
          <p className="mb-5 mt-2 text-xs leading-relaxed text-muted">
            Nội dung demo của đồ án. Không có khoản thanh toán thật.
          </p>
          <div className="space-y-3">
            <ErrorBox>{error || own.error}</ErrorBox>
            {accessible ? (
              <>
                <p className="flex items-center gap-2 text-sm font-semibold text-success">
                  <CheckCircle2 size={17} />
                  {enrolled
                    ? 'Bạn đã có quyền học.'
                    : 'Quyền xem dành cho Admin.'}
                </p>
                {enrolled && (
                  <div>
                    <Progress
                      value={enrolled.progress_percent}
                      label="Tiến độ khóa học"
                    />
                    <p className="mt-1 text-xs text-muted">
                      {enrolled.completed_lessons}/{enrolled.total_lessons} bài
                      · {enrolled.progress_percent}%
                    </p>
                  </div>
                )}
                {lessons.data?.items.length > 0 && (
                  <Button
                    className="w-full rounded-full"
                    href={`#/lessons/${lessons.data.items[0].id}`}
                  >
                    Bắt đầu học
                    <ArrowRight size={16} />
                  </Button>
                )}
              </>
            ) : item.is_free ? (
              <Button
                className="w-full rounded-full"
                onClick={enroll}
                busy={saving}
                disabled={own.loading}
              >
                {saving ? 'Đang đăng ký…' : 'Đăng ký miễn phí'}
              </Button>
            ) : (
              <Button
                className="w-full rounded-full"
                href={user ? `#/payments?course=${id}` : '#/login'}
              >
                Mua khóa học mô phỏng
                <ArrowRight size={16} />
              </Button>
            )}
          </div>
          <ul className="mt-6 space-y-3 border-t border-border pt-5 text-xs text-muted">
            <li className="flex items-center gap-2">
              <BookOpen size={16} />
              Nội dung học theo trình độ {item.level}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              Tiến độ và kết quả lưu trong tài khoản
            </li>
            <li className="flex items-center gap-2">
              <LockKeyhole size={16} />
              Quyền học được xác minh bởi máy chủ
            </li>
          </ul>
        </Card>
      </div>
    </>
  );
}

export function MyLearning() {
  const { data, loading, error, reload } = useResource(
    '/api/enrollments/my-courses',
  );
  return (
    <>
      <PageTitle eyebrow="YOUR LEARNING COLLECTION" title="Việc học của tôi">
        Mỗi bài học nhỏ đều đưa bạn đi xa hơn.
      </PageTitle>
      {loading && <Loading />}
      <ErrorBox onRetry={reload}>{error}</ErrorBox>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {data?.items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <div className="flex items-start gap-4">
              <img
                src={ASSETS.background}
                alt=""
                className="size-20 shrink-0 rounded-xl object-cover"
                loading="lazy"
              />
              <div className="min-w-0">
                <Badge
                  tone={
                    item.completed_lessons >= item.total_lessons &&
                    item.total_lessons > 0
                      ? 'green'
                      : 'blue'
                  }
                >
                  {item.level} ·{' '}
                  {item.completed_lessons >= item.total_lessons &&
                  item.total_lessons > 0
                    ? 'Đã hoàn thành'
                    : 'Đang học'}
                </Badge>
                <h2 className="mt-2 text-lg font-bold">{item.title}</h2>
              </div>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-muted">
                  {item.completed_lessons}/{item.total_lessons} bài học hoàn
                  thành
                </span>
                <strong>{item.progress_percent}%</strong>
              </div>
              <Progress
                value={item.progress_percent}
                label={`Tiến độ ${item.title}`}
              />
            </div>
            <Button
              variant="soft"
              className="mt-5 w-full"
              href={`#/courses/${item.course_id}`}
            >
              Tiếp tục học
              <ArrowRight size={16} />
            </Button>
          </Card>
        ))}
      </div>
      {data?.items.length === 0 && (
        <Empty title="Bắt đầu một điều mới hôm nay">
          <p>Bạn chưa đăng ký khóa học nào.</p>
          <Button className="mt-5" href="#/courses">
            Khám phá khóa học
            <ArrowRight size={16} />
          </Button>
        </Empty>
      )}
    </>
  );
}
