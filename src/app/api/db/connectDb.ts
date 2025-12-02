import { Sequelize } from 'sequelize'
import pg from 'pg'

const DB_NAME = process.env.NEXT_PRIVATE_DB_NAME || 'fallback_db'
const DB_USER = process.env.NEXT_PRIVATE_DB_USER || 'fallback_user'
const DB_PASSWORD = process.env.NEXT_PRIVATE_DB_PASSWORD || 'fallback_password'
const DB_HOST = process.env.NEXT_PRIVATE_DB_HOST || 'localhost'

let isConnected = false
let isSyncing = false
let syncPromise: Promise<void> | null = null

export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  dialect: 'postgres',
  dialectModule: pg,
  logging: false,
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
})

async function createDatabaseIfNotExists() {
  const adminSequelize = new Sequelize('postgres', DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    dialect: 'postgres',
    dialectModule: pg,
    logging: false,
  })

  try {
    const [result] = await adminSequelize.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      { bind: [DB_NAME] }
    )

    if ((result as unknown[]).length === 0) {
      console.log(`🛠 Creating database "${DB_NAME}"...`)
      await adminSequelize.query(`CREATE DATABASE "${DB_NAME}"`)
      console.log(`✅ Database "${DB_NAME}" created`)
    }
  } finally {
    await adminSequelize.close()
  }
}

async function importAllModels() {
  const models = [
    'user.model',
    'document.model',
    'recipient.model',
    'documentData.model',
    'documentMeta.model',
    'team.model',
    'folder.model',
    'documentAuditLog.model',
    'teamEmail.model',
    'teamGroup.model',
    'organisation.model',
    'organisationClaim.model',
    'activityLogs.model',
    'apiKey.model',
  ]

  await Promise.all(
    models.map((model) => import(`../models/${model}`))
  )
}

async function performSync() {
  if (isSyncing) {
    // Already syncing, wait for it to complete
    return syncPromise
  }

  isSyncing = true
  syncPromise = (async () => {
    try {
      const isDevelopment = process.env.NODE_ENV === 'development'
      
      if (isDevelopment) {
        await sequelize.sync({ alter: true })
        console.log('✅ Database synced (development mode)')
      } else {
        console.log('⚠️ Production mode: Use migrations for schema changes')
      }
    } finally {
      isSyncing = false
    }
  })()

  return syncPromise
}

export async function connectDb() {
  if (isConnected) return

  if (DB_NAME === 'fallback_db' || !process.env.NEXT_PRIVATE_DB_NAME) {
    console.warn('⚠️ Using fallback database credentials - skipping DB connection')
    return
  }

  try {
    await sequelize.authenticate()
    console.log('✅ Database connected')

    // Import models before syncing
    await importAllModels()

    // Sync only once, even with concurrent requests
    await performSync()

    isConnected = true
  } catch (error: unknown) {
    const errorCode = (error as { original?: { code?: string } })?.original?.code
    if (errorCode === '3D000') {
      console.warn('⚠️ Database not found, creating...')
      await createDatabaseIfNotExists()
      await sequelize.authenticate()
      console.log('✅ Database connected after creation')

      await importAllModels()
      await performSync()

      isConnected = true
    } else {
      console.error('❌ Database connection failed:', error)
      throw error
    }
  }
}

export async function ensureDbConnection() {
  if (!isConnected) {
    await connectDb()
  }
  // If sync is still in progress from another request, wait for it
  if (isSyncing && syncPromise) {
    await syncPromise
  }
}
