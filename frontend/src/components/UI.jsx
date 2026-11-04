import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  LoaderCircle,
  LockKeyhole,
  X,
} from 'lucide-react';
import { api, message } from '../api/client.js';
import { initials, LEVELS } from '../lib/learning.js';

export const money = (value, currency = 'VND') =>
  Number(value) === 0
    ? 'Miễn phí'
    : new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(
        value,
      );
export const dateTime = (value) => new Date(value).toLocaleString('vi-VN');
export const navigate = (path) => {
  window.location.hash = path;
};
export const cx = (...values) => values.filter(Boolean).join(' ');
export const ASSETS = {
  logo: '/assets/logo-tasmania.png',
  background: '/assets/tasmania-background.png',
  hero: '/assets/tasmania-coast-hero.png',
};

const buttonVariants = {
  primary: 'bg-primary text-white hover:bg-primary-hover shadow-orange',
  secondary: 'border border-border bg-white text-navy hover:bg-slate-50',
  soft: 'bg-orange-light text-primary-hover hover:bg-orange-100',
  ghost: 'text-muted hover:bg-slate-100 hover:text-navy',
  danger: 'bg-error text-white hover:bg-red-700',
};
export function Button({
  children,
  variant = 'primary',
  className,
  href,
  busy,
  disabled,
  ...props
}) {
  const classes = cx(
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    buttonVariants[variant],
    className,
  );
  if (href)
    return (
      <a className={classes} href={href} {...props}>
        {children}
      </a>
    );
  return (
    <button className={classes} disabled={disabled || busy} {...props}>
      {busy && <LoaderCircle size={17} className="animate-spin" />}
      {children}
    </button>
  );
}
export function Card({ children, className, ...props }) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
export const inputClass =
  'min-h-11 w-full min-w-0 rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-navy transition placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-3 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-muted';
export function Input({ label, hint, className, ...props }) {
  const hintId = useId();
  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-navy">
      {label}
      <input
        aria-label={label}
        aria-describedby={hint ? hintId : undefined}
        className={cx(inputClass, className)}
        {...props}
      />
      {hint && (
        <span
          id={hintId}
          className="text-xs font-normal leading-relaxed text-muted"
        >
          {hint}
        </span>
      )}
    </label>
  );
}
export function Select({ label, hint, children, className, ...props }) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-navy">
      {label}
      <select
        aria-label={label}
        className={cx(inputClass, className)}
        {...props}
      >
        {children}
      </select>
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}
export function Textarea({ label, className, ...props }) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-navy">
      {label}
      <textarea className={cx(inputClass, 'resize-y', className)} {...props} />
    </label>
  );
}
const badgeVariants = {
  orange: 'bg-orange-light text-primary-hover',
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-emerald-50 text-emerald-700',
  purple: 'bg-violet-50 text-violet-700',
  neutral: 'bg-slate-100 text-slate-600',
  pink: 'bg-pink-50 text-pink-700',
};
export function Badge({ children, tone = 'orange', className }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold',
        badgeVariants[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
export function Avatar({ name, className }) {
  return (
    <span
      title={name}
      className={cx(
        'flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-white bg-orange-100 text-sm font-bold text-primary-hover',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
export function Progress({ value = 0, label, className }) {
  return (
    <progress
      aria-label={label || 'Tiến độ học tập'}
      className={cx(
        'oelp-progress h-2 w-full overflow-hidden rounded-full',
        className,
      )}
      max={100}
      value={Math.max(0, Math.min(100, Number(value) || 0))}
    />
  );
}
export function Skeleton({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cx('animate-pulse rounded-xl bg-slate-100', className)}
    />
  );
}
export function Loading() {
  return (
    <div role="status" className="space-y-4 py-3">
      <span className="sr-only">Đang tải dữ liệu…</span>
      <Skeleton className="h-8 w-2/5" />
      <Skeleton className="h-36 w-full" />
    </div>
  );
}
export function ErrorBox({ children, onRetry }) {
  return children ? (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-relaxed text-red-800"
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 break-words">
        {children}
        {onRetry && (
          <button
            className="mt-2 block font-semibold underline"
            onClick={onRetry}
          >
            Thử lại
          </button>
        )}
      </div>
    </div>
  ) : null;
}
export function SuccessBox({ children }) {
  return children ? (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-800"
    >
      <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  ) : null;
}
export function Empty({
  children,
  title = 'Bắt đầu một hành trình mới',
  compact = false,
  action,
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center rounded-2xl border border-dashed border-border bg-white text-center',
        compact ? 'p-5' : 'px-5 py-10',
      )}
    >
      <img
        src={ASSETS.logo}
        alt="Tama đồng hành cùng bạn"
        className={
          compact
            ? 'mb-3 h-14 w-20 object-contain'
            : 'mb-4 h-20 w-28 object-contain'
        }
        loading="lazy"
      />
      {title && <h2 className="mb-2 text-lg font-bold text-navy">{title}</h2>}
      <div className="max-w-md text-sm leading-relaxed text-muted">
        {children}
      </div>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
export function PageTitle({ eyebrow, title, children, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-primary-hover">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          {title}
        </h1>
        {children && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {children}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
export function SignInRequired() {
  return (
    <Empty title="Đăng nhập để tiếp tục">
      <p className="mb-5">Lưu tiến độ và xem các khóa học của bạn.</p>
      <Button href="#/login">
        Đăng nhập <ArrowRight size={16} />
      </Button>
    </Empty>
  );
}
export function AccessDenied() {
  return (
    <Card className="mx-auto max-w-xl py-12 text-center">
      <LockKeyhole className="mx-auto mb-4 text-primary" size={34} />
      <h1 className="text-2xl font-bold">Bạn không có quyền truy cập</h1>
      <p className="my-4 text-sm text-muted">
        Khu vực quản trị chỉ dành cho tài khoản Admin được backend xác nhận.
      </p>
      <Button href="#/">Về trang chủ</Button>
    </Card>
  );
}

export function Modal({ open, title, children, onClose, drawer = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (open && !ref.current.open) ref.current.showModal();
    if (!open && ref.current.open) ref.current.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={
        drawer
          ? 'oelp-drawer m-0 h-dvh max-h-dvh w-[280px] max-w-[86vw] border-0 bg-dark-navy p-0 text-white backdrop:bg-navy/50'
          : 'm-auto w-[calc(100%_-_2rem)] max-w-lg rounded-2xl border border-border bg-white p-6 text-navy shadow-xl backdrop:bg-navy/50'
      }
    >
      {drawer ? (
        children
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">{title}</h2>
            <button
              aria-label="Đóng"
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-slate-100"
            >
              <X size={20} />
            </button>
          </div>
          {children}
        </>
      )}
    </dialog>
  );
}

const statusVariants = {
  PENDING: 'bg-amber-50 text-amber-800',
  SUCCESS: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-700',
};
export function StatusBadge({ status }) {
  const labels = {
    PENDING: 'Chờ thanh toán',
    SUCCESS: 'Thanh toán thành công',
    FAILED: 'Thanh toán thất bại',
  };
  return (
    <span
      className={cx(
        'status-badge inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold',
        statusVariants[status] || 'bg-slate-100 text-muted',
        status?.toLowerCase(),
      )}
    >
      {labels[status] || status}
    </span>
  );
}
const thumbnailPositions = {
  A1: 'object-left',
  A2: 'object-center',
  B1: 'object-right',
  B2: 'object-left-bottom',
  C1: 'object-right-top',
};
export function CourseCard({ course, enrolled = false, compact = false }) {
  return (
    <article className="course-card group overflow-hidden rounded-2xl border border-border bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
      <a
        href={`#/courses/${course.id}`}
        className="relative block overflow-hidden"
      >
        <img
          src={ASSETS.background}
          alt={`Khóa học ${course.language || 'ngoại ngữ'} trình độ ${course.level}`}
          className={cx(
            'w-full object-cover transition duration-500 group-hover:scale-105',
            compact ? 'h-28' : 'h-40',
            thumbnailPositions[course.level] || 'object-center',
          )}
          loading="lazy"
          width="420"
          height="200"
        />
        <Badge className="absolute left-3 top-3 border border-white/70 bg-white/95 text-navy">
          {course.level}
        </Badge>
        {enrolled && (
          <span className="absolute bottom-3 right-3 flex size-6 items-center justify-center rounded-full bg-success text-white">
            <Check size={14} />
          </span>
        )}
      </a>
      <div className={compact ? 'p-3.5' : 'p-5'}>
        <p className="text-[11px] font-medium text-muted">
          {course.language} ·{' '}
          {LEVELS.find((item) => item.code === course.level)?.name ||
            course.level}
        </p>
        <h2
          className={cx(
            'mt-1.5 font-bold leading-snug text-navy',
            compact ? 'text-sm' : 'text-lg',
          )}
        >
          <a href={`#/courses/${course.id}`}>{course.title}</a>
        </h2>
        {!compact && (
          <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-relaxed text-muted">
            {course.description}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
          <span className="font-semibold text-primary-hover">
            {money(course.price, course.currency)}
          </span>
          <a
            className="flex items-center gap-1 font-semibold text-navy"
            href={`#/courses/${course.id}`}
          >
            {enrolled ? 'Tiếp tục học' : 'Xem khóa học'}
            <ChevronRight size={14} />
          </a>
        </div>
      </div>
    </article>
  );
}

export function useResource(path) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({
    data: null,
    loading: Boolean(path),
    error: '',
  });
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: '' });
      return;
    }
    const controller = new AbortController();
    setState({ data: null, loading: true, error: '' });
    api(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ data, loading: false, error: '' });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ data: null, loading: false, error: message(error) });
      });
    return () => controller.abort();
  }, [path, version]);
  return { ...state, reload };
}
