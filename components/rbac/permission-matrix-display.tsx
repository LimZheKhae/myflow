"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Eye, Lock, AlertTriangle } from "lucide-react"
import type { EnhancedUser } from "@/types/rbac"
import { PERMISSION_MATRIX, DATA_ACCESS_MATRIX } from "@/lib/enhanced-rbac-config"

interface PermissionMatrixDisplayProps {
  user: EnhancedUser
}

export default function PermissionMatrixDisplay({ user }: PermissionMatrixDisplayProps) {
  const userPermissions = PERMISSION_MATRIX[user.role] || {}
  const userDataAccess = DATA_ACCESS_MATRIX[user.role] || {}

  const getPermissionIcon = (hasPermission: boolean) => {
    return hasPermission ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    )
  }

  const getDataAccessIcon = (access: string) => {
    switch (access) {
      case "FULL":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "READ_ONLY":
        return <Eye className="w-4 h-4 text-blue-600" />
      case "RESTRICTED":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case "HIDDEN":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            Permission Matrix - {user.role}
          </CardTitle>
          <CardDescription>Complete overview of user permissions and data access rights</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-6">
            {Object.entries(userPermissions).map(([module, permissions]) => (
              <div key={module} className="space-y-4">
                <h3 className="text-lg font-semibold capitalize text-gray-800 border-b border-gray-200 pb-2">
                  {module.replace("-", " ")}
                </h3>

                {/* Action Permissions */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-600">Action Permissions</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "IMPORT", "EXPORT", "APPROVE"].map((action) => (
                      <div
                        key={action}
                        className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                          (permissions as string[]).includes(action)
                            ? "bg-green-50 border border-green-200"
                            : "bg-red-50 border border-red-200"
                        }`}
                      >
                        {getPermissionIcon((permissions as string[]).includes(action))}
                        <span className="font-medium">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Data Access */}
                {userDataAccess[module as keyof typeof userDataAccess] && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-600">Data Access Rights</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(userDataAccess[module as keyof typeof userDataAccess] as Record<string, string>).map(([field, access]) => (
                        <div key={field} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border">
                          <span className="text-sm font-medium capitalize">{field.replace("_", " ")}</span>
                          <div className="flex items-center gap-2">
                            {getDataAccessIcon(access)}
                            <Badge
                              variant="outline"
                              className={
                                access === "FULL"
                                  ? "border-green-200 text-green-700 bg-green-50"
                                  : access === "READ_ONLY"
                                    ? "border-blue-200 text-blue-700 bg-blue-50"
                                    : access === "RESTRICTED"
                                      ? "border-yellow-200 text-yellow-700 bg-yellow-50"
                                      : "border-red-200 text-red-700 bg-red-50"
                              }
                            >
                              {access.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
