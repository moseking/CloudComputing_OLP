import { t } from '../lib/i18n.js';
import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Mail, ShieldCheck } from 'lucide-react';
import { api, message } from '../api/client.js';
import { useAuth } from '../auth.jsx';
import {
  ASSETS,
  Avatar,
  Badge,
  Button,
  Card,
  ErrorBox,
  Input,
  PageTitle,
  Select,
  SuccessBox,
  Textarea,
  inputClass,
  navigate,
  useResource,
} from '../components/UI.jsx';
import { LEVELS } from '../lib/learning.js';
function PasswordInput({
  label = 'Mật khẩu',
  name = 'password',
  register = false,
  ...props
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-navy">
      {t(label)}
      <span className="relative block">
        <input
          aria-label={t(label)}
          className={`${inputClass} pr-12`}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={register ? 'new-password' : 'current-password'}
          required
          minLength={register ? 8 : 1}
          maxLength={128}
          {...props}
        />
        <button
          type="button"
          aria-label={t(
            visible
              ? t('Ẩn {0}', {
                  0: label.toLowerCase(),
                })
              : t('Hiện {0}', {
                  0: label.toLowerCase(),
                }),
          )}
          aria-pressed={visible}
          className="absolute inset-y-0 right-1 flex w-10 items-center justify-center rounded-lg text-muted hover:text-navy"
          onClick={() => setVisible((value) => !value)}
        >
          {t(visible ? <EyeOff size={18} /> : <Eye size={18} />)}
        </button>
      </span>
    </label>
  );
}
export function AccountForm({ register = false }) {
  const { login } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError('');
    setRegistered(false);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (register && data.password !== data.confirm_password) {
      setError('Mật khẩu xác nhận chưa khớp.');
      return;
    }
    delete data.confirm_password;
    setSaving(true);
    try {
      if (register) {
        await api('/api/users/register', {
          method: 'POST',
          body: data,
        });
        setRegistered(true);
      } else {
        await login(data);
        navigate('/');
      }
    } catch (error) {
      setError(message(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="mx-auto grid max-w-5xl gap-6 py-3 lg:grid-cols-2 lg:gap-10 lg:py-7">
      <div className="relative isolate hidden overflow-hidden rounded-3xl bg-navy p-8 text-white lg:flex lg:flex-col lg:justify-end">
        <img
          src={ASSETS.background}
          alt={t('Tama chào đón bạn đến OELP')}
          className="absolute inset-0 -z-20 size-full object-cover object-[65%_50%]"
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-navy via-navy/25 to-transparent" />
        <Badge className="w-fit">{t('WELCOME TO YOUR NEXT ADVENTURE')}</Badge>
        <h1 className="mt-4 text-3xl font-bold leading-tight">
          {t(register ? t('Một khởi đầu mới.') : t('Chào mừng bạn trở lại.'))}
        </h1>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/80">
          {t('Mỗi ngày học một chút. Mỗi ngày tiến thêm một bước cùng Tama.')}
        </p>
      </div>
      <Card className="px-5 py-7 sm:px-8 sm:py-9">
        <div className="mb-7">
          <p className="mb-2 text-xs font-semibold tracking-widest text-primary-hover">
            {t('OELP · ENGLISH FOR EVERYONE')}
          </p>
          <h2 className="text-2xl font-bold">
            {t(register ? t('Tạo tài khoản') : t('Đăng nhập'))}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {t(
              register
                ? t('Hành trình tiếng Anh của bạn bắt đầu từ đây.')
                : t('Tiếp tục khám phá những điều mới hôm nay.'),
            )}
          </p>
        </div>
        <div className="mb-5 space-y-3">
          <ErrorBox>{t(error)}</ErrorBox>
          <SuccessBox>
            {t(
              registered && (
                <>
                  {t('Tài khoản đã được tạo.')}
                  {t(' ')}
                  <a className="font-semibold underline" href="#/login">
                    {t('Đăng nhập để bắt đầu học.')}
                  </a>
                </>
              ),
            )}
          </SuccessBox>
        </div>
        <form onSubmit={submit} className="space-y-5">
          {t(
            register && (
              <Input
                label={t('Họ và tên')}
                name="display_name"
                autoComplete="name"
                required
                maxLength={150}
                placeholder={t('Tên của bạn')}
              />
            ),
          )}
          <Input
            label={t('Email')}
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder={t('you@example.com')}
          />
          <PasswordInput register={register} />
          {t(
            register && (
              <>
                <PasswordInput
                  name="confirm_password"
                  label={t('Xác nhận mật khẩu')}
                  register
                />
                <p className="text-xs leading-relaxed text-muted">
                  {t(
                    'Mật khẩu cần từ 8 đến 128 ký tự. Tài khoản đăng ký mới là Learner.',
                  )}
                </p>
              </>
            ),
          )}
          <Button className="w-full rounded-full" busy={saving}>
            {t(
              saving
                ? t('Đang xử lý…')
                : register
                  ? t('Đăng ký tài khoản')
                  : t('Đăng nhập'),
            )}
            {t(!saving && <ArrowRight size={16} />)}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          {t(register ? t('Đã có tài khoản?') : t('Chưa có tài khoản?'))}
          {t(' ')}
          <a
            className="font-semibold text-primary-hover"
            href={register ? '#/login' : '#/register'}
          >
            {t(register ? t('Đăng nhập') : t('Đăng ký'))}
          </a>
        </p>
        <div className="mt-7 flex items-start gap-2 border-t border-border pt-5 text-[11px] leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 shrink-0 text-success" size={16} />
          {t(
            'Thông tin đăng nhập được xử lý bởi User Service. Không chia sẻ mật khẩu hoặc token của bạn.',
          )}
        </div>
      </Card>
    </div>
  );
}
export function Profile() {
  const { user, setUser } = useAuth();
  const languages = useResource('/api/languages');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [level, setLevel] = useState(user.self_assessed_level || '');
  const [preferences, setPreferences] = useState(
    user.language_preferences.length
      ? user.language_preferences.map((item) => ({
          ...item,
        }))
      : [
          {
            language_code: '',
            level: 'A1',
          },
        ],
  );
  function updatePreference(index, field, value) {
    setPreferences((items) =>
      items.map((item, position) =>
        position === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const selected = preferences.filter((item) => item.language_code);
    if (
      new Set(selected.map((item) => item.language_code)).size !==
      selected.length
    ) {
      setError('Mỗi ngôn ngữ chỉ nên được chọn một lần.');
      setSaving(false);
      return;
    }
    try {
      const result = await api('/api/users/me', {
        method: 'PUT',
        body: {
          ...data,
          self_assessed_level: level || null,
          language_preferences: selected,
        },
      });
      setUser(result.user);
      setSaved(true);
    } catch (error) {
      setError(message(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow={t('YOUR SPACE, YOUR STORY')}
        title={t('Hồ sơ người học')}
      >
        {t('Giữ thông tin và mục tiêu học tập của bạn luôn cập nhật.')}
      </PageTitle>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="text-center">
          <Avatar
            name={user.display_name}
            className="mx-auto size-20 text-2xl"
          />
          <h2 className="mt-4 break-words text-xl font-bold">
            {t(user.display_name)}
          </h2>
          <p className="mt-1 break-all text-xs text-muted">{t(user.email)}</p>
          <div className="mt-4">
            <Badge tone={user.role === 'admin' ? 'purple' : 'blue'}>
              {t(user.role === 'admin' ? t('Admin') : t('Learner'))}
            </Badge>
          </div>
          <p className="mt-5 border-t border-border pt-5 text-xs leading-relaxed text-muted">
            {t(
              'Avatar hiển thị chữ cái từ tên của bạn. Tài khoản chưa hỗ trợ tải ảnh đại diện.',
            )}
          </p>
        </Card>
        <Card>
          <div className="mb-5 space-y-3">
            <ErrorBox>{t(error)}</ErrorBox>
            <SuccessBox>{t(saved && t('Thông tin đã được lưu.'))}</SuccessBox>
          </div>
          <form onSubmit={submit} className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input
                label={t('Họ và tên')}
                name="display_name"
                defaultValue={user.display_name}
                required
                maxLength={150}
              />
              <Input label={t('Email')} value={user.email} disabled />
            </div>
            <Textarea
              label={t('Giới thiệu')}
              name="bio"
              defaultValue={user.bio}
              maxLength={500}
              rows={3}
            />
            <Select
              label={t('Trình độ tự đánh giá')}
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              <option value="">{t('Chưa xác định')}</option>
              {t(
                LEVELS.map((item) => (
                  <option key={item.code} value={item.code}>
                    {t(item.code)} — {t(item.name)}
                  </option>
                )),
              )}
            </Select>
            <div>
              <h2 className="text-sm font-semibold">
                {t('Ngôn ngữ quan tâm')}
              </h2>
              <p className="mb-4 mt-1 text-xs text-muted">
                {t(
                  'Chọn từ danh mục ngôn ngữ hiện có. Nội dung demo hiện tập trung vào tiếng Anh.',
                )}
              </p>
              <ErrorBox>{t(languages.error)}</ErrorBox>
              <div className="space-y-4">
                {t(
                  preferences.map((item, index) => (
                    <div
                      className="grid grid-cols-[minmax(0,1fr)_110px_auto] items-end gap-2 rounded-xl bg-slate-50 p-3"
                      key={index}
                    >
                      <Select
                        label={t(
                          index === 0
                            ? t('Ngôn ngữ quan tâm')
                            : t('Ngôn ngữ {0}', {
                                0: index + 1,
                              }),
                        )}
                        value={item.language_code}
                        onChange={(event) =>
                          updatePreference(
                            index,
                            'language_code',
                            event.target.value,
                          )
                        }
                      >
                        <option value="">{t('Chọn ngôn ngữ')}</option>
                        {t(
                          item.language_code &&
                            !languages.data?.items.some(
                              (row) => row.code === item.language_code,
                            ) && (
                              <option value={item.language_code}>
                                {t(item.language_code)}
                              </option>
                            ),
                        )}
                        {t(
                          languages.data?.items.map((row) => (
                            <option key={row.code} value={row.code}>
                              {t(row.name)}
                            </option>
                          )),
                        )}
                      </Select>
                      <Select
                        label={t('Trình độ ngôn ngữ {0}', {
                          0: index + 1,
                        })}
                        value={item.level}
                        onChange={(event) =>
                          updatePreference(index, 'level', event.target.value)
                        }
                      >
                        {t(
                          LEVELS.map((row) => (
                            <option key={row.code}>{t(row.code)}</option>
                          )),
                        )}
                      </Select>
                      <button
                        type="button"
                        aria-label={t('Xóa ngôn ngữ {0}', {
                          0: index + 1,
                        })}
                        className="mb-0.5 min-h-10 rounded-lg px-2 text-sm text-error hover:bg-red-50"
                        onClick={() =>
                          setPreferences((items) =>
                            items.filter((_, position) => position !== index),
                          )
                        }
                      >
                        {t('Xóa')}
                      </button>
                    </div>
                  )),
                )}
              </div>
              {t(
                (languages.data?.items.length || 0) > preferences.length && (
                  <Button
                    type="button"
                    variant="soft"
                    className="mt-4"
                    onClick={() =>
                      setPreferences((items) => [
                        ...items,
                        {
                          language_code: '',
                          level: 'A1',
                        },
                      ])
                    }
                  >
                    {t('Thêm ngôn ngữ')}
                  </Button>
                ),
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <p className="text-xs text-muted">
                {t('Vai trò và email không được thay đổi tại đây.')}
              </p>
              <Button busy={saving}>
                {t(saving ? t('Đang lưu…') : t('Lưu hồ sơ'))}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
