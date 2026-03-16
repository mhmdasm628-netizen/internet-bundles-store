import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  setDoc } from
'firebase/firestore';
import { db, auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map((provider) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Service Functions
export const settingsService = {
  async get() {
    try {
      const docRef = doc(db, 'settings', 'global');
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return snapshot.data();
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    }
  },
  async update(data: any) {
    try {
      await setDoc(doc(db, 'settings', 'global'), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/global');
    }
  },
  subscribe(callback: (settings: any) => void) {
    return onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      callback(snapshot.data());
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/global'));
  }
};

export const categoriesService = {
  async getAll() {
    try {
      const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    }
  },
  async add(data: any) {
    try {
      return await addDoc(collection(db, 'categories'), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    }
  },
  async update(id: string, data: any) {
    try {
      await updateDoc(doc(db, 'categories', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `categories/${id}`);
    }
  },
  async delete(id: string) {
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
    }
  }
};

export const packagesService = {
  async getAll() {
    try {
      const snapshot = await getDocs(collection(db, 'packages'));
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'packages');
    }
  },
  async getByCategory(categoryId: string) {
    try {
      const q = query(collection(db, 'packages'), where('categoryId', '==', categoryId), where('isActive', '==', true));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `packages?categoryId=${categoryId}`);
    }
  },
  async add(data: any) {
    try {
      return await addDoc(collection(db, 'packages'), { ...data, isActive: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'packages');
    }
  },
  async update(id: string, data: any) {
    try {
      await updateDoc(doc(db, 'packages', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `packages/${id}`);
    }
  },
  async updateStock(id: string, newStock: number) {
    try {
      await updateDoc(doc(db, 'packages', id), { stock: newStock });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `packages/${id}/stock`);
    }
  },
  async delete(id: string) {
    try {
      await deleteDoc(doc(db, 'packages', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `packages/${id}`);
    }
  }
};

export const subscriptionsService = {
  async create(data: any) {
    try {
      // Decrement stock immediately on request as per user requirement
      const pkgDoc = await getDoc(doc(db, 'packages', data.packageId));
      if (pkgDoc.exists()) {
        const pkgData = pkgDoc.data();
        if (pkgData.stock !== undefined && pkgData.stock > 0) {
          await updateDoc(doc(db, 'packages', data.packageId), {
            stock: pkgData.stock - 1
          });
        }
      }

      return await addDoc(collection(db, 'subscriptions'), {
        ...data,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'subscriptions');
    }
  },
  async updateStatus(id: string, status: string) {
    try {
      await updateDoc(doc(db, 'subscriptions', id), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `subscriptions/${id}`);
    }
  },
  subscribeToUserSubscriptions(userId: string, callback: (subs: any[]) => void) {
    const q = query(collection(db, 'subscriptions'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'subscriptions'));
  },
  subscribeToAll(callback: (subs: any[]) => void) {
    const q = query(collection(db, 'subscriptions'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'subscriptions'));
  }
};

export const chatService = {
  async sendMessage(subscriptionId: string, text: string) {
    try {
      const msg = {
        subscriptionId,
        senderId: auth.currentUser?.uid,
        text,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'chatMessages'), msg);

      // Update subscription with last message info for notifications
      await updateDoc(doc(db, 'subscriptions', subscriptionId), {
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: auth.currentUser?.uid,
        lastMessageText: text
      });

      return docRef;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chatMessages');
    }
  },
  subscribeToMessages(subscriptionId: string, callback: (msgs: any[]) => void) {
    const q = query(collection(db, 'chatMessages'), where('subscriptionId', '==', subscriptionId), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'chatMessages'));
  }
};

export const usersService = {
  async getAll() {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  },
  async updateRole(userId: string, role: string) {
    try {
      await updateDoc(doc(db, 'users', userId), { role });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  },
  subscribeToAll(callback: (users: any[]) => void) {
    return onSnapshot(collection(db, 'users'), (snapshot) => {
      callback(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
  }
};

export const refundService = {
  async requestRefund(subscriptionId: string, senderPhone: string, refundPhone: string) {
    try {
      const refundData = {
        subscriptionId,
        senderPhone,
        refundPhone,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'refundRequests'), refundData);

      // Also store in subscription for easy access by Admin
      await updateDoc(doc(db, 'subscriptions', subscriptionId), {
        status: 'refund_requested',
        refundDetails: refundData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'refundRequests');
    }
  },
  subscribeToAll(callback: (reqs: any[]) => void) {
    const q = query(collection(db, 'refundRequests'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'refundRequests'));
  }
};