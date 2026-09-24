
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Auth({ onLogin, onCancel }) {
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
    <div className="flex min-h-screen items-center justify-center bg-[#f5f3ee] px-4">
      <form
        onSubmit={handleLogin}
        className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-xl"
      >
        <p className="text-sm font-semibold tracking-[0.25em] text-orange-600">
          SOLESPACE
        </p>

        <h1 className="mt-3 text-3xl font-bold text-gray-900">
          Admin Login
        </h1>

        <p className="mb-6 mt-2 text-gray-500">
          Login to manage your shoe collection.
        </p>

        <label className="mb-2 block text-sm font-medium text-gray-700">
          Email
        </label>

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Admin email"
          required
          className="mb-4 w-full rounded-xl border px-4 py-3 text-gray-900"
        />

        <label className="mb-2 block text-sm font-medium text-gray-700">
          Password
        </label>

        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          required
          className="mb-4 w-full rounded-xl border px-4 py-3 text-gray-900"
        />

        {error && (
          <p className="mb-4 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gray-900 py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-3 w-full rounded-xl border border-gray-300 py-3 font-semibold text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
        )}
      </form>
    </div>
  )
}