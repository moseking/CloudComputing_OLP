import { t } from '../lib/i18n.js';
import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Headphones, Volume2 } from 'lucide-react';
import { Button, ErrorBox, Select } from './UI.jsx';
import {
  normalizeAudioText,
  parseSourceLine,
  parseStudyContent,
} from '../lib/studyContent.js';
function AudioPlayer({ text, audio, label }) {
  const [accent, setAccent] = useState('uk');
  const [rate, setRate] = useState('1');
  const [failed, setFailed] = useState(false);
  const ref = useRef(null);
  const item = audio.manifest?.byText[normalizeAudioText(text)]?.[accent];
  useEffect(() => {
    const player = ref.current;
    if (player) {
      player.pause();
      player.playbackRate = Number(rate);
    }
    setFailed(false);
    return () => player?.pause();
  }, [item?.src]);
  useEffect(() => {
    if (ref.current) ref.current.playbackRate = Number(rate);
  }, [rate]);
  function play(event) {
    document.querySelectorAll('audio').forEach((element) => {
      if (element !== event.currentTarget) element.pause();
    });
  }
  if (audio.loading)
    return (
      <p role="status" className="text-xs text-muted">
        {t('Đang tải audio…')}
      </p>
    );
  if (audio.error)
    return <ErrorBox onRetry={audio.reload}>{t(audio.error)}</ErrorBox>;
  if (!item)
    return (
      <p className="text-xs text-muted">
        {t('Chưa có audio cho nội dung này.')}
      </p>
    );
  return (
    <div className="space-y-4 rounded-2xl border border-blue-100 bg-light-blue/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy">
        <Headphones size={18} />
        {t(label)}
        <span className="text-[10px] font-normal text-muted">
          {t('Giọng máy · tự luyện')}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label={t('Giọng đọc — {0}', {
            0: label,
          })}
          value={accent}
          onChange={(event) => setAccent(event.target.value)}
        >
          <option value="uk">{t('Anh–Anh (UK)')}</option>
          <option value="us">{t('Anh–Mỹ (US)')}</option>
        </Select>
        <Select
          label={t('Tốc độ — {0}', {
            0: label,
          })}
          value={rate}
          onChange={(event) => setRate(event.target.value)}
        >
          <option value="0.75">{t('Chậm · 0.75×')}</option>
          <option value="1">{t('Bình thường · 1×')}</option>
          <option value="1.25">{t('Nhanh · 1.25×')}</option>
        </Select>
      </div>
      <audio
        key={item.src}
        ref={ref}
        controls
        preload="none"
        aria-label={t(
          `${label} — ${accent === 'uk' ? t('Anh–Anh') : t('Anh–Mỹ')}`,
        )}
        onPlay={play}
        onLoadedMetadata={() => {
          if (ref.current) ref.current.playbackRate = Number(rate);
        }}
        onError={() => setFailed(true)}
        className="h-12 w-full min-w-0"
      >
        <source src={item.src} type="audio/mpeg" />
        {t('Trình duyệt của bạn chưa hỗ trợ audio.')}
      </audio>
      {t(
        failed && (
          <ErrorBox>
            {t('Không tải được audio. ')}
            <button
              className="underline"
              onClick={() => {
                setFailed(false);
                ref.current?.load();
              }}
            >
              {t('Thử tải lại')}
            </button>
          </ErrorBox>
        ),
      )}
    </div>
  );
}
function ReadingSection({ body, audio }) {
  const [visible, setVisible] = useState(true);
  return (
    <section className="space-y-4">
      <h3 className="text-xl font-bold">{t('Reading & Listening')}</h3>
      <p className="text-xs leading-relaxed text-muted">
        {t(
          'Nghe một lượt để nắm ý chính, nghe lại để tìm chi tiết, rồi đối chiếu bài đọc. Bạn có thể ẩn transcript khi nghe.',
        )}
      </p>
      <AudioPlayer text={body} audio={audio} label={t('Nghe bài đọc')} />
      <Button
        variant="ghost"
        className="px-0"
        aria-expanded={visible}
        onClick={() => setVisible((value) => !value)}
      >
        {t(visible ? t('Ẩn transcript') : t('Hiện transcript'))}
      </Button>
      {t(
        visible && (
          <p
            className="reading-transcript whitespace-pre-wrap rounded-2xl border border-border bg-slate-50 p-5 text-[15px] leading-8 text-slate-600"
            lang="en"
          >
            {t(body)}
          </p>
        ),
      )}
    </section>
  );
}
export default function StudyContent({ text, audio }) {
  return (
    <div className="mt-5 space-y-8">
      {t(
        parseStudyContent(text).map((section, index) =>
          section.kind === 'reading' ? (
            <ReadingSection key={index} body={section.body} audio={audio} />
          ) : section.kind === 'sources' ? (
            <section
              key={index}
              className="rounded-xl border border-border p-4"
            >
              <h3 className="mb-3 text-sm font-bold">
                {t('Nguồn tham khảo & luyện thêm')}
              </h3>
              <div className="space-y-3 text-xs leading-relaxed">
                {t(
                  section.body.split('\n').map((line, i) => {
                    const source = parseSourceLine(line);
                    return source ? (
                      <a
                        key={i}
                        className="flex items-start gap-2 break-words font-medium text-primary-hover underline underline-offset-2"
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t(source.title)}
                        <ExternalLink size={13} className="mt-0.5 shrink-0" />
                      </a>
                    ) : (
                      <p key={i} className="text-muted">
                        {t(line)}
                      </p>
                    );
                  }),
                )}
              </div>
            </section>
          ) : (
            <section key={index}>
              {t(
                section.heading && (
                  <h3 className="mb-3 text-lg font-bold">
                    {t(section.heading)}
                  </h3>
                ),
              )}
              <p className="whitespace-pre-wrap text-[15px] leading-8 text-slate-600">
                {t(section.body)}
              </p>
            </section>
          ),
        ),
      )}
    </div>
  );
}
export function PronunciationPractice({ words, audio }) {
  const [index, setIndex] = useState('0');
  const word = words[Number(index)] || words[0];
  if (
    !word ||
    (!audio.loading &&
      !audio.error &&
      !audio.manifest?.byText[normalizeAudioText(word.term)])
  )
    return null;
  return (
    <section className="mb-6 space-y-4 rounded-2xl border border-orange-100 bg-orange-light/40 p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-base font-bold">
        <Volume2 size={19} className="text-primary-hover" />
        {t('Luyện phát âm từ vựng')}
      </h3>
      <Select
        label={t('Từ muốn luyện phát âm')}
        value={index}
        onChange={(event) => setIndex(event.target.value)}
      >
        {t(
          words.map((item, i) => (
            <option key={i} value={String(i)}>
              {t(item.term)} — {t(item.meaning)}
            </option>
          )),
        )}
      </Select>
      <AudioPlayer
        text={word.term}
        audio={audio}
        label={t('Nghe phát âm từ')}
      />
      <p className="text-xs leading-relaxed text-muted">
        {t(
          'Nghe mẫu, đọc lại và so sánh hai giọng. Bài tự luyện hiện chưa ghi âm hoặc chấm điểm phát âm. Phiên âm trên flashcard, nếu có, dùng mẫu Anh–Anh; giọng đọc có thể khác theo accent.',
        )}
      </p>
    </section>
  );
}
