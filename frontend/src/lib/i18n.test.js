import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from './translations.json' with { type: 'json' };
import { apiErrorMessage, getLocale, setLocale, t } from './i18n.js';

test('Vietnamese UI consistently translates navigation and headings', () => {
  setLocale('vi');
  assert.equal(t('Home'), 'Trang chủ');
  assert.equal(t('Vocabulary'), 'Từ vựng');
  assert.equal(t('Your learning journey'), 'Tiến trình học của bạn');
  assert.equal(t('Continue Learning'), 'Tiếp tục học');
});
test('English UI translates forms and feedback', () => {
  setLocale('en');
  assert.equal(t('Đăng nhập'), 'Sign in');
  assert.equal(t('Họ và tên'), 'Full name');
  assert.equal(t('Hoàn thành mục tiêu!'), 'Goal complete!');
  assert.equal(t('Thông tin đã được lưu.'), 'Your information has been saved.');
});
test('templates and already-created notices translate with live values', () => {
  setLocale('en');
  assert.equal(
    t('Bài {0} · {1}', { 0: 2, 1: 'Where are you from?' }),
    'Lesson 2 · Where are you from?',
  );
  assert.equal(
    t('Đã tạo khóa học “My Course” (ID 9).'),
    'Created course “My Course” (ID 9).',
  );
  assert.equal(t(' Câu '), ' Question ');
});
test('locale changes keep data, numbers and unknown text intact', () => {
  setLocale('vi');
  assert.equal(getLocale(), 'vi');
  assert.equal(t('Hello, my name is Mai.'), 'Hello, my name is Mai.');
  assert.equal(t('https://example.org/a/b'), 'https://example.org/a/b');
  assert.equal(t('5/10'), '5/10');
  assert.equal(t(50), 50);
  assert.deepEqual(t({ lesson: 1 }), { lesson: 1 });
  setLocale('en');
  assert.equal(t('Hello, my name is Mai.'), 'Hello, my name is Mai.');
  assert.equal(t('5/10'), '5/10');
});
test('English API feedback avoids leaking untranslated backend messages', () => {
  setLocale('en');
  assert.equal(
    apiErrorMessage(
      { code: 'enrollment_required', message: 'Bạn cần đăng ký.' },
      403,
    ),
    'Enroll in this course before opening its lessons or quizzes.',
  );
  assert.equal(
    apiErrorMessage({ code: 'unknown', message: 'Lỗi dữ liệu.' }, 503),
    'The service is temporarily unavailable. Please try again.',
  );
});
test('every catalog entry has both locales and preserves template parameters', () => {
  for (const [key, entry] of Object.entries(catalog)) {
    assert.ok(entry.vi && entry.en, key);
    const placeholders = (value) =>
      [...value.matchAll(/\{\d+\}/g)].map((match) => match[0]).sort();
    assert.deepEqual(placeholders(entry.en), placeholders(key), key);
    assert.deepEqual(placeholders(entry.vi), placeholders(key), key);
  }
  setLocale('vi');
});

test('complete translated phrases retain spaces around live counts and labels', () => {
  const cases = [
    ['{0} bài học', {0: 3}, '3 bài học', '3 lessons'],
    ['1 bài học', {}, '1 bài học', '1 lesson'],
    ['{0}/{1} bài · {2}%', {0: 0, 1: 3, 2: 0}, '0/3 bài · 0%', '0/3 lessons · 0%'],
    ['{0}/{1} bài học hoàn thành', {0: 2, 1: 2}, '2/2 bài học hoàn thành', '2/2 lessons completed'],
    ['Nội dung học theo trình độ {0}', {0: 'C1'}, 'Nội dung học theo trình độ C1', 'Learning content at CEFR level C1'],
    ['Cấu trúc {0}', {0: 1}, 'Cấu trúc 1', 'Structure 1'],
    ['{0}/{1} câu', {0: 0, 1: 10}, '0/10 câu', '0/10 questions'],
    ['Câu {0} · {1} điểm', {0: 1, 1: 2}, 'Câu 1 · 2 điểm', 'Question 1 · 2 points'],
    ['Câu {0} · 1 điểm', {0: 1}, 'Câu 1 · 1 điểm', 'Question 1 · 1 point'],
    ['{0} câu trả lời đúng', {0: 10}, '10 câu trả lời đúng', '10 correct answers'],
    ['Bài {0}', {0: 3}, 'Bài 3', 'Lesson 3'],
    ['Mã: {0}', {0: 'a1b2-c3'}, 'Mã: a1b2-c3', 'ID: a1b2-c3'],
  ];
  for (const [key, params, vi, en] of cases) {
    setLocale('vi'); assert.equal(t(key, params), vi);
    setLocale('en'); assert.equal(t(key, params), en);
  }
  const confirmation = 'Bạn đã trả lời {0}/{1} câu. Bài làm sẽ được gửi để chấm điểm và lưu kết quả.';
  assert.equal(t(confirmation, {0: 3, 1: 10}), 'You have answered 3/10 questions. Your answers will be submitted for grading and saved.');
  setLocale('vi');
});
