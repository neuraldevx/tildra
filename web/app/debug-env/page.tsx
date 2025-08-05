'use client';

export default function DebugEnvPage() {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">🔍 Environment Debug</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Clerk Configuration</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <strong>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:</strong>
              <br />
              <span className={clerkKey?.startsWith('pk_test_') ? 'text-green-600' : 'text-red-600'}>
                {clerkKey || '❌ NOT SET'}
              </span>
            </div>
            <div className="mt-2">
              <strong>Environment Status:</strong>
              <br />
              {clerkKey?.startsWith('pk_test_') ? (
                <span className="text-green-600">✅ DEVELOPMENT (pk_test_)</span>
              ) : clerkKey?.startsWith('pk_live_') ? (
                <span className="text-red-600">❌ PRODUCTION (pk_live_) - Should be development!</span>
              ) : (
                <span className="text-red-600">❌ NO CLERK KEY FOUND</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">API Configuration</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <strong>NEXT_PUBLIC_API_BASE_URL:</strong>
              <br />
              <span className={apiUrl?.includes('127.0.0.1:8000') ? 'text-green-600' : 'text-red-600'}>
                {apiUrl || '❌ NOT SET'}
              </span>
            </div>
            <div className="mt-2">
              <strong>API Status:</strong>
              <br />
              {apiUrl?.includes('127.0.0.1:8000') ? (
                <span className="text-green-600">✅ LOCAL DEVELOPMENT (127.0.0.1:8000)</span>
              ) : apiUrl?.includes('tildra.fly.dev') ? (
                <span className="text-red-600">❌ PRODUCTION (tildra.fly.dev) - Should be local!</span>
              ) : (
                <span className="text-red-600">❌ NO API URL FOUND</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">💡 Expected for Development</h2>
          <ul className="space-y-1 text-sm">
            <li>✅ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY should start with <code>pk_test_</code></li>
            <li>✅ NEXT_PUBLIC_API_BASE_URL should be <code>http://127.0.0.1:8000</code></li>
            <li>✅ Should NOT show production values (pk_live_, tildra.fly.dev)</li>
          </ul>
        </div>

        <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">🔧 If Issues Found</h2>
          <ol className="space-y-1 text-sm list-decimal list-inside">
            <li>Stop the development server (Ctrl+C)</li>
            <li>Check <code>.env.development.local</code> has development keys</li>
            <li>Check <code>.env.local</code> doesn't override with production keys</li>
            <li>Restart with: <code>NODE_ENV=development npm run dev</code></li>
          </ol>
        </div>
      </div>
    </div>
  );
}