// import { NextRequest, NextResponse } from 'next/server'
// import { IntegratedNotificationService } from '@/services/integratedNotificationService'

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json()
//     const { type, data } = body

//     let result

//     switch (type) {
//       case 'gift_rejected':
//         result = await IntegratedNotificationService.sendGiftRejectionNotification(
//           data.giftData,
//           data.targetUsers
//         )
//         break

//       case 'bulk_action':
//         result = await IntegratedNotificationService.sendBulkActionNotification(
//           data.action,
//           data.giftIds,
//           data.userEmail,
//           data.targetRoles
//         )
//         break

//       case 'workflow_update':
//         result = await IntegratedNotificationService.sendWorkflowUpdateNotification(
//           data.giftData,
//           data.fromStatus,
//           data.toStatus,
//           data.targetRoles
//         )
//         break

//       case 'custom':
//         result = await IntegratedNotificationService.sendIntegratedNotification(data.notificationData)
//         break

//       default:
//         return NextResponse.json(
//           { success: false, message: `Unknown notification type: ${type}` },
//           { status: 400 }
//         )
//     }

//     return NextResponse.json({
//       success: true,
//       message: 'Integrated notification sent successfully',
//       result
//     })
//   } catch (error) {
//     console.error('Error sending integrated notification:', error)
//     return NextResponse.json(
//       {
//         success: false,
//         message: 'Failed to send integrated notification',
//         error: error instanceof Error ? error.message : 'Unknown error'
//       },
//       { status: 500 }
//     )
//   }
// }
