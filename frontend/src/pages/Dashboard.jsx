import { t } from '../lib/i18n.js';
import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Compass,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { api, message } from '../api/client.js';
import Hero from '../components/Hero.jsx';
import SkillCards from '../components/SkillCards.jsx';
import {
  ASSETS,
  Badge,
  Button,
  Card,
  CourseCard,
  Empty,
  ErrorBox,
  Loading,
  Progress,
  dateTime,
  useResource,
} from '../components/UI.jsx';
import {
  learningSummary,
  nextUnfinishedLesson,
  selectContinueCourse,
} from '../lib/learning.js';
function ContinueCard({ items, loading, error }) {
  const course = selectContinueCourse(items);
  const [lesson, setLesson] = useState(null);
  const [lessonError, setLessonError] = useState('');
  useEffect(() => {
    if (!course) return;
    const controller = new AbortController();
    setLesson(null);
    setLessonError('');
    api(`/api/courses/${course.course_id}/lessons`, {
      signal: controller.signal,
    })
      .then(async (data) => {
        const details = await Promise.all(
          data.items.map((item) =>
            api(`/api/lessons/${item.id}`, {
              signal: controller.signal,
            }),
          ),
        );
        if (!controller.signal.aborted)
          setLesson(nextUnfinishedLesson(details.map((item) => item.lesson)));
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLessonError(message(error));
      });
    return () => controller.abort();
  }, [course?.course_id, course?.completed_lessons]);
  if (loading) return <Loading />;
  if (error) return <ErrorBox>{t(error)}</ErrorBox>;
  if (!course)
    return (
      <Empty title={t('Hành trình của bạn bắt đầu ở đây')} compact>
        <p className="mb-4">{t('Bạn chưa đăng ký khóa học nào.')}</p>
        <Button href="#/courses" variant="soft">
          {t('Explore Courses')}
          <ArrowRight size={15} />
        </Button>
      </Empty>
    );
  return (
    <Card className="flex flex-wrap items-center gap-4 sm:flex-nowrap sm:p-4">
      <img
        src={ASSETS.background}
        alt={t('Hành trình tiếng Anh với Tama')}
        className="h-22 w-28 shrink-0 rounded-xl object-cover"
        loading="lazy"
        width="112"
        height="88"
      />
      <div className="min-w-0 flex-1">
        <Badge tone="blue">
          {t('CEFR ')}
          {t(course.level)}
        </Badge>
        <h3 className="mt-1.5 text-sm font-bold sm:text-base">
          {t(course.title)}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-muted">
          {t(
            lesson
              ? t('Bài {0} · {1}', {
                  0: lesson.position,
                  1: lesson.title,
                })
              : t('{0}/{1} bài học hoàn thành', {
                  0: course.completed_lessons,
                  1: course.total_lessons,
                }),
          )}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Progress
            value={course.progress_percent}
            label={t('Tiến độ {0}', {
              0: course.title,
            })}
          />
          <strong className="text-xs">{t(course.progress_percent)}%</strong>
        </div>
        {t(
          lessonError && (
            <p className="mt-2 text-xs text-error">{t(lessonError)}</p>
          ),
        )}
      </div>
      <Button
        href={
          lesson ? `#/lessons/${lesson.id}` : `#/courses/${course.course_id}`
        }
        className="w-full rounded-full sm:w-auto"
      >
        {t('Tiếp tục')}
        <ArrowRight size={15} />
      </Button>
    </Card>
  );
}
function Journey({ summary, loading, hasError }) {
  const circumference = 2 * Math.PI * 44;
  return (
    <Card className="h-fit">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">{t('Your learning journey')}</h2>
        <a
          href="#/progress"
          aria-label={t('Xem tiến độ học tập')}
          className="text-orange"
        >
          <ChevronRight size={20} />
        </a>
      </div>
      {t(
        loading ? (
          <Loading />
        ) : hasError ? (
          <p className="mt-5 text-sm text-muted">
            {t('Tiến độ chưa tải được. Vui lòng thử lại ở trang Progress.')}
          </p>
        ) : (
          <>
            <div className="mt-6 flex items-center gap-4">
              <div className="w-29 shrink-0 text-center">
                <div
                  className="relative size-29"
                  role="img"
                  aria-label={t('Đã hoàn thành {0} trên {1} bài học', {
                    0: summary.completed,
                    1: summary.total,
                  })}
                >
                  <svg
                    viewBox="0 0 108 108"
                    className="size-full -rotate-90"
                    aria-hidden="true"
                  >
                    <circle
                      cx="54"
                      cy="54"
                      r="44"
                      fill="none"
                      stroke="#eceef2"
                      strokeWidth="9"
                    />
                    <circle
                      cx="54"
                      cy="54"
                      r="44"
                      fill="none"
                      stroke="#ff6b00"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={
                        circumference * (1 - summary.percent / 100)
                      }
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <BookOpen size={19} className="mb-1 text-orange" />
                    <strong className="text-xl">
                      {t(summary.completed)}/{t(summary.total)}
                    </strong>
                  </div>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {t('Bài đã hoàn thành')}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold">
                  {t(
                    summary.total > 0 && summary.percent === 100
                      ? t('Hoàn thành mục tiêu!')
                      : summary.completed
                        ? t('Tiếp tục phát huy!')
                        : t('Bạn đã sẵn sàng?'),
                  )}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  {t(
                    summary.courses
                      ? t('{0} khóa học trong hành trình của bạn.', {
                          0: summary.courses,
                        })
                      : t('Khám phá một khóa học để bắt đầu.'),
                  )}
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
              <div>
                <p className="text-lg font-bold">{t(summary.percent)}%</p>
                <p className="text-[10px] text-muted">{t('Tiến độ tổng')}</p>
              </div>
              <div>
                <p className="text-lg font-bold">
                  {t(summary.finishedCourses)}
                </p>
                <p className="text-[10px] text-muted">
                  {t('Khóa đã hoàn thành')}
                </p>
              </div>
            </div>
          </>
        ),
      )}
    </Card>
  );
}
export default function Dashboard() {
  const { user } = useAuth();
  const catalog = useResource('/api/courses');
  const enrolled = useResource('/api/enrollments/my-courses');
  const results = useResource('/api/quizzes/my-results');
  const summary = learningSummary(enrolled.data?.items, results.data?.items);
  const owned = new Set(enrolled.data?.items.map((item) => item.course_id));
  const continueCourse = selectContinueCourse(enrolled.data?.items);
  return (
    <div className="grid grid-cols-1 gap-6 2xl:gap-7 xl:grid-cols-[minmax(0,1fr)_288px]">
      <div className="min-w-0 space-y-6">
        <Hero
          user={user}
          href={
            continueCourse
              ? `#/courses/${continueCourse.course_id}`
              : '#/courses'
          }
        />
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">{t('Continue Learning')}</h2>
            <a
              href="#/my-learning"
              className="text-xs font-semibold text-primary-hover"
            >
              {t('See all')}
            </a>
          </div>
          <ContinueCard
            items={enrolled.data?.items}
            loading={enrolled.loading}
            error={enrolled.error}
          />
        </section>
        <section>
          <h2 className="mb-4 text-lg font-bold">{t('Build Your Skills')}</h2>
          <SkillCards />
        </section>
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">{t('Explore Courses')}</h2>
            <a
              href="#/courses"
              className="text-xs font-semibold text-primary-hover"
            >
              {t('See all')}
            </a>
          </div>
          {t(catalog.loading && <Loading />)}
          <ErrorBox onRetry={catalog.reload}>{t(catalog.error)}</ErrorBox>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 min-[1380px]:grid-cols-3">
            {t(
              catalog.data?.items
                .slice(0, 5)
                .map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    enrolled={owned.has(course.id)}
                    compact
                  />
                )),
            )}
          </div>
          {t(
            catalog.data?.items.length === 0 && (
              <Empty compact>{t('Chưa có khóa học trong danh mục.')}</Empty>
            ),
          )}
        </section>
      </div>
      <aside className="grid min-w-0 grid-cols-1 content-start gap-5 sm:grid-cols-2 xl:grid-cols-1">
        <Journey
          summary={summary}
          loading={enrolled.loading}
          hasError={enrolled.error}
        />
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">{t('Recent results')}</h2>
            <Trophy size={19} className="text-orange" />
          </div>
          {t(results.loading && <Loading />)}
          <ErrorBox>{t(results.error)}</ErrorBox>
          {t(
            results.data?.items.length === 0 ? (
              <div className="py-6 text-center">
                <img
                  src={ASSETS.logo}
                  alt={t('Tama khích lệ bạn')}
                  className="mx-auto mb-3 h-16 w-22 object-contain"
                  loading="lazy"
                />
                <p className="text-xs leading-relaxed text-muted">
                  {t('Một bài Quiz nhỏ,')}
                  <br />
                  {t('một bước tiến mới.')}
                </p>
                <a
                  href="#/quizzes"
                  className="mt-3 inline-block text-xs font-semibold text-primary-hover"
                >
                  {t('Khám phá Quiz →')}
                </a>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {t(
                  results.data?.items.slice(0, 4).map((item) => (
                    <a
                      href={`#/results?quiz=${item.quiz_id}`}
                      key={item.id}
                      className="flex items-center gap-3"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-light text-orange">
                        <CheckCircle2 size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-xs">
                          {t(item.title)}
                        </strong>
                        <span className="text-[10px] text-muted">
                          {t(dateTime(item.submitted_at))}
                        </span>
                      </span>
                      <strong className="text-sm">
                        {t(item.score)}/{t(item.max_score)}
                      </strong>
                    </a>
                  )),
                )}
              </div>
            ),
          )}
        </Card>
        <div className="relative isolate overflow-hidden rounded-2xl bg-navy p-5 text-white">
          <img
            src={ASSETS.background}
            alt=""
            className="absolute inset-0 -z-20 size-full object-cover object-left opacity-55"
            loading="lazy"
          />
          <div className="absolute inset-0 -z-10 bg-linear-to-r from-navy/90 to-navy/20" />
          <Compass size={25} className="mb-4 text-orange-300" />
          <h2 className="text-xl font-bold">
            {t('Your next adventure')}
            <br />
            {t('starts with a word.')}
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-white/80">
            {t('Tiếp tục khám phá theo nhịp độ của riêng bạn.')}
          </p>
          <a
            href="#/learn"
            className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-orange-200"
          >
            {t('Explore your lessons')}
            <ArrowRight size={14} />
          </a>
        </div>
      </aside>
    </div>
  );
}
