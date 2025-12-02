export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🔄 Initializing database...');
    try {
      const { connectDb } = await import('@/app/api/db/connectDb');
      await connectDb();
      console.log('✅ Database initialization complete');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
    }
  }
}