import React, { useState } from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Crown,
  House,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  PlayCircle,
  Search,
  Settings2,
  ShieldCheck,
  Trophy,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import {
  ASSETS,
  Avatar,
  Button,
  Modal,
  cx,
  navigate,
} from '../components/UI.jsx';
import { useAuth } from '../auth.jsx';

const navigation = [
  { label: 'Home', href: '/', icon: House, active: (path) => path === '/' },
  {
    label: 'Courses',
    href: '/courses',
    icon: BookOpen,
    active: (path) => path.startsWith('/courses'),
  },
  {
    label: 'Learn',
    href: '/learn',
    icon: PlayCircle,
    active: (path, query) =>
      (path === '/learn' && query.get('section') !== 'practice') ||
      path.startsWith('/lessons/'),
  },
  {
    label: 'Practice',
    href: '/learn?section=practice',
    icon: Pencil,
    active: (path, query) =>
      path === '/learn' && query.get('section') === 'practice',
  },
  {
    label: 'Quizzes',
    href: '/quizzes',
    icon: Trophy,
    active: (path) => path.startsWith('/quizzes'),
  },
  {
    label: 'Progress',
    href: '/progress',
    icon: TrendingUp,
    active: (path) => path === '/progress' || path === '/results',
  },
  {
    label: 'My Courses',
    href: '/my-learning',
    icon: Layers,
    active: (path) => path === '/my-learning',
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: CircleUserRound,
    active: (path) => path === '/profile',
  },
];

export function Brand({ dark = false, collapsed = false }) {
  return (
    <a
      href="#/"
      aria-label="OELP Home"
      className={cx(
        'flex items-center gap-2.5',
        dark ? 'text-white' : 'text-navy',
      )}
    >
      <img
        src={ASSETS.logo}
        alt="Tama — linh vật OELP"
        width="72"
        height="58"
        className={cx(
          'shrink-0 object-contain',
          collapsed ? 'h-12 w-14' : 'h-16 w-19',
        )}
      />
      {!collapsed && (
        <span>
          <strong className="block text-[29px] font-bold leading-none tracking-wide">
            OELP
          </strong>
          <span
            className={cx(
              'mt-1.5 block text-[10px] leading-snug tracking-wide',
              dark ? 'text-slate-200' : 'text-muted',
            )}
          >
            Online English
            <br />
            Learning Platform
          </span>
        </span>
      )}
    </a>
  );
}

function Sidebar({ route, user, collapsed, onCollapse, onClose, onPlus }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-linear-to-br from-navy to-dark-navy text-white">
      <div
        className={cx(
          'flex items-center justify-between gap-1',
          collapsed ? 'px-3 py-5' : 'px-4 py-5',
        )}
      >
        <Brand dark collapsed={collapsed} />
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Đóng điều hướng"
            className="rounded-lg p-2 text-slate-200 hover:bg-white/10"
          >
            <X size={20} />
          </button>
        )}
      </div>
      <div className="sidebar-wave h-5 shrink-0 bg-orange" />
      <nav
        aria-label="Điều hướng chính"
        className={cx(
          'mt-3 flex-1 space-y-1 overflow-y-auto pb-4',
          collapsed ? 'px-3' : 'px-4',
        )}
      >
        {navigation.map(({ label, href, icon: Icon, active }) => (
          <a
            key={label}
            href={`#${href}`}
            onClick={onClose}
            title={collapsed ? label : undefined}
            aria-current={active(route.path, route.query) ? 'page' : undefined}
            className={cx(
              'flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-[13px] font-medium transition-colors',
              active(route.path, route.query)
                ? 'bg-orange text-white shadow-orange'
                : 'text-slate-200 hover:bg-white/8 hover:text-white',
              collapsed && 'justify-center px-0',
            )}
          >
            <Icon size={21} strokeWidth={1.7} className="shrink-0" />
            <span className={collapsed ? 'sr-only' : ''}>{label}</span>
          </a>
        ))}
        <div className="my-4 border-t border-white/10" />
        <a
          href="#/payments"
          onClick={onClose}
          title="Giao dịch"
          className={cx(
            'flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-[13px] transition hover:bg-white/8',
            route.path === '/payments'
              ? 'bg-white/12 text-white'
              : 'text-slate-300',
            collapsed && 'justify-center px-0',
          )}
        >
          <Wallet size={20} />
          <span className={collapsed ? 'sr-only' : ''}>Giao dịch</span>
        </a>
        {user.role === 'admin' && (
          <a
            href="#/admin"
            onClick={onClose}
            title="Quản trị nội dung"
            className={cx(
              'flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-[13px] transition hover:bg-white/8',
              route.path === '/admin'
                ? 'bg-white/12 text-white'
                : 'text-slate-300',
              collapsed && 'justify-center px-0',
            )}
          >
            <ShieldCheck size={20} />
            <span className={collapsed ? 'sr-only' : ''}>
              Quản trị nội dung
            </span>
          </a>
        )}
      </nav>
      {!collapsed && (
        <div className="mx-4 mb-5 rounded-2xl border border-white/15 bg-white/6 p-4">
          <div className="flex items-center gap-2 text-lg font-bold">
            <Crown size={25} className="text-amber-300" />
            OELP Plus
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            Thêm nhiều hành trình học thú vị. Hãy đón chờ!
          </p>
          <button
            onClick={onPlus}
            className="mt-4 min-h-10 w-full rounded-full bg-orange px-4 text-xs font-semibold text-white hover:bg-primary"
          >
            Sắp ra mắt <ArrowRight size={14} className="ml-1 inline" />
          </button>
        </div>
      )}
      <div
        className={cx(
          'flex items-center gap-3 border-t border-white/10 p-4',
          collapsed && 'justify-center px-1',
        )}
      >
        <a href="#/profile" onClick={onClose}>
          <Avatar name={user.display_name} />
        </a>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-semibold"
                title={user.display_name}
              >
                {user.display_name}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {user.role === 'admin' ? 'Admin' : 'Learner'}
              </p>
            </div>
            <a
              href="#/profile"
              aria-label="Hồ sơ và cài đặt"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
            >
              <Settings2 size={19} />
            </a>
          </>
        )}
      </div>
      {onCollapse && (
        <button
          onClick={onCollapse}
          aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          className="hidden min-h-9 items-center justify-center border-t border-white/8 text-slate-400 hover:bg-white/5 lg:flex"
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      )}
    </div>
  );
}

export default function AppLayout({ children, route }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  function submit(event) {
    event.preventDefault();
    navigate(`/courses?q=${encodeURIComponent(search.trim())}`);
  }
  return (
    <div className="min-h-dvh bg-background">
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 hidden transition-[width] lg:block',
          collapsed ? 'w-[88px]' : 'w-[244px]',
        )}
      >
        <Sidebar
          route={route}
          user={user}
          collapsed={collapsed}
          onCollapse={() => setCollapsed((value) => !value)}
          onPlus={() => setModal('plus')}
        />
      </aside>
      <Modal
        open={drawer}
        title="Điều hướng OELP"
        drawer
        onClose={() => setDrawer(false)}
      >
        <Sidebar
          route={route}
          user={user}
          onClose={() => setDrawer(false)}
          onPlus={() => {
            setDrawer(false);
            setModal('plus');
          }}
        />
      </Modal>
      <div
        className={cx(
          'min-w-0 lg:transition-[margin]',
          collapsed ? 'lg:ml-[88px]' : 'lg:ml-[244px]',
        )}
      >
        <header className="sticky top-0 z-30 flex min-h-20 items-center gap-3 border-b border-border/70 bg-background/95 px-4 backdrop-blur-sm sm:px-6 xl:px-7">
          <button
            onClick={() => setDrawer(true)}
            aria-label="Mở điều hướng"
            className="rounded-xl border border-border bg-white p-2.5 lg:hidden"
          >
            <Menu size={21} />
          </button>
          <form
            onSubmit={submit}
            role="search"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-border bg-white px-4 py-2.5 shadow-card sm:max-w-xl"
          >
            <Search size={21} className="shrink-0 text-navy" />
            <input
              aria-label="Tìm kiếm khóa học"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm khóa học, trình độ, chủ đề…"
              maxLength={150}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            <button
              aria-label="Tìm kiếm"
              type="submit"
              className="hidden text-xs font-semibold text-primary-hover sm:block"
            >
              Tìm
            </button>
          </form>
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
            <span className="hidden items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] text-muted xl:flex">
              <BookOpen size={15} className="text-orange" />
              My learning space
            </span>
            <button
              aria-label="Thông báo"
              onClick={() => setModal('notifications')}
              className="rounded-xl p-2 text-navy hover:bg-white"
            >
              <Bell size={22} strokeWidth={1.8} />
            </button>
            <button
              aria-label="Mở menu tài khoản"
              onClick={() => setModal('account')}
              className="flex items-center gap-1 rounded-full"
            >
              <Avatar name={user.display_name} className="size-9" />
              <ChevronDown size={15} className="hidden sm:block" />
            </button>
          </div>
        </header>
        <main
          key={`${route.location}-${user.id}`}
          className="mx-auto min-w-0 max-w-[1580px] px-4 pb-10 pt-5 sm:px-6 xl:px-7"
        >
          {children}
        </main>
        <footer className="mx-4 flex flex-wrap justify-between gap-2 border-t border-border py-5 text-[10px] text-muted sm:mx-6 xl:mx-7">
          <span>© OELP · Online English Learning Platform</span>
          <span>Learn a little. Explore a lot.</span>
        </footer>
      </div>
      <Modal
        open={Boolean(modal)}
        title={
          modal === 'plus'
            ? 'OELP Plus đang được phát triển'
            : modal === 'notifications'
              ? 'Thông báo'
              : 'Tài khoản của bạn'
        }
        onClose={() => setModal(null)}
      >
        {modal === 'plus' ? (
          <>
            <p className="text-sm leading-relaxed text-muted">
              OELP chưa có gói thuê bao Plus. Các khóa học trả phí hiện dùng
              thanh toán mô phỏng riêng từng khóa; không có phí thật được thu.
            </p>
            <Button
              href="#/courses"
              onClick={() => setModal(null)}
              className="mt-5"
            >
              Khám phá khóa học
            </Button>
          </>
        ) : modal === 'notifications' ? (
          <p className="text-sm leading-relaxed text-muted">
            Trung tâm thông báo đang được phát triển. Tiến độ, kết quả Quiz và
            trạng thái giao dịch hiện được cập nhật tại từng trang tương ứng.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={user.display_name} />
              <div className="min-w-0">
                <p className="break-words font-semibold">{user.display_name}</p>
                <p className="break-all text-xs text-muted">{user.email}</p>
              </div>
            </div>
            <Button
              href="#/profile"
              variant="secondary"
              onClick={() => setModal(null)}
              className="w-full"
            >
              <CircleUserRound size={17} />
              Hồ sơ
            </Button>
            <Button
              variant="soft"
              className="w-full"
              onClick={() => {
                setModal(null);
                logout();
              }}
            >
              <LogOut size={17} />
              Đăng xuất
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function PublicLayout({ children, location }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Brand />
          <nav
            aria-label="Điều hướng khách"
            className="hidden items-center gap-7 text-sm font-medium text-muted md:flex"
          >
            <a href="#/" className="hover:text-primary-hover">
              Trang chủ
            </a>
            <a href="#/courses" className="hover:text-primary-hover">
              Khóa học
            </a>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <a href="#/login" className="font-medium hover:text-primary-hover">
              Đăng nhập
            </a>
            <Button
              href="#/register"
              className="min-h-10 rounded-full px-4 py-2"
            >
              Đăng ký
            </Button>
          </div>
        </div>
      </header>
      <main
        key={location}
        className="mx-auto max-w-[1320px] px-4 py-7 sm:px-6 lg:py-9"
      >
        {children}
      </main>
      <footer className="mt-8 border-t border-border bg-white">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 px-5 py-6">
          <div>
            <p className="font-bold text-navy">OELP</p>
            <p className="mt-1 text-xs text-muted">
              Học tiếng Anh. Mở rộng thế giới của bạn.
            </p>
          </div>
          <p className="text-xs text-muted">
            Đồ án Điện toán đám mây · Nội dung và thanh toán demo
          </p>
        </div>
      </footer>
    </div>
  );
}
