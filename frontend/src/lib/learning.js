export const LEVELS = [
  { code: 'A1', name: 'Beginner' },
  { code: 'A2', name: 'Elementary' },
  { code: 'B1', name: 'Intermediate' },
  { code: 'B2', name: 'Upper intermediate' },
  { code: 'C1', name: 'Advanced' },
];

export const SKILLS = [
  {
    id: 'theory',
    label: 'Theory',
    description: 'Hiểu kiến thức nền tảng',
    tone: 'orange',
  },
  {
    id: 'vocabulary',
    label: 'Vocabulary',
    description: 'Mở rộng vốn từ mỗi ngày',
    tone: 'pink',
  },
  {
    id: 'grammar',
    label: 'Grammar',
    description: 'Tự tin với từng cấu trúc',
    tone: 'green',
  },
  {
    id: 'practice',
    label: 'Practice',
    description: 'Đưa kiến thức vào thực tế',
    tone: 'purple',
  },
];

export function filterCourses(courses = [], query = '') {
  const normalize = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd');
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return courses.filter((course) =>
    terms.every((term) =>
      normalize(
        `${course.title} ${course.description} ${course.language} ${course.language_code} ${course.level}`,
      ).includes(term),
    ),
  );
}

export function learningSummary(enrollments = [], attempts = []) {
  const total = enrollments.reduce(
    (sum, item) => sum + Math.max(0, Number(item.total_lessons) || 0),
    0,
  );
  const completed = enrollments.reduce(
    (sum, item) =>
      sum +
      Math.min(
        Math.max(0, Number(item.completed_lessons) || 0),
        Math.max(0, Number(item.total_lessons) || 0),
      ),
    0,
  );
  const validAttempts = attempts.filter((item) => Number(item.max_score) > 0);
  return {
    total,
    completed,
    courses: enrollments.length,
    percent: total ? Math.round((completed * 100) / total) : 0,
    finishedCourses: enrollments.filter(
      (item) =>
        item.total_lessons > 0 && item.completed_lessons >= item.total_lessons,
    ).length,
    attempts: attempts.length,
    averageScore: validAttempts.length
      ? Math.round(
          validAttempts.reduce(
            (sum, item) => sum + (item.score * 100) / item.max_score,
            0,
          ) / validAttempts.length,
        )
      : null,
  };
}

export function selectContinueCourse(items = []) {
  return (
    items.find((item) => item.completed_lessons < item.total_lessons) ||
    items[0] ||
    null
  );
}

export function nextUnfinishedLesson(items = []) {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  return sorted.find((item) => !item.completed) || sorted[0] || null;
}

export function lessonNeighbors(items = [], id) {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  const index = sorted.findIndex((item) => String(item.id) === String(id));
  return {
    previous: index > 0 ? sorted[index - 1] : null,
    next: index >= 0 ? sorted[index + 1] || null : null,
  };
}

export function initials(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length
    ? `${words[0][0]}${words.length > 1 ? words.at(-1)[0] : ''}`.toLocaleUpperCase()
    : 'O';
}

export function greeting(hour = new Date().getHours()) {
  return hour < 12
    ? 'Good morning'
    : hour < 18
      ? 'Good afternoon'
      : 'Good evening';
}
