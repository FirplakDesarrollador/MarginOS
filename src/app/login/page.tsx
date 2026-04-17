'use client'

import { useState } from 'react'
import { login, signup } from './actions'
import { Lock, Mail, Calculator } from 'lucide-react'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    <main className="min-h-screen bg-surface-bg flex items-center justify-center p-4 selection:bg-brand-primary selection:text-white relative">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-brand-accent/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-brand-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-brand-primary/5 border border-border-subtle p-8 md:p-10 relative z-10">
        <div className="flex justify-center mb-8">
            <div className="h-16 w-16 bg-brand-primary rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                <Calculator className="w-8 h-8 text-white" />
            </div>
        </div>
        
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
            {isLogin ? 'Bienvenido al Simulador' : 'Crear Cuenta'}
          </h1>
          <p className="text-sm text-text-muted">
            {isLogin 
              ? 'Ingresa tus credenciales para continuar.' 
              : 'Registra un nuevo usuario para acceder al sistema.'}
          </p>
        </div>

        <form action={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary pl-1" htmlFor="email">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="ejemplo@firplak.com"
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-border-subtle rounded-xl text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary pl-1" htmlFor="password">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-border-subtle rounded-xl text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-brand-primary hover:bg-brand-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
             {loading ? 'Cargando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-brand-primary hover:text-brand-accent font-medium mt-2 focus:outline-none transition-colors"
          >
            {isLogin
              ? '¿No tienes cuenta? Regístrate'
              : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>
    </main>
  )
}
