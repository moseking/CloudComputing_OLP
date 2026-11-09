import { t } from '../lib/i18n.js';
import React, { useRef, useState } from 'react';
import { CreditCard, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import { api, message } from '../api/client.js';
import { useAuth } from '../auth.jsx';
import {
  Button,
  Card,
  Empty,
  ErrorBox,
  Input,
  Loading,
  PageTitle,
  Select,
  StatusBadge,
  SuccessBox,
  dateTime,
  money,
  useResource,
} from '../components/UI.jsx';
export default function Payments({ initialCourse }) {
  const { user } = useAuth();
  const courses = useResource('/api/courses');
  const history = useResource('/api/payments/my-transactions');
  const [courseId, setCourseId] = useState(initialCourse || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [result, setResult] = useState(null);
  const idempotency = useRef({
    course: '',
    key: '',
  });
  const paid = courses.data?.items.filter((item) => item.price > 0) || [];
  const selected = paid.find((item) => String(item.id) === courseId);
  async function create(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const previous = history.data?.items.find(
      (item) => item.idempotency_key === idempotency.current.key,
    );
    if (previous?.status === 'FAILED') idempotency.current.key = '';
    if (idempotency.current.course !== courseId || !idempotency.current.key)
      idempotency.current = {
        course: courseId,
        key: crypto.randomUUID(),
      };
    try {
      const response = await api('/api/payments', {
        method: 'POST',
        body: {
          course_id: Number(courseId),
        },
        headers: {
          'Idempotency-Key': idempotency.current.key,
        },
      });
      setNotice(
        `Đã tạo giao dịch ${response.transaction.id}. Trạng thái: ${response.transaction.status}.`,
      );
      history.reload();
    } catch (error) {
      setError(message(error));
    } finally {
      setSaving(false);
    }
  }
  async function simulate(scenario) {
    setSaving(true);
    setError('');
    setResult(null);
    try {
      const response = await api(
        `/api/payments/${encodeURIComponent(paymentId)}/simulate-result`,
        {
          method: 'POST',
          body: {
            scenario,
          },
        },
      );
      setResult(response);
      history.reload();
    } catch (error) {
      setError(message(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow={t('THANH TOÁN MÔ PHỎNG')}
        title={t('Giao dịch của tôi')}
      >
        {t(
          'Dành cho demo đồ án. Không thu tiền thật hoặc yêu cầu thông tin thẻ.',
        )}
      </PageTitle>
      <ErrorBox>{t(error || history.error || t(courses.error))}</ErrorBox>
      <SuccessBox>{t(notice)}</SuccessBox>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Card>
          <div className="mb-5 flex items-center gap-3">
            <span className="rounded-xl bg-orange-light p-3 text-primary-hover">
              <Wallet size={21} />
            </span>
            <h2 className="text-lg font-bold">
              {t('Đăng ký khóa học trả phí')}
            </h2>
          </div>
          {t(courses.loading && <Loading />)}
          {t(
            courses.data && paid.length === 0 ? (
              <Empty compact>{t('Chưa có khóa học trả phí.')}</Empty>
            ) : (
              <form onSubmit={create} className="payment-form space-y-5">
                <Select
                  label={t('Khóa học')}
                  value={courseId}
                  onChange={(event) => {
                    setCourseId(event.target.value);
                    idempotency.current.key = '';
                  }}
                  required
                >
                  <option value="">{t('Chọn khóa học')}</option>
                  {t(
                    paid.map((course) => (
                      <option key={course.id} value={String(course.id)}>
                        {t(course.title)} —{t(' ')}
                        {t(money(course.price, course.currency))}
                      </option>
                    )),
                  )}
                </Select>
                {t(
                  selected && (
                    <div className="rounded-xl bg-slate-50 p-4 text-sm">
                      <p>
                        {t('Giá tham khảo:')}
                        {t(' ')}
                        <strong>
                          {t(money(selected.price, selected.currency))}
                        </strong>
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-muted">
                        {t(
                          'Số tiền giao dịch được xác định tại máy chủ. Khóa học chỉ được mở khi quyền truy cập đã được xác nhận.',
                        )}
                      </p>
                    </div>
                  ),
                )}
                <Button busy={saving} disabled={!selected} className="w-full">
                  <CreditCard size={16} />
                  {t('Tạo giao dịch mô phỏng')}
                </Button>
              </form>
            ),
          )}
        </Card>
        {t(
          user.role === 'admin' && (
            <Card className="admin-panel">
              <div className="mb-5 flex items-center gap-3">
                <ShieldCheck size={23} className="text-primary-hover" />
                <div>
                  <p className="text-[10px] font-semibold tracking-widest text-primary-hover">
                    {t('ADMIN / MÔI TRƯỜNG DEMO')}
                  </p>
                  <h2 className="mt-1 text-lg font-bold">
                    {t('Mô phỏng kết quả giao dịch')}
                  </h2>
                </div>
              </div>
              <p className="mb-5 text-xs leading-relaxed text-muted">
                {t(
                  'Nhập mã giao dịch của người học. Máy chủ kiểm tra quyền Admin và chế độ demo.',
                )}
              </p>
              <Input
                label={t('Mã giao dịch')}
                value={paymentId}
                onChange={(event) => setPaymentId(event.target.value)}
                placeholder={t('UUID giao dịch')}
              />
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  disabled={saving || !paymentId}
                  onClick={() => simulate('success')}
                >
                  {t('Mô phỏng thành công')}
                </Button>
                <Button
                  variant="secondary"
                  disabled={saving || !paymentId}
                  onClick={() => simulate('failure')}
                >
                  {t('Mô phỏng thất bại')}
                </Button>
              </div>
              {t(
                result && (
                  <div
                    className="simulation-result mt-5 rounded-xl border border-border p-4"
                    role="status"
                  >
                    <StatusBadge status={result.transaction.status} />
                    <p className="mt-3 text-xs leading-relaxed text-muted">
                      {t(
                        result.transaction.enrollment_confirmed
                          ? t('Course Service đã xác nhận cấp quyền học.')
                          : result.transaction.status === 'SUCCESS'
                            ? t(
                                'Thanh toán đã ghi nhận; quyền học đang chờ xác nhận. Thử lại cùng giao dịch để gửi lại thông báo.',
                              )
                            : t('Giao dịch chưa được cấp quyền học.'),
                      )}
                    </p>
                  </div>
                ),
              )}
            </Card>
          ),
        )}
      </div>
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{t('Lịch sử giao dịch')}</h2>
          <Button variant="secondary" onClick={history.reload}>
            <RefreshCw size={15} />
            {t('Làm mới')}
          </Button>
        </div>
        {t(history.loading && <Loading />)}
        {t(
          history.data?.items.length === 0 && (
            <Empty>{t('Bạn chưa có giao dịch nào.')}</Empty>
          ),
        )}
        <div className="transaction-list grid gap-4 xl:grid-cols-2">
          {t(
            history.data?.items.map((transaction) => (
              <Card key={transaction.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-bold">{t(transaction.course_title)}</h3>
                  <StatusBadge status={transaction.status} />
                </div>
                <p className="mt-4 text-sm font-semibold">
                  {t(money(transaction.amount, transaction.currency))}
                </p>
                <p className="mt-2 text-xs text-muted">
                  {t(dateTime(transaction.created_at))}
                </p>
                <p className="transaction-id mt-3 break-all text-[11px] text-muted">
                  {t('Mã: {0}', { 0: transaction.id })}
                </p>
                {t(
                  transaction.status === 'SUCCESS' && (
                    <p className="mt-3 text-xs font-medium text-success">
                      {t(
                        transaction.enrollment_confirmed
                          ? t('Đã được cấp quyền học.')
                          : t('Đang chờ xác nhận quyền học.'),
                      )}
                    </p>
                  ),
                )}
              </Card>
            )),
          )}
        </div>
      </section>
    </>
  );
}
