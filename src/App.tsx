import { lazy, Suspense } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './store/theme'
import { ToastProvider } from './store/toast'
import { GameProvider } from './store/game'
import { AuthProvider } from './store/auth'
import { MarketingLayout } from './layouts/MarketingLayout'
import { AppLayout } from './layouts/AppLayout'
import { AuthLayout, GuestOnly, RequireAuth } from './layouts/AuthLayout'
import { Skeleton, PixelIcon, ButtonLink } from './components/ui'

const Landing = lazy(() => import('./pages/Landing'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Assistant = lazy(() => import('./pages/Assistant'))
const QuestMap = lazy(() => import('./pages/QuestMap'))
const Lesson = lazy(() => import('./pages/Lesson'))
const Profile = lazy(() => import('./pages/Profile'))
const Settings = lazy(() => import('./pages/Settings'))
const CourseList = lazy(() => import('./pages/Courses').then((m) => ({ default: m.CourseList })))
const CourseOverview = lazy(() => import('./pages/Courses').then((m) => ({ default: m.CourseOverview })))
const Login = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Login })))
const Signup = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Signup })))
const Forgot = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Forgot })))
const Reset = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Reset })))
const Onboarding = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Onboarding })))
const AuthCallback = lazy(() => import('./pages/Auth').then((m) => ({ default: m.AuthCallback })))

const Loading = () => (
  <div className="container" style={{ padding: '48px 24px', display: 'grid', gap: 16 }} role="status" aria-label="Loading">
    <Skeleton h={40} w="50%" />
    <Skeleton h={140} />
    <Skeleton h={140} />
  </div>
)

const NotFound = () => (
  <div className="container" style={{ padding: '96px 24px', textAlign: 'center', display: 'grid', gap: 16, justifyItems: 'center' }}>
    <PixelIcon name="flag" size={72} />
    <h1>404: Quest not found</h1>
    <p className="muted">This path is not on the map.</p>
    <ButtonLink to="/" variant="primary">Back to home</ButtonLink>
    <Link to="/app">Go to dashboard</Link>
  </div>
)

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <GameProvider>
            <BrowserRouter>
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route element={<MarketingLayout />}>
                    <Route path="/" element={<Landing />} />
                  </Route>
                  <Route element={<AuthLayout />}>
                    <Route element={<GuestOnly />}>
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />
                      <Route path="/forgot-password" element={<Forgot />} />
                    </Route>
                    {/* Reached from an email link with a temporary session, so it must not be guest-only. */}
                    <Route path="/reset-password" element={<Reset />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route element={<RequireAuth />}>
                      <Route path="/onboarding" element={<Onboarding />} />
                    </Route>
                  </Route>
                  <Route path="/app" element={<AppLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="assistant" element={<Assistant />} />
                    <Route path="quests" element={<QuestMap />} />
                    <Route path="courses" element={<CourseList />} />
                    <Route path="course/:id" element={<CourseOverview />} />
                    <Route path="lesson/:id" element={<Lesson />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </GameProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
