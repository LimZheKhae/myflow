import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, updatePassword, deleteUser, getAuth, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, writeBatch } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { FirebaseUser } from "@/types/firebase";
import type { UserRole, Permission, MemberType } from "@/types/auth";

export class FirebaseAuthService {
  // Sign in with email and password
  static async signIn(email: string, password: string): Promise<{ user: User; userData: FirebaseUser }> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user data from Firestore
      let userData = await this.getUserData(user.uid);

      // If user document doesn't exist, create it with default role based on email
      if (!userData) {
        userData = await this.createUserDocumentOnFirstLogin(user);
        if (!userData) {
          throw new Error("Failed to create user document");
        }
      }

      // Update last login
      await this.updateLastLogin(user.uid);

      return { user, userData };
    } catch (error: any) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  // Sign out
  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error(`Sign out failed: ${error.message}`);
    }
  }

  // Create new user (Admin only)
  static async createUser(userData: Omit<FirebaseUser, "id" | "createdAt" | "updatedAt" | "lastLogin"> & { password: string }): Promise<string> {
    try {
      // Create a secondary Firebase app instance for user creation
      const secondaryApp = initializeApp(
        {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        },
        "Secondary"
      );

      const secondaryAuth = getAuth(secondaryApp);

      // Create Firebase Auth user with secondary app (doesn't affect current session)
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, userData.password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName: userData.name });

      // Create user document in Firestore (using main db instance)
      const userDoc: FirebaseUser = {
        ...userData,
        id: user.uid,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
        lastLogin: null as any,
      };

      await setDoc(doc(db, "users", user.uid), userDoc);

      // Sign out from secondary auth (cleanup)
      await signOut(secondaryAuth);

      // Delete the secondary app to clean up
      await deleteApp(secondaryApp);

      // Log activity
      const currentUserId = auth.currentUser?.uid || "system";
      await this.logActivity(currentUserId, "CREATE_USER", "user-management", "user", user.uid, {
        email: userData.email,
        role: userData.role,
      });

      return user.uid;
    } catch (error: any) {
      throw new Error(`User creation failed: ${error.message}`);
    }
  }

  // Get user data from Firestore
  static async getUserData(uid: string): Promise<FirebaseUser | null> {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        return { ...userDoc.data(), id: userDoc.id } as FirebaseUser;
      }
      return null;
    } catch (error: any) {
      console.error("Error fetching user data:", error);
      return null;
    }
  }

  // Update user data
  static async updateUserData(uid: string, updates: Partial<Omit<FirebaseUser, "id" | "createdAt" | "email">>, updatedBy?: string): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        ...(updatedBy && { updatedBy }),
      };

      await updateDoc(doc(db, "users", uid), updateData);

      // Log activity
      if (updatedBy) {
        await this.logActivity(updatedBy, "UPDATE_USER", "user-management", "user", uid, updates);
      }
    } catch (error: any) {
      throw new Error(`User update failed: ${error.message}`);
    }
  }

  // Update user permissions
  static async updateUserPermissions(uid: string, permissions: Record<string, Permission[]>, updatedBy: string): Promise<void> {
    try {
      await updateDoc(doc(db, "users", uid), {
        permissions,
        lastPermissionUpdate: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy,
      });

      // Log activity
      await this.logActivity(updatedBy, "UPDATE_PERMISSIONS", "user-management", "user", uid, {
        permissions,
      });
    } catch (error: any) {
      throw new Error(`Permission update failed: ${error.message}`);
    }
  }

  // Activate/Deactivate user
  static async toggleUserStatus(uid: string, isActive: boolean, updatedBy: string): Promise<void> {
    try {
      await updateDoc(doc(db, "users", uid), {
        isActive,
        updatedAt: serverTimestamp(),
        updatedBy,
      });

      // Log activity
      await this.logActivity(updatedBy, isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER", "user-management", "user", uid, {
        isActive,
      });
    } catch (error: any) {
      throw new Error(`User status update failed: ${error.message}`);
    }
  }

  // Delete user (Admin only)
  static async deleteUser(uid: string, deletedBy: string): Promise<void> {
    try {
      const batch = writeBatch(db);

      // Get user data for logging
      const userData = await this.getUserData(uid);

      // Soft delete - mark as inactive and archived
      batch.update(doc(db, "users", uid), {
        isActive: false,
        isArchived: true,
        archivedAt: serverTimestamp(),
        archivedBy: deletedBy,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      // Log activity
      await this.logActivity(deletedBy, "DELETE_USER", "user-management", "user", uid, {
        email: userData?.email,
        role: userData?.role,
      });
    } catch (error: any) {
      throw new Error(`User deletion failed: ${error.message}`);
    }
  }

  // Get all users (excluding deleted/archived users)
  static async getAllUsers(): Promise<FirebaseUser[]> {
    try {
      // Get all users first, then filter in memory to handle users without isArchived field
      const q = query(collection(db, "users"));
      const querySnapshot = await getDocs(q);

      const users = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as FirebaseUser[];

      // Filter out archived users (include users where isArchived is undefined, null, or false)
      return users.filter((user) => !user.isArchived);
    } catch (error: any) {
      console.error("Error fetching all users:", error);
      return [];
    }
  }

  // Get users by role
  static async getUsersByRole(role: UserRole): Promise<FirebaseUser[]> {
    try {
      const q = query(collection(db, "users"), where("role", "==", role), where("isActive", "==", true));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as FirebaseUser[];
    } catch (error: any) {
      console.error("Error fetching users by role:", error);
      return [];
    }
  }

  // Get users by merchant access
  static async getUsersByMerchant(merchant: string): Promise<FirebaseUser[]> {
    try {
      const q = query(collection(db, "users"), where("merchants", "array-contains", merchant), where("isActive", "==", true));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as FirebaseUser[];
    } catch (error: any) {
      console.error("Error fetching users by merchant:", error);
      return [];
    }
  }

  // Reset user password (Admin only)
  static async resetUserPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }

  // Update password (user self-service)
  static async updateUserPassword(newPassword: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("No authenticated user");
      }

      await updatePassword(user, newPassword);
    } catch (error: any) {
      throw new Error(`Password update failed: ${error.message}`);
    }
  }

  // Update last login timestamp
  static async updateLastLogin(uid: string): Promise<void> {
    try {
      await updateDoc(doc(db, "users", uid), {
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.error("Error updating last login:", error);
    }
  }

  // Check if user has permission
  static hasPermission(userData: FirebaseUser, module: string, permission: Permission): boolean {
    const modulePermissions = userData.permissions[module] || [];
    return modulePermissions.includes(permission);
  }

  // Check merchant access
  static canAccessMerchant(userData: FirebaseUser, merchant: string): boolean {
    return userData.merchants.includes(merchant) || userData.role === "ADMIN";
  }

  // Check currency access
  static canAccessCurrency(userData: FirebaseUser, currency: string): boolean {
    return userData.currencies.includes(currency) || userData.role === "ADMIN";
  }

  // Check member type access
  static canAccessMemberType(userData: FirebaseUser, memberType: MemberType): boolean {
    return userData.memberAccess.includes(memberType) || userData.role === "ADMIN";
  }

  // Log user activity
  static async logActivity(userId: string, action: string, module: string, entityType: string, entityId: string, details: Record<string, any>): Promise<void> {
    try {
      const userData = await this.getUserData(userId);
      if (!userData) return;

      const activityLog = {
        userId,
        userName: userData.name,
        action,
        module,
        entityType,
        entityId,
        details,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(collection(db, "activity_logs")), activityLog);
    } catch (error: any) {
      console.error("Error logging activity:", error);
    }
  }

  // Auth state listener
  static onAuthStateChanged(callback: (user: User | null, userData: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userData = await this.getUserData(user.uid);
        callback(user, userData);
      } else {
        callback(null, null);
      }
    });
  }

  // Get current user
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    return !!auth.currentUser;
  }

  // Create user document on first login based on email
  static async createUserDocumentOnFirstLogin(user: User): Promise<FirebaseUser | null> {
    try {
      // Determine role and permissions based on email
      let role: UserRole = "KAM";
      let permissions: Record<string, Permission[]> = {};
      let merchants: string[] = ["MERCHANT_A"];
      let currencies: string[] = ["USD"];
      let memberAccess: MemberType[] = ["VIP"];
      let department = "Sales";
      let region = "North America";

      // Set role and permissions based on email
      if (user.email === "admin@crm.com" || user.email?.includes("admin")) {
        role = "ADMIN";
        merchants = ["MERCHANT_A", "MERCHANT_B", "MERCHANT_C"];
        currencies = ["USD", "EUR", "GBP"];
        memberAccess = ["NORMAL", "VIP"];
        department = "IT";
        region = "Global";
        permissions = {
          "vip-profile": ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "IMPORT", "EXPORT"],
          campaign: ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "IMPORT", "EXPORT"],
          "gift-approval": ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "IMPORT", "EXPORT"],
          "user-management": ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "IMPORT", "EXPORT"],
        };
      } else if (user.email === "manager@crm.com") {
        role = "MANAGER";
        merchants = ["MERCHANT_A", "MERCHANT_B"];
        currencies = ["USD", "EUR"];
        memberAccess = ["NORMAL", "VIP"];
        department = "Marketing";
        permissions = {
          "vip-profile": ["VIEW", "SEARCH", "EXPORT"],
          campaign: ["VIEW", "SEARCH", "EDIT", "ADD", "EXPORT"],
          "gift-approval": ["VIEW", "SEARCH", "EDIT", "IMPORT", "EXPORT"],
          "user-management": ["VIEW", "SEARCH", "EDIT"],
        };
      } else if (user.email === "kam@crm.com") {
        role = "KAM";
        permissions = {
          "vip-profile": ["VIEW", "SEARCH", "EDIT", "ADD"],
          campaign: ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE"],
          "gift-approval": ["VIEW", "SEARCH", "ADD", "IMPORT"],
        };
      }

      // Create user document
      const userData: FirebaseUser = {
        id: user.uid,
        email: user.email || "",
        name: user.displayName || user.email?.split("@")[0] || "User",
        role,
        merchants,
        currencies,
        memberAccess,
        permissions,
        isActive: true,
        department,
        region,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
        lastLogin: serverTimestamp() as any,
        additionalData: {},
      };

      await setDoc(doc(db, "users", user.uid), userData);

      // Log activity
      await this.logActivity(user.uid, "FIRST_LOGIN", "user-management", "user", user.uid, {
        email: user.email,
        role: role,
      });

      return userData;
    } catch (error: any) {
      console.error("Error creating user document:", error);
      return null;
    }
  }

  // Change password for current user
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error("No authenticated user found");
      }

      // Re-authenticate user with current password for security
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password in Firebase Auth
      await updatePassword(user, newPassword);

      // Log activity
      await this.logActivity(user.uid, "CHANGE_PASSWORD", "user-management", "user", user.uid, {
        email: user.email,
        timestamp: new Date().toISOString(),
      });

      console.log("Password changed successfully");
    } catch (error: any) {
      console.error("Password change failed:", error);

      // Map Firebase error codes to user-friendly messages
      if (error.code === "auth/wrong-password") {
        throw new Error("Current password is incorrect");
      } else if (error.code === "auth/weak-password") {
        throw new Error("New password is too weak. Please choose a stronger password");
      } else if (error.code === "auth/requires-recent-login") {
        throw new Error("Please log out and log back in before changing your password");
      } else {
        throw new Error(`Password change failed: ${error.message}`);
      }
    }
  }

  // Send password reset email
  static async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log("Password reset email sent successfully");
    } catch (error: any) {
      console.error("Failed to send password reset email:", error);

      if (error.code === "auth/user-not-found") {
        throw new Error("No account found with this email address");
      } else if (error.code === "auth/invalid-email") {
        throw new Error("Invalid email address");
      } else {
        throw new Error(`Failed to send password reset email: ${error.message}`);
      }
    }
  }
}
