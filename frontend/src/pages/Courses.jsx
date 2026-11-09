import { t } from '../lib/i18n.js';
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
      <PageTitle
        eyebrow={t('FIND YOUR NEXT ADVENTURE')}
        title={t('Khóa học tiếng Anh')}
      >
        {t(
          'Chọn trình độ, tìm cảm hứng và bắt đầu hành trình học tập của riêng bạn.',
        )}
      </PageTitle>
      <Card className="mb-6">
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_230px]">
          <Input
            label={t('Tìm khóa học')}
            placeholder={t('Tên khóa học, trình độ, chủ đề…')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            type="search"
            maxLength={150}
          />
          <Select
            label={t('Trình độ CEFR')}
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          >
            <option value="">{t('Tất cả trình độ')}</option>
            {t(
              LEVELS.map((item) => (
                <option key={item.code} value={item.code}>
                  {t(item.code)} — {t(item.name)}
                </option>
              )),
            )}
          </Select>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <span>
            {t(
              catalog.loading
                ? t('Đang tìm khóa học…')
                : t('{0} khóa học phù hợp', {
                    0: rows.length,
                  }),
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <Filter size={14} />
            {t('Tìm trong danh mục thực tế của OELP')}
          </span>
        </div>
      </Card>
      {t(catalog.loading && <Loading />)}
      <ErrorBox onRetry={catalog.reload}>{t(catalog.error)}</ErrorBox>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 min-[1380px]:grid-cols-3">
        {t(
          rows.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              enrolled={owned.has(course.id)}
            />
          )),
        )}
      </div>
      {t(
        !catalog.loading && !catalog.error && rows.length === 0 && (
          <Empty title={t('Chưa tìm thấy khóa học phù hợp')}>
            <p>
              {t(
                search.trim()
                  ? t('Không có khóa học khớp từ khóa trong danh mục đã tải.')
                  : t('Chưa có khóa học ở trình độ này.'),
              )}
            </p>
            <p className="mt-2">
              {t('Thử một từ khóa khác hoặc chọn tất cả trình độ.')}
            </p>
            <Button
              variant="soft"
              className="mt-5"
              onClick={() => {
                setLevel('');
                setSearch('');
              }}
            >
              {t('Xem toàn bộ khóa học')}
            </Button>
          </Empty>
        ),
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
        body: {
          course_id: Number(id),
        },
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
    return <ErrorBox onRetry={course.reload}>{t(course.error)}</ErrorBox>;
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
        {t('Danh sách khóa học')}
      </a>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="min-w-0 space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-navy">
            <img
              src={ASSETS.background}
              alt={t('Học tiếng Anh cùng Tama')}
              className="h-55 w-full object-cover object-[65%_50%] sm:h-65"
              width="900"
              height="320"
            />
            <div className="absolute inset-0 bg-linear-to-t from-navy/70 to-transparent" />
            <Badge className="absolute bottom-5 left-5 bg-white text-navy">
              {t(item.language)}
              {t(' · CEFR ')}
              {t(item.level)}
            </Badge>
          </div>
          <PageTitle title={t(item.title)}>{t(item.description)}</PageTitle>
          <Card>
            <h2 className="text-lg font-bold">{t('Bạn sẽ học được gì?')}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {t(
                item.learning_goals ||
                  t('Khám phá kiến thức và thực hành theo từng bài học.'),
              )}
            </p>
            <h3 className="mt-6 text-sm font-semibold">
              {t('Trước khi bắt đầu')}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t(item.prerequisites || t('Không có yêu cầu đầu vào bổ sung.'))}
            </p>
          </Card>
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">{t('Nội dung khóa học')}</h2>
              {t(
                lessons.data && (
                  <Badge tone="neutral">
                    {t(lessons.data.items.length === 1 ? '1 bài học' : '{0} bài học', {
                      0: lessons.data.items.length,
                    })}
                  </Badge>
                ),
              )}
            </div>
            {t(lessons.loading && <Loading />)}
            <ErrorBox onRetry={lessons.reload}>{t(lessons.error)}</ErrorBox>
            <ol className="divide-y divide-border">
              {t(
                lessons.data?.items.map((lesson) => (
                  <li className="flex items-center gap-3 py-4" key={lesson.id}>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-light text-sm font-bold text-primary-hover">
                      {t(String(lesson.position).padStart(2, '0'))}
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="block text-sm">
                        {t(lesson.title)}
                      </strong>
                      <span className="mt-1 block text-[11px] text-muted">
                        {t('Theory · Vocabulary · Grammar')}
                        {t(lesson.quiz_id ? t(' · Quiz') : t(''))}
                      </span>
                    </div>
                    {t(
                      accessible ? (
                        <a
                          className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-hover"
                          href={`#/lessons/${lesson.id}`}
                        >
                          {t('Học bài')}
                          <ArrowRight size={15} />
                        </a>
                      ) : (
                        <LockKeyhole
                          size={17}
                          className="shrink-0 text-slate-400"
                          aria-label={t('Cần đăng ký')}
                        />
                      ),
                    )}
                  </li>
                )),
              )}
            </ol>
            {t(
              lessons.data?.items.length === 0 && (
                <Empty compact title={t('Nội dung đang được chuẩn bị')}>
                  {t('Khóa học chưa có bài học.')}
                </Empty>
              ),
            )}
          </Card>
        </div>
        <Card className="xl:sticky xl:top-26">
          <span className="text-xs font-medium text-muted">
            {t('ĐẦU TƯ CHO HÀNH TRÌNH CỦA BẠN')}
          </span>
          <h2 className="mt-3 text-3xl font-bold">
            {t(money(item.price, item.currency))}
          </h2>
          <p className="mb-5 mt-2 text-xs leading-relaxed text-muted">
            {t('Nội dung demo của đồ án. Không có khoản thanh toán thật.')}
          </p>
          <div className="space-y-3">
            <ErrorBox>{t(error || t(own.error))}</ErrorBox>
            {t(
              accessible ? (
                <>
                  <p className="flex items-center gap-2 text-sm font-semibold text-success">
                    <CheckCircle2 size={17} />
                    {t(
                      enrolled
                        ? t('Bạn đã có quyền học.')
                        : t('Quyền xem dành cho Admin.'),
                    )}
                  </p>
                  {t(
                    enrolled && (
                      <div>
                        <Progress
                          value={enrolled.progress_percent}
                          label={t('Tiến độ khóa học')}
                        />
                        <p className="mt-1 text-xs text-muted">
                          {t('{0}/{1} bài · {2}%', {
                            0: enrolled.completed_lessons,
                            1: enrolled.total_lessons,
                            2: enrolled.progress_percent,
                          })}
                        </p>
                      </div>
                    ),
                  )}
                  {t(
                    lessons.data?.items.length > 0 && (
                      <Button
                        className="w-full rounded-full"
                        href={`#/lessons/${lessons.data.items[0].id}`}
                      >
                        {t('Bắt đầu học')}
                        <ArrowRight size={16} />
                      </Button>
                    ),
                  )}
                </>
              ) : item.is_free ? (
                <Button
                  className="w-full rounded-full"
                  onClick={enroll}
                  busy={saving}
                  disabled={own.loading}
                >
                  {t(saving ? t('Đang đăng ký…') : t('Đăng ký miễn phí'))}
                </Button>
              ) : (
                <Button
                  className="w-full rounded-full"
                  href={user ? `#/payments?course=${id}` : '#/login'}
                >
                  {t('Mua khóa học mô phỏng')}
                  <ArrowRight size={16} />
                </Button>
              ),
            )}
          </div>
          <ul className="mt-6 space-y-3 border-t border-border pt-5 text-xs text-muted">
            <li className="flex items-center gap-2">
              <BookOpen size={16} />
              {t('Nội dung học theo trình độ {0}', { 0: item.level })}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              {t('Tiến độ và kết quả lưu trong tài khoản')}
            </li>
            <li className="flex items-center gap-2">
              <LockKeyhole size={16} />
              {t('Quyền học được xác minh bởi máy chủ')}
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
      <PageTitle
        eyebrow={t('YOUR LEARNING COLLECTION')}
        title={t('Việc học của tôi')}
      >
        {t('Mỗi bài học nhỏ đều đưa bạn đi xa hơn.')}
      </PageTitle>
      {t(loading && <Loading />)}
      <ErrorBox onRetry={reload}>{t(error)}</ErrorBox>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {t(
          data?.items.map((item) => (
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
                    {t(item.level)} ·{t(' ')}
                    {t(
                      item.completed_lessons >= item.total_lessons &&
                        item.total_lessons > 0
                        ? t('Đã hoàn thành')
                        : t('Đang học'),
                    )}
                  </Badge>
                  <h2 className="mt-2 text-lg font-bold">{t(item.title)}</h2>
                </div>
              </div>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-muted">
                    {t('{0}/{1} bài học hoàn thành', {
                      0: item.completed_lessons,
                      1: item.total_lessons,
                    })}
                  </span>
                  <strong>{t(item.progress_percent)}%</strong>
                </div>
                <Progress
                  value={item.progress_percent}
                  label={t('Tiến độ {0}', {
                    0: item.title,
                  })}
                />
              </div>
              <Button
                variant="soft"
                className="mt-5 w-full"
                href={`#/courses/${item.course_id}`}
              >
                {t('Tiếp tục học')}
                <ArrowRight size={16} />
              </Button>
            </Card>
          )),
        )}
      </div>
      {t(
        data?.items.length === 0 && (
          <Empty title={t('Bắt đầu một điều mới hôm nay')}>
            <p>{t('Bạn chưa đăng ký khóa học nào.')}</p>
            <Button className="mt-5" href="#/courses">
              {t('Khám phá khóa học')}
              <ArrowRight size={16} />
            </Button>
          </Empty>
        ),
      )}
    </>
  );
}
