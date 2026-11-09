import { t } from '../lib/i18n.js';
import React from 'react';
import { ArrowRight, BookOpen, Trophy } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  Loading,
  PageTitle,
  useResource,
} from '../components/UI.jsx';
import useLearningLibrary from '../hooks/useLearningLibrary.js';
import { SKILLS } from '../lib/learning.js';
export default function Library({ section, quizzes = false }) {
  const { user } = useAuth();
  const enrolled = useResource('/api/enrollments/my-courses');
  const catalog = useResource(user.role === 'admin' ? '/api/courses' : null);
  const library = useLearningLibrary(
    user,
    enrolled.data?.items,
    catalog.data?.items,
  );
  const skill = SKILLS.find((item) => item.id === section);
  const items = quizzes
    ? library.items.filter((item) => item.quiz_id)
    : library.items;
  const loading = enrolled.loading || catalog.loading || library.loading;
  return (
    <>
      <PageTitle
        eyebrow={t(
          quizzes ? t('CHECK YOUR KNOWLEDGE') : t('ONE LESSON AT A TIME'),
        )}
        title={t(
          quizzes
            ? t('Quizzes của bạn')
            : skill
              ? t('{0} / Bài học của bạn', {
                  0: skill.label,
                })
              : t('Không gian học tập'),
        )}
      >
        {t(
          quizzes
            ? t('Kiểm tra kiến thức từ những bài học bạn có quyền truy cập.')
            : t('Chọn một bài học và tiếp tục hành trình của bạn.'),
        )}
      </PageTitle>
      {t(loading && <Loading />)}
      <ErrorBox>
        {t(enrolled.error || catalog.error || t(library.error))}
      </ErrorBox>
      {t(
        !loading &&
          !enrolled.error &&
          !catalog.error &&
          !library.error &&
          !items.length && (
            <Empty
              title={t(
                quizzes
                  ? t('Chưa có Quiz để bắt đầu')
                  : t('Hành trình mới đang chờ bạn'),
              )}
              action={
                <Button href="#/courses">
                  {t('Khám phá khóa học')}
                  <ArrowRight size={15} />
                </Button>
              }
            >
              {t(
                quizzes
                  ? t(
                      'Quiz xuất hiện khi khóa học bạn được truy cập có bài kiểm tra được liên kết.',
                    )
                  : t('Đăng ký một khóa học để xem các bài học tại đây.'),
              )}
            </Empty>
          ),
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {t(
          items.map((item) => (
            <Card key={item.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-orange-light text-primary-hover">
                  {t(quizzes ? <Trophy size={22} /> : <BookOpen size={22} />)}
                </span>
                <Badge tone="blue">{t(item.level)}</Badge>
              </div>
              <p className="mt-4 text-xs text-muted">{t(item.course_title)}</p>
              <h2 className="mt-2 text-lg font-bold">{t(item.title)}</h2>
              <p className="mb-5 mt-2 text-xs text-muted">
                {t('Bài {0}', { 0: item.position })}
                {t(
                  skill
                    ? t(' · {0}', {
                        0: skill.label,
                      })
                    : t(''),
                )}
              </p>
              <Button
                variant="soft"
                className="mt-auto w-full"
                href={
                  quizzes
                    ? `#/quizzes/${item.quiz_id}`
                    : `#/lessons/${item.id}${skill ? `?section=${skill.id}` : ''}`
                }
              >
                {t(quizzes ? t('Bắt đầu Quiz') : t('Vào bài học'))}
                <ArrowRight size={15} />
              </Button>
            </Card>
          )),
        )}
      </div>
    </>
  );
}
