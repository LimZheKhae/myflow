"use client"

import { useState } from "react"
import { FirebaseAuthService } from "@/lib/firebase-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Lock, Eye, EyeOff, CheckCircle, AlertCircle, KeyRound } from "lucide-react"
import { toast } from "sonner"

interface ChangePasswordDialogProps {
  children: React.ReactNode
}

export default function ChangePasswordDialog({ children }: ChangePasswordDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [error, setError] = useState("")
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const validatePassword = (password: string): string[] => {
    const errors: string[] = []
    
    if (password.length < 6) {
      errors.push("Password must be at least 6 characters long")
    }
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push("Password must contain at least one lowercase letter")
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push("Password must contain at least one uppercase letter")
    }
    if (!/(?=.*\d)/.test(password)) {
      errors.push("Password must contain at least one number")
    }
    
    return errors
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError("")

    // Validate new password in real-time
    if (field === "newPassword") {
      const errors = validatePassword(value)
      setValidationErrors(errors)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Validation checks
      if (!formData.currentPassword) {
        throw new Error("Please enter your current password")
      }

      if (!formData.newPassword) {
        throw new Error("Please enter a new password")
      }

      if (formData.newPassword !== formData.confirmPassword) {
        throw new Error("New passwords do not match")
      }

      if (formData.currentPassword === formData.newPassword) {
        throw new Error("New password must be different from current password")
      }

      const passwordErrors = validatePassword(formData.newPassword)
      if (passwordErrors.length > 0) {
        throw new Error(passwordErrors[0])
      }

      // Change password
      await FirebaseAuthService.changePassword(formData.currentPassword, formData.newPassword)

      // Success
      toast.success("Password changed successfully!", {
        description: "Your password has been updated securely."
      })

      // Reset form and close dialog
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      })
      setValidationErrors([])
      setIsOpen(false)

    } catch (error: any) {
      setError(error.message)
      toast.error("Failed to change password", {
        description: error.message
      })
    } finally {
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const resetForm = () => {
    setFormData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    })
    setError("")
    setValidationErrors([])
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) resetForm()
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-600" />
            Change Password
          </DialogTitle>
          <DialogDescription>
            Update your password to keep your account secure. Make sure to use a strong password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPasswords.current ? "text" : "password"}
                placeholder="Enter your current password"
                value={formData.currentPassword}
                onChange={(e) => handleInputChange("currentPassword", e.target.value)}
                disabled={isLoading}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("current")}
                disabled={isLoading}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPasswords.current ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPasswords.new ? "text" : "password"}
                placeholder="Enter your new password"
                value={formData.newPassword}
                onChange={(e) => handleInputChange("newPassword", e.target.value)}
                disabled={isLoading}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("new")}
                disabled={isLoading}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPasswords.new ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            
            {/* Password validation feedback */}
            {formData.newPassword && validationErrors.length > 0 && (
              <div className="space-y-1">
                {validationErrors.map((error, index) => (
                  <p key={index} className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                  </p>
                ))}
              </div>
            )}
            
            {formData.newPassword && validationErrors.length === 0 && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Password strength looks good
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPasswords.confirm ? "text" : "password"}
                placeholder="Confirm your new password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                disabled={isLoading}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("confirm")}
                disabled={isLoading}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPasswords.confirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            
            {/* Password match indicator */}
            {formData.confirmPassword && (
              <p className={`text-xs flex items-center gap-1 ${
                formData.newPassword === formData.confirmPassword 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {formData.newPassword === formData.confirmPassword ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    Passwords match
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    Passwords do not match
                  </>
                )}
              </p>
            )}
          </div>

          {/* Security Notice */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-medium">Security Tips:</p>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  <li>Use a combination of letters, numbers, and symbols</li>
                  <li>Avoid using personal information</li>
                  <li>Don't reuse passwords from other accounts</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading || 
                !formData.currentPassword || 
                !formData.newPassword || 
                !formData.confirmPassword ||
                formData.newPassword !== formData.confirmPassword ||
                validationErrors.length > 0
              }
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 