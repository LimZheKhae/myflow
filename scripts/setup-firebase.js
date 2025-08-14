// Firebase Setup Script
// Run this in the browser console at localhost:3000 to create demo users

const setupFirebaseDemo = async () => {
  console.log('🔥 Setting up Firebase Demo Data...')
  
  // Demo users to create
  const demoUsers = [
    {
      email: 'admin@crm.com',
      password: 'admin123',
      userData: {
        name: 'System Administrator',
        role: 'ADMIN',
        merchants: ['MERCHANT_A', 'MERCHANT_B', 'MERCHANT_C'],
        currencies: ['USD', 'EUR', 'GBP'],
        memberAccess: ['NORMAL', 'VIP'],
        permissions: {
          'vip-profile': ['VIEW', 'SEARCH', 'EDIT', 'ADD', 'DELETE', 'EXPORT'],
          'campaign': ['VIEW', 'SEARCH', 'EDIT', 'ADD', 'DELETE', 'EXPORT'],
          'gift-approval': ['VIEW', 'SEARCH', 'EDIT', 'ADD', 'DELETE', 'EXPORT'],
          'user-management': ['VIEW', 'SEARCH', 'EDIT', 'ADD', 'DELETE', 'EXPORT']
        },
        isActive: true,
        department: 'IT',
        region: 'Global',
        additionalData: {}
      }
    },
    {
      email: 'manager@crm.com',
      password: 'manager123',
      userData: {
        name: 'Marketing Manager',
        role: 'MANAGER',
        merchants: ['MERCHANT_A', 'MERCHANT_B'],
        currencies: ['USD', 'EUR'],
        memberAccess: ['NORMAL', 'VIP'],
        permissions: {
          'vip-profile': ['VIEW', 'SEARCH'],
          'campaign': ['VIEW', 'SEARCH', 'EDIT'],
          'gift-approval': ['VIEW', 'SEARCH', 'EDIT'],
          'user-management': ['VIEW', 'SEARCH', 'EDIT']
        },
        isActive: true,
        department: 'Marketing',
        region: 'North America',
        additionalData: {}
      }
    },
    {
      email: 'kam@crm.com',
      password: 'kam123',
      userData: {
        name: 'Key Account Manager',
        role: 'KAM',
        merchants: ['MERCHANT_A'],
        currencies: ['USD'],
        memberAccess: ['VIP'],
        permissions: {
          'vip-profile': ['VIEW', 'SEARCH', 'EDIT', 'ADD'],
          'campaign': ['VIEW', 'SEARCH', 'EDIT', 'ADD', 'DELETE'],
          'gift-approval': ['VIEW', 'ADD']
        },
        isActive: true,
        department: 'Sales',
        region: 'North America',
        additionalData: {}
      }
    }
  ]

  try {
    // Note: This requires the Firebase Auth service to be properly set up
    // and the user to manually create users through Firebase Console first
    
    console.log('Demo user data ready:')
    console.table(demoUsers.map(u => ({
      email: u.email,
      password: u.password,
      role: u.userData.role,
      name: u.userData.name
    })))
    
    console.log('📝 Next steps:')
    console.log('1. Go to Firebase Console > Authentication > Users')
    console.log('2. Click "Add user" and create users with above credentials')
    console.log('3. After creating users, their Firestore documents will be created automatically on first login')
    console.log('4. Or use the Firebase Admin SDK to create users programmatically')
    
    return demoUsers
  } catch (error) {
    console.error('Error setting up demo data:', error)
  }
}

// Demo VIP profiles
const demoVIPProfiles = [
  {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    merchant: 'MERCHANT_A',
    currency: 'USD',
    memberType: 'VIP',
    totalDeposit: 50000,
    status: 'Active',
    customFields: {}
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+1234567891',
    merchant: 'MERCHANT_A',
    currency: 'USD',
    memberType: 'VIP',
    totalDeposit: 75000,
    status: 'Active',
    customFields: {}
  }
]

// Demo campaigns
const demoCampaigns = [
  {
    name: 'VIP Reactivation Q1',
    type: 'Reactivation',
    status: 'Active',
    targetCount: 150,
    completedCalls: 45,
    merchant: 'MERCHANT_A',
    currency: 'USD',
    description: 'Reactivate dormant VIP players',
    targetCriteria: {
      memberTypes: ['VIP'],
      lastActivityDays: 30,
      merchants: ['MERCHANT_A'],
      currencies: ['USD']
    },
    assignedUsers: [],
    targets: [],
    results: {
      totalCalls: 45,
      successfulContacts: 25,
      conversions: 8
    }
  }
]

console.log('🔥 Firebase Demo Setup Script Loaded!')
console.log('Run setupFirebaseDemo() to see demo user credentials')
console.log('Demo VIP profiles and campaigns are also available as demoVIPProfiles and demoCampaigns')

// Export for use
if (typeof window !== 'undefined') {
  window.setupFirebaseDemo = setupFirebaseDemo
  window.demoVIPProfiles = demoVIPProfiles
  window.demoCampaigns = demoCampaigns
} 