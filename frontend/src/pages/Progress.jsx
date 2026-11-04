import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Target,
  Trophy,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  Loading,
  PageTitle,
  Progress as ProgressBar,
  dateTime,
  useResource,
} from '../components/UI.jsx';
import { learningSummary } from '../lib/learning.js';

export default function ProgressPage() {
  const enrolled = useResource('/api/enrollments/my-courses');
  const attempts = useResource('/api/quizzes/my-results');
  const stats = learningSummary(enrolled.data?.items, attempts.data?.items);
  const metrics = [
    { icon: BookOpen, label: 'Khóa đã đăng ký', value: stats.courses },
    {
      icon: CheckCircle2,
      label: 'Bài đã hoàn thành',
      value: `${stats.completed} / ${stats.total}`,
    },
    { icon: Trophy, label: 'Lượt làm Quiz', value: stats.attempts },
    {
      icon: Target,
      label: 'Điểm Quiz trung bình',
      value: stats.averageScore === null ? 'Chưa có' : `${stats.averageScore}%`,
    },
  ];
  return (
    <>
      <PageTitle eyebrow="YOUR LEARNING JOURNEY" title="Tiến độ của bạn">
        Mỗi bài học hoàn thành là một bước tiến. Theo dõi hành trình tại đây.
      </PageTitle>
      <ErrorBox>{enrolled.error || attempts.error}</ErrorBox>
      {enrolled.loading || attempts.loading ? (
        <Loading />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ icon: Icon, label, value }) => (
              <Card key={label}>
                <Icon size={22} className="text-orange" />
                <p className="mt-4 text-2xl font-bold">{value}</p>
                <p className="mt-1 text-xs text-muted">{label}</p>
              </Card>
            ))}
          </div>
          <div className="mt-7 grid items-start gap-6 xl:grid-cols-2">
            <section>
              <h2 className="mb-4 text-xl font-bold">Khóa học của bạn</h2>
              <div className="space-y-4">
                {enrolled.data?.items.map((item) => (
                  <Card key={item.course_id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-bold">{item.title}</h3>
                      <Badge
                        tone={item.progress_percent === 100 ? 'green' : 'blue'}
                      >
                        {item.progress_percent}%
                      </Badge>
                    </div>
                    <ProgressBar
                      className="mt-4"
                      value={item.progress_percent}
                      label={`Tiến độ ${item.title}`}
                    />
                    <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs">
                      <span className="text-muted">
                        {item.completed_lessons}/{item.total_lessons} bài hoàn
                        thành
                      </span>
                      <a
                        className="font-semibold text-primary-hover"
                        href={`#/courses/${item.course_id}`}
                      >
                        Tiếp tục học →
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
              {enrolled.data?.items.length === 0 && (
                <Empty
                  compact
                  action={<Button href="#/courses">Khám phá khóa học</Button>}
                >
                  Chưa có khóa học để theo dõi tiến độ.
                </Empty>
              )}
            </section>
            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">Lịch sử Quiz</h2>
                <a
                  href="#/results"
                  className="text-xs font-semibold text-primary-hover"
                >
                  Xem tất cả
                </a>
              </div>
              <Card className="divide-y divide-border">
                {attempts.data?.items.slice(0, 8).map((item) => (
                  <a
                    key={item.id}
                    href={`#/results?quiz=${item.quiz_id}`}
                    className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold">{item.title}</h3>
                      <p className="mt-1 text-[11px] text-muted">
                        {dateTime(item.submitted_at)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-primary-hover">
                      {item.score}/{item.max_score}
                    </span>
                    <ArrowRight size={15} className="shrink-0 text-muted" />
                  </a>
                ))}
                {attempts.data?.items.length === 0 && (
                  <Empty compact>Bạn chưa nộp bài Quiz nào.</Empty>
                )}
              </Card>
            </section>
          </div>
        </>
      )}
    </>
  );
}
