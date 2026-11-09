import { t } from '../lib/i18n.js';
import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Trophy,
} from 'lucide-react';
import { api, message } from '../api/client.js';
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  Input,
  Loading,
  PageTitle,
  Select,
  SuccessBox,
  Textarea,
  cx,
  useResource,
} from '../components/UI.jsx';
import { LEVELS } from '../lib/learning.js';
const emptyLesson = () => ({
  title: '',
  position: 1,
  theory: '',
  vocabulary: [],
  grammar: [],
  practice: [],
  quiz_id: '',
});
const lessonBody = (lesson) => ({
  title: lesson.title,
  position: Number(lesson.position),
  theory: lesson.theory,
  vocabulary: lesson.vocabulary,
  grammar: lesson.grammar,
  practice: lesson.practice,
  quiz_id: lesson.quiz_id ? Number(lesson.quiz_id) : null,
});
const makeQuestion = () => ({
  kind: 'single_choice',
  prompt: '',
  options: [
    {
      id: 'a',
      text: '',
    },
    {
      id: 'b',
      text: '',
    },
  ],
  correct_answer: '',
  points: 1,
});
function ArrayEditor({ title, items, onChange, blank, children, max = 30 }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold">{t(title)}</h3>
        <Button
          type="button"
          variant="soft"
          disabled={items.length >= max}
          className="px-3"
          onClick={() => onChange([...items, blank()])}
        >
          <Plus size={14} />
          {t('Thêm')}
        </Button>
      </div>
      {t(
        items.map((item, index) => (
          <div key={index} className="space-y-3 rounded-xl bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">
                {t(title)} {t(index + 1)}
              </span>
              <button
                type="button"
                aria-label={t('Bỏ {0} {1} khỏi bản nháp', {
                  0: title,
                  1: index + 1,
                })}
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                className="rounded-lg p-2 text-error hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
            {t(
              children(
                item,
                (field, value) =>
                  onChange(
                    items.map((row, i) =>
                      i === index
                        ? {
                            ...row,
                            [field]: value,
                          }
                        : row,
                    ),
                  ),
                index,
              ),
            )}
          </div>
        )),
      )}
      {t(
        !items.length && (
          <p className="text-xs text-muted">{t('Chưa thêm nội dung.')}</p>
        ),
      )}
    </section>
  );
}
function NewCourse({ onCreated }) {
  const languages = useResource('/api/languages');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await api('/api/courses', {
        method: 'POST',
        body: {
          ...values,
          price: Number(values.price),
          currency: 'VND',
        },
      });
      setNotice(
        `Đã tạo khóa học “${result.course.title}” (ID ${result.course.id}).`,
      );
      form.reset();
      onCreated();
    } catch (error) {
      setError(message(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Card>
      <h2 className="mb-5 text-xl font-bold">{t('Tạo khóa học')}</h2>
      <ErrorBox>{t(error || t(languages.error))}</ErrorBox>
      <SuccessBox>{t(notice)}</SuccessBox>
      <form onSubmit={submit} className="space-y-5">
        <Input
          label={t('Tên khóa học')}
          name="title"
          maxLength={150}
          required
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label={t('Ngôn ngữ')} name="language_code" required>
            <option value="">{t('Chọn ngôn ngữ')}</option>
            {t(
              languages.data?.items.map((item) => (
                <option key={item.code} value={item.code}>
                  {t(item.name)}
                </option>
              )),
            )}
          </Select>
          <Select label={t('CEFR')} name="level">
            {t(
              LEVELS.map((item) => (
                <option key={item.code}>{t(item.code)}</option>
              )),
            )}
          </Select>
          <Input
            label={t('Giá (VND)')}
            name="price"
            type="number"
            min="0"
            max="1000000000"
            step="1"
            defaultValue="0"
            required
          />
        </div>
        <Textarea
          label={t('Mô tả khóa học')}
          name="description"
          rows={3}
          maxLength={5000}
          required
        />
        <Textarea
          label={t('Điều kiện đầu vào')}
          name="prerequisites"
          rows={2}
          maxLength={2000}
        />
        <Textarea
          label={t('Mục tiêu học tập')}
          name="learning_goals"
          rows={2}
          maxLength={2000}
        />
        <Button busy={saving}>
          <Plus size={16} />
          {t('Tạo khóa học')}
        </Button>
      </form>
    </Card>
  );
}
function LessonEditor({ courseId, lessons, onSaved }) {
  const [selected, setSelected] = useState('');
  const [draft, setDraft] = useState(emptyLesson);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loadedId, setLoadedId] = useState('');
  function update(field, value) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }
  async function load(id) {
    setSelected(id);
    setLoadedId('');
    setError('');
    setNotice('');
    if (!id) {
      setDraft(emptyLesson());
      return;
    }
    setLoading(true);
    try {
      const result = await api(`/api/lessons/${id}`);
      setDraft({
        ...lessonBody(result.lesson),
        quiz_id: result.lesson.quiz_id || '',
      });
      setLoadedId(id);
    } catch (error) {
      setError(message(error));
    } finally {
      setLoading(false);
    }
  }
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await api(
        selected
          ? `/api/lessons/${selected}`
          : `/api/courses/${courseId}/lessons`,
        {
          method: selected ? 'PUT' : 'POST',
          body: lessonBody(draft),
        },
      );
      setNotice(
        `Đã lưu bài học “${result.lesson.title}” (ID ${result.lesson.id}).`,
      );
      if (!selected) setDraft(emptyLesson());
      onSaved(
        `Đã lưu bài học “${result.lesson.title}” (ID ${result.lesson.id}).`,
      );
    } catch (error) {
      setError(message(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Card>
      <h2 className="mb-5 text-xl font-bold">{t('Nội dung bài học')}</h2>
      <Select
        label={t('Chọn bài học để sửa')}
        value={selected}
        disabled={saving || loading}
        onChange={(event) => load(event.target.value)}
      >
        <option value="">{t('+ Tạo bài học mới')}</option>
        {t(
          lessons.map((item) => (
            <option key={item.id} value={item.id}>
              {t(item.position)}. {t(item.title)}
            </option>
          )),
        )}
      </Select>
      <ErrorBox>{t(error)}</ErrorBox>
      <SuccessBox>{t(notice)}</SuccessBox>
      {t(
        loading ? (
          <Loading />
        ) : selected && loadedId !== selected ? (
          <p className="mt-4 text-sm text-muted">
            {t('Chưa tải được bài học. Chọn lại để thử lại.')}
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <Input
                label={t('Tên bài học')}
                value={draft.title}
                onChange={(event) => update('title', event.target.value)}
                required
                maxLength={150}
              />
              <Input
                label={t('Thứ tự bài')}
                type="number"
                min="1"
                value={draft.position}
                onChange={(event) => update('position', event.target.value)}
                required
              />
            </div>
            <Textarea
              label={t('Theory / Lý thuyết')}
              rows={6}
              value={draft.theory}
              onChange={(event) => update('theory', event.target.value)}
              maxLength={20000}
              required
            />
            <ArrayEditor
              title={t('Từ vựng')}
              items={draft.vocabulary}
              max={100}
              onChange={(value) => update('vocabulary', value)}
              blank={() => ({
                term: '',
                ipa: '',
                meaning: '',
                example: '',
              })}
            >
              {t((word, set) => (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label={t('Từ / cụm từ')}
                      value={word.term}
                      onChange={(event) => set('term', event.target.value)}
                      required
                      maxLength={150}
                    />
                    <Input
                      label={t('Phiên âm IPA')}
                      value={word.ipa}
                      onChange={(event) => set('ipa', event.target.value)}
                      maxLength={200}
                    />
                  </div>
                  <Input
                    label={t('Nghĩa')}
                    value={word.meaning}
                    onChange={(event) => set('meaning', event.target.value)}
                    required
                    maxLength={1000}
                  />
                  <Input
                    label={t('Câu ví dụ')}
                    value={word.example}
                    onChange={(event) => set('example', event.target.value)}
                    required
                    maxLength={1000}
                  />
                </>
              ))}
            </ArrayEditor>
            <ArrayEditor
              title={t('Ngữ pháp')}
              items={draft.grammar}
              onChange={(value) => update('grammar', value)}
              blank={() => ({
                pattern: '',
                explanation: '',
                examples: [''],
              })}
            >
              {t((item, set) => (
                <>
                  <Input
                    label={t('Cấu trúc')}
                    value={item.pattern}
                    onChange={(event) => set('pattern', event.target.value)}
                    required
                    maxLength={500}
                  />
                  <Textarea
                    label={t('Giải thích')}
                    rows={2}
                    value={item.explanation}
                    onChange={(event) => set('explanation', event.target.value)}
                    required
                    maxLength={2000}
                  />
                  <Textarea
                    label={t('Các ví dụ (mỗi dòng một câu, tối đa 20)')}
                    value={item.examples.join('\n')}
                    onChange={(event) =>
                      set('examples', event.target.value.split('\n'))
                    }
                    required
                  />
                </>
              ))}
            </ArrayEditor>
            <ArrayEditor
              title={t('Tự luyện')}
              items={draft.practice}
              onChange={(value) => update('practice', value)}
              blank={() => ({
                prompt: '',
                example: '',
              })}
            >
              {t((item, set) => (
                <>
                  <Textarea
                    label={t('Đề bài tự luyện')}
                    value={item.prompt}
                    onChange={(event) => set('prompt', event.target.value)}
                    required
                    maxLength={2000}
                  />
                  <Textarea
                    label={t('Gợi ý / ví dụ')}
                    value={item.example}
                    onChange={(event) => set('example', event.target.value)}
                    maxLength={2000}
                  />
                </>
              ))}
            </ArrayEditor>
            <Input
              label={t('Quiz ID liên kết (để trống nếu chưa có)')}
              type="number"
              min="1"
              value={draft.quiz_id}
              onChange={(event) => update('quiz_id', event.target.value)}
              hint={t(
                'Chỉ liên kết Quiz thuộc đúng khóa học. Bạn có thể tạo Quiz tại mục Quizzes rồi quay lại điền ID.',
              )}
            />
            <Button busy={saving}>
              <Save size={16} />
              {t(selected ? t('Lưu thay đổi bài học') : t('Tạo bài học'))}
            </Button>
          </form>
        ),
      )}
    </Card>
  );
}
function NewQuiz({ courseId, lessons }) {
  const [title, setTitle] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [questions, setQuestions] = useState([makeQuestion()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await api('/api/quizzes', {
        method: 'POST',
        body: {
          course_id: Number(courseId),
          lesson_id: lessonId ? Number(lessonId) : null,
          title,
          questions: questions.map((item) => ({
            ...item,
            points: Number(item.points),
          })),
        },
      });
      setNotice(
        `Đã tạo Quiz ID ${result.quiz.id}. Để Quiz xuất hiện trong bài học, mở mục Lessons, chọn bài tương ứng và lưu Quiz ID ${result.quiz.id}.`,
      );
      setTitle('');
      setQuestions([makeQuestion()]);
    } catch (error) {
      setError(message(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Card>
      <h2 className="mb-2 text-xl font-bold">{t('Tạo Quiz')}</h2>
      <p className="mb-5 text-xs leading-relaxed text-muted">
        {t(
          'Đáp án do Admin nhập khi tạo nội dung; người học chỉ nhận đáp án sau khi nộp bài. Quiz hiện chưa hỗ trợ sửa hoặc xóa.',
        )}
      </p>
      <ErrorBox>{t(error)}</ErrorBox>
      <SuccessBox>{t(notice)}</SuccessBox>
      <form onSubmit={submit} className="space-y-5">
        <Input
          label={t('Tên Quiz')}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          maxLength={150}
        />
        <Select
          label={t('Bài học liên quan')}
          value={lessonId}
          onChange={(event) => setLessonId(event.target.value)}
        >
          <option value="">{t('Không chọn bài học')}</option>
          {t(
            lessons.map((item) => (
              <option key={item.id} value={item.id}>
                {t(item.title)}
              </option>
            )),
          )}
        </Select>
        <ArrayEditor
          title={t('Câu hỏi')}
          items={questions}
          max={100}
          onChange={setQuestions}
          blank={makeQuestion}
        >
          {t((item, set) => (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label={t('Loại câu hỏi')}
                  value={item.kind}
                  onChange={(event) => {
                    const kind = event.target.value;
                    setQuestions((current) =>
                      current.map((row) =>
                        row === item
                          ? {
                              ...row,
                              kind,
                              correct_answer: '',
                              options:
                                kind === 'fill_blank'
                                  ? []
                                  : [
                                      {
                                        id: 'a',
                                        text: '',
                                      },
                                      {
                                        id: 'b',
                                        text: '',
                                      },
                                    ],
                            }
                          : row,
                      ),
                    );
                  }}
                >
                  <option value="single_choice">
                    {t('Trắc nghiệm một đáp án')}
                  </option>
                  <option value="fill_blank">{t('Điền từ')}</option>
                </Select>
                <Input
                  label={t('Điểm câu hỏi')}
                  type="number"
                  min="1"
                  max="10"
                  value={item.points}
                  onChange={(event) => set('points', event.target.value)}
                  required
                />
              </div>
              <Textarea
                label={t('Nội dung câu hỏi')}
                value={item.prompt}
                onChange={(event) => set('prompt', event.target.value)}
                required
                maxLength={5000}
              />
              {t(
                item.kind === 'single_choice' && (
                  <ArrayEditor
                    title={t('Lựa chọn')}
                    items={item.options}
                    max={6}
                    onChange={(value) => set('options', value)}
                    blank={() => ({
                      id: String.fromCharCode(97 + item.options.length),
                      text: '',
                    })}
                  >
                    {t((option, setOption) => (
                      <div className="grid gap-3 sm:grid-cols-[80px_1fr]">
                        <Input
                          label={t('Mã')}
                          value={option.id}
                          onChange={(event) =>
                            setOption('id', event.target.value)
                          }
                          maxLength={30}
                          required
                        />
                        <Input
                          label={t('Nội dung lựa chọn')}
                          value={option.text}
                          onChange={(event) =>
                            setOption('text', event.target.value)
                          }
                          maxLength={2000}
                          required
                        />
                      </div>
                    ))}
                  </ArrayEditor>
                ),
              )}
              {t(
                item.kind === 'single_choice' ? (
                  <Select
                    label={t('Đáp án đúng')}
                    value={item.correct_answer}
                    onChange={(event) =>
                      set('correct_answer', event.target.value)
                    }
                    required
                  >
                    <option value="">{t('Chọn mã đáp án')}</option>
                    {t(
                      item.options.map((option, i) => (
                        <option key={i} value={option.id}>
                          {t(option.id)}: {t(option.text)}
                        </option>
                      )),
                    )}
                  </Select>
                ) : (
                  <Input
                    label={t('Đáp án đúng')}
                    value={item.correct_answer}
                    onChange={(event) =>
                      set('correct_answer', event.target.value)
                    }
                    maxLength={1000}
                    required
                  />
                ),
              )}
            </>
          ))}
        </ArrayEditor>
        <Button busy={saving} disabled={!questions.length}>
          <Plus size={16} />
          {t('Tạo Quiz')}
        </Button>
      </form>
    </Card>
  );
}
export default function Admin() {
  const catalog = useResource('/api/courses');
  const [tab, setTab] = useState('courses');
  const [courseId, setCourseId] = useState('');
  const [notice, setNotice] = useState('');
  const lessons = useResource(
    courseId ? `/api/courses/${courseId}/lessons` : null,
  );
  const tabs = [
    {
      id: 'courses',
      label: 'Courses',
      icon: BookOpen,
    },
    {
      id: 'lessons',
      label: 'Lessons',
      icon: BookOpen,
    },
    {
      id: 'quizzes',
      label: 'Quizzes',
      icon: Trophy,
    },
  ];
  return (
    <>
      <PageTitle
        eyebrow={t('ADMIN WORKSPACE')}
        title={t('Quản trị nội dung')}
        action={
          <Badge tone="purple">
            <ShieldCheck size={13} />
            {t('Admin')}
          </Badge>
        }
      >
        {t(
          'Tạo khóa học, biên soạn bài học và thiết lập Quiz cho hành trình OELP.',
        )}
      </PageTitle>
      <div className="mb-6 flex flex-wrap gap-2">
        {t(
          tabs.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={tab === id ? 'primary' : 'secondary'}
              onClick={() => setTab(id)}
            >
              <Icon size={16} />
              {t(label)}
            </Button>
          )),
        )}
      </div>
      <ErrorBox onRetry={catalog.reload}>{t(catalog.error)}</ErrorBox>
      {t(
        tab === 'courses' ? (
          <div className="space-y-6">
            <NewCourse onCreated={catalog.reload} />
            <Card>
              <h2 className="mb-4 text-lg font-bold">
                {t('Danh mục hiện có')}
              </h2>
              {t(catalog.loading && <Loading />)}
              <div className="divide-y divide-border">
                {t(
                  catalog.data?.items.map((item) => (
                    <a
                      href={`#/courses/${item.id}`}
                      key={item.id}
                      className="flex items-center justify-between gap-3 py-3 text-sm"
                    >
                      <span>{t(item.title)}</span>
                      <Badge tone="blue">
                        {t(item.level)}
                        {t(' · ID ')}
                        {t(item.id)}
                      </Badge>
                    </a>
                  )),
                )}
              </div>
              <p className="mt-4 text-xs text-muted">
                {t('Khóa học chưa có API sửa hoặc xóa.')}
              </p>
            </Card>
          </div>
        ) : (
          <>
            <Card className="mb-5">
              <Select
                label={t('Khóa học quản trị')}
                value={courseId}
                onChange={(event) => {
                  setNotice('');
                  setCourseId(event.target.value);
                }}
              >
                <option value="">{t('Chọn khóa học')}</option>
                {t(
                  catalog.data?.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {t(item.title)} · {t(item.level)}
                    </option>
                  )),
                )}
              </Select>
            </Card>
            <SuccessBox>{t(notice)}</SuccessBox>
            <ErrorBox onRetry={lessons.reload}>{t(lessons.error)}</ErrorBox>
            {t(
              lessons.loading ? (
                <Loading />
              ) : !courseId ? (
                <Empty compact>
                  {t('Chọn một khóa học để quản lý nội dung.')}
                </Empty>
              ) : (
                lessons.data &&
                (tab === 'lessons' ? (
                  <LessonEditor
                    key={courseId}
                    courseId={courseId}
                    lessons={lessons.data.items}
                    onSaved={(text) => {
                      setNotice(text);
                      lessons.reload();
                    }}
                  />
                ) : (
                  <NewQuiz
                    key={courseId}
                    courseId={courseId}
                    lessons={lessons.data.items}
                  />
                ))
              ),
            )}
          </>
        ),
      )}
    </>
  );
}
