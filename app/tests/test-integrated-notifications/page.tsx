'use client'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Mail, Bell, Gift, Users } from 'lucide-react'

export default function TestIntegratedNotifications() {
    const [loading, setLoading] = useState(false)

    const handleBrevoEmailTest = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/test-brevo-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    toEmail: 'dsa.dev24@gmail.com',
                    subject: 'Brevo Email Test',
                    message: '<h1>Brevo Email Test</h1><p>This is a test email sent using Brevo service.</p><p>If you receive this, Brevo is working!</p>'
                }),
            })
            const result = await response.json()
            if (result.success) {
                toast.success('Brevo email test successful!', {
                    description: 'Check your email inbox (and spam folder)'
                })
            } else {
                toast.error('Brevo email test failed', {
                    description: result.message
                })
            }
        } catch (error) {
            toast.error('Error sending Brevo email test', {
                description: error instanceof Error ? error.message : 'Unknown error'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleBrevoCompanyEmailTest = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/test-brevo-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    toEmail: 'zk.lim@aetheriondataworks.com',
                    subject: 'Brevo Company Email Test',
                    message: '<h1>Brevo Company Email Test</h1><p>This is a test email sent using Brevo service to a company email.</p><p>If you receive this, Brevo is working!</p>'
                }),
            })
            const result = await response.json()
            if (result.success) {
                toast.success('Brevo company email test successful!', {
                    description: 'Check your company email inbox'
                })
            } else {
                toast.error('Brevo company email test failed', {
                    description: result.message
                })
            }
        } catch (error) {
            toast.error('Error sending Brevo company email test', {
                description: error instanceof Error ? error.message : 'Unknown error'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleGiftRejectionTest = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/test-gift-rejection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userEmail: 'dsa.dev24@gmail.com',
                    giftId: 123,
                    fullName: 'Test User',
                    memberLogin: 'testuser',
                    giftItem: 'Test Gift',
                    costMyr: 100,
                    category: 'Test',
                    kamRequestedBy: 'Test KAM',
                    kamEmail: 'dsa.dev24@gmail.com',
                    rejectReason: 'Test rejection reason'
                }),
            })
            const result = await response.json()
            if (result.success) {
                toast.success('Gift rejection test successful!', {
                    description: `Notification: ${result.notificationSuccess ? '✅' : '❌'} | Email: ${result.emailSuccess ? '✅' : '❌'}`
                })
            } else {
                toast.error('Gift rejection test failed', {
                    description: result.message
                })
            }
        } catch (error) {
            toast.error('Error sending gift rejection test', {
                description: error instanceof Error ? error.message : 'Unknown error'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleGiftRejectionCompanyTest = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/test-gift-rejection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userEmail: 'zk.lim@aetheriondataworks.com',
                    giftId: 456,
                    fullName: 'Company User',
                    memberLogin: 'companyuser',
                    giftItem: 'Company Gift',
                    costMyr: 500,
                    category: 'Corporate',
                    kamRequestedBy: 'Company KAM',
                    kamEmail: 'zk.lim@aetheriondataworks.com',
                    rejectReason: 'Company policy violation'
                }),
            })
            const result = await response.json()
            if (result.success) {
                toast.success('Gift rejection company test successful!', {
                    description: `Notification: ${result.notificationSuccess ? '✅' : '❌'} | Email: ${result.emailSuccess ? '✅' : '❌'}`
                })
            } else {
                toast.error('Gift rejection company test failed', {
                    description: result.message
                })
            }
        } catch (error) {
            toast.error('Error sending gift rejection company test', {
                description: error instanceof Error ? error.message : 'Unknown error'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Brevo Email & Notification System Test</h1>
                <p className="text-gray-600">
                    Test the Brevo email service and integrated notification system
                </p>
            </div>

            {/* Basic Email Tests */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Basic Email Tests
                    </CardTitle>
                    <CardDescription>
                        Test basic Brevo email functionality
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                            onClick={handleBrevoEmailTest}
                            disabled={loading}
                            className="flex items-center gap-2"
                        >
                            <Mail className="h-4 w-4" />
                            Test Basic Email (dsa.dev24@gmail.com)
                        </Button>
                        <Button
                            onClick={handleBrevoCompanyEmailTest}
                            disabled={loading}
                            className="flex items-center gap-2"
                        >
                            <Mail className="h-4 w-4" />
                            Test Company Email (zk.lim@aetheriondataworks.com)
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Gift Rejection Tests */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5" />
                        Gift Rejection Tests
                    </CardTitle>
                    <CardDescription>
                        Test the complete gift rejection flow with notifications and emails
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                            onClick={handleGiftRejectionTest}
                            disabled={loading}
                            className="flex items-center gap-2"
                        >
                            <Bell className="h-4 w-4" />
                            Test Gift Rejection (dsa.dev24@gmail.com)
                        </Button>
                        <Button
                            onClick={handleGiftRejectionCompanyTest}
                            disabled={loading}
                            className="flex items-center gap-2"
                        >
                            <Users className="h-4 w-4" />
                            Test Gift Rejection (Company Email)
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* System Information */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Brevo Email System Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm">
                        <p><strong>Email Service:</strong> Brevo (formerly Sendinblue)</p>
                        <p><strong>Free Tier:</strong> 300 emails/day (9,000/month) - PERMANENT</p>
                        <p><strong>Sender Email:</strong> dsa.dev24@gmail.com</p>
                        <p><strong>Sender Name:</strong> ZK Admin</p>

                        <p className="mt-4"><strong>What these tests do:</strong></p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>✅ Send emails using Brevo service</li>
                            <li>✅ Create notifications in Firebase</li>
                            <li>✅ Test both personal and company emails</li>
                            <li>✅ Test complete gift rejection workflow</li>
                        </ul>

                        <p className="mt-4"><strong>Email Flow:</strong></p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                            <li><code>ZK Admin &lt;dsa.dev24@gmail.com&gt;</code> → <code>dsa.dev24@gmail.com</code></li>
                            <li><code>ZK Admin &lt;dsa.dev24@gmail.com&gt;</code> → <code>zk.lim@aetheriondataworks.com</code></li>
                        </ul>

                        <p className="mt-4"><strong>What to check:</strong></p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>🔔 Notification appears in your notification bell</li>
                            <li>📧 Email received in the target email inbox</li>
                            <li>✅ Success message shows notification and email status</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
