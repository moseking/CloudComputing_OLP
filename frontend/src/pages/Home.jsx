import { t } from '../lib/i18n.js';
import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Globe2,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import Hero from '../components/Hero.jsx';
import SkillCards from '../components/SkillCards.jsx';
import {
  Badge,
  Button,
  CourseCard,
  Empty,
  ErrorBox,
  Loading,
  useResource,
} from '../components/UI.jsx';
import { LEVELS } from '../lib/learning.js';
export default function Home() {
  const catalog = useResource('/api/courses');
  return (
    <div className="space-y-12 lg:space-y-16">
      <Hero landing />
      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-white p-5 sm:grid-cols-3 sm:p-7">
        {t(
          [
            [
              Globe2,
              'Mở rộng thế giới',
              'Tiếng Anh cho việc học, công việc và cuộc sống.',
            ],
            [
              BookOpen,
              'Học theo nhịp của bạn',
              'Từng bài học ngắn, từng bước tiến vững vàng.',
            ],
            [
              CheckCircle2,
              'Nhìn thấy tiến bộ',
              'Theo dõi bài đã học và kết quả Quiz thực tế.',
            ],
          ].map(([Icon, title, description]) => (
            <div key={title} className="flex items-start gap-3">
              <span className="rounded-xl bg-orange-light p-3 text-orange">
                <Icon size={22} />
              </span>
              <div>
                <h2 className="text-sm font-bold">{t(title)}</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {t(description)}
                </p>
              </div>
            </div>
          )),
        )}
      </section>
      <section>
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary-hover">
            {t('YOUR LEVEL. YOUR JOURNEY.')}
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            {t('Bắt đầu từ nơi bạn đang đứng')}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted">
            {t(
              'Chọn trình độ CEFR phù hợp. Các khóa học hiện có được cập nhật từ danh mục của OELP.',
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {t(
            LEVELS.map((level) => (
              <a
                href={`#/courses?level=${level.code}`}
                key={level.code}
                className="rounded-2xl border border-border bg-white p-5 text-center transition hover:border-orange/50 hover:bg-orange-light"
              >
                <span className="text-3xl font-bold text-orange">
                  {t(level.code)}
                </span>
                <span className="mt-2 block text-xs font-medium text-muted">
                  {t(level.name)}
                </span>
              </a>
            )),
          )}
        </div>
      </section>
      <section>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.15em] text-primary-hover">
              {t('BUILD YOUR SKILLS')}
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              {t('Học để hiểu. Luyện để nhớ.')}
            </h2>
          </div>
          <GraduationCap className="hidden text-orange sm:block" size={32} />
        </div>
        <SkillCards />
      </section>
      <section>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.15em] text-primary-hover">
              {t('EXPLORE COURSES')}
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              {t('Khóa học dành cho bạn')}
            </h2>
          </div>
          <a
            href="#/courses"
            className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-hover"
          >
            {t('Xem tất cả')}
            <ArrowRight size={15} />
          </a>
        </div>
        {t(catalog.loading && <Loading />)}
        <ErrorBox onRetry={catalog.reload}>{t(catalog.error)}</ErrorBox>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {t(
            catalog.data?.items
              .slice(0, 3)
              .map((course) => <CourseCard key={course.id} course={course} />),
          )}
        </div>
        {t(
          catalog.data?.items.length === 0 && (
            <Empty title={t('Nội dung mới đang được chuẩn bị')}>
              {t('Hãy quay lại sau để khám phá khóa học đầu tiên của bạn.')}
            </Empty>
          ),
        )}
      </section>
      <section className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-navy px-6 py-8 text-white sm:flex-row sm:items-center sm:px-9">
        <div>
          <Badge>{t('YOUR NEXT ADVENTURE')}</Badge>
          <h2 className="mt-4 text-2xl font-bold">
            {t('Một chút mỗi ngày. Đi xa hơn mỗi lần.')}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
            {t(
              'Tạo tài khoản miễn phí và bắt đầu hành trình tiếng Anh cùng Tama.',
            )}
          </p>
        </div>
        <Button href="#/register" className="shrink-0 rounded-full">
          {t('Start Learning')}
          <ArrowRight size={17} />
        </Button>
      </section>
    </div>
  );
}
