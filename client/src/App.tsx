import { useEffect, useState, type FormEvent } from 'react'
import './App.css'
import capybaraLogo from './assets/ChatGPT Image Sep 16, 2026, 09_55_34 AM.png'
import scenicBg from './assets/ChatGPT Image Sep 16, 2026, 10_40_40 AM.png'

type View = 'home' | 'dashboard' | 'login' | 'full-plan' | 'insights-detail'
type AuthMode = 'login' | 'signup'
type ThemeMode = 'light' | 'dark'

type TaskItem = {
  id: string | number
  text: string
  done: boolean
}

type LoggedUser = {
  _id: string
  email: string
  username: string
}

const API_BASE_URL = 'http://localhost:5001'
const navItems = ['Home', 'Tasks', 'Calendar', 'Notes', 'Insights', 'Habits', 'Settings']
const initialTasks: TaskItem[] = [
  { id: 1, text: 'Finish assignment', done: false },
  { id: 2, text: 'Drink water', done: true },
  { id: 3, text: 'Call Mom', done: false },
  { id: 4, text: 'Read a book', done: false },
  { id: 5, text: 'Plan tomorrow', done: false },
]
const monthDays = Array.from({ length: 31 }, (_, index) => index + 1)

const mapTaskFromApi = (task: any): TaskItem => ({
  id: String(task._id ?? task.id),
  text: task.title ?? task.text ?? '',
  done: Boolean(task.completed ?? task.done),
})

function App() {
  const [view, setView] = useState<View>('home')
  const [activeNav, setActiveNav] = useState('Tasks')
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks)
  const [taskInput, setTaskInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' })
  const [signupForm, setSignupForm] = useState({ email: '', username: '', password: '', confirmPassword: '' })
  const [loginMessage, setLoginMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<LoggedUser | null>(null)
  const [themeMode, setThemeMode] = useState<ThemeMode>('light')
  const [habitStreak, setHabitStreak] = useState(4)
  const [dailyCheckIn, setDailyCheckIn] = useState(false)

  useEffect(() => {
    const loadTasks = async () => {
      if (!currentUser?._id) {
        setTasks(initialTasks)
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/tasks?userId=${currentUser._id}`)
        if (!response.ok) {
          throw new Error('Failed to load tasks')
        }

        const data = await response.json()
        const mappedTasks = Array.isArray(data) ? data.map(mapTaskFromApi) : []
        setTasks(mappedTasks.length > 0 ? mappedTasks : [])
      } catch (error) {
        console.error('Error loading tasks:', error)
      }
    }

    loadTasks()
  }, [currentUser?._id])

  const completedCount = tasks.filter((task) => task.done).length
  const filteredTasks = tasks.filter((task) => task.text.toLowerCase().includes(searchQuery.toLowerCase()))

  const goToHome = () => {
    setActiveNav('Tasks')
    setView('home')
  }

  const goToDashboard = () => {
    if (!currentUser) {
      setAuthMode('login')
      setView('login')
      setLoginMessage('Please log in or create an account to access your dashboard.')
      return
    }

    setActiveNav('Tasks')
    setView('dashboard')
  }

  const goToLogin = () => {
    setAuthMode('login')
    setView('login')
  }

  const logoutUser = () => {
    setCurrentUser(null)
    setTasks([])
    setView('home')
    setThemeMode('light')
    setSearchQuery('')
  }

  const openFullPlan = () => {
    setView('full-plan')
  }

  const openInsightsDetail = () => {
    setView('insights-detail')
  }

  const confirmDailyHabit = () => {
    if (!dailyCheckIn) {
      setHabitStreak((current) => current + 1)
      setDailyCheckIn(true)
    }
  }

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginMessage('')

    const identifier = loginForm.identifier.trim()
    const password = loginForm.password.trim()

    if (!identifier || !password) {
      setLoginMessage('Please enter your email or username and password.')
      return
    }

    try {
      const isEmail = identifier.includes('@')
      const payload = {
        email: isEmail ? identifier : '',
        username: isEmail ? '' : identifier,
        password,
      }

      const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const responseData = await loginResponse.json().catch(() => ({}))

      if (!loginResponse.ok) {
        throw new Error(responseData.message || 'Unable to log in')
      }

      if (!responseData.user) {
        throw new Error('Unable to load user profile')
      }

      setCurrentUser(responseData.user)
      setLoginMessage(responseData.message || 'Login successful')
      setLoginForm({ identifier: '', password: '' })
      setView('dashboard')
      setActiveNav('Tasks')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to log in'
      setLoginMessage(message)
    }
  }

  const handleSignupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginMessage('')

    const { email, username, password, confirmPassword } = signupForm
    const cleanEmail = email.trim()
    const cleanUsername = username.trim()

    if (!cleanEmail || !cleanUsername || !password) {
      setLoginMessage('Please complete all signup fields.')
      return
    }

    if (password !== confirmPassword) {
      setLoginMessage('Passwords do not match.')
      return
    }

    try {
      const registerResponse = await fetch(`${API_BASE_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          username: cleanUsername,
          password,
        }),
      })

      const responseData = await registerResponse.json().catch(() => ({}))

      if (!registerResponse.ok) {
        throw new Error(responseData.message || 'Unable to create account')
      }

      setCurrentUser(responseData.user)
      setLoginMessage(responseData.message || 'Account created successfully')
      setSignupForm({ email: '', username: '', password: '', confirmPassword: '' })
      setAuthMode('login')
      setView('dashboard')
      setActiveNav('Tasks')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create account'
      setLoginMessage(message)
    }
  }

  const addTask = async () => {
    const value = taskInput.trim()
    if (!value) return

    try {
      if (!currentUser?._id) {
        setLoginMessage('Please log in before creating tasks.')
        setView('login')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: value, completed: false, userId: currentUser._id }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Unable to save task')
      }

      const createdTask = await response.json()
      setTasks((current) => [mapTaskFromApi(createdTask), ...current])
      setTaskInput('')
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const toggleTask = async (id: string | number) => {
    const currentTask = tasks.find((task) => task.id === id)
    if (!currentTask) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${id}?userId=${currentUser?._id ?? ''}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentTask.done, title: currentTask.text, userId: currentUser?._id ?? '' }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Unable to update task')
      }

      const updatedTask = await response.json()
      setTasks((current) =>
        current.map((task) => (task.id === id ? mapTaskFromApi(updatedTask) : task)),
      )
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const deleteTask = async (id: string | number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${id}?userId=${currentUser?._id ?? ''}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Unable to delete task')
      }

      setTasks((current) => current.filter((task) => task.id !== id))
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const handleSidebarClick = (item: string) => {
    setActiveNav(item)
    if (item === 'Home') {
      setView('home')
      return
    }
    setView('dashboard')
  }

  const renderDashboardView = () => {
    switch (activeNav) {
      case 'Calendar':
        return (
          <div className="dashboard-content-panel">
            <div className="panel-header">
              <h3>Calendar</h3>
              <button className="panel-action">+ Add Event</button>
            </div>

            <div className="calendar-box">
              <div className="calendar-header-row">
                <span>September 2026</span>
                <div className="calendar-nav">
                  <button type="button">‹</button>
                  <button type="button">›</button>
                </div>
              </div>

              <div className="calendar-grid">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="weekday-label">{day}</div>
                ))}

                {Array.from({ length: 7 }, (_, index) => (
                  <div key={`blank-${index}`} className="calendar-date empty" />
                ))}

                {monthDays.map((day) => (
                  <div key={day} className={`calendar-date ${day === 16 ? 'selected' : ''}`}>
                    {day}
                    {day === 16 && <span className="calendar-dot" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'Notes':
        return (
          <div className="dashboard-content-panel">
            <div className="panel-header">
              <h3>Notes</h3>
              <button className="panel-action">+ New Note</button>
            </div>

            <div className="notes-list">
              <div className="note-card">
                <h4>Daily intention</h4>
                <p>Focus on the next meaningful step, not the whole mountain.</p>
              </div>
              <div className="note-card">
                <h4>Meeting reminder</h4>
                <p>Review the sprint update before 4 PM and prepare answers for feedback.</p>
              </div>
            </div>
          </div>
        )

      case 'Insights':
        return (
          <div className="dashboard-content-panel">
            <div className="panel-header">
              <h3>Insights</h3>
              <button className="panel-action" type="button" onClick={openInsightsDetail}>View report</button>
            </div>

            <div className="insight-grid">
              <div className="insight-card">
                <span>Productivity</span>
                <strong>82%</strong>
              </div>
              <div className="insight-card">
                <span>Focus streak</span>
                <strong>{habitStreak} days</strong>
              </div>
              <div className="insight-card">
                <span>Habits</span>
                <strong>{Math.min(3, completedCount + 1)}/3</strong>
              </div>
            </div>
          </div>
        )

      case 'Habits':
        return (
          <div className="dashboard-content-panel">
            <div className="panel-header">
              <h3>Habits</h3>
              <button className="panel-action" type="button" onClick={confirmDailyHabit}>
                {dailyCheckIn ? 'Checked in' : 'Confirm today'}
              </button>
            </div>

            <div className="habit-list">
              <div className="habit-item"><span>Hydration</span><strong>{dailyCheckIn ? 'Streak +1' : 'Done'}</strong></div>
              <div className="habit-item"><span>Workout</span><strong>Pending</strong></div>
              <div className="habit-item"><span>Reading</span><strong>In progress</strong></div>
              <div className="habit-item streak-box"><span>Current streak</span><strong>{habitStreak} days</strong></div>
            </div>
          </div>
        )

      case 'Settings':
        return (
          <div className="dashboard-content-panel">
            <div className="panel-header">
              <h3>Settings</h3>
              <button className="panel-action" type="button">Save</button>
            </div>

            <div className="settings-list">
              <div className="setting-row"><span>Notifications</span><button type="button">Enabled</button></div>
              <div className="setting-row"><span>Theme</span>
                <div className="theme-toggle-row">
                  <button type="button" className={themeMode === 'light' ? 'theme-btn active' : 'theme-btn'} onClick={() => setThemeMode('light')}>Light</button>
                  <button type="button" className={themeMode === 'dark' ? 'theme-btn active' : 'theme-btn'} onClick={() => setThemeMode('dark')}>Dark</button>
                </div>
              </div>
              <div className="setting-row"><span>Sync</span><button type="button">On</button></div>
            </div>
          </div>
        )

      default:
        return (
          <div className="stats-grid">
            <div className="stats-card wide">
              <div className="mini-stats">
                <div className="mini-pill green"><span>Today's tasks</span><strong>{completedCount} / {tasks.length}</strong></div>
                <div className="mini-pill blue"><span>Habits Done</span><strong>2 / 3</strong></div>
                <div className="mini-pill warm"><span>Focus Time</span><strong>1h 20m</strong></div>
              </div>
              <button type="button" className="link-row action-link" onClick={openFullPlan}>view full plan --&gt;</button>
            </div>

            <div className="stats-card task-card">
              <div className="task-head">
                <strong>Today's Tasks</strong>
                <span>{completedCount} / {tasks.length}</span>
                <button type="button" onClick={addTask} aria-label="Add task">+</button>
              </div>

              <div className="task-input-row">
                <input
                  type="text"
                  value={taskInput}
                  onChange={(event) => setTaskInput(event.target.value)}
                  placeholder="Add a new task"
                  aria-label="Add a new task"
                />
                <button type="button" className="task-add-btn" onClick={addTask}>Add</button>
              </div>

              <div className="task-search-wrap">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search tasks..."
                  aria-label="Search tasks"
                />
              </div>

              <ul className="task-list">
                {(filteredTasks.length > 0 ? filteredTasks : tasks).map((task) => (
                  <li
                    key={task.id}
                    className={task.done ? 'done' : ''}
                    onClick={() => toggleTask(task.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggleTask(task.id)
                      }
                    }}
                  >
                    <span className="check" />
                    <span className="task-text">{task.text}</span>
                    <button
                      type="button"
                      className="task-delete-btn"
                      aria-label={`Delete ${task.text}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        deleteTask(task.id)
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>

              {searchQuery && filteredTasks.length === 0 && (
                <p className="empty-state">No tasks match your search.</p>
              )}

              <div className="note-box">You're doing great!</div>
              <div className="motto-box">“you don't have to be perfect, just consistent.”</div>
            </div>
          </div>
        )
    }
  }

  const renderFullPlanPage = () => (
    <main className="scene-panel dashboard-panel" style={{ backgroundImage: `url(${scenicBg})` }}>
      <aside className="sidebar">
        <button className="side-item" onClick={() => setView('dashboard')}>Back to dashboard</button>
      </aside>

      <section className="content-panel">
        <div className="top-row full-plan-top-row">
          <div className="search-box">Full plan and reminders</div>
          <button className="logout-btn" onClick={logoutUser}>Log Out</button>
        </div>

        <div className="dashboard-content-panel">
          <div className="panel-header">
            <h3>Full plan</h3>
            <button className="panel-action" type="button" onClick={() => setView('dashboard')}>Return</button>
          </div>

          <div className="full-plan-grid">
            <div className="full-plan-card">
              <h4>To-do list</h4>
              <ul className="full-plan-list">
                {tasks.map((task) => (
                  <li key={task.id} className={task.done ? 'done' : ''}>
                    <span className="check" />
                    <span>{task.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="full-plan-card">
              <h4>Reminders</h4>
              <ul className="reminder-list">
                <li>Submit project brief before 4:00 PM</li>
                <li>Drink water every 2 hours</li>
                <li>Review daily goals before sleep</li>
                <li>Check in with your habits streak</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  )

  const renderInsightsDetail = () => (
    <main className="scene-panel dashboard-panel" style={{ backgroundImage: `url(${scenicBg})` }}>
      <aside className="sidebar">
        <button className="side-item" onClick={() => setView('dashboard')}>Back to dashboard</button>
      </aside>

      <section className="content-panel">
        <div className="top-row full-plan-top-row">
          <div className="search-box">User activity report</div>
          <button className="logout-btn" onClick={logoutUser}>Log Out</button>
        </div>

        <div className="dashboard-content-panel">
          <div className="panel-header">
            <h3>Detailed activity insights</h3>
            <button className="panel-action" type="button" onClick={() => setView('dashboard')}>Back</button>
          </div>

          <div className="insight-grid detailed-grid">
            <div className="insight-card">
              <span>Tasks completed</span>
              <strong>{completedCount}</strong>
              <small>Steady progress this week</small>
            </div>
            <div className="insight-card">
              <span>Focus score</span>
              <strong>82%</strong>
              <small>Up 12% from last week</small>
            </div>
            <div className="insight-card">
              <span>Habit consistency</span>
              <strong>{habitStreak}/7</strong>
              <small>Daily check-ins are improving</small>
            </div>
          </div>

          <div className="full-plan-card insight-summary">
            <h4>Summary</h4>
            <p>You are keeping a strong rhythm with task completion and habit consistency. The most productive pattern is morning planning followed by a brief evening recap.</p>
          </div>
        </div>
      </section>
    </main>
  )

  return (
    <div className={`page-shell ${themeMode === 'dark' ? 'dark-theme' : 'light-theme'}`}>
      <div className="app-frame">
        <header className="topbar">
          <div className="brand-block">
            <img src={capybaraLogo} alt="CapyTrail logo" className="brand-avatar" />
            <span className="brand-name">CapyTrail</span>
          </div>

          {view === 'dashboard' && currentUser ? (
            <div className="auth-header-actions">
              <button type="button" className="logout-btn" onClick={logoutUser}>Log Out</button>
            </div>
          ) : view === 'dashboard' ? (
            <nav className="tab-group" aria-label="Main navigation">
              <button type="button" className={activeNav === 'Home' ? 'tab active' : 'tab'} onClick={goToHome}>
                Home
              </button>
              <button type="button" className={activeNav !== 'Home' ? 'tab active' : 'tab'} onClick={goToDashboard}>
                Dashboard
              </button>
              {!currentUser && (
                <button type="button" className="tab" onClick={goToLogin}>
                  Login
                </button>
              )}
            </nav>
          ) : null}

          {view !== 'dashboard' && (
            <div className="user-badge">
              <span>
                {currentUser
                  ? currentUser.username
                  : view === 'home'
                    ? 'Home'
                    : view === 'full-plan'
                      ? 'Full Plan'
                      : view === 'insights-detail'
                        ? 'Insights'
                        : 'Login'}
              </span>
              <img src={capybaraLogo} alt="User avatar" className="user-avatar" />
            </div>
          )}
        </header>

        {view === 'home' && (
          <main className="scene-panel home-panel" style={{ backgroundImage: `url(${scenicBg})` }}>
            <div className="glass-copy">
              <span className="chip">Get Things Done, the Capy Way.</span>
              <h1>Plan your day with a calmer rhythm.</h1>
              <p>
                Meet your little productivity buddy. CapyTrail helps you organize tasks,
                build healthy routines, and stay on top of your day without making productivity
                feel stressful.
              </p>
              <p>
                Plan less. Do more. Stay chill. Made for calm productivity, gentle routines,
                and a better day ahead.
              </p>
              <div className="cta-row">
                <button type="button" className="primary-btn" onClick={goToLogin}>Get Started --&gt;</button>
                <button type="button" className="secondary-btn" onClick={goToLogin}>Contact us --&gt;</button>
              </div>
            </div>
          </main>
        )}

        {view === 'dashboard' && (
          <main className="scene-panel dashboard-panel" style={{ backgroundImage: `url(${scenicBg})` }}>
            <aside className="sidebar">
              {navItems.map((item) => (
                <button
                  key={item}
                  className={activeNav === item ? 'side-item active' : 'side-item'}
                  onClick={() => handleSidebarClick(item)}
                >
                  {item}
                </button>
              ))}
            </aside>

            <section className="content-panel">
              <div className="top-row dashboard-top-row">
                <input
                  type="search"
                  className="search-box"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search tasks, notes, or anything..."
                  aria-label="Search the dashboard"
                />
                <button className="logout-btn" onClick={logoutUser}>Log Out</button>
              </div>

              {renderDashboardView()}
            </section>
          </main>
        )}

        {view === 'full-plan' && renderFullPlanPage()}

        {view === 'insights-detail' && renderInsightsDetail()}

        {view === 'login' && (
          <main className="scene-panel login-panel" style={{ backgroundImage: `url(${scenicBg})` }}>
            <section className="login-card">
              <div className="brand-row">
                <img src={capybaraLogo} alt="CapyTrail logo" className="brand-icon" />
                <h1>CapyTrail</h1>
              </div>

              <p className="tagline">your little buddy for a better you ✓</p>

              <div className="auth-switch-row">
                <button
                  type="button"
                  className={authMode === 'login' ? 'auth-mode-btn active' : 'auth-mode-btn'}
                  onClick={() => setAuthMode('login')}
                >
                  Log In
                </button>
                <button
                  type="button"
                  className={authMode === 'signup' ? 'auth-mode-btn active' : 'auth-mode-btn'}
                  onClick={() => setAuthMode('signup')}
                >
                  Sign Up
                </button>
              </div>

              {authMode === 'login' ? (
                <>
                  <h2>Welcome back!</h2>
                  <p className="subheading">log in to continue your journey.</p>

                  <form className="login-form" onSubmit={handleLoginSubmit}>
                    <label className="field">
                      <span className="field-icon email" aria-hidden="true" />
                      <input
                        type="text"
                        placeholder="Email or Username"
                        value={loginForm.identifier}
                        onChange={(event) => setLoginForm((current) => ({ ...current, identifier: event.target.value }))}
                      />
                    </label>

                    <label className="field">
                      <span className="field-icon lock" aria-hidden="true" />
                      <input
                        type="password"
                        placeholder="password"
                        value={loginForm.password}
                        onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                      />
                    </label>

                    <div className="meta-row">
                      <label className="remember-me">
                        <input type="checkbox" defaultChecked />
                        <span>Remember me</span>
                      </label>
                      <a href="#">forgot password?</a>
                    </div>

                    <button type="submit" className="primary-btn">Log In --&gt;</button>
                  </form>
                </>
              ) : (
                <>
                  <h2>Start your journey.</h2>
                  <p className="subheading">create your capybara account.</p>

                  <form className="login-form" onSubmit={handleSignupSubmit}>
                    <label className="field">
                      <span className="field-icon email" aria-hidden="true" />
                      <input
                        type="email"
                        placeholder="Email"
                        value={signupForm.email}
                        onChange={(event) => setSignupForm((current) => ({ ...current, email: event.target.value }))}
                      />
                    </label>

                    <label className="field">
                      <span className="field-icon email" aria-hidden="true" />
                      <input
                        type="text"
                        placeholder="Username"
                        value={signupForm.username}
                        onChange={(event) => setSignupForm((current) => ({ ...current, username: event.target.value }))}
                      />
                    </label>

                    <label className="field">
                      <span className="field-icon lock" aria-hidden="true" />
                      <input
                        type="password"
                        placeholder="Password"
                        value={signupForm.password}
                        onChange={(event) => setSignupForm((current) => ({ ...current, password: event.target.value }))}
                      />
                    </label>

                    <label className="field">
                      <span className="field-icon lock" aria-hidden="true" />
                      <input
                        type="password"
                        placeholder="Confirm Password"
                        value={signupForm.confirmPassword}
                        onChange={(event) => setSignupForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                      />
                    </label>

                    <button type="submit" className="primary-btn">Create Account --&gt;</button>
                  </form>
                </>
              )}

              {loginMessage && <p className="login-message">{loginMessage}</p>}

              <div className="divider"><span>or</span></div>

              <button type="button" className="google-btn">
                <span className="google-mark" aria-hidden="true">G</span>
                Continue with Google
              </button>
            </section>
          </main>
        )}
      </div>
    </div>
  )
}

export default App
