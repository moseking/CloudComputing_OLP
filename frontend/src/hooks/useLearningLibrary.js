import { useEffect, useState } from 'react';
import { api, message } from '../api/client.js';

// The backend has no global lesson/quiz catalog. Only request metadata for courses this actor may learn.
export default function useLearningLibrary(user, enrolled = [], catalog = []) {
  const source =
    user?.role === 'admin'
      ? catalog
      : enrolled.map((item) => ({ ...item, id: item.course_id }));
  const key = source.map((item) => `${item.id}:${item.title}`).join('|');
  const [state, setState] = useState({
    items: [],
    loading: Boolean(user),
    error: '',
  });
  useEffect(() => {
    if (!user || !source.length) {
      setState({ items: [], loading: false, error: '' });
      return;
    }
    const controller = new AbortController();
    setState({ items: [], loading: true, error: '' });
    Promise.all(
      source.map(async (course) => {
        const data = await api(`/api/courses/${course.id}/lessons`, {
          signal: controller.signal,
        });
        return data.items.map((lesson) => ({
          ...lesson,
          course_title: course.title,
          level: course.level,
        }));
      }),
    )
      .then((groups) => {
        if (!controller.signal.aborted)
          setState({ items: groups.flat(), loading: false, error: '' });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ items: [], loading: false, error: message(error) });
      });
    return () => controller.abort();
    // key captures source metadata without making new array identities trigger extra requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, key]);
  return state;
}
