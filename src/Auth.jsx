import { useState } from 'react'
import { supabase } from './lib/supabaseClient'

function Auth({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignup, setIsSignup] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!email || !password) {
      alert('Please enter email and password.')
      return
    }

    try {
      setLoading(true)

      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          alert(error.message)
          return
        }

        if (data.user) {
          alert('Account created successfully!')
          onLogin(data.user)
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          alert(error.message)
          return
        }

        if (data.user) {
          onLogin(data.user)
        }
      }
    } catch (error) {
      console.error(error)
      alert('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="text-white">
      <div className="text-center mb-6">
        <p className="text-blue-400 text-xs uppercase tracking-[0.2em] font-bold">
          SOLESPACE
        </p>

        <h2 className="text-2xl font-black mt-2">
          {isSignup ? 'Create Account' : 'Welcome Back'}
        </h2>

        <p className="text-white/50 text-sm mt-2">
          {isSignup
            ? 'Create an account to manage your shoe collection.'
            : 'Login to manage your shoe collection.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-white/70 mb-2">
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-[#08142a] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-400"
          />
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-2">
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-[#08142a] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-400"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 px-5 py-3 rounded-xl font-bold transition"
        >
          {loading
            ? 'Please wait...'
            : isSignup
              ? 'Create Account'
              : 'Login'}
        </button>
      </form>

      <div className="text-center mt-5">
        <button
          type="button"
          onClick={() => setIsSignup(!isSignup)}
          className="text-sm text-white/50 hover:text-white transition"
        >
          {isSignup
            ? 'Already have an account? Login'
            : "Don't have an account? Create one"}
        </button>
      </div>
    </div>
  )
}

export default Auth