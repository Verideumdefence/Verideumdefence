import { Shield, Home } from 'lucide-react';

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-800 rounded-full mb-8">
          <Shield className="w-12 h-12 text-red-400" />
        </div>
        <h1 className="text-6xl font-bold text-white mb-4">403</h1>
        <h2 className="text-2xl font-semibold text-gray-300 mb-4">Access Denied</h2>
        <p className="text-gray-400 mb-8 max-w-md">
          You do not have permission to access this resource. Please contact your administrator if you believe this is an error.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          <Home className="w-5 h-5" />
          Return Home
        </a>
      </div>
    </div>
  );
}
