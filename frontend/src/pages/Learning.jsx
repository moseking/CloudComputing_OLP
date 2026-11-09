import { t } from '../lib/i18n.js';
import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Layers,
  Pencil,
  RotateCcw,
  Send,
  Trophy,
} from 'lucide-react';
import { api, message } from '../api/client.js';
import {
  ASSETS,
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  Input,
  Loading,
  Modal,
  PageTitle,
  Progress,
  Textarea,
  cx,
  dateTime,
  navigate,
  useResource,
} from '../components/UI.jsx';
import { lessonNeighbors, SKILLS } from '../lib/learning.js';
import StudyContent, {
  PronunciationPractice,
} from '../components/StudyContent.jsx';
import useLearningAudio from '../hooks/useLearningAudio.js';
const sectionIcons = {
  theory: BookOpen,
  vocabulary: Layers,
  grammar: Layers,
  practice: Pencil,
};
function Flashcard({ word }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      aria-label={t('Flashcard {0}', {
        0: word.term,
      })}
      aria-pressed={flipped}
      onClick={() => setFlipped((value) => !value)}
      className="flex min-h-52 w-full flex-col items-center justify-center rounded-2xl border border-orange-100 bg-orange-light/60 p-6 text-center transition hover:border-orange focus-visible:ring-4 focus-visible:ring-orange-100"
    >
      <span className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-primary-hover">
        {t(flipped ? t('Meaning & example') : t('Vocabulary'))}
      </span>
      <strong className="text-2xl text-navy">
        {t(flipped ? t(word.meaning) : t(word.term))}
      </strong>
      {t(
        !flipped && word.ipa && (
          <span className="mt-2 text-sm text-muted">{t(word.ipa)}</span>
        ),
      )}
      {t(
        flipped && word.example && (
          <span className="mt-3 text-sm italic leading-relaxed text-slate-600">
            “{t(word.example)}”
          </span>
        ),
      )}
      <span className="mt-5 flex items-center gap-1.5 text-[11px] text-muted">
        <RotateCcw size={12} />
        {t('Chạm để lật thẻ')}
      </span>
    </button>
  );
}
export function Lesson({ id, initialSection }) {
  const audio = useLearningAudio();
  const resource = useResource(`/api/lessons/${id}`);
  const lesson = resource.data?.lesson;
  const course = useResource(
    lesson ? `/api/courses/${lesson.course_id}` : null,
  );
  const list = useResource(
    lesson ? `/api/courses/${lesson.course_id}/lessons` : null,
  );
  const [section, setSection] = useState(
    SKILLS.some((item) => item.id === initialSection)
      ? initialSection
      : 'theory',
  );
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  async function complete() {
    setSaving(true);
    setActionError('');
    try {
      await api(`/api/lessons/${id}/complete`, {
        method: 'POST',
      });
      resource.reload();
    } catch (error) {
      setActionError(message(error));
    } finally {
      setSaving(false);
    }
  }
  if (resource.loading) return <Loading />;
  if (resource.error)
    return (
      <ErrorBox onRetry={resource.reload}>
        {t(resource.error)}
        {t(' ')}
        <a className="underline" href="#/my-learning">
          {t('Về khóa học của tôi')}
        </a>
      </ErrorBox>
    );
  if (!lesson) return <Empty>{t('Không tìm thấy nội dung bài học.')}</Empty>;
  const { previous, next } = lessonNeighbors(list.data?.items || [], id);
  return (
    <>
      <nav
        aria-label={t('Breadcrumb')}
        className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-muted"
      >
        <a href="#/my-learning" className="hover:text-primary">
          {t('My Courses')}
        </a>
        <ChevronRight size={13} />
        <a
          href={`#/courses/${lesson.course_id}`}
          className="hover:text-primary"
        >
          {t(course.data?.course.title || t('Nội dung khóa học'))}
        </a>
        <ChevronRight size={13} />
        <span>
          {t('Bài ')}
          {t(lesson.position)}
        </span>
      </nav>
      <PageTitle
        eyebrow={t('LESSON {0}', {
          0: lesson.position,
        })}
        title={t(lesson.title)}
        action={
          <Badge tone={lesson.completed ? 'green' : 'blue'}>
            {t(lesson.completed ? t('Đã hoàn thành') : t('Đang học'))}
          </Badge>
        }
      >
        {t(course.data?.course.title)}
      </PageTitle>
      <div
        role="tablist"
        aria-label={t('Nội dung bài học')}
        className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-white p-2 sm:flex"
      >
        {t(
          SKILLS.map((item) => {
            const Icon = sectionIcons[item.id];
            return (
              <button
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={section === item.id}
                aria-controls={`panel-${item.id}`}
                key={item.id}
                onClick={() => setSection(item.id)}
                className={cx(
                  'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition',
                  section === item.id
                    ? 'bg-orange-light text-primary-hover'
                    : 'text-muted hover:bg-slate-50',
                )}
              >
                <Icon size={17} />
                {t(item.label)}
              </button>
            );
          }),
        )}
      </div>
      <Card
        role="tabpanel"
        id={`panel-${section}`}
        aria-labelledby={`tab-${section}`}
        className="min-h-72"
      >
        {t(
          section === 'theory' && (
            <div className="mx-auto max-w-3xl py-2 sm:py-4">
              <Badge>{t('Theory / Lý thuyết')}</Badge>
              <h2 className="mt-4 text-2xl font-bold">
                {t('Từng bước làm chủ kiến thức')}
              </h2>
              {t(
                lesson.theory ? (
                  <StudyContent text={lesson.theory} audio={audio} />
                ) : (
                  <Empty compact>{t('Chưa có nội dung lý thuyết.')}</Empty>
                ),
              )}
              <Button
                variant="soft"
                className="mt-8"
                onClick={() => setSection('vocabulary')}
              >
                {t('Khám phá từ vựng')}
                <ArrowRight size={16} />
              </Button>
            </div>
          ),
        )}
        {t(
          section === 'vocabulary' && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold">
                  {t('Vocabulary flashcards')}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {t('Lật thẻ để khám phá nghĩa và câu ví dụ.')}
                </p>
              </div>
              <PronunciationPractice words={lesson.vocabulary} audio={audio} />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {t(
                  lesson.vocabulary.map((word, index) => (
                    <Flashcard word={word} key={index} />
                  )),
                )}
              </div>
              {t(
                !lesson.vocabulary.length && (
                  <Empty compact>{t('Chưa có từ vựng cho bài học này.')}</Empty>
                ),
              )}
            </>
          ),
        )}
        {t(
          section === 'grammar' && (
            <>
              <h2 className="mb-6 text-xl font-bold">
                {t('Grammar / Ngữ pháp')}
              </h2>
              <div className="space-y-5">
                {t(
                  lesson.grammar.map((item, index) => (
                    <section
                      key={index}
                      className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-success">
                        {t('Cấu trúc {0}', { 0: index + 1 })}
                      </p>
                      <h3 className="mt-2 break-words text-xl font-bold text-navy">
                        {t(item.pattern)}
                      </h3>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                        {t(item.explanation)}
                      </p>
                      <ul className="mt-4 space-y-2 border-l-2 border-emerald-200 pl-4 text-sm italic leading-relaxed text-slate-600">
                        {t(
                          item.examples.map((example, i) => (
                            <li key={i}>{t(example)}</li>
                          )),
                        )}
                      </ul>
                    </section>
                  )),
                )}
              </div>
              {t(
                !lesson.grammar.length && (
                  <Empty compact>{t('Chưa có nội dung ngữ pháp.')}</Empty>
                ),
              )}
              <Button
                className="mt-6"
                variant="soft"
                onClick={() => setSection('practice')}
              >
                {t('Thử áp dụng')}
                <ArrowRight size={16} />
              </Button>
            </>
          ),
        )}
        {t(
          section === 'practice' && (
            <>
              <h2 className="text-xl font-bold">{t('Practice / Tự luyện')}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {t(
                  'Câu trả lời nháp chỉ nằm trong trang hiện tại, không được lưu hoặc chấm điểm. Bạn có thể dùng Quiz để kiểm tra kiến thức.',
                )}
              </p>
              <div className="mt-6 space-y-6">
                {t(
                  lesson.practice.map((item, index) => (
                    <div key={index}>
                      <Textarea
                        label={t('{0}. {1}', {
                          0: index + 1,
                          1: item.prompt,
                        })}
                        rows={3}
                        placeholder={t('Viết câu trả lời của bạn…')}
                      />
                      <details className="mt-2 text-xs text-muted">
                        <summary className="cursor-pointer font-medium text-primary-hover">
                          {t('Ví dụ tham khảo')}
                        </summary>
                        <p className="mt-2 leading-relaxed">
                          {t(item.example)}
                        </p>
                      </details>
                    </div>
                  )),
                )}
              </div>
              {t(
                !lesson.practice.length && (
                  <Empty compact>{t('Chưa có bài tự luyện.')}</Empty>
                ),
              )}
            </>
          ),
        )}
      </Card>
      <ErrorBox>{t(actionError)}</ErrorBox>
      <Card className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            {t(
              lesson.completed && (
                <img
                  src={ASSETS.logo}
                  alt={t('Tama chúc mừng bạn')}
                  width="64"
                  height="54"
                  className="h-14 w-16 object-contain"
                />
              ),
            )}
            <div>
              <h2 className="font-bold">
                {t(
                  lesson.completed
                    ? t('Một bước tiến thật tuyệt!')
                    : t('Sẵn sàng cho bước tiếp theo?'),
                )}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {t(
                  lesson.completed
                    ? t('Tiến độ của bạn đã được lưu.')
                    : t('Hoàn thành bài học để lưu tiến độ vào khóa học.'),
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={complete}
              busy={saving}
              disabled={lesson.completed}
            >
              <Check size={16} />
              {t(
                lesson.completed
                  ? t('Đã hoàn thành bài học')
                  : t('Đánh dấu hoàn thành'),
              )}
            </Button>
            {t(
              lesson.quiz_id && (
                <Button
                  href={`#/quizzes/${lesson.quiz_id}`}
                  variant="secondary"
                >
                  <Trophy size={16} />
                  {t('Làm bài kiểm tra')}
                </Button>
              ),
            )}
          </div>
        </div>
      </Card>
      <ErrorBox>{t(list.error)}</ErrorBox>
      <div className="mt-5 flex flex-wrap justify-between gap-3">
        {t(
          previous ? (
            <Button href={`#/lessons/${previous.id}`} variant="ghost">
              <ArrowLeft size={16} />
              {t('Bài trước')}
            </Button>
          ) : (
            <span />
          ),
        )}
        {t(
          next && (
            <Button href={`#/lessons/${next.id}`} variant="ghost">
              {t('Bài tiếp theo')}
              <ArrowRight size={16} />
            </Button>
          ),
        )}
      </div>
    </>
  );
}
export function Quiz({ id }) {
  const resource = useResource(`/api/quizzes/${id}`);
  const [answers, setAnswers] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const quiz = resource.data?.quiz;
  const answered = Object.values(answers).filter((value) =>
    value.trim(),
  ).length;
  async function submit() {
    setSaving(true);
    setActionError('');
    try {
      await api(`/api/quizzes/${id}/submit`, {
        method: 'POST',
        body: {
          answers,
        },
      });
      navigate(`/results?quiz=${id}`);
    } catch (error) {
      setActionError(message(error));
      setConfirm(false);
    } finally {
      setSaving(false);
    }
  }
  if (resource.loading) return <Loading />;
  if (resource.error)
    return <ErrorBox onRetry={resource.reload}>{t(resource.error)}</ErrorBox>;
  if (!quiz) return null;
  return (
    <>
      <a
        href={`#/courses/${quiz.course_id}`}
        className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-primary"
      >
        <ArrowLeft size={15} />
        {t('Về khóa học')}
      </a>
      <PageTitle eyebrow={t('QUIZ / KIỂM TRA KIẾN THỨC')} title={t(quiz.title)}>
        {t(
          'Hãy thử sức! Kết quả và giải thích sẽ xuất hiện sau khi bạn nộp bài.',
        )}
      </PageTitle>
      <Card className="mb-6">
        <div className="mb-3 flex justify-between gap-3 text-sm">
          <span className="font-semibold">{t('Tiến độ trả lời')}</span>
          <span className="text-muted">
            {t('{0}/{1} câu', { 0: answered, 1: quiz.questions.length })}
          </span>
        </div>
        <Progress
          value={
            quiz.questions.length ? (answered / quiz.questions.length) * 100 : 0
          }
          label={t('Tiến độ trả lời Quiz')}
        />
      </Card>
      <ErrorBox>{t(actionError)}</ErrorBox>
      <form
        className="quiz-form mx-auto max-w-4xl space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          setConfirm(true);
        }}
      >
        {t(
          quiz.questions.map((question, index) => (
            <fieldset
              className="min-w-0 rounded-2xl border border-border bg-white p-5 shadow-card sm:p-7"
              key={question.id}
            >
              <legend className="ml-1 rounded-full bg-navy px-3 py-1 text-xs font-semibold text-white">
                {t(question.points === 1 ? 'Câu {0} · 1 điểm' : 'Câu {0} · {1} điểm', {
                  0: index + 1,
                  1: question.points,
                })}
              </legend>
              <h2 className="mb-5 mt-2 text-lg font-bold leading-relaxed">
                {t(question.prompt)}
              </h2>
              {t(
                question.kind === 'single_choice' ? (
                  <div className="space-y-3">
                    {t(
                      question.options.map((option) => (
                        <label
                          key={option.id}
                          className={cx(
                            'flex min-h-13 cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm transition',
                            answers[String(question.id)] === option.id
                              ? 'border-orange bg-orange-light text-primary-hover'
                              : 'border-border hover:bg-slate-50',
                          )}
                        >
                          <input
                            className="size-4 shrink-0 accent-orange"
                            type="radio"
                            name={String(question.id)}
                            value={option.id}
                            checked={answers[String(question.id)] === option.id}
                            onChange={(event) =>
                              setAnswers({
                                ...answers,
                                [question.id]: event.target.value,
                              })
                            }
                            required
                          />
                          <span>{t(option.text)}</span>
                        </label>
                      )),
                    )}
                  </div>
                ) : (
                  <Input
                    label={t('Điền câu trả lời')}
                    name={String(question.id)}
                    value={answers[String(question.id)] || ''}
                    onChange={(event) =>
                      setAnswers({
                        ...answers,
                        [question.id]: event.target.value,
                      })
                    }
                    required
                    maxLength={1000}
                    autoComplete="off"
                    placeholder={t('Câu trả lời của bạn…')}
                  />
                ),
              )}
            </fieldset>
          )),
        )}
        {t(
          quiz.questions.length ? (
            <div className="flex justify-end">
              <Button type="submit" busy={saving}>
                <Send size={16} />
                {t('Nộp bài kiểm tra')}
              </Button>
            </div>
          ) : (
            <Empty>{t('Bài kiểm tra chưa có câu hỏi.')}</Empty>
          ),
        )}
      </form>
      <Modal
        open={confirm}
        title={t('Bạn đã sẵn sàng nộp bài?')}
        onClose={() => {
          if (!saving) setConfirm(false);
        }}
      >
        <p className="text-sm leading-relaxed text-muted">
          {t('Bạn đã trả lời {0}/{1} câu. Bài làm sẽ được gửi để chấm điểm và lưu kết quả.', {
            0: answered,
            1: quiz.questions.length,
          })}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => setConfirm(false)}
          >
            {t('Xem lại')}
          </Button>
          <Button busy={saving} onClick={submit}>
            {t('Xác nhận nộp bài')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
export function Results({ quizId }) {
  const resource = useResource(
    quizId ? `/api/quizzes/${quizId}/results` : '/api/quizzes/my-results',
  );
  const { data, loading, error } = resource;
  return (
    <>
      <PageTitle
        eyebrow={t('MỖI BƯỚC ĐỀU CÓ Ý NGHĨA')}
        title={t(data?.quiz?.title || t('Kết quả học tập'))}
        action={
          quizId && (
            <Button variant="secondary" href={`#/quizzes/${quizId}`}>
              <RotateCcw size={15} />
              {t('Làm lại Quiz')}
            </Button>
          )
        }
      >
        {t('Xem điểm và lịch sử những bài kiểm tra bạn đã nộp.')}
      </PageTitle>
      {t(loading && <Loading />)}
      <ErrorBox onRetry={resource.reload}>{t(error)}</ErrorBox>
      {t(
        data?.items.length === 0 && (
          <Empty
            action={<Button href="#/learn">{t('Bắt đầu bài học')}</Button>}
          >
            {t('Bạn chưa có kết quả ở đây. Hãy bắt đầu một bài học.')}
          </Empty>
        ),
      )}
      <div className="results-list space-y-5">
        {t(
          data?.items.map((attempt, index) => (
            <Card key={attempt.id}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Badge tone="purple">{t('Quiz result')}</Badge>
                  <h2 className="mt-3 text-lg font-bold">
                    {t(attempt.title || t(data.quiz?.title))}
                  </h2>
                  <p className="mt-2 text-xs text-muted">
                    {t(dateTime(attempt.submitted_at))}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {t(
                    index === 0 && quizId && (
                      <img
                        src={ASSETS.logo}
                        alt={t('Tama đồng hành cùng bạn')}
                        width="80"
                        height="68"
                        className="h-17 w-20 object-contain"
                      />
                    ),
                  )}
                  <div className="text-right">
                    <strong className="score text-3xl font-extrabold text-primary-hover">
                      {t(attempt.score)}/{t(attempt.max_score)}
                    </strong>
                    <p className="mt-1 text-xs text-muted">
                      {t(attempt.correct_count === 1 ? '1 câu trả lời đúng' : '{0} câu trả lời đúng', {
                        0: attempt.correct_count,
                      })}
                    </p>
                  </div>
                </div>
              </div>
              {t(
                !quizId && (
                  <a
                    className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary-hover"
                    href={`#/results?quiz=${attempt.quiz_id}`}
                  >
                    {t('Xem chi tiết')}
                    <ArrowRight size={15} />
                  </a>
                ),
              )}
              {t(
                attempt.answers && (
                  <details className="mt-5 border-t border-border pt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-navy">
                      {t('Xem lại câu trả lời')}
                    </summary>
                    <div className="mt-4 space-y-3">
                      {t(
                        attempt.answers.map((answer) => (
                          <div
                            className={cx(
                              'review-item rounded-xl border p-4 text-sm',
                              answer.is_correct
                                ? 'border-emerald-100 bg-emerald-50/60'
                                : 'border-red-100 bg-red-50/60',
                            )}
                            key={answer.question_id}
                          >
                            <strong className="leading-relaxed">
                              {t(answer.prompt)}
                            </strong>
                            <p className="mt-2 text-muted">
                              {t('Bạn trả lời:')}
                              {t(' ')}
                              <span className="font-medium text-navy">
                                {t(answer.submitted_answer || t('(Bỏ trống)'))}
                              </span>
                              {t(' ')}·{t(' ')}
                              {t(
                                answer.is_correct ? t('Đúng') : t('Chưa đúng'),
                              )}
                            </p>
                            <p className="mt-2 text-muted">
                              {t('Đáp án:')}
                              {t(' ')}
                              <span className="font-medium text-navy">
                                {t(answer.correct_answer)}
                              </span>
                            </p>
                          </div>
                        )),
                      )}
                    </div>
                  </details>
                ),
              )}
            </Card>
          )),
        )}
      </div>
      {t(
        data?.quiz && (
          <Button
            variant="ghost"
            className="mt-5"
            href={`#/courses/${data.quiz.course_id}`}
          >
            <ArrowLeft size={16} />
            {t('Về khóa học')}
          </Button>
        ),
      )}
    </>
  );
}
