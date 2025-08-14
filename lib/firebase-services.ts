import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  endBefore,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore'
import { db } from './firebase'
import { FirebaseAuthService } from './firebase-auth'
import type {
  FirebaseUser,
  FirebaseVIPProfile,
  VIPNote,
  FirebaseCampaign,
  CampaignTarget,
  FirebaseGiftRequest,
  FirebaseActivityLog,
} from '@/types/firebase'
import type { UserRole, Permission, MemberType } from '@/types/auth'

// VIP Profile Service
export class VIPProfileService {
  private static readonly COLLECTION = 'vip_profiles'

  // Create VIP profile
  static async createVIPProfile(data: Omit<FirebaseVIPProfile, 'id' | 'createdAt' | 'updatedAt'>, createdBy: string): Promise<string> {
    try {
      const docRef = doc(collection(db, this.COLLECTION))
      const vipProfile: FirebaseVIPProfile = {
        ...data,
        id: docRef.id,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        createdBy,
      }

      await setDoc(docRef, vipProfile)

      // Log activity
      await FirebaseAuthService.logActivity(createdBy, 'CREATE_VIP_PROFILE', 'vip-profile', 'vip_profile', docRef.id, {
        name: data.name,
        email: data.email,
        merchant: data.merchant,
      })

      return docRef.id
    } catch (error: any) {
      throw new Error(`Failed to create VIP profile: ${error.message}`)
    }
  }

  // Get VIP profile by ID
  static async getVIPProfile(id: string): Promise<FirebaseVIPProfile | null> {
    try {
      const docSnap = await getDoc(doc(db, this.COLLECTION, id))
      if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as FirebaseVIPProfile
      }
      return null
    } catch (error: any) {
      console.error('Error fetching VIP profile:', error)
      return null
    }
  }

  // Get VIP profiles with filters and pagination
  static async getVIPProfiles(
    filters: {
      merchant?: string
      currency?: string
      status?: string
      assignedKAM?: string
      search?: string
    } = {},
    pagination: {
      limit: number
      lastDoc?: DocumentSnapshot
      orderByField?: string
      orderDirection?: 'asc' | 'desc'
    } = { limit: 20 }
  ): Promise<{ profiles: FirebaseVIPProfile[]; lastDoc: DocumentSnapshot | null }> {
    try {
      let q = query(collection(db, this.COLLECTION))

      // Apply filters
      if (filters.merchant) {
        q = query(q, where('merchant', '==', filters.merchant))
      }
      if (filters.currency) {
        q = query(q, where('currency', '==', filters.currency))
      }
      if (filters.status) {
        q = query(q, where('status', '==', filters.status))
      }
      if (filters.assignedKAM) {
        q = query(q, where('assignedKAM', '==', filters.assignedKAM))
      }

      // Apply ordering
      const orderField = pagination.orderByField || 'updatedAt'
      const orderDir = pagination.orderDirection || 'desc'
      q = query(q, orderBy(orderField, orderDir))

      // Apply pagination
      if (pagination.lastDoc) {
        q = query(q, startAfter(pagination.lastDoc))
      }
      q = query(q, limit(pagination.limit))

      const querySnapshot = await getDocs(q)
      const profiles = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as FirebaseVIPProfile[]

      // Filter by search term if provided (client-side for complex text search)
      let filteredProfiles = profiles
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        filteredProfiles = profiles.filter(
          (profile) =>
            profile.name.toLowerCase().includes(searchTerm) ||
            profile.email.toLowerCase().includes(searchTerm) ||
            profile.phone.toLowerCase().includes(searchTerm)
        )
      }

      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null

      return { profiles: filteredProfiles, lastDoc }
    } catch (error: any) {
      console.error('Error fetching VIP profiles:', error)
      return { profiles: [], lastDoc: null }
    }
  }

  // Update VIP profile
  static async updateVIPProfile(
    id: string,
    updates: Partial<Omit<FirebaseVIPProfile, 'id' | 'createdAt'>>,
    updatedBy: string
  ): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy,
      }

      await updateDoc(doc(db, this.COLLECTION, id), updateData)

      // Log activity
      await FirebaseAuthService.logActivity(updatedBy, 'UPDATE_VIP_PROFILE', 'vip-profile', 'vip_profile', id, updates)
    } catch (error: any) {
      throw new Error(`Failed to update VIP profile: ${error.message}`)
    }
  }

  // Add note to VIP profile
  static async addVIPNote(
    vipProfileId: string,
    note: Omit<VIPNote, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Promise<string> {
    try {
      const docRef = doc(collection(db, this.COLLECTION, vipProfileId, 'notes'))
      const vipNote: VIPNote = {
        ...note,
        id: docRef.id,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        createdBy,
      }

      await setDoc(docRef, vipNote)

      // Log activity
      await FirebaseAuthService.logActivity(createdBy, 'ADD_VIP_NOTE', 'vip-profile', 'vip_note', docRef.id, {
        vipProfileId,
        type: note.type,
        content: note.content.substring(0, 100) + '...',
      })

      return docRef.id
    } catch (error: any) {
      throw new Error(`Failed to add VIP note: ${error.message}`)
    }
  }

  // Get VIP notes
  static async getVIPNotes(vipProfileId: string): Promise<VIPNote[]> {
    try {
      const q = query(collection(db, this.COLLECTION, vipProfileId, 'notes'), orderBy('createdAt', 'desc'))
      const querySnapshot = await getDocs(q)

      return querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as VIPNote[]
    } catch (error: any) {
      console.error('Error fetching VIP notes:', error)
      return []
    }
  }

  // Real-time listener for VIP profiles
  static onVIPProfilesSnapshot(
    callback: (profiles: FirebaseVIPProfile[]) => void,
    filters: { merchant?: string; assignedKAM?: string } = {}
  ) {
    let q = query(collection(db, this.COLLECTION), orderBy('updatedAt', 'desc'))

    if (filters.merchant) {
      q = query(q, where('merchant', '==', filters.merchant))
    }
    if (filters.assignedKAM) {
      q = query(q, where('assignedKAM', '==', filters.assignedKAM))
    }

    return onSnapshot(q, (snapshot) => {
      const profiles = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as FirebaseVIPProfile[]
      callback(profiles)
    })
  }
}

// Campaign Service
export class CampaignService {
  private static readonly COLLECTION = 'campaigns'

  // Create campaign
  static async createCampaign(data: Omit<FirebaseCampaign, 'id' | 'createdAt' | 'updatedAt'>, createdBy: string): Promise<string> {
    try {
      const docRef = doc(collection(db, this.COLLECTION))
      const campaign: FirebaseCampaign = {
        ...data,
        id: docRef.id,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        createdBy,
      }

      await setDoc(docRef, campaign)

      // Log activity
      await FirebaseAuthService.logActivity(createdBy, 'CREATE_CAMPAIGN', 'campaign', 'campaign', docRef.id, {
        name: data.name,
        type: data.type,
        merchant: data.merchant,
      })

      return docRef.id
    } catch (error: any) {
      throw new Error(`Failed to create campaign: ${error.message}`)
    }
  }

  // Get campaign by ID
  static async getCampaign(id: string): Promise<FirebaseCampaign | null> {
    try {
      const docSnap = await getDoc(doc(db, this.COLLECTION, id))
      if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as FirebaseCampaign
      }
      return null
    } catch (error: any) {
      console.error('Error fetching campaign:', error)
      return null
    }
  }

  // Get campaigns with filters
  static async getCampaigns(
    filters: {
      status?: string
      type?: string
      merchant?: string
      assignedUser?: string
      search?: string
    } = {}
  ): Promise<FirebaseCampaign[]> {
    try {
      let q = query(collection(db, this.COLLECTION), orderBy('updatedAt', 'desc'))

      // Apply filters
      if (filters.status) {
        q = query(q, where('status', '==', filters.status))
      }
      if (filters.type) {
        q = query(q, where('type', '==', filters.type))
      }
      if (filters.merchant) {
        q = query(q, where('merchant', '==', filters.merchant))
      }
      if (filters.assignedUser) {
        q = query(q, where('assignedUsers', 'array-contains', filters.assignedUser))
      }

      const querySnapshot = await getDocs(q)
      let campaigns = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as FirebaseCampaign[]

      // Filter by search term if provided
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        campaigns = campaigns.filter((campaign) => campaign.name.toLowerCase().includes(searchTerm))
      }

      return campaigns
    } catch (error: any) {
      console.error('Error fetching campaigns:', error)
      return []
    }
  }

  // Update campaign
  static async updateCampaign(
    id: string,
    updates: Partial<Omit<FirebaseCampaign, 'id' | 'createdAt'>>,
    updatedBy: string
  ): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy,
      }

      await updateDoc(doc(db, this.COLLECTION, id), updateData)

      // Log activity
      await FirebaseAuthService.logActivity(updatedBy, 'UPDATE_CAMPAIGN', 'campaign', 'campaign', id, updates)
    } catch (error: any) {
      throw new Error(`Failed to update campaign: ${error.message}`)
    }
  }

  // Update campaign target
  static async updateCampaignTarget(
    campaignId: string,
    targetIndex: number,
    updates: Partial<CampaignTarget>,
    updatedBy: string
  ): Promise<void> {
    try {
      const campaign = await this.getCampaign(campaignId)
      if (!campaign) {
        throw new Error('Campaign not found')
      }

      const updatedTargets = [...campaign.targets]
      updatedTargets[targetIndex] = { ...updatedTargets[targetIndex], ...updates }

      await this.updateCampaign(campaignId, { targets: updatedTargets }, updatedBy)

      // Log activity
      await FirebaseAuthService.logActivity(updatedBy, 'UPDATE_CAMPAIGN_TARGET', 'campaign', 'campaign_target', campaignId, {
        targetIndex,
        updates,
      })
    } catch (error: any) {
      throw new Error(`Failed to update campaign target: ${error.message}`)
    }
  }
}

// Gift Request Service
export class GiftRequestService {
  private static readonly COLLECTION = 'gift_requests'

  // Create gift request
  static async createGiftRequest(
    data: Omit<FirebaseGiftRequest, 'id' | 'createdAt' | 'updatedAt' | 'approvalWorkflow'>,
    createdBy: string
  ): Promise<string> {
    try {
      const docRef = doc(collection(db, this.COLLECTION))
      const giftRequest: FirebaseGiftRequest = {
        ...data,
        id: docRef.id,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        createdBy,
        approvalWorkflow: [
          {
            step: 1,
            role: 'MANAGER',
            action: 'Pending',
          },
        ],
      }

      await setDoc(docRef, giftRequest)

      // Log activity
      await FirebaseAuthService.logActivity(createdBy, 'CREATE_GIFT_REQUEST', 'gift-approval', 'gift_request', docRef.id, {
        playerName: data.playerName,
        giftType: data.giftType,
        amount: data.amount,
        currency: data.currency,
      })

      return docRef.id
    } catch (error: any) {
      throw new Error(`Failed to create gift request: ${error.message}`)
    }
  }

  // Get gift request by ID
  static async getGiftRequest(id: string): Promise<FirebaseGiftRequest | null> {
    try {
      const docSnap = await getDoc(doc(db, this.COLLECTION, id))
      if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as FirebaseGiftRequest
      }
      return null
    } catch (error: any) {
      console.error('Error fetching gift request:', error)
      return null
    }
  }

  // Get gift requests with filters
  static async getGiftRequests(
    filters: {
      status?: string
      requestedBy?: string
      merchant?: string
      approvedBy?: string
      search?: string
    } = {}
  ): Promise<FirebaseGiftRequest[]> {
    try {
      let q = query(collection(db, this.COLLECTION), orderBy('createdAt', 'desc'))

      // Apply filters
      if (filters.status) {
        q = query(q, where('status', '==', filters.status))
      }
      if (filters.requestedBy) {
        q = query(q, where('requestedBy', '==', filters.requestedBy))
      }
      if (filters.merchant) {
        q = query(q, where('merchant', '==', filters.merchant))
      }
      if (filters.approvedBy) {
        q = query(q, where('approvedBy', '==', filters.approvedBy))
      }

      const querySnapshot = await getDocs(q)
      let requests = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as FirebaseGiftRequest[]

      // Filter by search term if provided
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        requests = requests.filter(
          (request) =>
            request.playerName.toLowerCase().includes(searchTerm) ||
            request.giftType.toLowerCase().includes(searchTerm) ||
            request.reason.toLowerCase().includes(searchTerm)
        )
      }

      return requests
    } catch (error: any) {
      console.error('Error fetching gift requests:', error)
      return []
    }
  }

  // Approve gift request
  static async approveGiftRequest(id: string, approvedBy: string, comments?: string): Promise<void> {
    try {
      const batch = writeBatch(db)
      const docRef = doc(db, this.COLLECTION, id)

      // Get current request
      const request = await this.getGiftRequest(id)
      if (!request) {
        throw new Error('Gift request not found')
      }

      // Update approval workflow
      const updatedWorkflow = [...request.approvalWorkflow]
      const currentStep = updatedWorkflow.find((step) => step.action === 'Pending')
      if (currentStep) {
        currentStep.action = 'Approved'
        currentStep.userId = approvedBy
        currentStep.timestamp = serverTimestamp() as Timestamp
        currentStep.comments = comments
      }

      // Update request status
      batch.update(docRef, {
        status: 'Approved',
        approvedBy,
        approvedAt: serverTimestamp(),
        approvalWorkflow: updatedWorkflow,
        updatedAt: serverTimestamp(),
        updatedBy: approvedBy,
      })

      await batch.commit()

      // Log activity
      await FirebaseAuthService.logActivity(approvedBy, 'APPROVE_GIFT_REQUEST', 'gift-approval', 'gift_request', id, {
        comments,
      })
    } catch (error: any) {
      throw new Error(`Failed to approve gift request: ${error.message}`)
    }
  }

  // Reject gift request
  static async rejectGiftRequest(id: string, rejectedBy: string, reason: string): Promise<void> {
    try {
      const batch = writeBatch(db)
      const docRef = doc(db, this.COLLECTION, id)

      // Get current request
      const request = await this.getGiftRequest(id)
      if (!request) {
        throw new Error('Gift request not found')
      }

      // Update approval workflow
      const updatedWorkflow = [...request.approvalWorkflow]
      const currentStep = updatedWorkflow.find((step) => step.action === 'Pending')
      if (currentStep) {
        currentStep.action = 'Rejected'
        currentStep.userId = rejectedBy
        currentStep.timestamp = serverTimestamp() as Timestamp
        currentStep.comments = reason
      }

      // Update request status
      batch.update(docRef, {
        status: 'Rejected',
        rejectedBy,
        rejectedAt: serverTimestamp(),
        rejectionReason: reason,
        approvalWorkflow: updatedWorkflow,
        updatedAt: serverTimestamp(),
        updatedBy: rejectedBy,
      })

      await batch.commit()

      // Log activity
      await FirebaseAuthService.logActivity(rejectedBy, 'REJECT_GIFT_REQUEST', 'gift-approval', 'gift_request', id, {
        reason,
      })
    } catch (error: any) {
      throw new Error(`Failed to reject gift request: ${error.message}`)
    }
  }

  // Update procurement status
  static async updateProcurementStatus(
    id: string,
    procurementStatus: FirebaseGiftRequest['procurementStatus'],
    notes: string,
    updatedBy: string
  ): Promise<void> {
    try {
      await updateDoc(doc(db, this.COLLECTION, id), {
        procurementStatus,
        procurementNotes: notes,
        updatedAt: serverTimestamp(),
        updatedBy,
      })

      // Log activity
      await FirebaseAuthService.logActivity(updatedBy, 'UPDATE_PROCUREMENT_STATUS', 'gift-approval', 'gift_request', id, {
        procurementStatus,
        notes,
      })
    } catch (error: any) {
      throw new Error(`Failed to update procurement status: ${error.message}`)
    }
  }
}

// Activity Log Service
export class ActivityLogService {
  private static readonly COLLECTION = 'activity_logs'

  // Get activity logs with filters
  static async getActivityLogs(
    filters: {
      userId?: string
      module?: string
      entityType?: string
      entityId?: string
      action?: string
      startDate?: Date
      endDate?: Date
    } = {},
    pagination: { limit: number; lastDoc?: DocumentSnapshot } = { limit: 50 }
  ): Promise<{ logs: FirebaseActivityLog[]; lastDoc: DocumentSnapshot | null }> {
    try {
      let q = query(collection(db, this.COLLECTION), orderBy('createdAt', 'desc'))

      // Apply filters
      if (filters.userId) {
        q = query(q, where('userId', '==', filters.userId))
      }
      if (filters.module) {
        q = query(q, where('module', '==', filters.module))
      }
      if (filters.entityType) {
        q = query(q, where('entityType', '==', filters.entityType))
      }
      if (filters.entityId) {
        q = query(q, where('entityId', '==', filters.entityId))
      }
      if (filters.action) {
        q = query(q, where('action', '==', filters.action))
      }

      // Apply pagination
      if (pagination.lastDoc) {
        q = query(q, startAfter(pagination.lastDoc))
      }
      q = query(q, limit(pagination.limit))

      const querySnapshot = await getDocs(q)
      const logs = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as FirebaseActivityLog[]

      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null

      return { logs, lastDoc }
    } catch (error: any) {
      console.error('Error fetching activity logs:', error)
      return { logs: [], lastDoc: null }
    }
  }

  // Get user activity summary
  static async getUserActivitySummary(userId: string, days: number = 30): Promise<Record<string, number>> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const q = query(
        collection(db, this.COLLECTION),
        where('userId', '==', userId),
        where('createdAt', '>=', Timestamp.fromDate(startDate))
      )

      const querySnapshot = await getDocs(q)
      const summary: Record<string, number> = {}

      querySnapshot.docs.forEach((doc) => {
        const data = doc.data()
        const action = data.action
        summary[action] = (summary[action] || 0) + 1
      })

      return summary
    } catch (error: any) {
      console.error('Error fetching user activity summary:', error)
      return {}
    }
  }
} 