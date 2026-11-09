import { useCallback, useEffect, useState } from 'react';

let manifestPromise;
function readManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch('/audio/learning/manifest.json')
      .then((response) => {
        if (!response.ok) throw new Error('Không tải được bộ audio.');
        return response.json();
      })
      .catch((error) => {
        manifestPromise = null;
        throw error;
      });
  }
  return manifestPromise;
}

export default function useLearningAudio() {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({
    manifest: null,
    loading: true,
    error: '',
  });
  const reload = useCallback(() => {
    manifestPromise = null;
    setVersion((value) => value + 1);
  }, []);
  useEffect(() => {
    let active = true;
    setState({ manifest: null, loading: true, error: '' });
    readManifest()
      .then((manifest) => {
        if (active) setState({ manifest, loading: false, error: '' });
      })
      .catch((error) => {
        if (active)
          setState({ manifest: null, loading: false, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [version]);
  return { ...state, reload };
}
