import { t } from '../lib/i18n.js';
import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ASSETS, Button, cx } from './UI.jsx';
import { greeting } from '../lib/learning.js';
export default function Hero({ user, href, landing = false }) {
  const firstName = user?.display_name?.trim().split(/\s+/).at(-1);
  return (
    <section
      className={cx(
        'relative isolate overflow-hidden rounded-[22px] bg-navy text-white shadow-card',
        landing ? 'min-h-[380px] sm:min-h-[420px]' : 'min-h-[300px]',
      )}
    >
      <img
        src={ASSETS.hero}
        alt={t('Tama vẫy chào bên bờ biển Tasmania, sóng trắng và vách đá')}
        className="absolute inset-0 -z-20 size-full object-cover object-[68%_0%] sm:object-top"
        fetchPriority="high"
        width="1984"
        height="793"
      />
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-navy/65 via-navy/20 to-transparent sm:from-navy/25 sm:via-transparent" />
      <span
        aria-hidden="true"
        className="absolute -left-9 top-6 h-3 w-36 -rotate-45 bg-orange sm:h-4"
      />
      <span
        aria-hidden="true"
        className="absolute -right-9 bottom-6 h-3 w-36 -rotate-45 bg-orange sm:h-4"
      />
      <div
        className={cx(
          'relative max-w-[78%] px-5 py-7 sm:max-w-[62%] sm:px-8 sm:py-8',
          landing && 'lg:px-10 lg:py-12',
          !landing && 'lg:max-w-[59%]',
        )}
      >
        <span className="inline-flex rounded-full bg-orange px-3.5 py-1.5 text-[10px] font-semibold tracking-wide text-white">
          {t('Learn English Online')}
        </span>
        <h1
          className={cx(
            'mt-4 font-bold leading-[1.15] tracking-tight [text-shadow:0_2px_12px_rgb(0_0_0/0.15)]',
            landing
              ? 'text-3xl sm:text-4xl lg:text-5xl'
              : 'text-2xl sm:text-[32px]',
          )}
        >
          {t(
            landing ? (
              <>
                {t('Mở rộng thế giới')}
                <br />
                <span className="text-orange-300">
                  {t('qua từng bài học.')}
                </span>
              </>
            ) : (
              <>
                {t(greeting())},<br />
                <span className="text-orange-300">
                  {t(firstName || t('bạn'))}!
                </span>
              </>
            ),
          )}
        </h1>
        <p className="mt-3 max-w-sm text-xs leading-relaxed text-white/90 sm:text-sm">
          {t(
            landing
              ? t(
                  'Học tiếng Anh theo trình độ, luyện tập mỗi ngày và khám phá những khả năng mới cùng Tama.',
                )
              : t(
                  'Một chút tiếng Anh mỗi ngày. Một hành trình mới ở phía trước.',
                ),
          )}
        </p>
        <Button
          href={href || (landing ? '#/register' : '#/my-learning')}
          className="mt-5 rounded-full bg-orange text-white hover:bg-primary sm:mt-6"
        >
          {t(landing ? t('Start Learning') : t('Continue Learning'))}
          <ArrowRight size={17} />
        </Button>
      </div>
    </section>
  );
}
