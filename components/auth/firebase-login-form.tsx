"use client"

import { useState } from "react"
import { useFirebaseAuth } from "@/contexts/firebase-auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, LogIn, Eye, EyeOff, Shield, AlertCircle, Lock } from "lucide-react"

export default function FirebaseLoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const { login, error } = useFirebaseAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      return
    }

    setIsLoggingIn(true)
    
    try {
      await login(email, password)
    } catch (error) {
      // Error is handled by the context
      console.error('Login failed:', error)
    } finally {
      setIsLoggingIn(false)
    }
  }

  const getErrorMessage = (error: string) => {
    // Map Firebase error codes to user-friendly messages
    if (error.includes('user-not-found') || error.includes('wrong-password')) {
      return 'Invalid email or password. Please check your credentials and try again.'
    }
    if (error.includes('too-many-requests')) {
      return 'Too many failed login attempts. Please try again later.'
    }
    if (error.includes('user-disabled')) {
      return 'Your account has been disabled. Please contact your administrator.'
    }
    if (error.includes('invalid-email')) {
      return 'Please enter a valid email address.'
    }
    if (error.includes('network-request-failed')) {
      return 'Network error. Please check your internet connection and try again.'
    }
    return error
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-white to-gray-50">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-6 shadow-lg transform hover:scale-105 transition-transform duration-300">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-gray-600 mt-2 text-lg">Sign in to your CRM dashboard</p>
          </div>

          {/* Login Form Card */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-xl font-semibold text-center text-gray-900">
                Access Your Account
              </CardTitle>
              <CardDescription className="text-center text-gray-600">
                Enter your credentials to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50/80 animate-in slide-in-from-top-2 duration-300">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-800">{getErrorMessage(error)}</AlertDescription>
                  </Alert>
                )}

                {/* Email Input */}
                <div className="space-y-2">
                  <Label 
                    htmlFor="email" 
                    className={`text-sm font-medium transition-colors duration-200 ${
                      emailFocused ? 'text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      required
                      disabled={isLoggingIn}
                      className={`h-12 bg-white border-2 transition-all duration-300 focus:ring-0 ${
                        emailFocused 
                          ? 'border-blue-500 shadow-lg shadow-blue-100' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    />
                    <div className={`absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 transform transition-transform duration-300 ${
                      emailFocused ? 'scale-x-100' : 'scale-x-0'
                    }`} />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <Label 
                    htmlFor="password" 
                    className={`text-sm font-medium transition-colors duration-200 ${
                      passwordFocused ? 'text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      required
                      disabled={isLoggingIn}
                      className={`h-12 bg-white border-2 pr-12 transition-all duration-300 focus:ring-0 ${
                        passwordFocused 
                          ? 'border-blue-500 shadow-lg shadow-blue-100' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoggingIn}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-600 transition-colors duration-200"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                    <div className={`absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 transform transition-transform duration-300 ${
                      passwordFocused ? 'scale-x-100' : 'scale-x-0'
                    }`} />
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoggingIn || !email || !password}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5 mr-2" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>

              {/* Security Notice */}
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-100">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Lock className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Secure Login</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Your connection is protected with enterprise-grade security
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Powered by{" "}
              <span className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Firebase Authentication
              </span>
            </p>
                     </div>
         </div>
      </div>
  )
} 