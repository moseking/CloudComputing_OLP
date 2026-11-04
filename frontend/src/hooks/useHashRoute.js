import { useEffect, useState } from 'react';

export default function useHashRoute() {
  const [location, setLocation] = useState(
    window.location.hash.slice(1) || '/',
  );
  useEffect(() => {
    const change = () => {
      setLocation(window.location.hash.slice(1) || '/');
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  const [path, search = ''] = location.split('?');
  return { location, path, query: new URLSearchParams(search) };
}
