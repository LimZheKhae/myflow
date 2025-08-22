import { executeQuery } from '@/lib/snowflake/config'
import { debugSQL } from '@/lib/utils'

/**
 * Log workflow timeline changes for gift requests
 */
export async function logWorkflowTimeline({ giftId, fromStatus, toStatus, changedBy, remark }: { giftId: number; fromStatus: string | null; toStatus: string; changedBy: string; remark?: string }) {
  try {
    const timelineSQL = `
      INSERT INTO MY_FLOW.PUBLIC.GIFT_WORKFLOW_TIMELINE (
        GIFT_ID, FROM_STATUS, TO_STATUS, CHANGED_BY, CHANGED_AT, REMARK
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(), ?)
    `

    const timelineParams = [giftId, fromStatus, toStatus, changedBy, remark || `${fromStatus || 'initial'} → ${toStatus}`]

    debugSQL(timelineSQL, timelineParams, 'Workflow Timeline Log')
    await executeQuery(timelineSQL, timelineParams)

    console.log(`✅ Workflow timeline logged: Gift ${giftId} - ${fromStatus || 'initial'} → ${toStatus}`)
  } catch (error) {
    console.error(`❌ Failed to log workflow timeline for Gift ${giftId}:`, error)
    // Don't throw error - timeline logging should not break the main operation
  }
}

/**
 * Log multiple workflow timeline entries for batch operations
 */
export async function logBulkWorkflowTimeline(
  entries: Array<{
    giftId: number
    fromStatus: string | null
    toStatus: string
    changedBy: string
    remark?: string
  }>
) {
  try {
    // Use a transaction for bulk timeline logging
    await executeQuery('BEGIN TRANSACTION')

    for (const entry of entries) {
      await logWorkflowTimeline(entry)
    }

    await executeQuery('COMMIT')
    console.log(`✅ Bulk workflow timeline logged: ${entries.length} entries`)
  } catch (error) {
    console.error('❌ Failed to log bulk workflow timeline:', error)
    try {
      await executeQuery('ROLLBACK')
    } catch (rollbackError) {
      console.error('❌ Failed to rollback bulk timeline transaction:', rollbackError)
    }
    // Don't throw error - timeline logging should not break the main operation
  }
}

/**
 * Get workflow status transitions map
 */
export const WORKFLOW_TRANSITIONS = {
  // Creation flows
  create_individual: { from: null, to: 'KAM_Request', then: 'Manager_Review' },
  create_bulk: { from: null, to: 'KAM_Request', then: 'Manager_Review' },

  // Approval flows
  manager_approve: { from: 'Manager_Review', to: 'MKTOps_Processing' },
  manager_reject: { from: 'Manager_Review', to: 'Rejected' },

  // Processing flows
  processing_update: { from: 'MKTOps_Processing', to: 'KAM_Proof' },
  processing_reject: { from: 'MKTOps_Processing', to: 'Rejected' },

  // KAM Proof flows
  kam_submit: { from: 'KAM_Proof', to: 'SalesOps_Audit' },

  // Audit flows
  audit_complete: { from: 'SalesOps_Audit', to: 'Completed' },
  audit_issue: { from: 'SalesOps_Audit', to: 'KAM_Proof' },
} as const

export type WorkflowTransitionKey = keyof typeof WORKFLOW_TRANSITIONS
