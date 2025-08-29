import { EmailTemplate, GiftEmailData } from '@/types/email'

export class EmailTemplates {
  private static baseTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gift Approval System</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; border: 1px solid #e5e7eb; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-approved { background: #d1fae5; color: #065f46; }
          .status-rejected { background: #fee2e2; color: #991b1b; }
          .status-delivered { background: #dbeafe; color: #1e40af; }
          .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f9fafb; border-radius: 4px; }
          .info-label { font-weight: bold; color: #374151; }
          .info-value { color: #6b7280; }
          .action-button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          .action-button:hover { background: #1d4ed8; }
          .alert-box { padding: 15px; border-radius: 6px; margin: 15px 0; }
          .alert-warning { background: #fffbeb; border: 1px solid #fcd34d; }
          .alert-error { background: #fef2f2; border: 1px solid #fecaca; }
          .alert-success { background: #f0fdf4; border: 1px solid #bbf7d0; }
          @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .info-row { flex-direction: column; }
            .info-label, .info-value { margin: 2px 0; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px; color: #333;">🎁 Gift Approval System</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Automated Workflow Notifications</p>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>This is an automated email from the Gift Approval System.</p>
            <p>Please do not reply to this email. Contact support if you have questions.</p>
            <p>&copy; ${new Date().getFullYear()} MYFLOW SYSTEM. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  static giftRequestSubmitted(giftData: GiftEmailData): EmailTemplate {
    const content = `
      <h2 style="color: #2563eb; margin-top: 0;">🎁 New Gift Request Submitted</h2>
      
      <div class="info-row">
        <span class="info-label">Gift ID:</span>
        <span class="info-value">#${giftData.giftId}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Player:</span>
        <span class="info-value">${giftData.fullName} (${giftData.memberLogin})</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Gift Item:</span>
        <span class="info-value">${giftData.giftItem}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Value:</span>
        <span class="info-value">${giftData.cost} MYR</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Category:</span>
        <span class="info-value">${giftData.category}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Submitted by:</span>
        <span class="info-value">${giftData.kamRequestedBy}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${giftData.createdDate ? new Date(giftData.createdDate).toLocaleDateString() : new Date().toLocaleDateString()}</span>
      </div>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <p><strong>Status:</strong> <span class="status-badge status-pending">Pending Manager Review</span></p>
      
      <p>This gift request has been submitted and is awaiting manager approval. You will receive an update once the request has been reviewed.</p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/gift-approval" class="action-button">
        View Gift Request
      </a>
    `

    return {
      to: giftData.kamEmail,
      subject: `Gift Request Submitted - #${giftData.giftId}`,
      html: this.baseTemplate(content),
      text: `Gift Request #${giftData.giftId} has been submitted for ${giftData.fullName}. Status: Pending Manager Review.`
    }
  }

  static giftApproved(giftData: GiftEmailData): EmailTemplate {
    const content = `
      <h2 style="color: #059669; margin-top: 0;">✅ Gift Request Approved</h2>
      
      <div class="info-row">
        <span class="info-label">Gift ID:</span>
        <span class="info-value">#${giftData.giftId}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Player:</span>
        <span class="info-value">${giftData.fullName}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Gift Item:</span>
        <span class="info-value">${giftData.giftItem}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Value:</span>
        <span class="info-value">${giftData.cost}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Approved by:</span>
        <span class="info-value">${giftData.approvalReviewedBy || 'System'}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${giftData.lastModifiedDate ? new Date(giftData.lastModifiedDate).toLocaleDateString() : new Date().toLocaleDateString()}</span>
      </div>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <p><strong>Status:</strong> <span class="status-badge status-approved">Approved</span></p>
      
      <p>Congratulations! Your gift request has been approved and is now in processing. The MKTOps team will handle the procurement and delivery.</p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/gift-approval" class="action-button">
        View Gift Details
      </a>
    `

    return {
      to: giftData.kamEmail,
      subject: `Gift Request Approved - #${giftData.giftId}`,
      html: this.baseTemplate(content),
      text: `Gift Request #${giftData.giftId} has been approved for ${giftData.fullName}. Status: Approved.`
    }
  }

  static giftRejected(giftData: GiftEmailData): EmailTemplate {
    const content = `
      <h2 style="color: #dc2626; margin-top: 0;">❌ Gift Request Rejected</h2>
      
      <div class="info-row">
        <span class="info-label">Gift ID:</span>
        <span class="info-value">#${giftData.giftId}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Player:</span>
        <span class="info-value">${giftData.fullName}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Gift Item:</span>
        <span class="info-value">${giftData.giftItem}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Value:</span>
        <span class="info-value">${giftData.cost} MYR</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Rejected by:</span>
        <span class="info-value">${giftData.approvalReviewedBy || 'System'}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${giftData.lastModifiedDate ? new Date(giftData.lastModifiedDate).toLocaleDateString() : new Date().toLocaleDateString()}</span>
      </div>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <p><strong>Status:</strong> <span class="status-badge status-rejected">Rejected</span></p>
      
      <div class="alert-box alert-error">
        <h4 style="margin: 0 0 10px 0; color: #991b1b;">Rejection Reason:</h4>
        <p style="margin: 0; color: #7f1d1d;">${giftData.rejectReason || 'No reason provided'}</p>
      </div>
      
      <p>Please review the rejection reason and take necessary action. You may need to modify the request or provide additional information.</p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/gift-approval" class="action-button">
        Review Gift Request
      </a>
    `

    return {
      to: giftData.kamEmail,
      subject: `Gift Request Rejected - #${giftData.giftId}`,
      html: this.baseTemplate(content),
      text: `Gift Request #${giftData.giftId} has been rejected for ${giftData.fullName}. Reason: ${giftData.rejectReason || 'No reason provided'}.`
    }
  }

  static deliveryStatusUpdate(giftData: GiftEmailData): EmailTemplate {
    const content = `
      <h2 style="color: #7c3aed; margin-top: 0;">📦 Delivery Status Update</h2>
      
      <div class="info-row">
        <span class="info-label">Gift ID:</span>
        <span class="info-value">#${giftData.giftId}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Player:</span>
        <span class="info-value">${giftData.fullName}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Gift Item:</span>
        <span class="info-value">${giftData.giftItem}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Status:</span>
        <span class="info-value"><span class="status-badge status-delivered">${giftData.trackingStatus}</span></span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Courier:</span>
        <span class="info-value">${giftData.dispatcher}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Tracking Code:</span>
        <span class="info-value">${giftData.trackingCode}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Updated by:</span>
        <span class="info-value">${giftData.mktOpsUpdatedBy || 'MKTOps Team'}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${giftData.lastModifiedDate ? new Date(giftData.lastModifiedDate).toLocaleDateString() : new Date().toLocaleDateString()}</span>
      </div>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <p>The delivery status for this gift has been updated. Please check the tracking information above for the latest status.</p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/gift-approval" class="action-button">
        View Delivery Details
      </a>
    `

    return {
      to: giftData.kamEmail,
      subject: `Delivery Status Update - #${giftData.giftId}`,
      html: this.baseTemplate(content),
      text: `Delivery status updated for Gift #${giftData.giftId}. Status: ${giftData.trackingStatus}.`
    }
  }

  static kamProofRequired(giftData: GiftEmailData): EmailTemplate {
    const content = `
      <h2 style="color: #ea580c; margin-top: 0;">📸 KAM Proof Required</h2>
      
      <div class="info-row">
        <span class="info-label">Gift ID:</span>
        <span class="info-value">#${giftData.giftId}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Player:</span>
        <span class="info-value">${giftData.fullName}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Gift Item:</span>
        <span class="info-value">${giftData.giftItem}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">KAM:</span>
        <span class="info-value">${giftData.kamRequestedBy}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Delivery Date:</span>
        <span class="info-value">${giftData.lastModifiedDate ? new Date(giftData.lastModifiedDate).toLocaleDateString() : new Date().toLocaleDateString()}</span>
      </div>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <div class="alert-box alert-warning">
        <h4 style="margin: 0 0 10px 0; color: #92400e;">Action Required:</h4>
        <p style="margin: 0; color: #78350f;">The gift has been delivered successfully. Please upload proof of delivery in the system.</p>
      </div>
      
      <p>Please log into the system and upload the delivery proof (photo/signature) to complete the gift delivery process.</p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/gift-approval" class="action-button">
        Upload Delivery Proof
      </a>
    `

    return {
      to: giftData.kamEmail,
      subject: `KAM Proof Required - #${giftData.giftId}`,
      html: this.baseTemplate(content),
      text: `KAM proof required for Gift #${giftData.giftId}. Please upload delivery proof.`
    }
  }

  static auditComplete(giftData: GiftEmailData): EmailTemplate {
    const content = `
      <h2 style="color: #059669; margin-top: 0;">✅ Audit Complete</h2>
      
      <div class="info-row">
        <span class="info-label">Gift ID:</span>
        <span class="info-value">#${giftData.giftId}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Player:</span>
        <span class="info-value">${giftData.fullName}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Gift Item:</span>
        <span class="info-value">${giftData.giftItem}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Value:</span>
        <span class="info-value">${giftData.cost} MYR</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Audited by:</span>
        <span class="info-value">${giftData.auditorName || 'SalesOps Team'}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${giftData.lastModifiedDate ? new Date(giftData.lastModifiedDate).toLocaleDateString() : new Date().toLocaleDateString()}</span>
      </div>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <p><strong>Status:</strong> <span class="status-badge status-approved">Completed</span></p>
      
      <p>Congratulations! The gift request has been successfully audited and completed. The entire workflow is now finished.</p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/gift-approval" class="action-button">
        View Completed Gift
      </a>
    `

    return {
      to: giftData.kamEmail,
      subject: `Audit Complete - #${giftData.giftId}`,
      html: this.baseTemplate(content),
      text: `Audit completed for Gift #${giftData.giftId}. Status: Completed.`
    }
  }

  static bulkActionNotification(giftIds: number[], action: string, userEmail: string): EmailTemplate {
    const content = `
      <h2 style="color: #2563eb; margin-top: 0;">🔄 Bulk Action Completed</h2>
      
      <div class="info-row">
        <span class="info-label">Action:</span>
        <span class="info-value">${action}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Gifts Affected:</span>
        <span class="info-value">${giftIds.length} gift(s)</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Gift IDs:</span>
        <span class="info-value">${giftIds.map(id => `#${id}`).join(', ')}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${new Date().toLocaleDateString()}</span>
      </div>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <p>The bulk action has been completed successfully. All affected gifts have been updated accordingly.</p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/gift-approval" class="action-button">
        View Gift Approval System
      </a>
    `

    return {
      to: userEmail,
      subject: `Bulk Action Completed - ${action}`,
      html: this.baseTemplate(content),
      text: `Bulk action "${action}" completed for ${giftIds.length} gift(s).`
    }
  }

  static bulkGiftRejected(giftDataArray: any[], rejectedBy: string, rejectReason: string): EmailTemplate {
    const giftDetails = giftDataArray.map(gift => `
      <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 10px 0; background: #f9fafb;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <strong>Gift #${gift.giftId}</strong>
          <span class="status-badge status-rejected">Rejected</span>
        </div>
        <div style="font-size: 14px; color: #6b7280;">
          <div><strong>Player:</strong> ${gift.fullName} (${gift.memberLogin})</div>
          <div><strong>Item:</strong> ${gift.giftItem}</div>
          <div><strong>Value:</strong> ${gift.cost} MYR</div>
          <div><strong>Category:</strong> ${gift.category}</div>
          <div><strong>KAM:</strong> ${gift.kamRequestedBy}</div>
        </div>
      </div>
    `).join('')

    const content = `
      <h2 style="color: #dc2626; margin-top: 0;">❌ Bulk Gift Rejection</h2>
      
      <div class="alert-box alert-error">
        <strong>⚠️ Important Notice:</strong> ${giftDataArray.length} gift request(s) have been rejected.
      </div>
      
      <div class="info-row">
        <span class="info-label">Total Rejected:</span>
        <span class="info-value">${giftDataArray.length} gift(s)</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Rejected by:</span>
        <span class="info-value">${rejectedBy || 'System'}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Rejection Reason:</span>
        <span class="info-value">${rejectReason}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${new Date().toLocaleDateString()}</span>
      </div>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <h3 style="color: #374151; margin-top: 20px;">Rejected Gift Details:</h3>
      ${giftDetails}
      
      <div class="alert-box alert-warning">
        <strong>Next Steps:</strong> Please review the rejection reasons and take appropriate action. 
        Contact the rejecting manager if you need clarification.
      </div>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/gift-approval" class="action-button">
        View Gift Approval System
      </a>
    `

    return {
      to: '',
      subject: `Bulk Gift Rejection - ${giftDataArray.length} gift(s) rejected`,
      html: this.baseTemplate(content),
      text: `Bulk rejection: ${giftDataArray.length} gift(s) rejected by ${rejectedBy}. Reason: ${rejectReason}. Gift IDs: ${giftDataArray.map(g => g.giftId).join(', ')}`
    }
  }

  static workflowUpdate(giftData: any): EmailTemplate {
    const content = `
      <h2 style="color: #2563eb; margin-top: 0;">🔄 Workflow Status Update</h2>
      
      <div class="info-row">
        <span class="info-label">Gift ID:</span>
        <span class="info-value">#${giftData.giftId}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Player:</span>
        <span class="info-value">${giftData.fullName} (${giftData.memberLogin})</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Gift Item:</span>
        <span class="info-value">${giftData.giftItem}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Previous Status:</span>
        <span class="info-value">${giftData.fromStatus}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">New Status:</span>
        <span class="info-value">${giftData.toStatus}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Updated by:</span>
        <span class="info-value">${giftData.updatedBy || 'System'}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${new Date().toLocaleDateString()}</span>
      </div>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <p><strong>Status Change:</strong> <span class="status-badge status-pending">${giftData.fromStatus} → ${giftData.toStatus}</span></p>
      
      <p style="margin-top: 20px;">The workflow status for this gift request has been updated. Please review the changes in the Gift Approval System.</p>
    `

    return {
      to: '',
      subject: `Workflow Update: Gift #${giftData.giftId} - ${giftData.fromStatus} → ${giftData.toStatus}`,
      text: `Workflow status updated for Gift #${giftData.giftId}: ${giftData.fromStatus} → ${giftData.toStatus}. Player: ${giftData.fullName} (${giftData.memberLogin})`,
      html: this.baseTemplate(content)
    }
  }

  static giftDelivered(giftData: any): EmailTemplate {
    const content = `
      <h2 style="color: #059669; margin-top: 0;">📦 Gift Delivered Successfully</h2>
      
      <div class="info-row">
        <span class="info-label">Gift ID:</span>
        <span class="info-value">#${giftData.giftId}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Player:</span>
        <span class="info-value">${giftData.fullName} (${giftData.memberLogin})</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Gift Item:</span>
        <span class="info-value">${giftData.giftItem}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Value:</span>
        <span class="info-value">${giftData.cost} MYR</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Category:</span>
        <span class="info-value">${giftData.category}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Tracking Code:</span>
        <span class="info-value">${giftData.trackingCode || 'N/A'}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Dispatcher:</span>
        <span class="info-value">${giftData.dispatcher || 'N/A'}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Updated by:</span>
        <span class="info-value">${giftData.updatedBy || 'System'}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Delivery Date:</span>
        <span class="info-value">${new Date().toLocaleDateString()}</span>
      </div>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <p><strong>Status:</strong> <span class="status-badge status-delivered">Delivered</span></p>
      
      <div class="alert-box alert-success">
        <strong>Delivery Confirmed:</strong> This gift has been successfully delivered to the player. 
        The tracking status has been updated to "Delivered" in the system.
      </div>
      
      <p style="margin-top: 20px;">The gift delivery has been confirmed. Please ensure all delivery documentation is properly filed.</p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/gift-approval" class="action-button">
        View Gift Approval System
      </a>
    `

    return {
      to: '',
      subject: `Gift Delivered: #${giftData.giftId} - ${giftData.fullName}`,
      text: `Gift #${giftData.giftId} has been delivered. Player: ${giftData.fullName} (${giftData.memberLogin}). Gift: ${giftData.giftItem}. Tracking: ${giftData.trackingCode || 'N/A'}`,
      html: this.baseTemplate(content)
    }
  }

  static bulkGiftDelivered(giftDataArray: any[]): EmailTemplate {
    const giftDetails = giftDataArray.map(gift => `
      <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 10px 0; background: #f9fafb;">
        <div class="info-row">
          <span class="info-label">Gift ID:</span>
          <span class="info-value">#${gift.giftId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Player:</span>
          <span class="info-value">${gift.fullName} (${gift.memberLogin})</span>
        </div>
        <div class="info-row">
          <span class="info-label">Gift Item:</span>
          <span class="info-value">${gift.giftItem}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Tracking Code:</span>
          <span class="info-value">${gift.trackingCode || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Dispatcher:</span>
          <span class="info-value">${gift.dispatcher || 'N/A'}</span>
        </div>
      </div>
    `).join('')

    const content = `
      <h2 style="color: #059669; margin-top: 0;">📦 Multiple Gifts Delivered</h2>
      
      <div class="info-row">
        <span class="info-label">Total Delivered:</span>
        <span class="info-value">${giftDataArray.length} gift(s)</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Updated by:</span>
        <span class="info-value">${giftDataArray[0]?.updatedBy || 'System'}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Delivery Date:</span>
        <span class="info-value">${new Date().toLocaleDateString()}</span>
      </div>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <p><strong>Status:</strong> <span class="status-badge status-delivered">Delivered</span></p>
      
      <div class="alert-box alert-success">
        <strong>Bulk Delivery Confirmed:</strong> ${giftDataArray.length} gift(s) have been successfully delivered to their respective players. 
        All tracking statuses have been updated to "Delivered" in the system.
      </div>
      
      <h3 style="color: #374151; margin-top: 20px;">Delivered Gift Details:</h3>
      ${giftDetails}
      
      <p style="margin-top: 20px;">All gift deliveries have been confirmed. Please ensure all delivery documentation is properly filed.</p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/gift-approval" class="action-button">
        View Gift Approval System
      </a>
    `

    return {
      to: '',
      subject: `Bulk Gift Delivery - ${giftDataArray.length} gift(s) delivered`,
      html: this.baseTemplate(content),
      text: `Bulk delivery: ${giftDataArray.length} gift(s) delivered. Updated by: ${giftDataArray[0]?.updatedBy || 'System'}. Gift IDs: ${giftDataArray.map(g => g.giftId).join(', ')}`
    }
  }
}
