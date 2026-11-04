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
      aria-label={`Flashcard ${word.term}`}
      aria-pressed={flipped}
      onClick={() => setFlipped((value) => !value)}
      className="flex min-h-52 w-full flex-col items-center justify-center rounded-2xl border border-orange-100 bg-orange-light/60 p-6 text-center transition hover:border-orange focus-visible:ring-4 focus-visible:ring-orange-100"
    >
      <span className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-primary-hover">
        {flipped ? 'Meaning & example' : 'Vocabulary'}
      </span>
      <strong className="text-2xl text-navy">
        {flipped ? word.meaning : word.term}
      </strong>
      {!flipped && word.ipa && (
        <span className="mt-2 text-sm text-muted">{word.ipa}</span>
      )}
      {flipped && word.example && (
        <span className="mt-3 text-sm italic leading-relaxed text-slate-600">
          “{word.example}”
        </span>
      )}
      <span className="mt-5 flex items-center gap-1.5 text-[11px] text-muted">
        <RotateCcw size={12} />
        Chạm để lật thẻ
      </span>
    </button>
  );
}

export function Lesson({ id, initialSection }) {
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
      await api(`/api/lessons/${id}/complete`, { method: 'POST' });
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
        {resource.error}{' '}
        <a className="underline" href="#/my-learning">
          Về khóa học của tôi
        </a>
      </ErrorBox>
    );
  if (!lesson) return <Empty>Không tìm thấy nội dung bài học.</Empty>;
  const { previous, next } = lessonNeighbors(list.data?.items || [], id);
  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-muted"
      >
        <a href="#/my-learning" className="hover:text-primary">
          My Courses
        </a>
        <ChevronRight size={13} />
        <a
          href={`#/courses/${lesson.course_id}`}
          className="hover:text-primary"
        >
          {course.data?.course.title || 'Nội dung khóa học'}
        </a>
        <ChevronRight size={13} />
        <span>Bài {lesson.position}</span>
      </nav>
      <PageTitle
        eyebrow={`LESSON ${lesson.position}`}
        title={lesson.title}
        action={
          <Badge tone={lesson.completed ? 'green' : 'blue'}>
            {lesson.completed ? 'Đã hoàn thành' : 'Đang học'}
          </Badge>
        }
      >
        {course.data?.course.title}
      </PageTitle>
      <div
        role="tablist"
        aria-label="Nội dung bài học"
        className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-white p-2 sm:flex"
      >
        {SKILLS.map((item) => {
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
              {item.label}
            </button>
          );
        })}
      </div>
      <Card
        role="tabpanel"
        id={`panel-${section}`}
        aria-labelledby={`tab-${section}`}
        className="min-h-72"
      >
        {section === 'theory' && (
          <div className="mx-auto max-w-3xl py-2 sm:py-4">
            <Badge>Theory / Lý thuyết</Badge>
            <h2 className="mt-4 text-2xl font-bold">
              Từng bước làm chủ kiến thức
            </h2>
            {lesson.theory ? (
              <p className="mt-5 whitespace-pre-wrap text-[15px] leading-8 text-slate-600">
                {lesson.theory}
              </p>
            ) : (
              <Empty compact>Chưa có nội dung lý thuyết.</Empty>
            )}
            <Button
              variant="soft"
              className="mt-8"
              onClick={() => setSection('vocabulary')}
            >
              Khám phá từ vựng
              <ArrowRight size={16} />
            </Button>
          </div>
        )}
        {section === 'vocabulary' && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold">Vocabulary flashcards</h2>
              <p className="mt-2 text-sm text-muted">
                Lật thẻ để khám phá nghĩa và câu ví dụ.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {lesson.vocabulary.map((word, index) => (
                <Flashcard word={word} key={index} />
              ))}
            </div>
            {!lesson.vocabulary.length && (
              <Empty compact>Chưa có từ vựng cho bài học này.</Empty>
            )}
          </>
        )}
        {section === 'grammar' && (
          <>
            <h2 className="mb-6 text-xl font-bold">Grammar / Ngữ pháp</h2>
            <div className="space-y-5">
              {lesson.grammar.map((item, index) => (
                <section
                  key={index}
                  className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-success">
                    Cấu trúc {index + 1}
                  </p>
                  <h3 className="mt-2 break-words text-xl font-bold text-navy">
                    {item.pattern}
                  </h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                    {item.explanation}
                  </p>
                  <ul className="mt-4 space-y-2 border-l-2 border-emerald-200 pl-4 text-sm italic leading-relaxed text-slate-600">
                    {item.examples.map((example, i) => (
                      <li key={i}>{example}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            {!lesson.grammar.length && (
              <Empty compact>Chưa có nội dung ngữ pháp.</Empty>
            )}
            <Button
              className="mt-6"
              variant="soft"
              onClick={() => setSection('practice')}
            >
              Thử áp dụng
              <ArrowRight size={16} />
            </Button>
          </>
        )}
        {section === 'practice' && (
          <>
            <h2 className="text-xl font-bold">Practice / Tự luyện</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Câu trả lời nháp chỉ nằm trong trang hiện tại, không được lưu hoặc
              chấm điểm. Bạn có thể dùng Quiz để kiểm tra kiến thức.
            </p>
            <div className="mt-6 space-y-6">
              {lesson.practice.map((item, index) => (
                <div key={index}>
                  <Textarea
                    label={`${index + 1}. ${item.prompt}`}
                    rows={3}
                    placeholder="Viết câu trả lời của bạn…"
                  />
                  <details className="mt-2 text-xs text-muted">
                    <summary className="cursor-pointer font-medium text-primary-hover">
                      Ví dụ tham khảo
                    </summary>
                    <p className="mt-2 leading-relaxed">{item.example}</p>
                  </details>
                </div>
              ))}
            </div>
            {!lesson.practice.length && (
              <Empty compact>Chưa có bài tự luyện.</Empty>
            )}
          </>
        )}
      </Card>
      <ErrorBox>{actionError}</ErrorBox>
      <Card className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            {lesson.completed && (
              <img
                src={ASSETS.logo}
                alt="Tama chúc mừng bạn"
                width="64"
                height="54"
                className="h-14 w-16 object-contain"
              />
            )}
            <div>
              <h2 className="font-bold">
                {lesson.completed
                  ? 'Một bước tiến thật tuyệt!'
                  : 'Sẵn sàng cho bước tiếp theo?'}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {lesson.completed
                  ? 'Tiến độ của bạn đã được lưu.'
                  : 'Hoàn thành bài học để lưu tiến độ vào khóa học.'}
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
              {lesson.completed
                ? 'Đã hoàn thành bài học'
                : 'Đánh dấu hoàn thành'}
            </Button>
            {lesson.quiz_id && (
              <Button href={`#/quizzes/${lesson.quiz_id}`} variant="secondary">
                <Trophy size={16} />
                Làm bài kiểm tra
              </Button>
            )}
          </div>
        </div>
      </Card>
      <ErrorBox>{list.error}</ErrorBox>
      <div className="mt-5 flex flex-wrap justify-between gap-3">
        {previous ? (
          <Button href={`#/lessons/${previous.id}`} variant="ghost">
            <ArrowLeft size={16} />
            Bài trước
          </Button>
        ) : (
          <span />
        )}
        {next && (
          <Button href={`#/lessons/${next.id}`} variant="ghost">
            Bài tiếp theo
            <ArrowRight size={16} />
          </Button>
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
        body: { answers },
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
    return <ErrorBox onRetry={resource.reload}>{resource.error}</ErrorBox>;
  if (!quiz) return null;
  return (
    <>
      <a
        href={`#/courses/${quiz.course_id}`}
        className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-primary"
      >
        <ArrowLeft size={15} />
        Về khóa học
      </a>
      <PageTitle eyebrow="QUIZ / KIỂM TRA KIẾN THỨC" title={quiz.title}>
        Hãy thử sức! Kết quả và giải thích sẽ xuất hiện sau khi bạn nộp bài.
      </PageTitle>
      <Card className="mb-6">
        <div className="mb-3 flex justify-between gap-3 text-sm">
          <span className="font-semibold">Tiến độ trả lời</span>
          <span className="text-muted">
            {answered} / {quiz.questions.length} câu
          </span>
        </div>
        <Progress
          value={
            quiz.questions.length ? (answered / quiz.questions.length) * 100 : 0
          }
          label="Tiến độ trả lời Quiz"
        />
      </Card>
      <ErrorBox>{actionError}</ErrorBox>
      <form
        className="quiz-form mx-auto max-w-4xl space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          setConfirm(true);
        }}
      >
        {quiz.questions.map((question, index) => (
          <fieldset
            className="min-w-0 rounded-2xl border border-border bg-white p-5 shadow-card sm:p-7"
            key={question.id}
          >
            <legend className="ml-1 rounded-full bg-navy px-3 py-1 text-xs font-semibold text-white">
              Câu {index + 1} · {question.points} điểm
            </legend>
            <h2 className="mb-5 mt-2 text-lg font-bold leading-relaxed">
              {question.prompt}
            </h2>
            {question.kind === 'single_choice' ? (
              <div className="space-y-3">
                {question.options.map((option) => (
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
                    <span>{option.text}</span>
                  </label>
                ))}
              </div>
            ) : (
              <Input
                label="Điền câu trả lời"
                name={String(question.id)}
                value={answers[String(question.id)] || ''}
                onChange={(event) =>
                  setAnswers({ ...answers, [question.id]: event.target.value })
                }
                required
                maxLength={1000}
                autoComplete="off"
                placeholder="Câu trả lời của bạn…"
              />
            )}
          </fieldset>
        ))}
        {quiz.questions.length ? (
          <div className="flex justify-end">
            <Button type="submit" busy={saving}>
              <Send size={16} />
              Nộp bài kiểm tra
            </Button>
          </div>
        ) : (
          <Empty>Bài kiểm tra chưa có câu hỏi.</Empty>
        )}
      </form>
      <Modal
        open={confirm}
        title="Bạn đã sẵn sàng nộp bài?"
        onClose={() => {
          if (!saving) setConfirm(false);
        }}
      >
        <p className="text-sm leading-relaxed text-muted">
          Bạn đã trả lời {answered}/{quiz.questions.length} câu. Bài làm sẽ được
          gửi để chấm điểm và lưu kết quả.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => setConfirm(false)}
          >
            Xem lại
          </Button>
          <Button busy={saving} onClick={submit}>
            Xác nhận nộp bài
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
        eyebrow="MỖI BƯỚC ĐỀU CÓ Ý NGHĨA"
        title={data?.quiz?.title || 'Kết quả học tập'}
        action={
          quizId && (
            <Button variant="secondary" href={`#/quizzes/${quizId}`}>
              <RotateCcw size={15} />
              Làm lại Quiz
            </Button>
          )
        }
      >
        Xem điểm và lịch sử những bài kiểm tra bạn đã nộp.
      </PageTitle>
      {loading && <Loading />}
      <ErrorBox onRetry={resource.reload}>{error}</ErrorBox>
      {data?.items.length === 0 && (
        <Empty action={<Button href="#/learn">Bắt đầu bài học</Button>}>
          Bạn chưa có kết quả ở đây. Hãy bắt đầu một bài học.
        </Empty>
      )}
      <div className="results-list space-y-5">
        {data?.items.map((attempt, index) => (
          <Card key={attempt.id}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <Badge tone="purple">Quiz result</Badge>
                <h2 className="mt-3 text-lg font-bold">
                  {attempt.title || data.quiz?.title}
                </h2>
                <p className="mt-2 text-xs text-muted">
                  {dateTime(attempt.submitted_at)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {index === 0 && quizId && (
                  <img
                    src={ASSETS.logo}
                    alt="Tama đồng hành cùng bạn"
                    width="80"
                    height="68"
                    className="h-17 w-20 object-contain"
                  />
                )}
                <div className="text-right">
                  <strong className="score text-3xl font-extrabold text-primary-hover">
                    {attempt.score}/{attempt.max_score}
                  </strong>
                  <p className="mt-1 text-xs text-muted">
                    {attempt.correct_count} câu trả lời đúng
                  </p>
                </div>
              </div>
            </div>
            {!quizId && (
              <a
                className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary-hover"
                href={`#/results?quiz=${attempt.quiz_id}`}
              >
                Xem chi tiết
                <ArrowRight size={15} />
              </a>
            )}
            {attempt.answers && (
              <details className="mt-5 border-t border-border pt-4">
                <summary className="cursor-pointer text-sm font-semibold text-navy">
                  Xem lại câu trả lời
                </summary>
                <div className="mt-4 space-y-3">
                  {attempt.answers.map((answer) => (
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
                        {answer.prompt}
                      </strong>
                      <p className="mt-2 text-muted">
                        Bạn trả lời:{' '}
                        <span className="font-medium text-navy">
                          {answer.submitted_answer || '(Bỏ trống)'}
                        </span>{' '}
                        · {answer.is_correct ? 'Đúng' : 'Chưa đúng'}
                      </p>
                      <p className="mt-2 text-muted">
                        Đáp án:{' '}
                        <span className="font-medium text-navy">
                          {answer.correct_answer}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </Card>
        ))}
      </div>
      {data?.quiz && (
        <Button
          variant="ghost"
          className="mt-5"
          href={`#/courses/${data.quiz.course_id}`}
        >
          <ArrowLeft size={16} />
          Về khóa học
        </Button>
      )}
    </>
  );
}
