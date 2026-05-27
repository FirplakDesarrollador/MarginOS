'use client'

import { useState, useEffect } from 'react'
import { login, signup } from './actions'
import { Lock, Mail, Sun, Moon } from 'lucide-react'
import Image from 'next/image'
import { useTheme } from '@/contexts/ThemeContext'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { theme, setTheme } = useTheme()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    if (theme === 'system') {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
    } else {
      setIsDark(theme === 'dark')
    }
  }, [theme])

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const action = isLogin ? login : signup
    const result = await action(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--bg-base)', color: 'var(--fg-primary)' }}
    >
      {/* Decorative auras — radial gradients as per design */}
      <div aria-hidden style={{
        position: 'absolute', top: '-20%', right: '-10%',
        width: 520, height: 520, borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgba(116,144,148,0.18), transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />
      <div aria-hidden style={{
        position: 'absolute', bottom: '-10%', left: '-5%',
        width: 360, height: 360, borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgba(37,65,83,0.14), transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />

      {/* Theme toggle — top right */}
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className="absolute top-6 right-6 w-[38px] h-[38px] rounded-full inline-flex items-center justify-center cursor-pointer transition-colors"
        style={{
          background: 'var(--glass-tint)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '0.5px solid var(--border-hair)',
          color: 'var(--fg-muted)',
        }}
        aria-label="Cambiar tema"
      >
        {isDark
          ? <Sun size={15} strokeWidth={1.75} />
          : <Moon size={15} strokeWidth={1.75} />
        }
      </button>

      {/* Glass card */}
      <form
        action={handleSubmit}
        className="surface-glass-strong w-full relative z-10"
        style={{ maxWidth: 420, padding: '40px 36px', borderRadius: 28 }}
      >
        {/* Brand header */}
        <div className="flex flex-col items-center mb-7">
          <div
            className="mb-[18px] inline-flex items-center justify-center"
            style={{
              width: 64, height: 64, borderRadius: 20,
              background: 'var(--navy)',
              boxShadow: '0 12px 30px -10px rgba(37,65,83,0.40)',
            }}
          >
            <Image
              src="/brand/firplak-logo-dark.png"
              alt="FIRPLAK"
              width={40}
              height={40}
              className="object-contain max-h-8 max-w-[40px]"
              priority
            />
          </div>
          <div className="overline mb-1.5">FIRPLAK · MarginOS</div>
          <h2 className="mb-1.5 text-center">
            {isLogin ? 'Bienvenido' : 'Crear cuenta'}
          </h2>
          <p className="text-center" style={{ color: 'var(--fg-muted)', maxWidth: 300, fontSize: 14, lineHeight: 1.5 }}>
            {isLogin
              ? 'Ingresa con tus credenciales corporativas para acceder al simulador.'
              : 'Registra un nuevo usuario para acceder al sistema.'}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="mb-4 p-3 rounded-xl text-sm text-center"
            style={{
              background: 'var(--danger-soft)',
              border: '0.5px solid rgba(178,58,58,0.30)',
              color: 'var(--danger)',
            }}
          >
            {error}
          </div>
        )}

        {/* Fields */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="field-label block mb-1.5" htmlFor="email">
              Correo electrónico
            </label>
            <div className="relative">
              <div
                className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
                style={{ color: 'var(--fg-muted)' }}
              >
                <Mail className="h-[14px] w-[14px]" strokeWidth={1.75} />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="usuario@firplak.com"
                className="input"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          <div>
            <label className="field-label block mb-1.5" htmlFor="password">
              Contraseña
            </label>
            <div className="relative">
              <div
                className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
                style={{ color: 'var(--fg-muted)' }}
              >
                <Lock className="h-[14px] w-[14px]" strokeWidth={1.75} />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="input"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn btn--primary w-full mt-6"
          style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem' }}
        >
          {loading ? 'Validando…' : (isLogin ? 'Iniciar sesión' : 'Registrarse')}
        </button>

        {/* Footer toggle */}
        <div className="text-center mt-5">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="bg-transparent border-none cursor-pointer text-[13px] font-medium"
            style={{ color: 'var(--blue-green)' }}
          >
            {isLogin
              ? '¿No tienes cuenta? Regístrate →'
              : '¿Ya tienes cuenta? Inicia sesión →'}
          </button>
        </div>
      </form>
    </main>
  )
}
