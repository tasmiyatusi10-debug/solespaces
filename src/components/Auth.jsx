
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Auth({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(event) {
    event.preventDefault()

    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    onLogin(data.user)
  }

  return (
    <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl"
      >
        <p className="text-sm font-semibold tracking-[0.25em] text-orange-600">
          SOLESPACE
        </p>

        <h1 className="text-3xl font-bold mt-3 text-gray-900">
          Admin Login
        </h1>

        <p className="text-gray-500 mt-2 mb-6">
          Login to manage your shoe collection.
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Admin email"
          required
          className="w-full border rounded-xl px-4 py-3 mb-4"
        />

        <label className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>

        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          required
          className="w-full border rounded-xl px-4 py-3 mb-4"
        />

        {error && (
          <p className="text-red-600 text-sm mb-4">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white rounded-xl py-3 font-semibold disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  )
}