import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

import Task from './models/Task.js'
import User from './models/User.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 5000

const memoryTasks = [
  {
    _id: crypto.randomUUID(),
    title: 'Finalize sprint review deck',
    notes: 'Update the roadmap and stats before 4 PM.',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    category: 'Work',
    priority: 'High',
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: crypto.randomUUID(),
    title: 'Gym session',
    notes: '30 min strength training and 10 min stretch.',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 30).toISOString(),
    category: 'Health',
    priority: 'Medium',
    completed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const memoryUsers = []

let mongoReady = false

app.use(cors())
app.use(express.json())

const normalizeTask = (task) => {
  if (!task) return null

  return {
    ...task,
    _id: task._id?.toString?.() ?? task._id,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
    createdAt: task.createdAt ? new Date(task.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: task.updatedAt ? new Date(task.updatedAt).toISOString() : new Date().toISOString(),
  }
}

const listTasks = async (userId) => {
  const filter = userId ? { userId } : {}

  if (mongoReady) {
    const tasks = await Task.find(filter).sort({ createdAt: -1 }).lean()
    return tasks.map(normalizeTask)
  }

  return [...memoryTasks]
    .filter((task) => !userId || task.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

const createTask = async (taskInput) => {
  const userId = String(taskInput.userId || '').trim()
  const taskData = {
    _id: crypto.randomUUID(),
    userId: userId || null,
    title: String(taskInput.title || '').trim(),
    notes: String(taskInput.notes || '').trim(),
    dueDate: taskInput.dueDate ? new Date(taskInput.dueDate).toISOString() : null,
    category: taskInput.category || 'Work',
    priority: taskInput.priority || 'Medium',
    completed: Boolean(taskInput.completed),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  if (mongoReady) {
    const task = await Task.create({
      userId: userId || undefined,
      title: taskData.title,
      notes: taskData.notes,
      dueDate: taskData.dueDate,
      category: taskData.category,
      priority: taskData.priority,
      completed: taskData.completed,
    })

    return normalizeTask(task.toObject())
  }

  memoryTasks.unshift(taskData)
  return taskData
}

const updateTask = async (id, patch, userId) => {
  if (mongoReady) {
    const task = await Task.findOneAndUpdate(
      { _id: id, ...(userId ? { userId } : {}) },
      patch,
      { new: true, runValidators: true },
    )
    return task ? normalizeTask(task.toObject()) : null
  }

  const taskIndex = memoryTasks.findIndex((task) => task._id === id && (!userId || task.userId === userId))
  if (taskIndex === -1) return null

  const updatedTask = {
    ...memoryTasks[taskIndex],
    ...patch,
    dueDate: patch.dueDate ? new Date(patch.dueDate).toISOString() : memoryTasks[taskIndex].dueDate,
    updatedAt: new Date().toISOString(),
  }

  memoryTasks[taskIndex] = updatedTask
  return updatedTask
}

const deleteTask = async (id, userId) => {
  if (mongoReady) {
    const task = await Task.findOneAndDelete({ _id: id, ...(userId ? { userId } : {}) })
    return !!task
  }

  const index = memoryTasks.findIndex((task) => task._id === id && (!userId || task.userId === userId))
  if (index === -1) return false

  memoryTasks.splice(index, 1)
  return true
}

const normalizeUser = (user) => {
  if (!user) return null

  const safeUser = {
    _id: user._id?.toString?.() ?? user._id,
    email: user.email,
    username: user.username,
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : new Date().toISOString(),
  }

  return safeUser
}

const createUserRecord = async (userInput) => {
  const email = String(userInput.email || '').trim().toLowerCase()
  const username = String(userInput.username || '').trim()
  const password = String(userInput.password || '').trim()

  if (!email || !username || !password) {
    throw new Error('Email, username, and password are required')
  }

  if (mongoReady) {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] })
    if (existingUser) {
      throw new Error('User already exists')
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const createdUser = await User.create({ email, username, password: hashedPassword })
    return normalizeUser(createdUser.toObject())
  }

  const existingUser = memoryUsers.find((user) => user.email === email || user.username === username)
  if (existingUser) {
    throw new Error('User already exists')
  }

  const hash = await bcrypt.hash(password, 10)
  const newUser = {
    _id: crypto.randomUUID(),
    email,
    username,
    password: hash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  memoryUsers.push(newUser)
  return normalizeUser(newUser)
}

const loginUser = async (userInput) => {
  const email = String(userInput.email || '').trim().toLowerCase()
  const username = String(userInput.username || '').trim()
  const password = String(userInput.password || '').trim()

  if ((!email && !username) || !password) {
    throw new Error('Email or username and password are required')
  }

  if (mongoReady) {
    const user = await User.findOne({ $or: [{ email }, { username }] }).lean()
    if (!user) {
      return null
    }

    const matches = await bcrypt.compare(password, user.password)
    if (!matches) {
      return null
    }

    return normalizeUser(user)
  }

  const user = memoryUsers.find((entry) => {
    const sameEmail = email ? entry.email === email : false
    const sameUsername = username ? entry.username === username : false
    return sameEmail || sameUsername
  })

  if (!user) {
    return null
  }

  const matches = await bcrypt.compare(password, user.password)
  if (!matches) {
    return null
  }

  return normalizeUser(user)
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: mongoReady ? 'mongodb' : 'memory' })
})

app.get('/api/users', async (req, res) => {
  try {
    if (mongoReady) {
      const users = await User.find().sort({ createdAt: -1 }).lean()
      return res.json(users.map(normalizeUser))
    }

    return res.json(memoryUsers.map(normalizeUser))
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch users', error: error.message })
  }
})

app.post('/api/users/register', async (req, res) => {
  try {
    const user = await createUserRecord(req.body)
    res.status(201).json({ message: 'User created successfully', user })
  } catch (error) {
    const statusCode = error.message === 'User already exists' ? 409 : 400
    res.status(statusCode).json({ message: error.message || 'Unable to create user' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, username, password, identifier } = req.body
    const resolvedEmail = email || (typeof identifier === 'string' && identifier.includes('@') ? identifier : '')
    const resolvedUsername = username || (typeof identifier === 'string' && !identifier.includes('@') ? identifier : '')
    const user = await loginUser({ email: resolvedEmail, username: resolvedUsername, password })

    if (!user) {
      return res.status(401).json({ message: 'Invalid email/username or password' })
    }

    res.json({ message: 'Login successful', user })
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to log in' })
  }
})

app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await listTasks(req.query.userId ? String(req.query.userId) : '')
    res.json(tasks)
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch tasks', error: error.message })
  }
})

app.post('/api/tasks', async (req, res) => {
  try {
    const { title, notes, dueDate, category, priority, completed, userId } = req.body

    if (!title || String(title).trim().length === 0) {
      return res.status(400).json({ message: 'Task title is required' })
    }

    if (!userId) {
      return res.status(400).json({ message: 'User context is required to save a task' })
    }

    const task = await createTask({ title, notes, dueDate, category, priority, completed, userId })
    res.status(201).json(task)
  } catch (error) {
    res.status(500).json({ message: 'Unable to create task', error: error.message })
  }
})

app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId || ''
    const task = await updateTask(req.params.id, req.body, userId)

    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    res.json(task)
  } catch (error) {
    res.status(500).json({ message: 'Unable to update task', error: error.message })
  }
})

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const userId = req.query.userId ? String(req.query.userId) : ''
    const deleted = await deleteTask(req.params.id, userId)

    if (!deleted) {
      return res.status(404).json({ message: 'Task not found' })
    }

    res.status(204).send()
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete task', error: error.message })
  }
})

async function startServer() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/todoapp'

  try {
    await mongoose.connect(mongoUri)
    mongoReady = true
    console.log('MongoDB connected successfully')
  } catch (error) {
    console.warn('MongoDB unavailable. Running with in-memory storage for local testing.')
    console.warn(error.message)
  }

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
  })
}

startServer()
