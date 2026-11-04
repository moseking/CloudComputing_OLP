import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterCourses,
  learningSummary,
  lessonNeighbors,
  nextUnfinishedLesson,
  selectContinueCourse,
  initials,
  greeting,
} from './learning.js';

test('catalog search matches actual course fields and Vietnamese accents', () => {
  const rows = [
    {
      title: 'English First Steps',
      description: 'Khởi đầu tiếng Anh',
      level: 'A1',
    },
    { title: 'At Work', level: 'B1' },
  ];
  assert.equal(filterCourses(rows, 'khoi dau a1').length, 1);
  assert.equal(filterCourses(rows, 'B2').length, 0);
  assert.equal(filterCourses(rows, '').length, 2);
});
test('progress aggregates lesson counts instead of averaging course percentages', () => {
  const result = learningSummary([
    { total_lessons: 2, completed_lessons: 2 },
    { total_lessons: 8, completed_lessons: 2 },
  ]);
  assert.equal(result.percent, 40);
  assert.equal(result.finishedCourses, 1);
});
test('unknown progress or quiz data never invents activity or a score', () => {
  assert.deepEqual(learningSummary(), {
    total: 0,
    completed: 0,
    courses: 0,
    percent: 0,
    finishedCourses: 0,
    attempts: 0,
    averageScore: null,
  });
  assert.equal(
    learningSummary([], [{ score: 0, max_score: 0 }]).averageScore,
    null,
  );
});
test('progress handles invalid counts and shows a derived server-score average', () => {
  const result = learningSummary(
    [{ total_lessons: 2, completed_lessons: 8 }],
    [
      { score: 1, max_score: 2 },
      { score: 3, max_score: 3 },
    ],
  );
  assert.equal(result.percent, 100);
  assert.equal(result.averageScore, 75);
});
test('continue learning prefers an actual unfinished enrolled course', () => {
  const rows = [
    { course_id: 1, total_lessons: 2, completed_lessons: 2 },
    { course_id: 2, total_lessons: 2, completed_lessons: 0 },
  ];
  assert.equal(selectContinueCourse(rows).course_id, 2);
  assert.equal(selectContinueCourse([]), null);
});
test('next lesson and neighbors use ordered backend metadata without mutating it', () => {
  const rows = [
    { id: 2, position: 2, completed: false },
    { id: 1, position: 1, completed: true },
  ];
  assert.equal(nextUnfinishedLesson(rows).id, 2);
  assert.equal(lessonNeighbors(rows, 1).next.id, 2);
  assert.equal(lessonNeighbors(rows, 99).next, null);
  assert.equal(rows[0].id, 2);
});
test('avatar and greeting are derived from real names and the local hour', () => {
  assert.equal(initials('Nguyễn Minh An'), 'NA');
  assert.equal(initials(' '), 'O');
  assert.equal(greeting(8), 'Good morning');
  assert.equal(greeting(15), 'Good afternoon');
  assert.equal(greeting(20), 'Good evening');
});
